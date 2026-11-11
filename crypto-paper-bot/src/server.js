'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { Bot } = require('./bot');
const { SimFeed } = require('./sim');
const coingecko = require('./coingecko');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const STATE_FILE = path.join(ROOT, 'data', 'state.json');

// Minimal .env reader so the bot needs no packages.
function loadEnv() {
  let text;
  try {
    text = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}
loadEnv();

const num = (v, fallback) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fallback);
const SIM = process.argv.includes('--sim') || process.env.SIM === '1';
const PORT = num(process.env.PORT, 3000);
const POLL_SECONDS = num(process.env.POLL_SECONDS, 60);
const API_KEY = (process.env.COINGECKO_API_KEY || '').trim();
const COIN = 'bitcoin';

let saveTimer = null;
function scheduleSave() {
  if (SIM || saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
      fs.writeFileSync(STATE_FILE + '.tmp', JSON.stringify(bot));
      fs.renameSync(STATE_FILE + '.tmp', STATE_FILE);
    } catch (err) {
      console.error('Could not save state:', err.message);
    }
  }, 500);
}

// The crossover runs on short candles; RSI dip-buying was tested on hourly ones.
const CANDLE_MINUTES = num(process.env.CANDLE_MINUTES, 5);
const candleMinutesFor = (strategy) => (strategy === 'rsi' ? 60 : CANDLE_MINUTES);

const bot = new Bot(
  {
    strategy: 'rsi',
    fastPeriod: 9,
    slowPeriod: 21,
    rsiPeriod: 14,
    rsiBuyBelow: 25,
    rsiSellAbove: 70,
    candleMinutes: CANDLE_MINUTES,
    startingCash: 10000,
    feePct: 0.1,
    slippagePct: 0.05,
  },
  { onChange: scheduleSave }
);

if (!SIM) {
  try {
    bot.restore(JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Ignoring unreadable saved state:', err.message);
  }
}

bot.settings.candleMinutes = candleMinutesFor(bot.settings.strategy);

const feed = { status: 'starting', error: null, nextCheckAt: null };

// Enough history to fill the indicators: one day for short candles, a week for hourly.
function loadHistory(candleMinutes) {
  const days = candleMinutes >= 60 ? 7 : 1;
  if (SIM) return Promise.resolve(sim.recent(days * 24 * 60));
  return coingecko.fetchHistory(COIN, days, API_KEY);
}
// In sim mode one real second is one simulated minute.
const SIM_TICK_MS = 1000;
let sim = null;
const now = () => (SIM && bot.lastTickAt ? bot.lastTickAt : Date.now());

async function startLive() {
  let delay = POLL_SECONDS * 1000;
  let seeded = false;
  const loop = async () => {
    try {
      if (!seeded) {
        bot.seed(await loadHistory(bot.settings.candleMinutes));
        seeded = true;
        bot.log(Date.now(), 'INFO', `Loaded recent prices (${bot.candles.length} candles)`);
      }
      bot.onTick(Date.now(), await coingecko.fetchPrice(COIN, API_KEY));
      feed.status = 'ok';
      feed.error = null;
      delay = POLL_SECONDS * 1000;
    } catch (err) {
      feed.status = 'error';
      feed.error = err.message;
      delay = Math.min(delay * 2, 5 * 60 * 1000); // back off, retry
      console.error('Price check failed:', err.message);
    }
    feed.nextCheckAt = Date.now() + delay;
    setTimeout(loop, delay);
  };
  await loop();
}

function startSim() {
  sim = new SimFeed();
  sim.history(7 * 24 * 60 - 30);
  loadHistory(bot.settings.candleMinutes).then((points) => bot.seed(points));
  bot.log(sim.t, 'INFO', 'Offline demo started with simulated prices');
  feed.status = 'ok';
  setInterval(() => {
    const { t, price } = sim.next();
    bot.onTick(t, price);
  }, SIM_TICK_MS);
}

function state() {
  const v = bot.view();
  // Countdowns in real seconds, whichever clock the feed runs on.
  const scale = SIM ? SIM_TICK_MS / 60000 : 1;
  const clock = now();
  v.candleClosesIn = v.candleEndsAt ? Math.max(0, Math.round(((v.candleEndsAt - clock) * scale) / 1000)) : null;
  v.nextCheckIn = SIM ? 1 : feed.nextCheckAt ? Math.max(0, Math.round((feed.nextCheckAt - Date.now()) / 1000)) : null;
  v.sim = SIM;
  v.feed = { status: feed.status, error: feed.error };
  v.pollSeconds = SIM ? 1 : POLL_SECONDS;
  return v;
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

function sendJson(res, code, body) {
  res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 10000) reject(new Error('Request too large'));
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Body must be JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Only the dashboard served from this machine may change the bot.
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

async function handlePost(req, res, route) {
  if (!sameOrigin(req)) return sendJson(res, 403, { error: 'Cross-origin requests are not allowed' });
  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    return sendJson(res, 400, { error: err.message });
  }
  if (route === '/api/pause') bot.setPaused(true, now());
  else if (route === '/api/resume') bot.setPaused(false, now());
  else if (route === '/api/reset') {
    const cash = Number(body.startingCash);
    if (!Number.isFinite(cash) || cash < 100 || cash > 1e9) {
      return sendJson(res, 400, { error: 'Starting cash must be between $100 and $1,000,000,000' });
    }
    bot.reset(cash, now());
  } else if (route === '/api/settings') {
    const strategy = body.strategy === undefined ? bot.settings.strategy : body.strategy;
    const pick = (k) => (body[k] === undefined ? bot.settings[k] : Number(body[k]));
    const [fastPeriod, slowPeriod, feePct, slippagePct] = ['fastPeriod', 'slowPeriod', 'feePct', 'slippagePct'].map(pick);
    const [rsiPeriod, rsiBuyBelow, rsiSellAbove] = ['rsiPeriod', 'rsiBuyBelow', 'rsiSellAbove'].map(pick);
    if (!['sma', 'rsi'].includes(strategy)) return sendJson(res, 400, { error: 'Strategy must be "sma" or "rsi"' });
    if (!Number.isInteger(rsiPeriod) || rsiPeriod < 2 || rsiPeriod > 100) {
      return sendJson(res, 400, { error: 'RSI length must be a whole number from 2 to 100' });
    }
    if (![rsiBuyBelow, rsiSellAbove].every(Number.isFinite) || rsiBuyBelow < 1 || rsiSellAbove > 99 || rsiBuyBelow >= rsiSellAbove) {
      return sendJson(res, 400, { error: 'RSI levels must be between 1 and 99, with the buy level below the sell level' });
    }
    if (!Number.isInteger(fastPeriod) || !Number.isInteger(slowPeriod) || fastPeriod < 1 || slowPeriod > 200 || fastPeriod >= slowPeriod) {
      return sendJson(res, 400, { error: 'Averages must be whole numbers with fast smaller than slow (slow at most 200)' });
    }
    if (![feePct, slippagePct].every((n) => Number.isFinite(n) && n >= 0 && n <= 5)) {
      return sendJson(res, 400, { error: 'Fee and slippage must be between 0% and 5%' });
    }
    const patch = { fastPeriod, slowPeriod, feePct, slippagePct, rsiPeriod, rsiBuyBelow, rsiSellAbove };
    if (strategy !== bot.settings.strategy) {
      const candleMinutes = candleMinutesFor(strategy);
      let points;
      try {
        points = await loadHistory(candleMinutes);
      } catch (err) {
        return sendJson(res, 502, { error: `Could not load price history for the new strategy: ${err.message}` });
      }
      bot.switchStrategy({ strategy, candleMinutes }, points, now());
    }
    bot.updateSettings(patch, now());
  } else return sendJson(res, 404, { error: 'Not found' });
  sendJson(res, 200, state());
}

const server = http.createServer((req, res) => {
  const route = new URL(req.url, 'http://localhost').pathname;
  if (req.method === 'POST') return void handlePost(req, res, route);
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
  if (route === '/api/state') return sendJson(res, 200, state());

  let rel;
  try {
    rel = decodeURIComponent(route === '/' ? '/index.html' : route);
  } catch {
    return sendJson(res, 400, { error: 'Bad path' });
  }
  const file = path.join(PUBLIC, rel);
  if (!file.startsWith(PUBLIC + path.sep)) return sendJson(res, 403, { error: 'Forbidden' });
  fs.readFile(file, (err, data) => {
    if (err) return sendJson(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Trading bot running at http://localhost:${PORT}` + (SIM ? ' (offline demo, simulated prices)' : ''));
  if (!SIM && !API_KEY) console.log('No COINGECKO_API_KEY in .env: using the keyless API, which has stricter limits.');
  if (SIM) startSim();
  else startLive();
});
