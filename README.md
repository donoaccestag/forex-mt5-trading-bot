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
| `src/dataProcessing.ts` | Indicator logic and ATR handling |
| `src/orderProcessing.ts` | Order execution and execution safety |
| `src/errorHandling.ts` | Guarded async execution, retry logic, trace IDs |
| `src/logging.ts` | Structured event and circuit-breaker state |
| `src/ui/dashboard.ts` | Terminal dashboard |
| `src/config/` | Strategy and risk parameters |
| `scripts/mt5-bridge.py` | MetaTrader 5 Python bridge |

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
