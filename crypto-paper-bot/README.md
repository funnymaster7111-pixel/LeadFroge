# Crypto trading bot (paper trading)

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
| `npm run backtest -- 30` | Replays the RSI strategy over the last 30 days of real prices and compares it with buy and hold. Add `sma` for the crossover: `npm run backtest -- 30 sma`. `1` day gives 5-minute candles, `2` to `90` give hourly candles. |
| `npm test` | Unit tests. |

## What it does

- **Strategies** (`src/strategy.js`), switched from the Settings button. Both only act when a candle closes.
  - **RSI dip-buying (default):** hourly candles and a 14-candle RSI. It buys when RSI closes below 25, which marks a sharp drop, and sells everything when RSI closes above 70.
  - **SMA crossover:** 5-minute candles, a 9-candle average and a 21-candle average. It buys when the fast average crosses above the slow one and sells everything when it crosses back below.
- **Paper trading** (`src/paperBroker.js`): starts with $10,000 of pretend money. Each trade pays a 0.1% fee and 0.05% slippage. It holds at most one position and never sells short.
- **Data** (`src/coingecko.js`): on startup it loads recent prices (a week for hourly candles, a day for 5-minute ones) so the indicators are ready, then checks the live price every 60 seconds. No trades are placed on the loaded history.
- **Dashboard** (`public/`): price chart with both averages and buy/sell arrows, bot equity against buy and hold, the current signal, an activity log, pause and resume, settings, account reset, and light and dark themes.

The paper account is saved in `data/state.json`, so it survives a restart.

## Settings

The strategy, its levels, the fee and the slippage can be changed from the Settings button. These are set in `.env`:

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3000` | Dashboard port |
| `POLL_SECONDS` | `60` | Seconds between price checks |
| `CANDLE_MINUTES` | `5` | Candle length for the SMA crossover (RSI always uses hourly candles) |

A price check every 60 seconds is about 43,000 API calls a month. If your CoinGecko plan allows fewer, raise `POLL_SECONDS` (300 is about 8,600 a month).

## Before using real money

This bot places no real orders and has no exchange connection.

The default RSI levels were chosen by looking back at recent prices, so their backtest is flattering by construction. On Bitcoin on 11 Nov 2026:

| Period | RSI 14, buy below 25, sell above 70 | Buy and hold | Closed trades |
| --- | --- | --- | --- |
| Last 30 days | +3.15% | -10.73% | 2 |
| Last 90 days | +4.36% | +18.58% | 4 |

Two to four trades cannot separate skill from luck. Let it paper trade for several weeks and compare it with buy and hold before trusting it.

The chart library in `public/vendor/` is TradingView Lightweight Charts (Apache 2.0).
