'use strict';
// Usage: npm run backtest -- [days] [rsi|sma]   (1 day = 5-minute candles, 2-90 days = hourly candles)

const fs = require('fs');
const path = require('path');
const { evaluate, rsiSeries } = require('./strategy');
const { PaperBroker } = require('./paperBroker');
const { fetchHistory } = require('./coingecko');
const { usd } = require('./bot');

function run(closes, opts = {}) {
  const { strategy = 'rsi', fastPeriod = 9, slowPeriod = 21, rsiPeriod = 14, rsiBuyBelow = 25, rsiSellAbove = 70 } = opts;
  const { startingCash = 10000, feePct = 0.1, slippagePct = 0.05 } = opts;
  const broker = new PaperBroker(startingCash, feePct, slippagePct);
  const first = strategy === 'rsi' ? rsiPeriod : slowPeriod;
  const rsi = strategy === 'rsi' ? rsiSeries(closes, rsiPeriod) : null;
  for (let i = first; i < closes.length; i++) {
    if (rsi) {
      if (rsi[i] < rsiBuyBelow) broker.buy(closes[i], i);
      else if (rsi[i] > rsiSellAbove) broker.sell(closes[i], i);
      continue;
    }
    const { cross } = evaluate(closes.slice(0, i + 1), fastPeriod, slowPeriod);
    if (cross === 'up') broker.buy(closes[i], i);
    else if (cross === 'down') broker.sell(closes[i], i);
  }
  const last = closes[closes.length - 1];
  return {
    bot: broker.equity(last),
    hold: (startingCash / closes[first]) * last,
    fills: broker.trades.length,
    closedTrades: broker.closedTrades,
    wins: broker.trades.filter((t) => t.pnl > 0).length,
    feesPaid: broker.feesPaid,
  };
}

async function main() {
  const days = Number(process.argv[2]) || 30;
  let key = (process.env.COINGECKO_API_KEY || '').trim();
  try {
    const m = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').match(/^\s*COINGECKO_API_KEY\s*=\s*(\S+)/m);
    if (!key && m) key = m[1];
  } catch {}
  const prices = await fetchHistory('bitcoin', days, key);
  const closes = prices.map((p) => p.price);
  const spacingMin = Math.round((prices[prices.length - 1].t - prices[0].t) / (prices.length - 1) / 60000);
  const strategy = process.argv[3] === 'sma' ? 'sma' : 'rsi';
  const r = run(closes, { strategy });
  const pct = (v) => ((v / 10000 - 1) * 100).toFixed(2) + '%';
  console.log(`BTC, last ${days} day(s), ${closes.length} candles of about ${spacingMin} minutes, ${strategy === 'rsi' ? 'RSI 14 buy below 25 sell above 70' : 'SMA 9/21'}, $10,000 start`);
  console.log(`  Bot:        ${usd(r.bot)} (${pct(r.bot)})`);
  console.log(`  Buy & hold: ${usd(r.hold)} (${pct(r.hold)})`);
  console.log(`  Closed trades: ${r.closedTrades} (${r.wins} profitable), fees paid ${usd(r.feesPaid)}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { run };
