'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { sma, evaluate } = require('../src/strategy');
const { PaperBroker } = require('../src/paperBroker');
const { Bot } = require('../src/bot');

test('sma averages the last N values', () => {
  assert.strictEqual(sma([1, 2, 3, 4], 2), 3.5);
  assert.strictEqual(sma([1, 2, 3, 4], 2, 1), 1.5);
  assert.strictEqual(sma([1], 2), null);
});

test('evaluate reports golden and death crosses only on the crossing candle', () => {
  assert.strictEqual(evaluate([10, 10, 10, 10, 12], 2, 4).cross, 'up');
  assert.strictEqual(evaluate([10, 10, 10, 10, 12, 13], 2, 4).cross, null);
  assert.strictEqual(evaluate([10, 10, 10, 10, 8], 2, 4).cross, 'down');
});

test('broker charges fee and slippage and tracks profit', () => {
  const b = new PaperBroker(10000, 0.1, 0.05);
  const buy = b.buy(100, 1);
  assert.ok(Math.abs(buy.price - 100.05) < 1e-9);
  assert.ok(Math.abs(buy.qty * buy.price + buy.fee - 10000) < 1e-6);
  assert.strictEqual(b.buy(100, 2), null);
  const sell = b.sell(110, 3);
  assert.ok(Math.abs(b.cash - (buy.qty * 110 * 0.9995 * 0.999)) < 1e-6);
  assert.ok(Math.abs(sell.pnl - (b.cash - 10000)) < 1e-6);
  assert.strictEqual(b.closedTrades, 1);
  assert.strictEqual(b.sell(110, 4), null);
});

test('bot buys on a golden cross at candle close and sells on the death cross', () => {
  const bot = new Bot({ fastPeriod: 2, slowPeriod: 4, candleMinutes: 5, startingCash: 10000, feePct: 0.1, slippagePct: 0.05 });
  const min = 60000;
  let t = 0;
  const candle = (price) => {
    bot.onTick(t, price);
    t += 5 * min;
  };
  [10, 10, 10, 10, 12].forEach(candle);
  assert.strictEqual(bot.broker.btc, 0, 'no trade until the crossing candle closes');
  candle(13); // closes the 12 candle -> golden cross
  assert.ok(bot.broker.btc > 0);
  [13, 9, 5].forEach(candle);
  candle(5);
  assert.strictEqual(bot.broker.btc, 0);
  assert.strictEqual(bot.broker.closedTrades, 1);
  assert.deepStrictEqual(bot.activity.map((a) => a.type), ['TRADE', 'TRADE']);
});

test('paused bot records the cross but does not trade', () => {
  const bot = new Bot({ fastPeriod: 2, slowPeriod: 4, candleMinutes: 5, startingCash: 10000, feePct: 0.1, slippagePct: 0.05 });
  bot.setPaused(true, 0);
  [10, 10, 10, 10, 12, 13].forEach((p, i) => bot.onTick(i * 300000, p));
  assert.strictEqual(bot.broker.btc, 0);
  assert.match(bot.activity.at(-1).message, /Not traded: trading is paused/);
});

test('rsi is low after a run of falls and high after a run of rises', () => {
  const { rsiSeries } = require('../src/strategy');
  const falling = Array.from({ length: 20 }, (_, i) => 100 - i);
  const rising = Array.from({ length: 20 }, (_, i) => 100 + i);
  assert.strictEqual(rsiSeries(falling, 14)[13], null);
  assert.strictEqual(rsiSeries(falling, 14).at(-1), 0);
  assert.strictEqual(rsiSeries(rising, 14).at(-1), 100);
  const mixed = rsiSeries([44, 44.3, 44.1, 43.6, 44.3, 44.8, 45.1, 45.4, 45.8, 46.1, 45.9, 46.0, 45.6, 46.3, 46.3], 14).at(-1);
  assert.ok(mixed > 60 && mixed < 80);
});

test('rsi bot buys the dip and sells the rebound', () => {
  const bot = new Bot({ strategy: 'rsi', rsiPeriod: 3, rsiBuyBelow: 30, rsiSellAbove: 70, candleMinutes: 60, startingCash: 10000, feePct: 0.1, slippagePct: 0.05 });
  const prices = [100, 101, 100, 96, 92, 88, 88, 93, 98, 103, 108, 108];
  prices.forEach((p, i) => bot.onTick(i * 3600000, p));
  assert.strictEqual(bot.broker.closedTrades, 1);
  assert.deepStrictEqual(bot.broker.trades.map((t) => t.side), ['BUY', 'SELL']);
  assert.ok(bot.broker.trades[1].pnl > 0);
  assert.strictEqual(bot.lastCross.kind, 'rebound');
});
