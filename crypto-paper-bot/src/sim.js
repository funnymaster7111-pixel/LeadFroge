'use strict';

// Offline demo feed: a random walk that runs one simulated minute per tick.
class SimFeed {
  constructor(startPrice = 68000) {
    this.price = startPrice;
    this.drift = 0;
    this.t = Date.now() - 24 * 3600 * 1000;
  }

  next() {
    this.drift = this.drift * 0.9 + (Math.random() - 0.5) * 0.0006;
    this.price *= 1 + this.drift + (Math.random() - 0.5) * 0.0012;
    this.t += 60 * 1000;
    return { t: this.t, price: this.price };
  }

  history(minutes) {
    const out = [];
    for (let i = 0; i < minutes; i++) out.push(this.next());
    return out;
  }
}

module.exports = { SimFeed };
