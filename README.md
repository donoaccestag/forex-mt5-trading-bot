# Forex MT5 Trading Bot

> A production-style TypeScript trading bot for MetaTrader 5 featuring SuperTrend-based entries, Kelly stake sizing, and robust risk management.

<p align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](#)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](#)
[![MetaTrader 5](https://img.shields.io/badge/Platform-MetaTrader%205-0055A4.svg)](#)
[![License](https://img.shields.io/badge/License-MIT-orange.svg)](#)

</p>

---

## Overview

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
>>>>>>> a614eac10b975fa14d1ccfda42f21bb5efcf79b8

This repository is **not a commercial trading system**.

It exists for one reason:

> **To share a real algorithmic trading project instead of endlessly discussing trading theory without showing actual implementation.**

There are thousands of articles explaining indicators.

Thousands more promise profitable strategies.

Very few repositories demonstrate what a production-ready trading system actually looks like.

This project shares the engineering side of algorithmic trading—from signal generation and execution to risk management and operational safety.

---

## A Few Honest Notes

This bot **is not a guaranteed money-making machine.**

Markets change.

Volatility changes.

Strategies stop working.

Execution quality matters.

No indicator remains profitable forever.

I don't hide these realities.

Instead, this repository demonstrates how a real automated trading system should be designed: modular, observable, testable, and focused on controlling risk rather than chasing unrealistic returns.

Think of it as a solid foundation that you can study, extend, and adapt to your own research.

---

## Trading is Mathematics

This project uses **STAKE-MATH**, a Node.js library implementing Kelly-based position sizing.

Trading is fundamentally a probability problem.

Every trade is an expected-value calculation.

Without proper mathematics, position sizing becomes little more than guessing.

This bot uses mathematical models including:

* Kelly Criterion
* Fractional Kelly
* Expected Value (EV)
* Risk-to-Reward calculations
* ATR-based volatility measurement
* Position sizing based on account balance

Over the long run, risk management has a much greater impact than simply finding another indicator.

---

## My Recommendation

If you're exploring algorithmic trading:

* begin with a demo account
* understand every signal before trusting it
* backtest extensively
* forward test before going live
* never increase position size simply because of a winning streak
* risk only what you can afford to lose

Successful trading is built through discipline, not excitement.

Happy Trading ❤️

---

# Features

* 📈 SuperTrend-inspired trend detection
* ✅ Confirmation candle before entry
* 📊 ATR and candle-body quality filters
* 💰 Kelly Criterion position sizing
* 🛡 Maximum risk and exposure controls
* 🚨 Daily drawdown protection
* 🔒 Circuit breaker after repeated failures
* 📝 Structured logging
* 📊 Blessed terminal dashboard
* ⚙️ PM2 deployment support
* 🚀 Fully written in TypeScript

---

# Strategy

The bot follows a trend-following workflow while emphasizing risk management.

```
Market Data
      │
      ▼
Calculate ATR
      │
      ▼
SuperTrend Signal
      │
      ▼
Trend Quality Filter
      │
      ▼
Confirmation Candle
      │
      ▼
Kelly Position Sizing
      │
      ▼
Risk Validation
      │
      ▼
MT5 Order Execution
      │
      ▼
Trade Monitoring
```

Every potential trade passes multiple filters before an order is submitted.

The goal is not to maximize trade frequency, but to improve trade quality.

---

# Risk Management

The trading engine includes several independent safety mechanisms.

* Kelly-based lot sizing
* Maximum simultaneous positions
* Daily drawdown limits
* Maximum account exposure
* ATR volatility filter
* Confirmation candle requirement
* Circuit breaker after consecutive order failures
* Structured error recovery

These controls are intended to reduce catastrophic losses rather than maximize profits.

---

# Kelly Position Sizing

Lot sizing is calculated using **STAKE-MATH**.

Forex trades are mapped into Kelly inputs:

```
bankroll
```

Current account balance.

```
probability
```

Estimated long-term win probability.

```
allInPrice
```

Risk portion of the move.

```
|Entry − Stop Loss|
──────────────────────────────
|Entry − SL| + |TP − Entry|
```

```
kellyFraction
```

Fractional Kelly (default: 0.5)

The returned dollar stake is automatically converted into MT5 lot sizes using each symbol's tick value and contract specifications.

---

# Project Structure

```
src/

├── index.ts
│   └── Main trading loop

├── dataProcessing.ts
│   └── ATR & SuperTrend implementation

├── orderProcessing.ts
│   └── Kelly sizing & order execution

├── timeProcessing.ts
│   └── Candle timing & market sessions

├── config/
│   ├── symbols.ts
│   └── kelly.ts

├── mt5/
│   └── Typed MT5 client

scripts/

└── mt5-bridge.py
    └── Python bridge for MetaTrader5
```

---

# Supported Markets

The bot currently supports **26 major and minor Forex currency pairs**.

Examples include:

* EUR/USD
* GBP/USD
* USD/JPY
* USD/CAD
* AUD/USD
* NZD/USD
* EUR/JPY
* GBP/JPY

Timeframes are configurable through:

```
src/config/symbols.ts
```

---

# Prerequisites

Before running the bot, ensure you have:

* Node.js 18+
* Python 3
* Official MetaTrader5 Python package
* MetaTrader 5 terminal installed
* A demo account for testing

---

# Quick Start

```bash
npm install

npm run build

npm run dev
```

The application will prompt for:

* MT5 Account Number
* Password
* Trading Server

---

# Run with PM2

```bash
npm install -g pm2

mkdir -p logs

npm run build

pm2 start ecosystem.config.cjs
```

View logs:

```bash
pm2 logs forex-bot
```

Useful commands:

```bash
pm2 status

pm2 restart forex-bot

pm2 stop forex-bot

pm2 delete forex-bot
```

---

# Terminal Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│ Account Balance │ Equity │ Daily PnL │ Open Trades │ Status │
├──────────────────────────────────────────────────────────────┤
│ Current Signals          │ Active Positions                │
├──────────────────────────┴──────────────────────────────────┤
│ Equity Curve             │ Risk Metrics                    │
├──────────────────────────────────────────────────────────────┤
│ Orders                   │ Errors                          │
└──────────────────────────────────────────────────────────────┘
```

Structured logs are written under:

```
.state/
```

This keeps operational logs separate from the terminal interface.

---

# Architecture

```
                MT5 Terminal
                     │
                     ▼
              Python RPC Bridge
                     │
                     ▼
              TypeScript Client
                     │
                     ▼
              Market Data Engine
                     │
                     ▼
             SuperTrend Strategy
                     │
                     ▼
              Risk Management
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
 Position Sizing           Order Execution
        │                         │
        └────────────┬────────────┘
                     ▼
          Logging + Dashboard
```

---

# Roadmap

* [ ] Multi-timeframe confirmation
* [ ] Historical backtesting engine
* [ ] Walk-forward optimization
* [ ] Strategy plugin architecture
* [ ] Portfolio risk analysis
* [ ] Web dashboard
* [ ] Telegram notifications
* [ ] Multi-broker support

---

# Contributing

Contributions are welcome.

Whether you're interested in:

* quantitative trading
* MetaTrader automation
* TypeScript
* risk management
* software architecture
* performance optimization

feel free to open an Issue or Pull Request.

---

# Disclaimer

This repository is provided **for educational purposes only**.

Nothing contained here should be interpreted as financial advice.

Trading foreign exchange involves significant financial risk.

Past performance does not guarantee future results.

Always perform your own research, backtesting, and forward testing before trading live capital.

Start with a demo account, understand the strategy thoroughly, and never risk funds you cannot afford to lose.

---

<p align="center">

### Built with ❤️ for algorithmic traders and TypeScript developers.

If this repository helped you learn something new, consider giving it a ⭐.

</p>
