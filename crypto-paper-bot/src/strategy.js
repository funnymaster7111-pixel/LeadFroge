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

module.exports = { sma, evaluate };
