'use strict';

// Simple moving average of the `period` values ending at index `end` (inclusive).
function sma(values, period, end = values.length - 1) {
  if (period < 1 || end + 1 < period) return null;
  let sum = 0;
  for (let i = end - period + 1; i <= end; i++) sum += values[i];
  return sum / period;
}

// Looks at the last two closed candles and reports whether the fast average
// just crossed the slow one. `cross` is 'up' (golden), 'down' (death) or null.
function evaluate(closes, fastPeriod, slowPeriod) {
  const last = closes.length - 1;
  const fast = sma(closes, fastPeriod, last);
  const slow = sma(closes, slowPeriod, last);
  const prevFast = sma(closes, fastPeriod, last - 1);
  const prevSlow = sma(closes, slowPeriod, last - 1);
  let cross = null;
  if (fast !== null && slow !== null && prevFast !== null && prevSlow !== null) {
    if (prevFast <= prevSlow && fast > slow) cross = 'up';
    else if (prevFast >= prevSlow && fast < slow) cross = 'down';
  }
  return { fast, slow, cross, ready: fast !== null && slow !== null };
}

// Relative Strength Index (Wilder's smoothing) for every candle; null until
// there are `period` price changes. Low values mean a sharp recent drop.
function rsiSeries(closes, period) {
  const out = new Array(closes.length).fill(null);
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const up = Math.max(change, 0);
    const down = Math.max(-change, 0);
    if (i <= period) {
      gain += up / period;
      loss += down / period;
    } else {
      gain = (gain * (period - 1) + up) / period;
      loss = (loss * (period - 1) + down) / period;
    }
    if (i >= period) out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

module.exports = { sma, evaluate, rsiSeries };
