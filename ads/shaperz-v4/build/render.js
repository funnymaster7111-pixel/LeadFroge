// Shaperz v4 ads, in the Novaleo v4 style: navy ground, person cut out on a pink disc with gold ring + arc,
// bleeding off the side and into the address band; text column with pill, headline, checks, CTA, proof row.
//   node ads/shaperz-v4/build/render.js   -> ads/shaperz-v4/shaperz-v4-<ad>-<feed|story>.png + preview.html
// Run build/prep.py first (it writes photos/*-cut.png).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PHOTOS = path.join(ROOT, 'photos');
const FONTS = path.join(__dirname, 'fonts');

const C = { navy: '#1B2B46', navyDeep: '#111C30', pink: '#E63D7E', gold: '#E9B04A', goldDeep: '#B8862C', blush: '#FDD1CB', white: '#FFFFFF' };
const SIZES = { feed: [1080, 1350], story: [1080, 1920] };

const dataUri = (file) => {
  const ext = path.extname(file).slice(1);
  const type = ext === 'woff2' ? 'font/woff2' : `image/${ext}`;
  return `data:${type};base64,${fs.readFileSync(file).toString('base64')}`;
};
const font = (family, file, weight) =>
  `@font-face{font-family:'${family}';src:url(${dataUri(path.join(FONTS, file))}) format('woff2');font-weight:${weight}}`;
const FONT_CSS = [
  font('Great Vibes', 'great-vibes-latin-400-normal.woff2', 400),
  font('Montserrat', 'montserrat-latin-600-normal.woff2', 600),
  font('Montserrat', 'montserrat-latin-700-normal.woff2', 700),
  font('Montserrat', 'montserrat-latin-800-normal.woff2', 800),
  font('Montserrat', 'montserrat-latin-900-normal.woff2', 900),
].join('\n');

const LOGO = dataUri(path.join(PHOTOS, 'shaperz-logo.png'));
const PERSON = { lynn: dataUri(path.join(PHOTOS, 'lynn-cut.png')), woman249: dataUri(path.join(PHOTOS, 'woman249-cut.png')) };

const CHECK = `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="${C.gold}"/><path d="M11 20.5l6 6 12-13" fill="none" stroke="${C.navy}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const PIN = `<svg viewBox="0 0 24 24"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="10" r="2.6" fill="currentColor"/></svg>`;
const ARROW = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="${C.navy}"/><path d="M7 12h9m-3.5-4 4 4-4 4" fill="none" stroke="${C.gold}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const BADGE = `<svg viewBox="0 0 24 24"><path d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 20l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2z" fill="${C.gold}"/><path d="M8.3 11.3l2.5 2.5 4.9-5" fill="none" stroke="${C.navy}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const TROPHY = `<svg viewBox="0 0 24 24"><path d="M7 3h10v3a5 5 0 0 1-10 0z" fill="${C.gold}"/><path d="M7 4H4v1.5A3.5 3.5 0 0 0 7.5 9M17 4h3v1.5A3.5 3.5 0 0 1 16.5 9" fill="none" stroke="${C.gold}" stroke-width="1.8"/><path d="M11 11h2v4h-2zM8 16h8v2.5H8z" fill="${C.gold}"/></svg>`;

const BASE_CSS = `
${FONT_CSS}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:var(--w);height:var(--h);overflow:hidden}
body{background:${C.navy};color:${C.white};font-family:'Montserrat',sans-serif;position:relative;-webkit-font-smoothing:antialiased}
.feed{--logo-top:48px}.story{--logo-top:170px}
.bgglow{position:absolute;inset:0;background:radial-gradient(900px 700px at var(--glow-x,85%) 55%, rgba(230,61,126,.16), transparent 60%)}
.logo{position:absolute;top:var(--logo-top);width:150px;height:150px;border-radius:50%;z-index:5;box-shadow:0 8px 22px rgba(0,0,0,.35)}
.ring{position:absolute;border-radius:50%;border:2px solid rgba(233,176,74,.6)}
.arc{position:absolute;border-radius:50%;border:7px solid ${C.gold};border-color:transparent transparent ${C.gold} ${C.gold};transform:rotate(18deg)}
.arc.flip{border-color:transparent ${C.gold} ${C.gold} transparent;transform:rotate(-18deg)}
.disc{position:absolute;border-radius:50%;background:${C.pink}}
.person{position:absolute;z-index:2;filter:drop-shadow(-18px 10px 30px rgba(5,10,24,.5))}
.copy{position:absolute;z-index:4}
.pill{display:inline-flex;align-items:center;gap:12px;border:2px solid ${C.gold};color:${C.gold};border-radius:999px;padding:10px 22px 10px 16px;font-weight:800;font-size:22px;letter-spacing:.06em;text-transform:uppercase;background:rgba(17,28,48,.55);white-space:nowrap}
.pill svg{width:26px;height:26px}
.script{font-family:'Great Vibes',cursive;line-height:.95}
.black{font-weight:900;letter-spacing:-.02em;text-transform:uppercase}
.checks{list-style:none;display:grid;gap:20px}
.checks li{display:flex;gap:18px;align-items:flex-start;font-weight:800;font-size:31px;line-height:1.18}
.checks svg{flex:0 0 40px;width:40px;height:40px;margin-top:-1px}
.story .checks li{font-size:34px}.story .checks{gap:24px}
.cta{display:inline-flex;align-items:center;gap:14px;background:${C.gold};color:${C.navy};border-radius:999px;padding:24px 34px;font-weight:900;font-size:25px;letter-spacing:.04em;text-transform:uppercase;box-shadow:0 12px 28px rgba(0,0,0,.35);white-space:nowrap}
.cta svg{width:30px;height:30px}
.proof{display:grid;gap:10px;margin-top:22px;font-weight:800;font-size:23px;color:${C.blush};white-space:nowrap}
.proof>div{display:flex;align-items:center;gap:12px}
.proof svg{width:32px;height:32px;flex:0 0 32px}
.proof b{color:${C.gold};font-weight:900}
.story .proof{font-size:26px;margin-top:28px}
.badge{border-radius:50%;background:radial-gradient(circle at 35% 30%, #F7D27E, ${C.gold} 55%, ${C.goldDeep});display:flex;flex-direction:column;align-items:center;justify-content:center;color:${C.navy};text-align:center;box-shadow:0 10px 26px rgba(0,0,0,.35), inset 0 0 0 6px rgba(255,255,255,.35)}
.badge b{font-weight:900;line-height:.95;letter-spacing:-.02em}
.badge span{font-weight:900;text-transform:uppercase;letter-spacing:.08em;line-height:1.2}
.band{position:absolute;left:0;right:0;bottom:0;height:80px;background:${C.navyDeep};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:26px;z-index:6}
.band b{color:${C.gold};font-weight:900}
.story .band{height:290px;align-items:flex-start;padding-top:30px;font-size:29px}
`;

const pill = (text) => `<div class="pill">${PIN}<span>${text}</span></div>`;
const checks = (items) => `<ul class="checks">${items.map((t) => `<li>${CHECK}<span>${t}</span></li>`).join('')}</ul>`;
const cta = (label) => `<div class="cta">${label} ${ARROW}</div>`;
const proof = (award = true) => `<div class="proof"><div>${BADGE}<span><b>FNP-BC</b> · Nearly 30 Years</span></div>${award ? `<div>${TROPHY}<span>Best of 2025 · South Side</span></div>` : ''}</div>`;
const badge = (size) => `<div class="badge" style="width:${size}px;height:${size}px">
  <span style="font-size:${size * 0.085}px">Best of</span><b style="font-size:${size * 0.32}px">2025</b>
  <span style="font-size:${size * 0.07}px">Medical Spa</span><span style="font-size:${size * 0.07}px">South Side</span></div>`;
const band = `<div class="band"><span>3135 W. 111th St, Chicago · <b>FSA / HSA accepted</b></span></div>`;

function page(size, glowX, body) {
  const [w, h] = SIZES[size];
  return `<!doctype html><html><head><meta charset="utf-8"><style>:root{--w:${w}px;--h:${h}px;--glow-x:${glowX}}${BASE_CSS}</style></head>
<body class="${size}"><div class="bgglow"></div>${body}${band}</body></html>`;
}

// art: disc [x, y, diameter]; person: rendered width w and top-left (x, y); side: where the person bleeds off.
const ADS = [
  {
    id: 'ad1-medical', side: 'right', photo: 'lynn',
    copy: (s) => `
      <div class="copy" style="left:64px;top:${s === 'feed' ? 226 : 360}px;width:${s === 'feed' ? 560 : 520}px">
        ${pill('111th St · South Side Chicago')}
        <div style="margin-top:${s === 'feed' ? 20 : 34}px;line-height:.95">
          <div class="script" style="font-size:${s === 'feed' ? 108 : 126}px;color:${C.gold}">Medical</div>
          <div class="black" style="font-size:${s === 'feed' ? 96 : 112}px;margin-top:-4px">Weight<br>Loss</div>
          <div class="black" style="font-size:${s === 'feed' ? 58 : 66}px;color:${C.pink};margin-top:10px;text-transform:none">on 111th St.</div>
        </div>
        <p style="font-weight:700;font-size:${s === 'feed' ? 27 : 31}px;margin-top:${s === 'feed' ? 22 : 32}px;color:${C.blush};line-height:1.3;max-width:470px">Led by Lynn St. Victor-Luckett, FNP-BC</p>
        <div style="margin-top:${s === 'feed' ? 26 : 38}px;max-width:470px">${checks(['Semaglutide &amp; tirzepatide', 'Shots or pills', 'FSA / HSA accepted'])}</div>
        <div style="margin-top:${s === 'feed' ? 34 : 50}px">${cta('Book Free Consult')}</div>${proof()}
      </div>`,
    art: { feed: { disc: [580, 320, 600], w: 860, x: 350, y: 360 }, story: { disc: [500, 760, 640], w: 960, x: 280, y: 680 } },
  },
  {
    id: 'ad2-offer', side: 'left', photo: 'woman249',
    copy: (s) => `
      <div class="copy" style="right:64px;top:${s === 'feed' ? 226 : 360}px;width:${s === 'feed' ? 500 : 520}px;text-align:right;display:flex;flex-direction:column;align-items:flex-end">
        ${pill('Medical Weight Loss')}
        <div style="margin-top:${s === 'feed' ? 20 : 34}px;line-height:.92">
          <div class="script" style="font-size:${s === 'feed' ? 92 : 108}px;color:${C.gold}">Your first month</div>
          <div class="black" style="font-size:${s === 'feed' ? 190 : 216}px;margin-top:-6px">$249</div>
          <div class="black" style="font-size:${s === 'feed' ? 50 : 58}px;color:${C.pink};margin-top:8px">All this included:</div>
        </div>
        <div style="margin-top:${s === 'feed' ? 28 : 40}px;text-align:left">${checks(['Labs + hormone review', 'ShapeScale 3D body scan', 'Meal plan + exercise guidance', '60-min visit with your NP'])}</div>
        <div style="margin-top:${s === 'feed' ? 34 : 50}px">${cta('Claim Your Spot')}</div>
        ${proof().replace('class="proof"', 'class="proof" style="justify-items:end"')}
      </div>`,
    art: { feed: { disc: [-120, 380, 600], w: 840, x: -110, y: 400 }, story: { disc: [-150, 800, 660], w: 940, x: -110, y: 740 } },
  },
  {
    id: 'ad3-provider', side: 'right', photo: 'lynn',
    copy: (s) => `
      <div class="copy" style="left:64px;top:${s === 'feed' ? 226 : 360}px;width:${s === 'feed' ? 560 : 520}px">
        ${pill('111th St · South Side Chicago')}
        <div style="margin-top:${s === 'feed' ? 14 : 26}px;line-height:.9">
          <div class="script" style="font-size:${s === 'feed' ? 130 : 150}px;color:${C.pink}">Meet</div>
          <div class="black" style="font-size:${s === 'feed' ? 160 : 186}px;margin-top:-10px">Lynn</div>
        </div>
        <p class="black" style="font-size:${s === 'feed' ? 31 : 35}px;line-height:1.18;margin-top:${s === 'feed' ? 18 : 26}px;letter-spacing:.01em;font-weight:800">Your weight loss<br>nurse practitioner</p>
        <p style="font-weight:700;font-size:${s === 'feed' ? 25 : 25}px;margin-top:10px;color:${C.blush}">Lynn St. Victor-Luckett, <b style="color:${C.gold};font-weight:900">FNP-BC</b></p>
        <div style="margin-top:${s === 'feed' ? 28 : 40}px;max-width:470px">${checks(['Nearly 30 years in practice', '60-minute first visit', 'Right here on 111th St'])}</div>
        <div style="margin-top:${s === 'feed' ? 34 : 50}px">${cta('Book Free Consult')}</div>
        <div style="margin-top:${s === 'feed' ? 26 : 40}px">${badge(s === 'feed' ? 160 : 190)}</div>
      </div>`,
    art: { feed: { disc: [580, 320, 600], w: 860, x: 350, y: 360 }, story: { disc: [500, 760, 640], w: 960, x: 280, y: 680 } },
  },
];

function adHtml(ad, size) {
  const a = ad.art[size];
  const [dx, dy, d] = a.disc;
  const art = `
    <div class="ring" style="left:${dx - 70}px;top:${dy - 70}px;width:${d + 140}px;height:${d + 140}px"></div>
    <div class="disc" style="left:${dx}px;top:${dy}px;width:${d}px;height:${d}px"></div>
    <div class="arc${ad.side === 'left' ? ' flip' : ''}" style="left:${dx - 40}px;top:${dy - 40}px;width:${d + 80}px;height:${d + 80}px"></div>
    <img class="person" src="${PERSON[ad.photo]}" style="width:${a.w}px;left:${a.x}px;top:${a.y}px">`;
  const logo = `<img class="logo" src="${LOGO}" style="${ad.side === 'left' ? 'right' : 'left'}:64px">`;
  return page(size, ad.side === 'left' ? '15%' : '85%', art + logo + ad.copy(size));
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
