// Color math + shared HTML shell (fonts, CSS tokens, footer disclaimer, in-page fit/audit script).

export const DISCLAIMER =
  'Prescription required. Eligibility determined by a licensed provider. Results vary.';

export const SIZES = {
  feed: { key: 'feed', w: 1080, h: 1080 },
  portrait: { key: 'portrait', w: 1080, h: 1350 },
};

// Max share of the image covered by text before the fitter shrinks headlines.
export const MAX_TEXT_COVERAGE = 0.24;

function parseHex(hex) {
  let h = String(hex).trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`Invalid color "${hex}" (use #RRGGBB)`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

const toHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

export function mix(a, b, t) {
  const A = parseHex(a);
  const B = parseHex(b);
  return toHex(A.map((v, i) => v + (B[i] - v) * t));
}

function luminance(hex) {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

// Push `color` toward black or white until it reaches `min` contrast against `bg`.
function ensureContrast(color, bg, min) {
  const target = luminance(bg) > 0.4 ? '#000000' : '#ffffff';
  let c = color;
  for (let t = 0.05; contrast(c, bg) < min && t <= 1; t += 0.05) c = mix(color, target, t);
  return c;
}

const onColor = (bg) => (contrast('#ffffff', bg) >= contrast('#16181a', bg) ? '#ffffff' : '#16181a');

export function buildTheme(cfg) {
  const { primary, accent, background } = cfg.brandColors;
  const bg = background;
  const ink = ensureContrast(primary, bg, 7);
  const deep = ensureContrast(primary, '#ffffff', 7); // dark panel color
  return {
    primary,
    accent,
    bg,
    ink,
    deep,
    onDeep: onColor(deep),
    onAccent: onColor(accent),
    accentInk: ensureContrast(accent, bg, 3.2),
    accentOnDeep: ensureContrast(accent, deep, 3.2),
    muted: mix(ink, bg, 0.38),
    line: mix(ink, bg, 0.84),
    tint: mix(bg, primary, 0.07),
    tint2: mix(bg, primary, 0.14),
    accentTint: mix(bg, accent, 0.16),
    card: luminance(bg) > 0.85 ? '#ffffff' : mix(bg, '#ffffff', 0.6),
  };
}

function fontLinks(fonts) {
  const fams = [...new Set([fonts.heading, fonts.body])];
  const q = (f) => encodeURIComponent(f).replace(/%20/g, '+');
  // A plain family link always resolves; the weighted one may 400 for single-weight fonts (harmless).
  const plain = fams.map((f) => `family=${q(f)}`).join('&');
  const weighted = fams
    .map((f) =>
      f === 'Fraunces'
        ? 'family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700'
        : `family=${q(f)}:wght@400;500;600;700`
    )
    .join('&');
  return [plain, weighted]
    .map((p) => `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${p}&display=block">`)
    .join('\n');
}

const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:var(--w);height:var(--h);overflow:hidden;background:var(--bg)}
body{-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
.ad{position:relative;width:var(--w);height:var(--h);overflow:hidden;background:var(--bg);color:var(--ink);font-family:var(--body),system-ui,sans-serif}
.stage{position:absolute;left:0;right:0;top:0;bottom:var(--foot);padding:var(--pad)}
.h{font-family:var(--head),Georgia,serif;font-weight:450;letter-spacing:-0.022em;line-height:1.04;font-variation-settings:"opsz" 144}
.h em{font-style:italic;color:var(--accentInk);white-space:nowrap}
.h em.n{font-style:normal}
.kicker{font-size:22px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--accentInk)}
.sub{font-size:31px;line-height:1.36;color:var(--muted)}
.cta{display:inline-flex;align-items:center;gap:14px;align-self:flex-start;background:var(--accent);color:var(--onAccent);font-weight:600;font-size:29px;line-height:1;padding:22px 34px;border-radius:999px;white-space:nowrap}
.cta svg{width:26px;height:26px}
.brand{display:flex;align-items:center;align-self:flex-start;min-height:64px;max-width:100%;flex:none}
.brand img{height:64px;width:auto;max-width:330px;object-fit:contain}
.wordmark{font-family:var(--head),Georgia,serif;font-size:32px;font-weight:500;letter-spacing:-0.01em;line-height:1.1;max-width:640px}
.foot{position:absolute;left:0;right:0;bottom:0;height:var(--foot);display:flex;align-items:center;justify-content:center;padding:0 56px;background:var(--footBg);border-top:1px solid var(--footLine)}
.disclaimer{font-size:20px;line-height:1.25;color:var(--footInk);text-align:center;letter-spacing:.01em}
.icon{display:block}
.lead{flex:.55}
`;

// In-page: shrink [data-fit] text until nothing overflows/overlaps and text coverage is under the cap.
const FIT_SCRIPT = `
(() => {
  const AD = () => document.querySelector('.ad');
  const rectOf = (el) => el.getBoundingClientRect();
  const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const label = (el) => (el.dataset.name || el.className || el.tagName) + ' "' + (el.textContent || '').trim().slice(0, 40) + '"';

  function coverage() {
    const ad = AD(); const box = rectOf(ad); const cell = 4;
    const cols = Math.ceil(box.width / cell), rows = Math.ceil(box.height / cell);
    const grid = new Uint8Array(cols * rows);
    const mark = (r) => {
      const x0 = Math.max(0, Math.floor((r.left - box.left) / cell)), x1 = Math.min(cols, Math.ceil((r.right - box.left) / cell));
      const y0 = Math.max(0, Math.floor((r.top - box.top) / cell)), y1 = Math.min(rows, Math.ceil((r.bottom - box.top) / cell));
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) grid[y * cols + x] = 1;
    };
    const walker = document.createTreeWalker(ad, NodeFilter.SHOW_TEXT);
    let extra = 0;
    for (let n; (n = walker.nextNode());) {
      if (!n.textContent.trim()) continue;
      const p = n.parentElement; const cs = getComputedStyle(p);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
      if (p.closest('svg')) {
        const t = p.closest('text');
        if (t && !t.dataset.counted) { t.dataset.counted = 1; const fs = parseFloat(getComputedStyle(t).fontSize); const k = t.getScreenCTM().a; extra += t.getComputedTextLength() * k * fs * k * 1.25; }
        continue;
      }
      const range = document.createRange(); range.selectNodeContents(n);
      for (const r of range.getClientRects()) mark(r);
    }
    document.querySelectorAll('[data-counted]').forEach((t) => delete t.dataset.counted);
    let on = 0; for (const v of grid) on += v;
    return (on * cell * cell + extra) / (box.width * box.height);
  }

  function audit() {
    const issues = [];
    const ad = AD(); const adBox = rectOf(ad);
    const ts = [...document.querySelectorAll('.t')];
    for (const el of ts) {
      const r = rectOf(el);
      if (r.width === 0 || r.height === 0) continue;
      const bounds = rectOf(el.parentElement.closest('[data-bounds]') || ad);
      const lim = { left: Math.max(bounds.left, adBox.left + 20), right: Math.min(bounds.right, adBox.right - 20), top: Math.max(bounds.top, adBox.top + 16), bottom: Math.min(bounds.bottom, adBox.bottom - 6) };
      if (r.left < lim.left - 1 || r.right > lim.right + 1 || r.top < lim.top - 1 || r.bottom > lim.bottom + 1) issues.push('out of bounds: ' + label(el));
      // Real clipping only: content wider than its box (glyph ink above/below a tight line-height is fine),
      // or taller than a box that hides overflow.
      const cs = getComputedStyle(el);
      const wide = el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0;
      const tall = cs.overflow !== 'visible' && el.scrollHeight > el.clientHeight + 2;
      if (wide || tall) issues.push('text clipped: ' + label(el));
    }
    for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) {
      const a = ts[i], b = ts[j];
      if (a.contains(b) || b.contains(a)) continue;
      if (inter(rectOf(a), rectOf(b)) > 4) issues.push('overlap: ' + label(a) + ' / ' + label(b));
    }
    for (const img of document.images) if (!img.complete || !img.naturalWidth) issues.push('image failed to load: ' + img.src.slice(0, 60));
    return { issues, coverage: coverage(), text: ad.innerText };
  }

  window.__fit = async (maxCov) => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
    const fits = [...document.querySelectorAll('[data-fit]')].map((el) => {
      const base = parseFloat(getComputedStyle(el).fontSize);
      return { el, base, min: base * (+el.dataset.min || 0.62) };
    });
    let scale = 1, r = audit(), steps = 0;
    while ((r.issues.length || r.coverage > maxCov) && steps < 40) {
      scale *= 0.96; steps++;
      let moved = false;
      for (const f of fits) { const s = Math.max(f.min, f.base * scale); if (s < parseFloat(f.el.style.fontSize || f.base) - 0.1) moved = true; f.el.style.fontSize = s + 'px'; }
      if (!moved) break;
      r = audit();
    }
    return { ...r, shrink: Math.round((1 - scale) * 100) };
  };
})();
`;

export function page({ cfg, theme, size, adClass, css, body, footStyle = 'light' }) {
  const foot =
    footStyle === 'dark'
      ? { footBg: theme.deep, footInk: mix(theme.onDeep, theme.deep, 0.28), footLine: mix(theme.onDeep, theme.deep, 0.85) }
      : { footBg: theme.bg, footInk: theme.muted, footLine: theme.line };
  const vars = {
    w: size.w + 'px',
    h: size.h + 'px',
    foot: '78px',
    pad: '72px',
    head: `"${cfg.fonts.heading}"`,
    body: `"${cfg.fonts.body}"`,
    ...theme,
    ...foot,
  };
  const root = Object.entries(vars)
    .map(([k, v]) => `--${k}:${v}`)
    .join(';');
  return `<!doctype html><html><head><meta charset="utf-8">
${fontLinks(cfg.fonts)}
<style>:root{${root}}${BASE_CSS}${css}</style></head>
<body><div class="ad ${adClass} ${size.key}">${body}
<div class="foot"><p class="disclaimer t" data-name="disclaimer">${DISCLAIMER}</p></div></div>
<script>${FIT_SCRIPT}</script></body></html>`;
}
