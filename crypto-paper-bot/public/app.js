'use strict';

const $ = (id) => document.getElementById(id);
const usd = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signed = (n) => (n >= 0 ? '+' : '-') + usd(Math.abs(n));
const clock = (t) => new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const stamp = (t) => new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const FIELDS = ['fastPeriod', 'slowPeriod', 'feePct', 'slippagePct', 'rsiPeriod', 'rsiBuyBelow', 'rsiSellAbove'];
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
  const useRsi = st.strategy === 'rsi';
  const title = useRsi ? 'RSI Dip-Buying Bot' : 'SMA Crossover Bot';
  $('title').textContent = title;
  document.title = title;
  $('chartTitle').textContent = useRsi ? 'Price' : 'Price & moving averages';
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
  $('lgFastN').textContent = st.fastPeriod;
  $('lgSlowN').textContent = st.slowPeriod;
  $('lgRsiN').textContent = st.rsiPeriod;
  $('lgFastWrap').hidden = $('lgSlowWrap').hidden = useRsi;
  $('lgRsiWrap').hidden = !useRsi;
  const { fast = null, slow = null, rsi = null, ready } = s.signal;
  const money = (v) => (v === null ? '–' : usd(v));
  setText('lgFast', money(fast));
  setText('lgSlow', money(slow));
  setText('lgRsi', rsi === null ? '–' : rsi.toFixed(1));
  if (useRsi) {
    setText('rwL1', `RSI (${st.rsiPeriod})`);
    setText('rwV1', rsi === null ? '–' : rsi.toFixed(1));
    setText('rwL2', 'Buys below');
    setText('rwV2', String(st.rsiBuyBelow));
    setText('rwL3', 'Sells above');
    setText('rwV3', String(st.rsiSellAbove));
    $('rule1').innerHTML = `<b>Buy</b> when RSI closes <i>below</i> ${st.rsiBuyBelow} (a sharp dip).`;
    $('rule2').innerHTML = `<b>Sell</b> everything when RSI closes <i>above</i> ${st.rsiSellAbove} (the rebound).`;
  } else {
    setText('rwL1', `Fast SMA (${st.fastPeriod})`);
    setText('rwV1', money(fast));
    setText('rwL2', `Slow SMA (${st.slowPeriod})`);
    setText('rwV2', money(slow));
    setText('rwL3', 'Gap between them');
    setText('rwV3', ready ? `${fast >= slow ? '+' : ''}${(((fast - slow) / slow) * 100).toFixed(3)}%` : '–');
    $('rule1').innerHTML = '<b>Buy</b> when the fast SMA crosses <i>above</i> the slow SMA.';
    $('rule2').innerHTML = '<b>Sell</b> everything when it crosses back <i>below</i>.';
  }
  setText('rwCrossLabel', useRsi ? 'Last signal' : 'Last crossover');
  const lastClose = s.chart.length ? s.chart[s.chart.length - 1].close : null;
  setText('lgClose', lastClose === null ? '–' : usd(lastClose));
  setText('rwCandle', s.candleClosesIn === null ? '–' : s.candleClosesIn + 's');
  setText('rwNext', s.nextCheckIn === null ? '–' : s.nextCheckIn + 's');
  const KIND = { golden: 'Golden cross ▲', death: 'Death cross ▼', dip: 'Dip ▲', rebound: 'Rebound ▼' };
  setText('rwCross', s.lastCross ? `${KIND[s.lastCross.kind] || 'Signal'} · ${stamp(s.lastCross.t)} · ${s.lastCross.note}` : 'None yet');
  $('rule3').textContent = `Checked once per closed ${st.candleMinutes}-minute candle. Each fill pays ${st.feePct}% fee + ${st.slippagePct}% slippage.`;

  const box = $('signalBox');
  if (!ready) {
    box.className = 'signal';
    setText('signalArrow', '•');
    setText('signalTitle', 'Warming up');
    setText('signalText', useRsi ? `Needs ${st.rsiPeriod + 1} closed candles before it can compute RSI.` : `Needs ${st.slowPeriod} closed candles before it can compare the averages.`);
  } else if (useRsi) {
    box.className = holding ? 'signal up' : rsi < st.rsiBuyBelow ? 'signal down' : 'signal';
    setText('signalArrow', holding ? '▲' : rsi < st.rsiBuyBelow ? '▼' : '•');
    setText('signalTitle', holding ? 'Holding BTC after a dip' : rsi < st.rsiBuyBelow ? `RSI is below ${st.rsiBuyBelow} (dip)` : 'Waiting for a dip');
    setText('signalText', holding ? `Sells when RSI closes above ${st.rsiSellAbove}.` : rsi < st.rsiBuyBelow ? 'Buys if RSI is still below the level when this candle closes.' : `In cash. Buys when RSI closes below ${st.rsiBuyBelow}.`);
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

  $('candleHead').replaceChildren(...(useRsi ? ['Candle', 'Close', 'RSI'] : ['Candle', 'Close', 'Fast SMA', 'Slow SMA']).map((h) => Object.assign(document.createElement('th'), { textContent: h })));
  const rows = $('candleRows');
  rows.replaceChildren(
    ...s.chart.slice(-30).reverse().map((c) => {
      const tr = document.createElement('tr');
      const cells = useRsi ? [stamp(c.t), usd(c.close), c.rsi === null ? '–' : c.rsi.toFixed(1)] : [stamp(c.t), usd(c.close), money(c.fast), money(c.slow)];
      for (const text of cells) {
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
  for (const k of FIELDS) form.elements[k].value = state.settings[k];
  form.elements.strategy.value = state.settings.strategy;
  showStrategyFields();
  $('resetCash').value = state.settings.startingCash;
  $('settingsErr').hidden = true;
  dlg.showModal();
};
function showStrategyFields() {
  const rsi = form.elements.strategy.value === 'rsi';
  $('smaFields').hidden = rsi;
  $('rsiFields').hidden = !rsi;
}
form.elements.strategy.onchange = showStrategyFields;
$('settingsCancel').onclick = () => dlg.close();
const showErr = (err) => {
  $('settingsErr').textContent = err.message;
  $('settingsErr').hidden = false;
};
form.onsubmit = (e) => {
  e.preventDefault();
  const body = { strategy: form.elements.strategy.value };
  for (const k of FIELDS) body[k] = Number(form.elements[k].value);
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
