// Shaperz v4 ads: people fill half the frame and bleed off the edges, text fills the rest.
//   node ads/shaperz-v4/build/render.js   -> ads/shaperz-v4/shaperz-v4-<ad>-<feed|story>.png + preview.html
// Run build/prep.py first (it writes photos/*-cut.png).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PHOTOS = path.join(ROOT, 'photos');
const FONTS = path.join(__dirname, 'fonts');

const C = { navy: '#1B2B46', navyDeep: '#121E33', pink: '#E63D7E', pinkDeep: '#C42A68', gold: '#E9B04A', goldDeep: '#B8862C', blush: '#FDD1CB', white: '#FFFFFF' };
const SIZES = { feed: [1080, 1350], story: [1080, 1920] };
// Cutouts are 1680×2130; every person is placed by its rendered width and top-left inside its panel.
const CUT_W = 1680;

const dataUri = (file) => {
  const ext = path.extname(file).slice(1);
  const type = ext === 'woff2' ? 'font/woff2' : `image/${ext}`;
  return `data:${type};base64,${fs.readFileSync(file).toString('base64')}`;
};
const font = (family, file, weight) =>
  `@font-face{font-family:'${family}';src:url(${dataUri(path.join(FONTS, file))}) format('woff2');font-weight:${weight}}`;
const FONT_CSS = [
  font('Anton', 'anton-latin-400-normal.woff2', 400),
  font('Great Vibes', 'great-vibes-latin-400-normal.woff2', 400),
  font('Montserrat', 'montserrat-latin-600-normal.woff2', 600),
  font('Montserrat', 'montserrat-latin-700-normal.woff2', 700),
  font('Montserrat', 'montserrat-latin-800-normal.woff2', 800),
  font('Montserrat', 'montserrat-latin-900-normal.woff2', 900),
].join('\n');

const LOGO = dataUri(path.join(PHOTOS, 'shaperz-logo.png'));
const PERSON = { lynn: dataUri(path.join(PHOTOS, 'lynn-cut.png')), woman249: dataUri(path.join(PHOTOS, 'woman249-cut.png')) };

const check = (bg, fg) => `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="${bg}"/><path d="M11 20.5l6 6 12-13" fill="none" stroke="${fg}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const arrow = (bg, fg) => `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="${bg}"/><path d="M7 12h9m-3.5-4 4 4-4 4" fill="none" stroke="${fg}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const sparkle = (color, size) => `<svg class="spark" viewBox="0 0 24 24" style="width:${size}px;height:${size}px"><path d="M12 0c.6 6.2 5.8 11.4 12 12-6.2.6-11.4 5.8-12 12-.6-6.2-5.8-11.4-12-12C6.2 11.4 11.4 6.2 12 0z" fill="${color}"/></svg>`;

const BASE_CSS = `
${FONT_CSS}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:var(--w);height:var(--h);overflow:hidden}
body{font-family:'Montserrat',sans-serif;position:relative;-webkit-font-smoothing:antialiased}
.panel{position:absolute;overflow:hidden}
.panel .person{position:absolute;max-width:none}
.circle{position:absolute;border-radius:50%}
.text{position:absolute;display:flex;flex-direction:column;justify-content:space-between;z-index:3}
.logo{width:150px;height:150px;border-radius:50%;box-shadow:0 8px 22px rgba(0,0,0,.25)}
.script{font-family:'Great Vibes',cursive;line-height:.9}
.anton{font-family:'Anton',sans-serif;text-transform:uppercase;line-height:.92;letter-spacing:.005em}
.checks{list-style:none;display:grid;gap:18px}
.checks li{display:flex;gap:16px;align-items:flex-start;font-weight:800;line-height:1.18}
.checks svg{flex:0 0 auto;margin-top:.04em}
.cta{display:inline-flex;align-items:center;gap:14px;border-radius:999px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;box-shadow:0 12px 28px rgba(0,0,0,.28);align-self:flex-start;white-space:nowrap}
.addr{font-weight:700;letter-spacing:.01em;opacity:.92}
.badge{position:relative;border-radius:50%;background:radial-gradient(circle at 35% 30%, #F7D27E, ${C.gold} 55%, ${C.goldDeep});display:flex;flex-direction:column;align-items:center;justify-content:center;color:${C.navy};text-align:center;box-shadow:0 10px 26px rgba(0,0,0,.3), inset 0 0 0 6px rgba(255,255,255,.35)}
.badge b{font-family:'Anton';font-weight:400;line-height:.95}
.badge span{font-weight:900;text-transform:uppercase;letter-spacing:.08em;line-height:1.2}
.spark{position:absolute;z-index:2}
`;

const badge = (size) => `<div class="badge" style="width:${size}px;height:${size}px">
  <span style="font-size:${size * 0.085}px">Best of</span><b style="font-size:${size * 0.34}px">2025</b>
  <span style="font-size:${size * 0.07}px">Medical Spa</span><span style="font-size:${size * 0.07}px">South Side</span></div>`;
const checks = (items, size, bg, fg, color) =>
  `<ul class="checks" style="font-size:${size}px;color:${color}">${items.map((t) => `<li>${check(bg, fg).replace('<svg', `<svg style="width:${size * 1.2}px;height:${size * 1.2}px"`)}<span>${t}</span></li>`).join('')}</ul>`;
const cta = (label, size, bg, fg) =>
  `<div class="cta" style="background:${bg};color:${fg};font-size:${size}px;padding:${size * 0.95}px ${size * 1.35}px">${label} ${arrow(fg, bg).replace('<svg', `<svg style="width:${size * 1.25}px;height:${size * 1.25}px"`)}</div>`;
const ADDRESS = '3135 W. 111th St, Chicago · FSA / HSA accepted';

// panel: {x,y,w,h,bg}; person: {name,w,x,y} (x,y inside the panel); circle: {x,y,d,color} inside the panel.
function personPanel(p) {
  const circle = p.circle ? `<div class="circle" style="left:${p.circle.x}px;top:${p.circle.y}px;width:${p.circle.d}px;height:${p.circle.d}px;background:${p.circle.color}"></div>` : '';
  return `<div class="panel" style="left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;background:${p.bg}">${circle}
    <img class="person" src="${PERSON[p.person.name]}" style="width:${p.person.w}px;left:${p.person.x}px;top:${p.person.y}px"></div>`;
}

function page(size, bg, body) {
  const [w, h] = SIZES[size];
  return `<!doctype html><html><head><meta charset="utf-8"><style>:root{--w:${w}px;--h:${h}px}${BASE_CSS}</style></head>
<body style="background:${bg}">${body}</body></html>`;
}

const ADS = [
  {
    // Ad 1: Medical Weight Loss on 111th St, now with Lynn (the provider) instead of a stock model.
    id: 'ad1-medical', bg: C.navy,
    feed: {
      panel: { x: 540, y: 0, w: 540, h: 1350, bg: C.pink, circle: { x: 40, y: 60, d: 640, color: '#F0679B' }, person: { name: 'lynn', w: 1100, x: -437, y: -30 } },
      text: { x: 60, y: 54, w: 460, h: 1242 },
      sizes: { script: 120, anton: 150, anton2: 64, lead: 25, checks: 27, cta: 23, addr: 19, badge: 0 },
    },
    story: {
      panel: { x: 0, y: 960, w: 1080, h: 960, bg: C.pink, circle: { x: 380, y: 60, d: 760, color: '#F0679B' }, person: { name: 'lynn', w: 1100, x: 0, y: -40 } },
      text: { x: 64, y: 150, w: 952, h: 770, split: 470 },
      sizes: { script: 130, anton: 160, anton2: 72, lead: 30, checks: 34, cta: 24, addr: 21, badge: 0 },
    },
    body: (s, z) => [`
      <div>
        <img class="logo" src="${LOGO}">
        <div style="margin-top:${z.script * 0.25}px;position:relative">
          <div class="script" style="font-size:${z.script}px;color:${C.gold}">Medical</div>
          <div class="anton" style="font-size:${z.anton}px;color:${C.white};margin-top:4px">Weight<br>Loss</div>
          <div class="anton" style="font-size:${z.anton2}px;color:${C.pink};margin-top:10px">on 111th St</div>
        </div>
      </div>`, `
      <p style="font-weight:700;font-size:${z.lead}px;color:${C.white};line-height:1.35">Led by Lynn St. Victor-Luckett, FNP-BC, nurse practitioner</p>
      ${checks(['Semaglutide &amp; tirzepatide', 'Shots or pills', 'FSA / HSA accepted'], z.checks, C.gold, C.navy, C.white)}
      ${cta('Book Free Consult', z.cta, C.gold, C.navy)}
      <div class="addr" style="font-size:${z.addr}px;color:${C.white}">${ADDRESS}</div>`],
  },
  {
    // Ad 2: $249 first month offer.
    id: 'ad2-offer', bg: C.pink,
    feed: {
      panel: { x: 0, y: 0, w: 540, h: 1350, bg: C.navy, circle: { x: -160, y: 120, d: 760, color: '#26395C' }, person: { name: 'woman249', w: 1070, x: -100, y: 10 } },
      text: { x: 590, y: 54, w: 440, h: 1242 },
      sizes: { pill: 22, price: 250, month: 96, checks: 28, cta: 23, addr: 18 },
    },
    story: {
      panel: { x: 0, y: 960, w: 1080, h: 960, bg: C.navy, circle: { x: -120, y: 40, d: 860, color: '#26395C' }, person: { name: 'woman249', w: 1060, x: -60, y: -90 } },
      text: { x: 64, y: 150, w: 952, h: 770, split: 480 },
      sizes: { pill: 24, price: 260, month: 100, checks: 34, cta: 26, addr: 21 },
    },
    body: (s, z) => [`
      <img class="logo" src="${LOGO}">
      <div>
        <div style="display:inline-block;background:${C.white};color:${C.pink};font-weight:900;font-size:${z.pill}px;letter-spacing:.06em;padding:12px 22px;border-radius:999px;text-transform:uppercase;white-space:nowrap">Medical Weight Loss</div>
        <div class="anton" style="font-size:${z.price}px;color:${C.navy};line-height:.86;margin-top:18px">$249</div>
        <div class="anton" style="font-size:${z.month}px;color:${C.white};margin-top:6px">First Month</div>
      </div>`, `
      ${checks(['Labs + hormone review', 'ShapeScale 3D body scan', 'Meal plan + exercise guidance', '60-min visit with your NP'], z.checks, C.navy, C.white, C.white)}
      ${cta('Claim Your Spot', z.cta, C.navy, C.white)}
      <div class="addr" style="font-size:${z.addr}px;color:${C.white}">${ADDRESS}</div>`],
  },
  {
    // Ad 3: Meet Lynn.
    id: 'ad3-provider', bg: C.blush,
    feed: {
      panel: { x: 540, y: 0, w: 540, h: 1350, bg: C.navy, circle: { x: 30, y: 70, d: 640, color: '#E86C9A' }, person: { name: 'lynn', w: 1100, x: -437, y: -30 } },
      text: { x: 60, y: 54, w: 450, h: 1242 },
      sizes: { script: 150, anton: 250, sub: 30, checks: 29, cta: 23, addr: 18, badge: 190 },
    },
    story: {
      panel: { x: 0, y: 960, w: 1080, h: 960, bg: C.navy, circle: { x: 380, y: 60, d: 760, color: '#E86C9A' }, person: { name: 'lynn', w: 1100, x: 0, y: -40 } },
      text: { x: 64, y: 150, w: 952, h: 770, split: 470 },
      sizes: { script: 150, anton: 250, sub: 30, checks: 32, cta: 24, addr: 21, badge: 210 },
    },
    body: (s, z) => [`
      <div>
        <img class="logo" src="${LOGO}">
        <div class="script" style="font-size:${z.script}px;color:${C.pink};margin-top:${z.script * 0.2}px">Meet</div>
        <div class="anton" style="font-size:${z.anton}px;color:${C.navy};margin-top:-6px">Lynn</div>
        <p style="font-weight:900;font-size:${z.sub}px;color:${C.navy};line-height:1.2;text-transform:uppercase;letter-spacing:.02em;margin-top:14px">Your weight loss<br>nurse practitioner</p>
      </div>`, `
      ${checks(['Nearly 30 years in practice', '60-minute first visit', 'Right here on 111th St'], z.checks, C.pink, C.white, C.navy)}
      ${cta('Book Free Consult', z.cta, C.navy, C.white)}
      ${z.badge ? badge(z.badge) : ''}
      <div class="addr" style="font-size:${z.addr}px;color:${C.navy}">${ADDRESS}</div>`],
  },
];

function adHtml(ad, size) {
  const L = ad[size];
  const t = L.text;
  const [left, right] = ad.body(size, L.sizes);
  const box = `left:${t.x}px;top:${t.y}px;width:${t.w}px;height:${t.h}px`;
  const text = size === 'feed'
    ? `<div class="text" style="${box}">${left}${right}</div>`
    : `<div style="position:absolute;${box};display:flex;gap:40px;z-index:3">
        <div class="text" style="position:relative;flex:0 0 ${t.split}px;height:100%">${left}</div>
        <div class="text" style="position:relative;flex:1;height:100%;padding-top:110px">${right}</div></div>`;
  return page(size, ad.bg, personPanel(L.panel) + text);
}

function previewHtml(files) {
  return `<!doctype html><meta charset="utf-8"><title>Shaperz v4 ads</title>
<style>body{font-family:system-ui;background:#eef0f4;margin:24px}div{display:flex;gap:16px;align-items:flex-start;margin-bottom:24px}img{width:360px;box-shadow:0 4px 18px rgba(0,0,0,.15)}</style>
${ADS.map((ad) => `<h2>${ad.id}</h2><div>${files.filter((f) => f.includes(`-${ad.id}-`)).map((f) => `<img src="${f}">`).join('')}</div>`).join('\n')}`;
}

(async () => {
  const browser = await chromium.launch();
  const files = [];
  for (const ad of ADS) {
    for (const size of Object.keys(SIZES)) {
      const [width, height] = SIZES[size];
      const p = await browser.newPage({ viewport: { width, height } });
      await p.setContent(adHtml(ad, size), { waitUntil: 'load' });
      await p.evaluate(() => document.fonts.ready);
      const file = `shaperz-v4-${ad.id}-${size}.png`;
      await p.screenshot({ path: path.join(ROOT, file) });
      await p.close();
      files.push(file);
      console.log('wrote', file);
    }
  }
  fs.writeFileSync(path.join(ROOT, 'preview.html'), previewHtml(files));
  await browser.close();
})();
