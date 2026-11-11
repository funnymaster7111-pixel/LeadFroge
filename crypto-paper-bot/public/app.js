'use strict';

const $ = (id) => document.getElementById(id);
const usd = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signed = (n) => (n >= 0 ? '+' : '-') + usd(Math.abs(n));
const clock = (t) => new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const stamp = (t) => new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
// The chart library shows UTC, so shift times to show local time on the axis.
const chartTime = (t) => Math.floor(t / 1000) - new Date(t).getTimezoneOffset() * 60;

let state = null;
let priceChart, closeSeries, fastSeries, slowSeries, equityChart, botSeries, holdSeries;

function setText(id, text, cls) {
  const el = $(id);
  el.textContent = text;
  if (cls !== undefined) el.className = el.className.replace(/\b(pos|neg|muted)\b/g, '').trim() + ' ' + cls;
}

function buildCharts() {
  const options = () => ({
    autoSize: true,
    layout: { background: { color: 'transparent' }, textColor: css('--muted'), fontSize: 11 },
    grid: { vertLines: { color: css('--border') }, horzLines: { color: css('--border') } },
    rightPriceScale: { borderColor: css('--border') },
    timeScale: { borderColor: css('--border'), timeVisible: true, secondsVisible: false },
    handleScroll: false,
    handleScale: false,
  });
  if (priceChart) {
    priceChart.remove();
    equityChart.remove();
  }
  priceChart = LightweightCharts.createChart($('priceChart'), options());
  closeSeries = priceChart.addLineSeries({ color: css('--close'), lineWidth: 1 });
  fastSeries = priceChart.addLineSeries({ color: css('--fast'), lineWidth: 2, priceLineVisible: false });
  slowSeries = priceChart.addLineSeries({ color: css('--slow'), lineWidth: 2, priceLineVisible: false });
  equityChart = LightweightCharts.createChart($('equityChart'), options());
  botSeries = equityChart.addLineSeries({ color: css('--fast'), lineWidth: 2 });
  holdSeries = equityChart.addLineSeries({ color: css('--hold'), lineWidth: 1, priceLineVisible: false });
}

// Line data must have strictly increasing times.
function line(points, key) {
  const out = [];
  let last = -Infinity;
  for (const p of points) {
    const time = chartTime(p.t);
    if (p[key] === null || p[key] === undefined || time <= last) continue;
    out.push({ time, value: p[key] });
    last = time;
  }
  return out;
}

function render(s) {
  const st = s.settings;
  const feedName = s.sim ? 'Simulated prices (offline demo)' : 'Live CoinGecko prices';
  $('subtitle').textContent = 'BTC/USD · ' + feedName;
  $('simBadge').hidden = !s.sim;
  $('pauseBtn').textContent = s.paused ? 'Resume trading' : 'Pause trading';

  const start = st.startingCash;
  setText('price', s.price === null ? '–' : usd(s.price));
  setText('priceSub', s.sim ? 'Simulated feed' : 'Live feed');
  setText('equity', usd(s.equity));
  const gain = s.equity - start;
  const gainPct = (gain / start) * 100;
  setText('equitySub', `${gain >= 0 ? '▲' : '▼'} ${signed(gain)} (${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(2)}%)`, gain >= 0 ? 'sub pos' : 'sub neg');
  setText('hold', usd(s.hold));
  const diff = gainPct - (s.hold / start - 1) * 100;
  setText('holdSub', `${diff >= 0 ? '▲' : '▼'} Bot is ${Math.abs(diff).toFixed(2)} pts ${diff >= 0 ? 'ahead' : 'behind'}`, diff >= 0 ? 'sub pos' : 'sub neg');
  const holding = s.position.btc > 0;
  setText('position', holding ? s.position.btc.toFixed(6) + ' BTC' : 'No position');
  setText('positionSub', holding ? `${s.position.open >= 0 ? '▲' : '▼'} ${signed(s.position.open)} open · cost ${usd(s.position.cost)}` : 'All in cash', holding ? (s.position.open >= 0 ? 'sub pos' : 'sub neg') : 'sub muted');
  setText('closed', String(s.closedTrades));
  setText('fees', 'Fees paid ' + usd(s.feesPaid));

  $('chartSub').textContent = `${st.candleMinutes}-minute candles · ${feedName}`;
  for (const id of ['lgFastN', 'rwFastN']) $(id).textContent = st.fastPeriod;
  for (const id of ['lgSlowN', 'rwSlowN']) $(id).textContent = st.slowPeriod;
  const { fast, slow, ready } = s.signal;
  const lastClose = s.chart.length ? s.chart[s.chart.length - 1].close : null;
  setText('lgClose', lastClose === null ? '–' : usd(lastClose));
  for (const id of ['lgFast', 'rwFast']) setText(id, fast === null ? '–' : usd(fast));
  for (const id of ['lgSlow', 'rwSlow']) setText(id, slow === null ? '–' : usd(slow));
  setText('rwGap', ready ? `${fast >= slow ? '+' : ''}${(((fast - slow) / slow) * 100).toFixed(3)}%` : '–');
  setText('rwCandle', s.candleClosesIn === null ? '–' : s.candleClosesIn + 's');
  setText('rwNext', s.nextCheckIn === null ? '–' : s.nextCheckIn + 's');
  setText('rwCross', s.lastCross ? `${s.lastCross.kind === 'golden' ? 'Golden cross ▲' : 'Death cross ▼'} · ${stamp(s.lastCross.t)} · ${s.lastCross.note}` : 'None yet');
  $('rule3').textContent = `Checked once per closed ${st.candleMinutes}-minute candle. Each fill pays ${st.feePct}% fee + ${st.slippagePct}% slippage.`;

  const box = $('signalBox');
  if (!ready) {
    box.className = 'signal';
    setText('signalArrow', '•');
    setText('signalTitle', 'Warming up');
    setText('signalText', `Needs ${st.slowPeriod} closed candles before it can compare the averages.`);
  } else if (fast > slow) {
    box.className = 'signal up';
    setText('signalArrow', '▲');
    setText('signalTitle', 'Fast is above slow (uptrend)');
    setText('signalText', holding ? 'Holding BTC. Sells if the fast SMA crosses back below.' : 'In cash. Buys on the next cross above, after the fast SMA dips below first.');
  } else {
    box.className = 'signal down';
    setText('signalArrow', '▼');
    setText('signalTitle', 'Fast is below slow (downtrend)');
    setText('signalText', holding ? 'Holding BTC. Sells at the next candle close below.' : 'In cash. Buys when the fast SMA crosses above.');
  }

  closeSeries.setData(line(s.chart, 'close'));
  fastSeries.setData(line(s.chart, 'fast'));
  slowSeries.setData(line(s.chart, 'slow'));
  closeSeries.setMarkers(
    s.trades.map((tr) => ({
      time: chartTime(tr.candleT),
      position: tr.side === 'BUY' ? 'belowBar' : 'aboveBar',
      color: css(tr.side === 'BUY' ? '--up' : '--down'),
      shape: tr.side === 'BUY' ? 'arrowUp' : 'arrowDown',
      text: tr.side,
    }))
  );
  priceChart.timeScale().fitContent();
  botSeries.setData(line(s.equityCurve, 'bot'));
  holdSeries.setData(line(s.equityCurve, 'hold'));
  equityChart.timeScale().fitContent();
  setText('lgBot', usd(s.equity));
  setText('lgHold', usd(s.hold));

  const rows = $('candleRows');
  rows.replaceChildren(
    ...s.chart.slice(-30).reverse().map((c) => {
      const tr = document.createElement('tr');
      for (const text of [stamp(c.t), usd(c.close), c.fast === null ? '–' : usd(c.fast), c.slow === null ? '–' : usd(c.slow)]) {
        tr.appendChild(document.createElement('td')).textContent = text;
      }
      return tr;
    })
  );

  const list = $('activity');
  if (s.activity.length) {
    list.replaceChildren(
      ...s.activity.map((a) => {
        const li = document.createElement('li');
        li.appendChild(document.createElement('time')).textContent = clock(a.t);
        const tag = li.appendChild(document.createElement('span'));
        tag.className = 'tag ' + a.type;
        tag.textContent = a.type;
        li.appendChild(document.createElement('span')).textContent = a.message;
        return li;
      })
    );
  }
}

function setConnection(ok, message) {
  $('conn').className = 'pill ' + (ok ? 'ok' : 'bad');
  $('connText').textContent = ok ? 'Connected' : 'Disconnected';
  $('alert').hidden = !message;
  $('alert').textContent = message || '';
}

async function refresh() {
  try {
    const res = await fetch('/api/state', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    state = await res.json();
    render(state);
    if (state.feed.status === 'error') setConnection(false, `Price feed problem: ${state.feed.error}. Retrying.`);
    else setConnection(true, '');
  } catch {
    setConnection(false, 'Lost connection to the bot. Is `npm start` still running? Retrying…');
  }
}

async function post(route, body) {
  const res = await fetch(route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  state = data;
  render(state);
}

$('pauseBtn').onclick = () => state && post(state.paused ? '/api/resume' : '/api/pause').catch(() => {});

const dlg = $('settingsDlg');
const form = $('settingsForm');
$('settingsBtn').onclick = () => {
  if (!state) return;
  for (const k of ['fastPeriod', 'slowPeriod', 'feePct', 'slippagePct']) form.elements[k].value = state.settings[k];
  $('resetCash').value = state.settings.startingCash;
  $('settingsErr').hidden = true;
  dlg.showModal();
};
$('settingsCancel').onclick = () => dlg.close();
const showErr = (err) => {
  $('settingsErr').textContent = err.message;
  $('settingsErr').hidden = false;
};
form.onsubmit = (e) => {
  e.preventDefault();
  const body = {};
  for (const k of ['fastPeriod', 'slowPeriod', 'feePct', 'slippagePct']) body[k] = Number(form.elements[k].value);
  post('/api/settings', body).then(() => dlg.close(), showErr);
};
$('resetBtn').onclick = () => {
  if (!confirm('Reset the paper account? This clears all paper trades.')) return;
  post('/api/reset', { startingCash: Number($('resetCash').value) }).then(() => dlg.close(), showErr);
};

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  buildCharts();
  if (state) render(state);
}
$('themeBtn').onclick = () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem('theme', next);
  } catch {}
  applyTheme(next);
};
let saved = null;
try {
  saved = localStorage.getItem('theme');
} catch {}
applyTheme(saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

refresh();
setInterval(refresh, 1000);
