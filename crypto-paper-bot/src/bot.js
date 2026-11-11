'use strict';

const { evaluate, sma, rsiSeries } = require('./strategy');
const { PaperBroker } = require('./paperBroker');

const MAX_CANDLES = 600;
const MAX_EQUITY_POINTS = 3000;
const MAX_ACTIVITY = 200;

const usd = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

class Bot {
  constructor(settings, { onChange } = {}) {
    this.settings = { ...settings };
    this.onChange = onChange || (() => {});
    this.broker = new PaperBroker(settings.startingCash, settings.feePct, settings.slippagePct);
    this.candles = []; // closed candles: { t, close }
    this.current = null; // candle still forming
    this.lastPrice = null;
    this.lastTickAt = null;
    this.holdBtc = null; // buy & hold comparison: BTC bought with the starting cash at the first price
    this.equityCurve = [];
    this.activity = [];
    this.lastCross = null;
    this.paused = false;
  }

  get candleMs() {
    return this.settings.candleMinutes * 60 * 1000;
  }

  log(t, type, message) {
    this.activity.push({ t, type, message });
    if (this.activity.length > MAX_ACTIVITY) this.activity.shift();
  }

  // Seed closed candles from history so the averages are ready immediately.
  // No trades are placed on historical candles.
  seed(points) {
    for (const { t, price } of points) this.addPrice(t, price, false);
  }

  // Switch strategy and candle length together, rebuilding candles from history.
  switchStrategy(patch, points, now) {
    Object.assign(this.settings, patch);
    this.candles = [];
    this.current = null;
    this.seed(points);
    this.lastCross = null;
    const name = patch.strategy === 'rsi' ? 'RSI dip-buying' : 'SMA crossover';
    this.log(now, 'INFO', `Strategy switched to ${name} on ${patch.candleMinutes}-minute candles`);
    this.onChange();
  }

  onTick(t, price) {
    this.lastPrice = price;
    this.lastTickAt = t;
    if (this.holdBtc === null) this.holdBtc = this.broker.startingCash / price;
    this.addPrice(t, price, true);
    this.equityCurve.push({ t, bot: this.broker.equity(price), hold: this.holdBtc * price });
    if (this.equityCurve.length > MAX_EQUITY_POINTS) this.equityCurve.shift();
    this.onChange();
  }

  addPrice(t, price, live) {
    const bucket = Math.floor(t / this.candleMs) * this.candleMs;
    if (this.current && bucket > this.current.t) {
      this.candles.push(this.current);
      if (this.candles.length > MAX_CANDLES) this.candles.shift();
      const closed = this.current;
      this.current = { t: bucket, close: price };
      if (live) this.onCandleClose(closed, t);
    } else if (!this.current || bucket === this.current.t) {
      this.current = { t: bucket, close: price };
    }
  }

  onCandleClose(candle, now) {
    const st = this.settings;
    const closes = this.candles.map((c) => c.close);
    let buy;
    let kind;
    let what;
    if (st.strategy === 'rsi') {
      const value = rsiSeries(closes, st.rsiPeriod)[closes.length - 1];
      if (value === null) return;
      const holding = this.broker.btc > 0;
      if (!holding && value < st.rsiBuyBelow) {
        buy = true;
        kind = 'dip';
        what = `RSI(${st.rsiPeriod}) fell to ${value.toFixed(1)}, below ${st.rsiBuyBelow}.`;
      } else if (holding && value > st.rsiSellAbove) {
        buy = false;
        kind = 'rebound';
        what = `RSI(${st.rsiPeriod}) rose to ${value.toFixed(1)}, above ${st.rsiSellAbove}.`;
      } else return;
    } else {
      const { fastPeriod: f, slowPeriod: s } = st;
      const ev = evaluate(closes, f, s);
      if (!ev.cross) return;
      buy = ev.cross === 'up';
      kind = buy ? 'golden' : 'death';
      what = buy
        ? `Golden cross: fast SMA(${f}) crossed above slow SMA(${s}).`
        : `Death cross: fast SMA(${f}) crossed below slow SMA(${s}).`;
    }
    let trade = null;
    let note;
    if (this.paused) note = 'Not traded: trading is paused';
    else if (buy) {
      trade = this.broker.buy(candle.close, now);
      note = trade ? `BUY ${trade.qty.toFixed(6)} BTC at ${usd(trade.price)}` : 'Not traded: already holding BTC';
    } else {
      trade = this.broker.sell(candle.close, now);
      note = trade
        ? `SELL ${trade.qty.toFixed(6)} BTC at ${usd(trade.price)} (${trade.pnl >= 0 ? '+' : '-'}${usd(Math.abs(trade.pnl))})`
        : 'Not traded: no BTC to sell';
    }
    if (trade) trade.candleT = candle.t;
    this.lastCross = { t: now, kind, note };
    this.log(now, trade ? 'TRADE' : 'CROSS', `${what} ${note}`);
  }

  setPaused(paused, now) {
    if (this.paused === paused) return;
    this.paused = paused;
    this.log(now, 'INFO', paused ? 'Trading paused' : 'Trading resumed');
    this.onChange();
  }

  reset(startingCash, now) {
    this.settings.startingCash = startingCash;
    this.broker = new PaperBroker(startingCash, this.settings.feePct, this.settings.slippagePct);
    this.holdBtc = this.lastPrice ? startingCash / this.lastPrice : null;
    this.equityCurve = [];
    this.lastCross = null;
    this.log(now, 'INFO', `Paper account reset with ${usd(startingCash)}`);
    this.onChange();
  }

  updateSettings(patch, now) {
    Object.assign(this.settings, patch);
    const st = this.settings;
    this.broker.feePct = st.feePct;
    this.broker.slippagePct = st.slippagePct;
    const rule = st.strategy === 'rsi' ? `RSI(${st.rsiPeriod}) buy below ${st.rsiBuyBelow}, sell above ${st.rsiSellAbove}` : `SMA ${st.fastPeriod}/${st.slowPeriod}`;
    this.log(now, 'INFO', `Settings saved: ${rule}, fee ${st.feePct}%, slippage ${st.slippagePct}%`);
    this.onChange();
  }

  // Everything the dashboard needs.
  view() {
    const { fastPeriod: f, slowPeriod: s } = this.settings;
    const closes = this.candles.map((c) => c.close);
    const useRsi = this.settings.strategy === 'rsi';
    const rsi = useRsi ? rsiSeries(closes, this.settings.rsiPeriod) : null;
    const fast = useRsi ? null : sma(closes, f);
    const slow = useRsi ? null : sma(closes, s);
    const lastRsi = useRsi && closes.length ? rsi[closes.length - 1] : null;
    const price = this.lastPrice;
    const b = this.broker;
    const from = Math.max(0, this.candles.length - 300);
    const chart = [];
    for (let i = from; i < this.candles.length; i++) {
      chart.push({ t: this.candles[i].t, close: closes[i], fast: useRsi ? null : sma(closes, f, i), slow: useRsi ? null : sma(closes, s, i), rsi: useRsi ? rsi[i] : null });
    }
    return {
      settings: this.settings,
      paused: this.paused,
      price,
      lastTickAt: this.lastTickAt,
      equity: price === null ? b.cash : b.equity(price),
      hold: price === null || this.holdBtc === null ? b.startingCash : this.holdBtc * price,
      position: { btc: b.btc, cost: b.cost, open: price === null ? 0 : b.btc * price - b.cost },
      closedTrades: b.closedTrades,
      feesPaid: b.feesPaid,
      signal: useRsi ? { rsi: lastRsi, ready: lastRsi !== null } : { fast, slow, ready: fast !== null && slow !== null },
      candleEndsAt: this.current ? this.current.t + this.candleMs : null,
      lastCross: this.lastCross,
      chart,
      trades: b.trades.filter((tr) => tr.candleT >= (chart[0] ? chart[0].t : 0)),
      equityCurve: this.equityCurve,
      activity: this.activity.slice(-60).reverse(),
    };
  }

  toJSON() {
    const { settings, paused, holdBtc, equityCurve, activity, lastCross } = this;
    return { settings, paused, holdBtc, equityCurve, activity, lastCross, broker: this.broker.toJSON() };
  }

  restore(saved) {
    if (!saved || typeof saved !== 'object') return;
    for (const k of ['fastPeriod', 'slowPeriod', 'feePct', 'slippagePct', 'startingCash', 'rsiPeriod', 'rsiBuyBelow', 'rsiSellAbove']) {
      if (saved.settings && Number.isFinite(saved.settings[k])) this.settings[k] = saved.settings[k];
    }
    if (saved.settings && ['sma', 'rsi'].includes(saved.settings.strategy)) this.settings.strategy = saved.settings.strategy;
    this.broker.feePct = this.settings.feePct;
    this.broker.slippagePct = this.settings.slippagePct;
    if (saved.broker) this.broker.restore(saved.broker);
    this.paused = !!saved.paused;
    if (Number.isFinite(saved.holdBtc)) this.holdBtc = saved.holdBtc;
    if (Array.isArray(saved.equityCurve)) this.equityCurve = saved.equityCurve;
    if (Array.isArray(saved.activity)) this.activity = saved.activity;
    if (saved.lastCross) this.lastCross = saved.lastCross;
  }
}

module.exports = { Bot, usd };
