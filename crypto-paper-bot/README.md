# SMA Crossover Bot (paper trading)

A Bitcoin trading bot that trades pretend money on live CoinGecko prices and shows everything on a local dashboard. It needs Node.js 18 or newer and no other packages.

## Run it

1. Copy `.env.example` to `.env` and paste a CoinGecko key after `COINGECKO_API_KEY=`. The free demo key works. It also runs without a key, with stricter rate limits.
2. Start it:

   ```
   npm start
   ```

3. Open http://localhost:3000.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run sim` | Offline demo on simulated prices, one simulated minute per second. Nothing is saved. |
| `npm run backtest -- 90` | Replays the strategy over the last 90 days of real prices and compares it with buy and hold. `1` gives 5-minute candles, `2` to `90` give hourly candles. |
| `npm test` | Unit tests. |

## What it does

- **Strategy** (`src/strategy.js`): 5-minute candles, a 9-candle average as the fast one and a 21-candle average as the slow one. It buys when the fast average crosses above the slow one and sells everything when it crosses back below. It only checks when a candle closes.
- **Paper trading** (`src/paperBroker.js`): starts with $10,000 of pretend money. Each trade pays a 0.1% fee and 0.05% slippage. It holds at most one position and never sells short.
- **Data** (`src/coingecko.js`): on startup it loads the last day of prices so the averages are ready, then checks the live price every 60 seconds. No trades are placed on the loaded history.
- **Dashboard** (`public/`): price chart with both averages and buy/sell arrows, bot equity against buy and hold, the current signal, an activity log, pause and resume, settings, account reset, and light and dark themes.

The paper account is saved in `data/state.json`, so it survives a restart.

## Settings

The averages, fee and slippage can be changed from the Settings button. These are set in `.env`:

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3000` | Dashboard port |
| `POLL_SECONDS` | `60` | Seconds between price checks |
| `CANDLE_MINUTES` | `5` | Candle length |

A price check every 60 seconds is about 43,000 API calls a month. If your CoinGecko plan allows fewer, raise `POLL_SECONDS` (300 is about 8,600 a month).

## Before using real money

This bot places no real orders and has no exchange connection. Run `npm run backtest` first: a moving-average crossover often does worse than simply holding Bitcoin once fees are counted.

The chart library in `public/vendor/` is TradingView Lightweight Charts (Apache 2.0).
