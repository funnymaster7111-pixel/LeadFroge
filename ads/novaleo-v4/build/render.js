// Novaleo v4 ads: Katie's real photos, navy + gold, rendered with Playwright.
//   node ads/novaleo-v4/build/render.js   -> ads/novaleo-v4/novaleo-v4-adN-<name>-<feed|story>.png + preview.html
// Run build/cutout.py first (it writes photos/*-cut.png).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PHOTOS = path.join(ROOT, 'photos');
const FONTS = path.join(__dirname, 'fonts');

const C = { navy: '#14284B', navyDeep: '#0E1D38', gold: '#F2B705', cream: '#FFF6DC', white: '#FFFFFF' };
const SIZES = { feed: [1080, 1350], story: [1080, 1920] };

const dataUri = (file) => {
  const ext = path.extname(file).slice(1).replace('jpg', 'jpeg');
  const type = ext === 'woff2' ? 'font/woff2' : `image/${ext}`;
  return `data:${type};base64,${fs.readFileSync(file).toString('base64')}`;
};
const font = (family, file, weight, style) =>
  `@font-face{font-family:'${family}';src:url(${dataUri(path.join(FONTS, file))}) format('woff2');font-weight:${weight};font-style:${style}}`;

const FONT_CSS = [
  font('Montserrat', 'montserrat-latin-600-normal.woff2', 600, 'normal'),
  font('Montserrat', 'montserrat-latin-700-normal.woff2', 700, 'normal'),
  font('Montserrat', 'montserrat-latin-800-normal.woff2', 800, 'normal'),
  font('Montserrat', 'montserrat-latin-900-normal.woff2', 900, 'normal'),
  font('Playfair', 'playfair-display-latin-700-italic.woff2', 700, 'italic'),
  font('Playfair', 'playfair-display-latin-800-italic.woff2', 800, 'italic'),
].join('\n');

// Social proof shown on every ad. GOOGLE_RATING is the client-stated Google rating (Nov 2026);
// set it to null to drop the stars row if it can't be confirmed on her Google Business Profile.
const GOOGLE_RATING = '4.9';

const LOGO = dataUri(path.join(PHOTOS, 'novaleo-logo-from-v3.png'));
const cut = (name) => dataUri(path.join(PHOTOS, `katie-${name}-cut.png`));

const CHECK = `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="${C.gold}"/><path d="M11 20.5l6 6 12-13" fill="none" stroke="${C.navy}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const PIN = `<svg viewBox="0 0 24 24"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 14.5z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M9 20.5h6M12 17v3.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`;
const BADGE = `<svg viewBox="0 0 24 24"><path d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 20l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2z" fill="${C.gold}"/><path d="M8.3 11.3l2.5 2.5 4.9-5" fill="none" stroke="${C.navy}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ARROW = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="${C.navy}"/><path d="M7 12h9m-3.5-4 4 4-4 4" fill="none" stroke="${C.gold}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const BASE_CSS = `
${FONT_CSS}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:var(--w);height:var(--h);overflow:hidden}
body{background:${C.navy};color:${C.white};font-family:'Montserrat',sans-serif;position:relative;-webkit-font-smoothing:antialiased}
.feed{--logo-top:52px}.story{--logo-top:180px}
.bgglow{position:absolute;inset:0;background:radial-gradient(900px 700px at 85% 55%, rgba(242,183,5,.10), transparent 60%)}
.logo{position:absolute;left:64px;top:var(--logo-top);width:300px;z-index:5}
.ring{position:absolute;border-radius:50%;border:2px solid rgba(242,183,5,.55)}
.arc{position:absolute;border-radius:50%;border:7px solid ${C.gold};border-color:transparent transparent ${C.gold} ${C.gold};transform:rotate(18deg)}
.disc{position:absolute;border-radius:50%;background:${C.gold}}
.person{position:absolute;z-index:2;filter:drop-shadow(-18px 10px 30px rgba(5,12,28,.45))}
.copy{position:absolute;left:64px;z-index:4}
.pill{display:inline-flex;align-items:center;gap:12px;border:2px solid ${C.gold};color:${C.gold};border-radius:999px;padding:10px 22px 10px 16px;font-weight:800;font-size:22px;letter-spacing:.06em;text-transform:uppercase;background:rgba(14,29,56,.55)}
.pill svg{width:28px;height:28px}
.serif{font-family:'Playfair',serif;font-style:italic;font-weight:800;letter-spacing:-.01em}
.black{font-weight:900;letter-spacing:-.02em;text-transform:uppercase}
.gold{color:${C.gold}}
.checks{list-style:none;display:grid;gap:20px}
.checks li{display:flex;gap:18px;align-items:flex-start;font-weight:800;font-size:31px;line-height:1.18}
.checks svg{flex:0 0 40px;width:40px;height:40px;margin-top:-1px}
.cta{display:inline-flex;align-items:center;gap:14px;background:${C.gold};color:${C.navy};border-radius:999px;padding:24px 34px;font-weight:900;font-size:25px;letter-spacing:.04em;text-transform:uppercase;box-shadow:0 12px 28px rgba(0,0,0,.35)}
.cta svg{width:30px;height:30px}
.band{position:absolute;left:0;right:0;bottom:0;height:80px;background:${C.navyDeep};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:27px;z-index:6;letter-spacing:.005em}
.band b{color:${C.gold};font-weight:900}
.story .band{height:290px;align-items:flex-start;padding-top:30px;font-size:30px}
.story .checks li{font-size:34px}
.story .checks{gap:24px}
.proof{display:grid;gap:10px;margin-top:22px;font-weight:800;font-size:24px;color:${C.cream};white-space:nowrap;letter-spacing:.01em}
.proof>div{display:flex;align-items:center;gap:12px}
.proof svg{width:34px;height:34px;flex:0 0 34px}
.proof .stars{gap:3px}.proof .stars svg{width:26px;height:26px;flex-basis:26px}.proof .stars span{margin-left:10px}
.proof i{font-style:normal;color:${C.gold}}
.story .proof{font-size:26px;margin-top:28px}
`;

const pill = (text) => `<div class="pill">${PIN}<span>${text}</span></div>`;
const checks = (items) => `<ul class="checks">${items.map((t) => `<li>${CHECK}<span>${t}</span></li>`).join('')}</ul>`;
const cta = `<div class="cta">Book Free Assessment Call ${ARROW}</div>`;
const STAR = `<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="${C.gold}"/></svg>`;
const proof = () => `<div class="proof"><div>${BADGE}<span><b class="gold" style="font-weight:900">Board-Certified NP</b> <i>·</i> 20+ Years</span></div>${GOOGLE_RATING ? `<div class="stars">${STAR.repeat(5)}<span>${GOOGLE_RATING} on Google</span></div>` : ''}</div>`;
const band = `<div class="band"><span>Telehealth from home · <b>All of Michigan &amp; Wisconsin</b></span></div>`;

function page(size, css, body) {
  const [w, h] = SIZES[size];
  return `<!doctype html><html><head><meta charset="utf-8"><style>:root{--w:${w}px;--h:${h}px}${BASE_CSS}${css}</style></head>
<body class="${size}"><div class="bgglow"></div><img class="logo" src="${LOGO}">${body}</body></html>`;
}

// Each ad: name, photo, and per-size {css, body}. Positions are px on the 1080-wide canvas.
const ADS_BASE = [
  {
    id: '1a', name: 'stalled', photo: 'black-table',
    copy: (s) => `
      <div class="copy" style="top:${s === 'feed' ? 168 : 300}px;width:${s === 'feed' ? 600 : 640}px">
        ${pill('Telehealth · Michigan &amp; Wisconsin')}
        <div style="margin-top:${s === 'feed' ? 26 : 40}px;line-height:.98">
          <div class="serif" style="font-size:${s === 'feed' ? 88 : 108}px">Weight loss</div>
          <div class="black gold" style="font-size:${s === 'feed' ? 104 : 132}px;margin-top:4px">Stalled?</div>
          <div class="black" style="font-size:${s === 'feed' ? 76 : 86}px;margin-top:6px;text-transform:none;white-space:nowrap">Find out WHY.</div>
        </div>
        <p style="font-weight:700;font-size:${s === 'feed' ? 29 : 33}px;margin-top:${s === 'feed' ? 26 : 34}px;color:${C.cream};line-height:1.3;max-width:520px">Root-cause care with Katie Long, NP-C, for women 35–55.</p>
        <div style="margin-top:${s === 'feed' ? 30 : 40}px;max-width:500px">${checks(['Hormones, thyroid &amp; metabolism', 'Virtual visits from home', 'FREE assessment call'])}</div>
        <div style="margin-top:${s === 'feed' ? 36 : 52}px">${cta}</div>${proof()}
      </div>`,
    art: { feed: { disc: [600, 440, 600], h: 860, right: -130, bottom: 80 }, story: { disc: [560, 700, 640], h: 900, right: -200, bottom: 290 } },
  },
  {
    id: '2', name: 'meet-katie', photo: 'blue-shirt',
    copy: (s) => `
      <div class="copy" style="top:${s === 'feed' ? 168 : 300}px;width:600px">
        ${pill('Michigan &amp; Wisconsin')}
        <div style="margin-top:${s === 'feed' ? 22 : 36}px;line-height:.9">
          <div class="serif gold" style="font-size:${s === 'feed' ? 120 : 140}px">Meet</div>
          <div class="black" style="font-size:${s === 'feed' ? 170 : 196}px">Katie</div>
        </div>
        <p class="black" style="font-size:${s === 'feed' ? 33 : 37}px;line-height:1.18;margin-top:${s === 'feed' ? 22 : 30}px;letter-spacing:.01em;font-weight:800">Your weight loss<br>nurse practitioner</p>
        <div style="margin-top:${s === 'feed' ? 32 : 44}px;max-width:${s === 'feed' ? 470 : 520}px">${checks(['FREE assessment call', 'Root-cause care, not another diet', 'Virtual visits from home'])}</div>
        <div style="margin-top:${s === 'feed' ? 30 : 56}px">${cta}</div>${proof()}
      </div>`,
    art: { feed: { disc: [590, 250, 600], h: 1040, right: -250, bottom: 80 }, story: { disc: [560, 640, 620], h: 960, right: -170, bottom: 290 } },
  },
  {
    id: '3', name: 'program', photo: 'couch',
    copy: (s) => `
      <div class="copy" style="top:${s === 'feed' ? 166 : 300}px;width:${s === 'feed' ? 952 : 952}px">
        <div style="display:inline-block;background:${C.gold};color:${C.navy};font-weight:900;font-size:${s === 'feed' ? 30 : 34}px;letter-spacing:.08em;text-transform:uppercase;padding:12px 24px;border-radius:10px;transform:rotate(-2deg)">Only 4 spots</div>
        <div style="margin-top:${s === 'feed' ? 26 : 38}px;line-height:1.02">
          <div class="black" style="font-size:${s === 'feed' ? 58 : 66}px;text-transform:none">Now accepting <span class="gold">4 women</span><br>into the</div>
          <div class="serif gold" style="font-size:${s === 'feed' ? 80 : 92}px;line-height:1;margin-top:10px">Root Cause<br>Restoration Program</div>
        </div>
        <p style="font-weight:800;font-size:${s === 'feed' ? 27 : 29}px;margin-top:${s === 'feed' ? 22 : 30}px;color:${C.cream};letter-spacing:.02em">6 MONTHS · WOMEN 35–55 · WITH KATIE LONG, NP-C</p>
        <div style="margin-top:${s === 'feed' ? 26 : 46}px;max-width:${s === 'feed' ? 540 : 520}px">${checks(['Labs + metabolic tracking', 'Monthly data reviews', 'Nutrition &amp; supplement guidance', 'Provider visits from home'])}</div>
        <div style="margin-top:${s === 'feed' ? 30 : 56}px">${cta}</div>${proof()}
      </div>`,
    art: { feed: { disc: [670, 700, 500], h: 640, right: -110, bottom: 80 }, story: { disc: [650, 1020, 540], h: 800, right: -210, bottom: 290 } },
  },
];

// Ad 1B: same layout and copy as 1A with the blue-shirt photo, to A/B test which photo gets cheaper leads.
const ADS = [
  ADS_BASE[0],
  { ...ADS_BASE[0], id: '1b', photo: 'blue-shirt',
    art: { feed: { disc: [600, 420, 600], h: 900, right: -230, bottom: 80 }, story: { disc: [560, 700, 640], h: 900, right: -190, bottom: 290 } } },
  ...ADS_BASE.slice(1),
];

function adHtml(ad, size) {
  const a = ad.art[size];
  const [dx, dy, d] = a.disc;
  const art = `
    <div class="ring" style="left:${dx - 70}px;top:${dy - 70}px;width:${d + 140}px;height:${d + 140}px"></div>
    <div class="disc" style="left:${dx}px;top:${dy}px;width:${d}px;height:${d}px"></div>
    <div class="arc" style="left:${dx - 40}px;top:${dy - 40}px;width:${d + 80}px;height:${d + 80}px"></div>
    <img class="person" src="${cut(ad.photo)}" style="height:${a.h}px;right:${a.right}px;bottom:${a.bottom}px">`;
  return page(size, '', art + ad.copy(size) + band);
}

function previewHtml(files) {
  return `<!doctype html><meta charset="utf-8"><title>Novaleo v4 ads</title>
<style>body{font-family:system-ui;background:#eef0f4;margin:24px}div{display:flex;gap:16px;align-items:flex-start;margin-bottom:24px}img{width:360px;box-shadow:0 4px 18px rgba(0,0,0,.15)}</style>
${ADS.map((ad) => `<h2>Ad ${ad.id} · ${ad.name}</h2><div>${files.filter((f) => f.includes(`-ad${ad.id}-`)).map((f) => `<img src="${f}">`).join('')}</div>`).join('\n')}`;
}

(async () => {
  const browser = await chromium.launch();
  const files = [];
  for (const ad of ADS) {
    for (const size of Object.keys(SIZES)) {
      const [width, height] = SIZES[size];
      const page_ = await browser.newPage({ viewport: { width, height } });
      await page_.setContent(adHtml(ad, size), { waitUntil: 'load' });
      await page_.evaluate(() => document.fonts.ready);
      const file = `novaleo-v4-ad${ad.id}-${ad.name}-${size}.png`;
      await page_.screenshot({ path: path.join(ROOT, file) });
      await page_.close();
      files.push(file);
      console.log('wrote', file);
    }
  }
  fs.writeFileSync(path.join(ROOT, 'preview.html'), previewHtml(files));
  await browser.close();
})();
