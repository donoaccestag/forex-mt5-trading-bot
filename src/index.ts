import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';

import { createInitialSymbols, type SymbolConfig } from './config/symbols.js';
import { indicator, atrAt } from './dataProcessing.js';
import { mt5 } from './mt5/bridgeClient.js';
import { executeBuyOrder, executeSellOrder } from './orderProcessing.js';
import { logEvent } from './logging.js';
import Dashboard from './ui/dashboard.js';
import { AppError, createTraceId, runGuarded, validateRates, getErrorMessage } from './errorHandling.js';
import {
  CONFIRMATION_CANDLES,
  MIN_ATR,
  MIN_BODY_TO_RANGE,
  MAX_OPEN_TRADES,
  MAX_DAILY_DRAWDOWN_FRACTION,
  CIRCUIT_BREAKER_COOLDOWN_MS,
} from './config/risk.js';
import {
  candleRetrievedFlag,
  getMt5Interval,
  marketIsOpen,
  newCandleUpdate,
} from './timeProcessing.js';
import {
  setDailyStartBalanceIfMissing,
  getDailyStartBalance,
  isCircuitOpen,
  setCircuitOpen,
} from './logging.js';

async function promptCredentials(): Promise<{ account: number; password: string; server: string }> {
  const rl = createInterface({ input, output });

  while (true) {
    try {
      const accountRaw = await rl.question('Enter MT5 account number: ');
      const password = await rl.question('Enter MT5 password: ');
      const server = await rl.question('Enter server name: ');
      const account = Number.parseInt(accountRaw, 10);

      if (!Number.isFinite(account) || !password || !server) {
        throw new Error('Invalid input');
      }

      rl.close();
      return { account, password, server };
    } catch {
      console.log('Invalid input. Please try again.');
    }
  }
}

async function connectToMt5(): Promise<void> {
  const { account, password, server } = await promptCredentials();

  if (!(await mt5.initialize(account, password, server))) {
    const [code] = await mt5.lastError();
    console.log(`initialize() failed, error code=${code}`);
    process.exit(1);
  }

  if (!(await mt5.login(account, password, server))) {
    const [code] = await mt5.lastError();
    console.log(`Failed to connect to account #${account}, error code=${code}`);
    await mt5.shutdown();
    process.exit(1);
  }
}

async function runTradingLoop(symbols: SymbolConfig[]): Promise<void> {
  const dashboard = new Dashboard();
  const pendingSignals = new Map<string, { type: 'buy' | 'sell'; entry: number; minVal?: number; maxVal?: number; avgVal: number; candlesWaited: number; createdAt: number }>();
  while (true) {
    const traceId = createTraceId('cycle');
    const terminalResult = await runGuarded('terminalInfo', () => mt5.terminalInfo(), { traceId, retries: 1 });
    const terminal = terminalResult.ok ? terminalResult.data : null;
    dashboard.setStatus(terminal?.connected ? 'MT5 connected' : 'MT5 disconnected');
    if (!terminal?.connected) {
      dashboard.logError(`MT5 not connected (${traceId})`);
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    try {
      const accountResult = await runGuarded('accountInfo', () => mt5.accountInfo(), { traceId, retries: 1 });
      if (accountResult.ok && accountResult.data) {
        dashboard.updateAccount(accountResult.data);
        try {
          setDailyStartBalanceIfMissing(accountResult.data.balance);
        } catch {}
        const start = getDailyStartBalance();
        if (start && accountResult.data.balance < start * (1 - MAX_DAILY_DRAWDOWN_FRACTION)) {
          setCircuitOpen(CIRCUIT_BREAKER_COOLDOWN_MS, { reason: 'daily_drawdown' });
          logEvent('circuit_opened', { reason: 'daily_drawdown', start, balance: accountResult.data.balance, traceId });
          dashboard.logError('Daily drawdown exceeded; circuit opened.');
        }
      } else if (accountResult.error) {
        dashboard.logError(`account fetch error (${traceId}): ${getErrorMessage(accountResult.error)}`);
      }
    } catch (err) {
      dashboard.logError(`account fetch error (${traceId}): ${getErrorMessage(err)}`);
    }

    const positionsArr = await Promise.all(symbols.map((s) => mt5.positionsGet(s.symbol).catch(() => [])));
    let totalOpen = positionsArr.reduce((acc, p) => acc + (p?.length || 0), 0);

    for (const symbolConfig of symbols) {
      const symbolTraceId = createTraceId(`${symbolConfig.symbol.toLowerCase()}-cycle`);
      const timeframe = getMt5Interval(symbolConfig.timeframe);
      if (timeframe === null) {
        continue;
      }

      const shouldAnalyze = newCandleUpdate(symbolConfig.timeframe, symbolConfig.candlesRetrieved);
      if (!shouldAnalyze) {
        continue;
      }

      const selectResult = await runGuarded('symbolSelect', () => mt5.symbolSelect(symbolConfig.symbol), { traceId: symbolTraceId, retries: 1 });
      if (!selectResult.ok) {
        dashboard.logError(`Failed to select ${symbolConfig.symbol}: ${getErrorMessage(selectResult.error)}`);
        continue;
      }

      const positionsResult = await runGuarded('positionsGet', () => mt5.positionsGet(symbolConfig.symbol), { traceId: symbolTraceId, retries: 1 });
      const positions = positionsResult.ok ? positionsResult.data ?? [] : [];
      if (positions.length >= 1) {
        continue;
      }

      const ratesResult = await runGuarded('copyRatesFromPos', () => mt5.copyRatesFromPos(symbolConfig.symbol, timeframe, 0, 550), { traceId: symbolTraceId, retries: 1 });
      if (!ratesResult.ok || !ratesResult.data) {
        dashboard.logError(`Failed to retrieve rates for ${symbolConfig.symbol}: ${getErrorMessage(ratesResult.error)}`);
        continue;
      }

      try {
        validateRates(ratesResult.data, symbolConfig.symbol, symbolTraceId);
      } catch (error) {
        dashboard.logError(`Rate validation failed for ${symbolConfig.symbol}: ${getErrorMessage(error)}`);
        logEvent('invalid_rate_data', { symbol: symbolConfig.symbol, traceId: symbolTraceId, error: getErrorMessage(error) });
        continue;
      }

      const rates = ratesResult.data;
      const currOpen = rates[rates.length - 1].open;
      const prvHigh = rates[rates.length - 2].high;
      const prvLow = rates[rates.length - 2].low;

      const { maximum, minimum, average } = indicator(rates);
      const buyCondition = prvLow <= minimum && currOpen < average;
      const sellCondition = prvHigh >= maximum && currOpen > average;

      const atr = atrAt(rates, 18);
      const prevBar = rates[rates.length - 2];
      const body = Math.abs(prevBar.open - prevBar.close);
      const range = prevBar.high - prevBar.low || 1;
      const bodyRatio = body / range;
      const passesTrendFilter = atr >= MIN_ATR && bodyRatio >= MIN_BODY_TO_RANGE;

      const pending = pendingSignals.get(symbolConfig.symbol);

      if (pending) {
        pending.candlesWaited += 1;
        if ((pending.type === 'buy' && buyCondition) || (pending.type === 'sell' && sellCondition)) {
          if (pending.candlesWaited >= CONFIRMATION_CANDLES) {
            logEvent('signal_confirmed', { symbol: symbolConfig.symbol, pending, traceId: symbolTraceId });
            const circuit = isCircuitOpen();
            if (circuit.open) {
              logEvent('signal_blocked_by_circuit', { symbol: symbolConfig.symbol, until: circuit.until, traceId: symbolTraceId });
              dashboard.logError(`Signal blocked by circuit until ${new Date(circuit.until ?? 0).toISOString()}`);
              pendingSignals.delete(symbolConfig.symbol);
            } else if (totalOpen >= MAX_OPEN_TRADES) {
              logEvent('signal_blocked_by_open_trades', { symbol: symbolConfig.symbol, totalOpen, max: MAX_OPEN_TRADES, traceId: symbolTraceId });
              dashboard.logError(`Skipping execution; open trades ${totalOpen} >= ${MAX_OPEN_TRADES}`);
              pendingSignals.delete(symbolConfig.symbol);
            } else {
              if (pending.type === 'buy') {
                await executeBuyOrder(mt5, symbolConfig.symbol, pending.entry, pending.minVal ?? 0, pending.avgVal);
              } else {
                await executeSellOrder(mt5, symbolConfig.symbol, pending.entry, pending.maxVal ?? 0, pending.avgVal);
              }
              totalOpen += 1;
              pendingSignals.delete(symbolConfig.symbol);
            }
          }
        } else {
          logEvent('signal_cancelled', { symbol: symbolConfig.symbol, pending, traceId: symbolTraceId });
          pendingSignals.delete(symbolConfig.symbol);
        }
      } else if (passesTrendFilter) {
        if (buyCondition) {
          pendingSignals.set(symbolConfig.symbol, {
            type: 'buy',
            entry: currOpen,
            minVal: minimum,
            avgVal: average,
            candlesWaited: 0,
            createdAt: Date.now(),
          });
          logEvent('signal_generated', { symbol: symbolConfig.symbol, type: 'buy', entry: currOpen, minimum, average, traceId: symbolTraceId });
        } else if (sellCondition) {
          pendingSignals.set(symbolConfig.symbol, {
            type: 'sell',
            entry: currOpen,
            maxVal: maximum,
            avgVal: average,
            candlesWaited: 0,
            createdAt: Date.now(),
          });
          logEvent('signal_generated', { symbol: symbolConfig.symbol, type: 'sell', entry: currOpen, maximum, average, traceId: symbolTraceId });
        }
      } else if (buyCondition || sellCondition) {
        logEvent('signal_filtered_out', { symbol: symbolConfig.symbol, atr, bodyRatio, buyCondition, sellCondition, traceId: symbolTraceId });
      }

      try {
        const tickResult = await runGuarded('symbolInfoTick', () => mt5.symbolInfoTick(symbolConfig.symbol), { traceId: symbolTraceId, retries: 1 });
        const spread = tickResult.ok && tickResult.data ? Math.abs((tickResult.data.ask ?? 0) - (tickResult.data.bid ?? 0)) : 0;
        dashboard.updateSymbol({
          symbol: symbolConfig.symbol,
          timeframe: symbolConfig.timeframe,
          trend: atr >= MIN_ATR ? 'strong' : 'weak',
          lastSignal: pending ? pending.type : undefined,
          position: positions.length > 0 ? 'open' : 'none',
          spread,
          atr,
          candleTime: new Date(rates[rates.length - 1].time * 1000).toISOString(),
        });
      } catch (err) {
        dashboard.logError(`tick fetch error for ${symbolConfig.symbol}: ${getErrorMessage(err)}`);
      }

      const latestResult = await runGuarded('copyRatesFromPos(latest)', () => mt5.copyRatesFromPos(symbolConfig.symbol, timeframe, 0, 1), { traceId: symbolTraceId, retries: 1 });
      if (latestResult.ok && latestResult.data && latestResult.data.length > 0) {
        symbolConfig.candlesRetrieved = candleRetrievedFlag(latestResult.data[0].time);
      }
    }

    if (!marketIsOpen()) {
      console.log('\nMARKET CLOSING SOON.\nSleeping till Sunday 09:59:00 PM...');
      await sleep(172_800_000);
      break;
    }
  }
}

async function main(): Promise<void> {
  const symbols = createInitialSymbols();

  while (true) {
    if (!marketIsOpen()) {
      for (const symbolConfig of symbols) {
        symbolConfig.candlesRetrieved = false;
      }
      await connectToMt5();
    } else {
      continue;
    }

    await runTradingLoop(symbols);
  }
}

function attachProcessHandlers(): void {
  process.on('uncaughtException', async (error: Error) => {
    console.error('Uncaught exception:', error);
    logEvent('uncaught_exception', { error: error.message, stack: error.stack });
    try {
      await mt5.shutdown();
    } catch {}
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    console.error('Unhandled rejection:', reason);
    logEvent('unhandled_rejection', { error: message });
    try {
      await mt5.shutdown();
    } catch {}
    process.exit(1);
  });
}

attachProcessHandlers();

main().catch(async (error: unknown) => {
  console.error(error);
  logEvent('main_failure', { error: error instanceof Error ? error.message : String(error) });
  try {
    await mt5.shutdown();
  } catch {}
  process.exit(1);
});
