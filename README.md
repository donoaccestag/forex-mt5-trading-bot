# Forex MT5 Trading Bot

## About the program

This project is a rule-based forex trading bot for MetaTrader 5, implemented in TypeScript. It uses a SuperTrend-style signal base with safer live-trading controls including confirmation candles, ATR/body filters, hard risk caps, circuit-breaker protection, structured logs, and a simple terminal dashboard.

## Key capabilities

- Trend-quality filter and candle confirmation before entry
- Kelly-style lot sizing with risk caps
- Max open trades and daily-drawdown protection
- Circuit-breaker after repeated order failures
- Structured signal/order/error logging under `.state/`
- Blessed terminal dashboard
- PM2 deployment support

## Project structure

| Path | Role |
| --- | --- |
| `src/index.ts` | Main program loop |
| `src/dataProcessing.ts` | SuperTrend indicator (ATR implemented in TypeScript) |
| `src/orderProcessing.ts` | Order execution with **Kelly stake sizing** via [`stake-math`](https://www.npmjs.com/package/stake-math) |
| `src/timeProcessing.ts` | Market hours, candle timing, MT5 timeframe mapping |
| `src/config/symbols.ts` | 26 forex pairs and timeframes |
| `src/config/kelly.ts` | Kelly parameters (win probability, fraction, caps) |
| `src/mt5/` | Typed MT5 client |
| `scripts/mt5-bridge.py` | Thin Python RPC bridge to the official `MetaTrader5` package |

### Kelly Stake Sizing

Forex risk/reward is mapped into stake-math’s binary-market inputs:

- `bankroll` — account balance  
- `probability` — estimated win rate (`KELLY_WIN_PROBABILITY` in `src/config/kelly.ts`)  
- `allInPrice` — risk share of total move: `|entry − sl| / (|entry − sl| + |tp − entry|)`  
- `kellyFraction` — fractional Kelly (default half-Kelly at `0.5`)

The returned USD stake is converted to lots using symbol tick size/value. The original “double lot when closer to average line” rule is preserved.

## Prerequisites

- Node.js 18+
- Python 3 with the official MetaTrader5 package
- A running MetaTrader 5 terminal and a demo account for testing

## Run locally

```bash
npm install
npm run build
npm run dev
```

You will be prompted for your MT5 account number, password, and server name.

## Run with PM2

```bash
npm install -g pm2
mkdir -p logs
npm run build
pm2 start ecosystem.config.cjs
pm2 logs forex-bot
```

## Useful PM2 commands

```bash
pm2 status
pm2 restart forex-bot
pm2 stop forex-bot
pm2 delete forex-bot
```

## Disclaimer

This strategy is not guaranteed to be profitable. Backtest and validate thoroughly before using it on a live account. Use demo accounts first.
