'use strict';

// Pretend-money account. Long only, one position at a time, all-in / all-out.
class PaperBroker {
  constructor(startingCash, feePct, slippagePct) {
    this.startingCash = startingCash;
    this.cash = startingCash;
    this.btc = 0;
    this.cost = 0; // cash spent to open the current position, fees included
    this.feesPaid = 0;
    this.closedTrades = 0;
    this.trades = []; // every fill, oldest first
    this.feePct = feePct;
    this.slippagePct = slippagePct;
  }

  equity(price) {
    return this.cash + this.btc * price;
  }

  buy(price, t) {
    if (this.btc > 0 || this.cash <= 0) return null;
    const fill = price * (1 + this.slippagePct / 100);
    const feeRate = this.feePct / 100;
    const notional = this.cash / (1 + feeRate);
    const fee = notional * feeRate;
    const qty = notional / fill;
    this.cost = this.cash;
    this.cash = 0;
    this.btc = qty;
    this.feesPaid += fee;
    const trade = { t, side: 'BUY', qty, price: fill, fee };
    this.trades.push(trade);
    return trade;
  }

  sell(price, t) {
    if (this.btc <= 0) return null;
    const fill = price * (1 - this.slippagePct / 100);
    const notional = this.btc * fill;
    const fee = notional * (this.feePct / 100);
    const proceeds = notional - fee;
    const trade = { t, side: 'SELL', qty: this.btc, price: fill, fee, pnl: proceeds - this.cost };
    this.cash = proceeds;
    this.btc = 0;
    this.cost = 0;
    this.feesPaid += fee;
    this.closedTrades += 1;
    this.trades.push(trade);
    return trade;
  }

  toJSON() {
    const { startingCash, cash, btc, cost, feesPaid, closedTrades, trades } = this;
    return { startingCash, cash, btc, cost, feesPaid, closedTrades, trades };
  }

  restore(saved) {
    for (const k of ['startingCash', 'cash', 'btc', 'cost', 'feesPaid', 'closedTrades']) {
      if (Number.isFinite(saved[k])) this[k] = saved[k];
    }
    if (Array.isArray(saved.trades)) this.trades = saved.trades;
  }
}

module.exports = { PaperBroker };
