'use strict';

const BASE = 'https://api.coingecko.com/api/v3';

async function get(path, apiKey) {
  const headers = { accept: 'application/json' };
  if (apiKey) headers['x-cg-demo-api-key'] = apiKey;
  const res = await fetch(BASE + path, { headers, signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    let hint = '';
    if (res.status === 429) hint = ' (rate limited: add a CoinGecko key to .env or raise POLL_SECONDS)';
    if (res.status === 401) hint = ' (check COINGECKO_API_KEY in .env)';
    if (res.status === 404) hint = ' (unknown coin id)';
    throw new Error(`CoinGecko returned HTTP ${res.status}${hint}`);
  }
  return res.json();
}

// Current USD price of one coin.
async function fetchPrice(coinId, apiKey) {
  const data = await get(`/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=usd`, apiKey);
  const price = data && data[coinId] && data[coinId].usd;
  if (!Number.isFinite(price)) throw new Error(`CoinGecko sent no price for "${coinId}"`);
  return price;
}

// Price history as [{ t, price }]. One day comes back at 5-minute spacing,
// 2 to 90 days at hourly spacing.
async function fetchHistory(coinId, days, apiKey) {
  const data = await get(`/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=usd&days=${days}`, apiKey);
  if (!data || !Array.isArray(data.prices)) throw new Error('CoinGecko sent no price history');
  return data.prices.map(([t, price]) => ({ t, price }));
}

module.exports = { fetchPrice, fetchHistory };
