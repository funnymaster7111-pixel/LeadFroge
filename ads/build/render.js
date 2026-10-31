// Renders 3 ads x 2 sizes per clinic from clinics.js.
//   node ads/build/render.js            -> ads/<slug>/<slug>-adN-<feed|story>.png + preview.html
//   node ads/build/render.js --proof DIR -> layout proofs with labeled photo slots (no real photos needed)
// Expects cutouts made by cutout.py: ads/<slug>/photos/<slot>-cut.png

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const clinics = require('./clinics');

const ADS_DIR = path.resolve(__dirname, '..');
const FONT_DIR = path.join(__dirname, 'fonts');
const SIZES = { feed: [1080, 1350], story: [1080, 1920] };

const args = process.argv.slice(2);
const proofIdx = args.indexOf('--proof');
const PROOF_DIR = proofIdx >= 0 ? path.resolve(args[proofIdx + 1]) : null;
const only = args.filter((a, i) => !a.startsWith('--') && (proofIdx < 0 || i !== proofIdx + 1));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fileUrl = (p) => 'file://' + p;

function fontFaces() {
  const f = (family, file, weight = 400, style = 'normal') =>
    `@font-face{font-family:'${family}';src:url('${fileUrl(path.join(FONT_DIR, file))}');font-weight:${weight};font-style:${style}}`;
  return [
    f('Anton', 'Anton.ttf'),
    f('Montserrat', 'Montserrat-600.ttf', 600),
    f('Montserrat', 'Montserrat-800.ttf', 800),
    f('Montserrat', 'Montserrat-900.ttf', 900),
    f('GreatVibes', 'GreatVibes.ttf'),
    f('KaushanScript', 'KaushanScript.ttf'),
    f('DMSerif', 'DMSerifDisplay.ttf'),
    f('DMSerifDisplay-Italic', 'DMSerifDisplay-Italic.ttf', 400, 'normal'),
  ].join('\n');
}

function photoPath(clinic, slot) {
  return path.join(ADS_DIR, clinic.slug, 'photos', `${slot}-cut.png`);
}

function personHtml(clinic, ad, cls) {
  const p = photoPath(clinic, ad.photo);
  if (fs.existsSync(p)) return `<img class="person ${cls}" src="${fileUrl(p)}">`;
  if (!PROOF_DIR) throw new Error(`Missing cutout ${p} — run cutout.py first (or use --proof)`);
  // Proof mode: a labeled silhouette the size of the real cutout slot.
  return `<div class="person slot ${cls}"><svg viewBox="0 0 400 520" preserveAspectRatio="xMidYMax meet">
    <circle cx="200" cy="150" r="95" fill="rgba(255,255,255,.28)"/>
    <path d="M20 520 C20 330 90 270 200 270 C310 270 380 330 380 520 Z" fill="rgba(255,255,255,.28)"/></svg>
    <span>PHOTO SLOT<br>${esc(ad.photoNote)}</span></div>`;
}

function logoHtml(clinic, cls = '') {
  const p = path.join(ADS_DIR, clinic.slug, 'photos', clinic.logo);
  if (fs.existsSync(p)) return `<div class="logo ${cls}"><img src="${fileUrl(p)}"></div>`;
  const lf = clinic.logoFallback;
  return `<div class="logo word ${cls}"><b>${esc(lf.top)}</b><small>${esc(lf.bottom)}</small>${
    lf.flag ? `<em>${esc(lf.flag)}</em>` : '<em>[LOGO PENDING]</em>'}</div>`;
}

const check = (color) =>
  `<svg class="ck" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="${color}"/><path d="M11 21 l6 6 l12 -14" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function button(c, ad) {
  return `<div class="btn" style="background:${c[ad.buttonBg]};color:${c[ad.buttonInk]}">${esc(ad.button)}<span class="arrow">&#10140;</span></div>`;
}

function ad1(clinic, size) {
  const c = clinic.colors, ad = clinic.ads.ad1;
  const lines = ad.lines.map((l, i) => {
    const fam = { heavy: "'Montserrat'", block: "'Anton'", script: `'${clinic.script}'`, serif: "'DMSerif'" }[l.style];
    const extra = l.style === 'block' ? 'text-transform:uppercase;letter-spacing:1px;' : l.style === 'heavy' ? 'font-weight:900;letter-spacing:-2px;' : '';
    return `<div class="hl hl${i} ${l.style}" data-fit style="font-family:${fam};font-size:${l.size}px;color:${c[l.color]};${extra}">${esc(l.t)}</div>`;
  }).join('');
  return `
  <div class="ad a1 ${size}" style="background:${c[ad.bg]}">
    <div class="circle" style="background:${c[ad.circle]}"></div>
    ${personHtml(clinic, ad, '')}
    ${logoHtml(clinic)}
    <div class="head">${lines}</div>
    <div class="lower">
      ${ad.tag ? `<div class="tag" style="background:${c.light};color:${c.ink}">${esc(ad.tag)}</div>` : ''}
      ${ad.chips ? `<div class="chips">${ad.chips.map((t) => `<span style="border-color:${c.accent};color:${c.light}">${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="led" style="color:${c.light}"><b>${esc(ad.led)}</b><br><span style="color:${c.accent}">${esc(ad.ledSub)}</span></div>
      ${button(c, ad)}
    </div>
    <div class="foot" style="background:${c.ink === c[ad.bg] ? 'rgba(0,0,0,.35)' : c.ink};color:${c.light}">${esc(clinic.footer)}</div>
  </div>`;
}

function ad2(clinic, size) {
  const c = clinic.colors, ad = clinic.ads.ad2;
  return `
  <div class="ad a2 ${size}" style="background:${c[ad.bg]};color:${c[ad.ink]}">
    <div class="circle" style="background:${c[ad.circle]}"></div>
    ${personHtml(clinic, ad, '')}
    ${logoHtml(clinic)}
    <div class="offer">
      <div class="kicker" style="background:${c[ad.kickerBg]};color:${c[ad.kickerInk]}">${esc(ad.kicker)}</div>
      <div class="price" data-fit style="color:${c[ad.priceColor]};font-size:${ad.priceSize}px">${esc(ad.price)}</div>
      <div class="psub" data-fit style="color:${c[ad.priceSubColor]}">${esc(ad.priceSub)}</div>
      ${ad.sticker ? `<div class="sticker" style="background:${c.pop === c[ad.bg] ? c.light : c.pop};color:${c.ink}">${esc(ad.sticker)}</div>` : ''}
      <ul class="checks">${ad.checks.map((t) => `<li>${check(c[ad.checkColor])}<span>${esc(t)}</span></li>`).join('')}</ul>
      ${button(c, ad)}
    </div>
    <div class="foot" style="background:${c.ink};color:${c.light}">${esc(clinic.footer)}</div>
  </div>`;
}

function ad3(clinic, size) {
  const c = clinic.colors, ad = clinic.ads.ad3;
  const aw = ad.award;
  return `
  <div class="ad a3 ${size}" style="background:${c[ad.bg]};color:${c.light}">
    <div class="circle" style="background:${c[ad.circle]}"></div>
    ${personHtml(clinic, ad, '')}
    ${logoHtml(clinic)}
    ${aw ? `<div class="seal" style="background:${c.accent};color:${c.ink};box-shadow:0 0 0 8px ${c[ad.bg]},0 0 0 12px ${c.accent}">
      <small>${esc(aw.top)}</small><b>${esc(aw.mid)}</b><i>${esc(aw.year)}</i><small class="by">${esc(aw.bottom)}</small></div>` : ''}
    <div class="intro">
      <div class="meet" style="font-family:'${clinic.script}';color:${c.light}">${esc(ad.meet)}</div>
      <div class="first" data-fit style="color:${c[ad.firstColor]};font-size:${ad.firstSize}px">${esc(ad.first)}</div>
      <div class="role">${esc(ad.role)}</div>
      <div class="cred" style="color:${c.accent}">${esc(ad.credential)}</div>
      <ul class="checks">${ad.points.map((t) => `<li>${check(c.pop === c[ad.bg] ? c.accent : c.pop)}<span>${esc(t)}</span></li>`).join('')}</ul>
      ${ad.stat ? `<div class="stat" style="color:${c.accent}">&#9733; ${esc(ad.stat)}</div>` : ''}
      ${button(c, ad)}
    </div>
    <div class="foot" style="background:rgba(0,0,0,.35);color:${c.light}">${esc(clinic.footer)}</div>
  </div>`;
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#000}
.ad{position:relative;overflow:hidden;font-family:'Montserrat';font-weight:800}
.feed{width:1080px;height:1350px}.story{width:1080px;height:1920px}
.circle{position:absolute;border-radius:50%}
.person{position:absolute;object-fit:contain;object-position:bottom center;filter:drop-shadow(0 18px 30px rgba(0,0,0,.35));z-index:2}
.slot{display:flex;align-items:flex-end;justify-content:center;border:4px dashed rgba(255,255,255,.7);border-bottom:0;border-radius:30px 30px 0 0;background:rgba(0,0,0,.12)}
.slot svg{position:absolute;inset:0;width:100%;height:100%}
.slot span{position:relative;margin-bottom:40px;padding:14px 18px;background:rgba(0,0,0,.6);color:#fff;font:700 22px/1.3 'Montserrat';text-align:center;border-radius:10px;max-width:90%}
.logo{position:absolute;z-index:5;background:#fff;border-radius:18px;padding:14px 22px;box-shadow:0 8px 24px rgba(0,0,0,.25)}
.logo img{display:block;max-height:78px;max-width:300px}
.logo.word{display:flex;flex-direction:column;color:#111;line-height:1}
.logo.word b{font:900 34px 'Montserrat';letter-spacing:1px}
.logo.word small{font:800 14px 'Montserrat';letter-spacing:2px;margin-top:6px}
.logo.word em{font:800 12px 'Montserrat';color:#c00;font-style:normal;margin-top:6px}
.hl{white-space:nowrap;line-height:.95}
.hl.block{line-height:.92}.hl.script{line-height:1.15}
.btn{display:inline-flex;align-items:center;gap:18px;font:900 40px 'Montserrat';padding:26px 40px;border-radius:999px;box-shadow:0 10px 0 rgba(0,0,0,.25),0 18px 30px rgba(0,0,0,.25);white-space:nowrap}
.btn .arrow{font-size:38px}
.foot{position:absolute;left:0;right:0;bottom:0;height:84px;display:flex;align-items:center;justify-content:center;font:800 28px 'Montserrat';letter-spacing:.5px;z-index:4}
.checks{list-style:none}
.checks li{display:flex;align-items:center;gap:18px;font:800 36px/1.15 'Montserrat';margin:0 0 20px}
.ck{width:46px;height:46px;flex:none}
.head,.lower,.offer,.intro{position:absolute;z-index:3}

/* ---- AD 1 feed ---- */
.a1.feed .logo{left:56px;top:52px}
.a1.feed .head{left:56px;top:190px;width:968px}
.a1.feed .person{right:-40px;top:470px;width:600px;height:796px}
.a1.feed .circle{width:700px;height:700px;right:-120px;top:520px}
.a1.feed .lower{left:56px;top:640px;width:420px}
.a1 .tag{display:inline-block;font:900 32px 'Montserrat';padding:12px 20px;border-radius:12px;margin-bottom:26px;transform:rotate(-2deg)}
.a1 .chips{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:28px}
.a1 .chips span{border:3px solid;border-radius:999px;padding:8px 18px;font:800 24px 'Montserrat'}
.a1 .led{font:600 28px/1.35 'Montserrat';margin-bottom:40px}
.a1 .led b{font-weight:900;font-size:30px}
.a1.feed .btn{font-size:36px;padding:24px 34px}
/* ---- AD 1 story ---- */
.a1.story .logo{left:60px;top:200px}
.a1.story .head{left:60px;top:360px;width:960px}
.a1.story .person{right:-60px;bottom:0;width:820px;height:1080px}
.a1.story .circle{width:900px;height:900px;right:-220px;top:930px}
.a1.story .lower{left:60px;top:880px;width:500px}
.a1.story .foot{display:none}

/* ---- AD 2 feed ---- */
.a2.feed .logo{right:52px;top:52px}
.a2.feed .person{left:-50px;bottom:84px;width:560px;height:1130px}
.a2.feed .circle{width:620px;height:620px;left:-140px;top:330px}
.a2.feed .offer{left:500px;top:180px;width:540px}
.a2 .kicker{display:inline-block;font:900 26px 'Montserrat';letter-spacing:1.5px;padding:12px 20px;border-radius:10px}
.a2 .price{font-family:'Anton';line-height:1;margin-top:14px;white-space:nowrap}
.a2 .psub{font:400 96px/1 'Anton';letter-spacing:1px;white-space:nowrap;margin-top:-6px}
.a2 .sticker{display:inline-block;font:900 30px 'Montserrat';padding:12px 22px;border-radius:12px;margin-top:20px;transform:rotate(-2deg);box-shadow:0 6px 0 rgba(0,0,0,.18)}
.a2 .checks{margin-top:34px}
.a2 .checks li{font-size:33px}
.a2.feed .btn{margin-top:14px;font-size:36px;padding:24px 34px}
/* ---- AD 2 story ---- */
.a2.story .logo{left:60px;top:200px}
.a2.story .offer{left:60px;top:340px;width:960px}
.a2.story .price{font-size:330px!important}
.a2.story .psub{font-size:140px}
.a2.story .checks{width:560px}
.a2.story .person{right:-60px;bottom:0;width:600px;height:960px}
.a2.story .circle{width:700px;height:700px;right:-200px;top:1100px}
.a2.story .btn{position:absolute;left:0;top:1090px}
.a2.story .foot{display:none}

/* ---- AD 3 feed ---- */
.a3.feed .logo{left:56px;top:52px}
.a3.feed .person{right:-30px;top:330px;width:540px;height:936px}
.a3.feed .circle{width:640px;height:640px;right:-110px;top:400px}
.a3.feed .intro{left:56px;top:190px;width:510px}
.a3 .meet{font-size:110px;line-height:1}
.a3 .first{font-family:'Anton';line-height:1;white-space:nowrap;letter-spacing:2px}
.a3 .role{font:900 40px/1.15 'Montserrat';margin-top:10px}
.a3 .cred{font:800 26px 'Montserrat';margin:14px 0 30px}
.a3 .checks li{font-size:31px;margin-bottom:16px}
.a3 .stat{font:900 30px 'Montserrat';margin:8px 0 30px}
.a3.feed .btn{font-size:36px;padding:24px 34px}
.seal{position:absolute;z-index:6;border-radius:50%;width:230px;height:230px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;transform:rotate(8deg);line-height:1}
.seal small{font:900 20px 'Montserrat';letter-spacing:2px}
.seal b{font:400 40px 'Anton';margin:6px 0 2px}
.seal i{font:400 52px 'Anton';font-style:normal}
.seal .by{font:800 12px/1.2 'Montserrat';letter-spacing:.5px;max-width:170px;margin-top:6px}
.a3.feed .seal{right:56px;top:60px}
/* ---- AD 3 story ---- */
.a3.story .logo{left:60px;top:200px}
.a3.story .intro{left:60px;top:350px;width:960px}
.a3.story .role{font-size:50px;width:640px}
.a3.story .checks{width:520px}
.a3.story .person{right:-60px;bottom:0;width:700px;height:1050px}
.a3.story .circle{width:760px;height:760px;right:-180px;top:1000px}
.a3.story .btn{position:absolute;left:0;top:1010px}
.a3.story .seal{right:60px;top:200px}
.a3.story .foot{display:none}
`;

// Shrink any [data-fit] element whose text overflows its container.
const FIT_JS = `
for (const el of document.querySelectorAll('[data-fit]')) {
  const max = el.parentElement.clientWidth;
  let fs = parseFloat(getComputedStyle(el).fontSize);
  el.style.display = 'inline-block';
  while (el.scrollWidth > max && fs > 20) { fs -= 2; el.style.fontSize = fs + 'px'; }
  el.style.display = 'block';
}`;

function page(body) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontFaces()}${CSS}</style></head><body>${body}<script>document.fonts.ready.then(()=>{${FIT_JS};document.body.dataset.ready=1})</script></body></html>`;
}

function previewHtml(clinic, files) {
  const c = clinic.colors;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(clinic.name)} ads</title><style>
body{margin:0;background:#f3f3f3;font-family:system-ui,sans-serif;color:#111}
header{padding:24px 16px;background:${c.bg};color:#fff}h1{margin:0;font-size:24px}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;padding:20px 16px;max-width:1200px;margin:auto}
figure{margin:0;background:#fff;border-radius:12px;padding:10px;box-shadow:0 2px 8px rgba(0,0,0,.08)}
img{width:100%;display:block;border-radius:6px}figcaption{font-size:13px;padding:8px 2px 0}
</style></head><body><header><h1>${esc(clinic.name)} — Facebook ad samples v3</h1><p>Copy: ad-copy.md · Photo sources: photos.md</p></header>
<main>${files.map((f) => `<figure><img src="${f}" alt="${f}"><figcaption>${f}</figcaption></figure>`).join('')}</main></body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ deviceScaleFactor: 1 });
  const tmp = fs.mkdtempSync(path.join(PROOF_DIR || require('os').tmpdir(), 'html-'));
  for (const clinic of clinics) {
    if (only.length && !only.includes(clinic.slug)) continue;
    const outDir = PROOF_DIR || path.join(ADS_DIR, clinic.slug);
    const files = [];
    for (const [n, fn] of [['ad1', ad1], ['ad2', ad2], ['ad3', ad3]]) {
      for (const [size, [w, h]] of Object.entries(SIZES)) {
        const htmlFile = path.join(tmp, `${clinic.slug}-${n}-${size}.html`);
        fs.writeFileSync(htmlFile, page(fn(clinic, size)));
        const pg = await ctx.newPage();
        await pg.setViewportSize({ width: w, height: h });
        await pg.goto(fileUrl(htmlFile));
        await pg.waitForSelector('body[data-ready]');
        const name = `${clinic.slug}-${n}-${size}.png`;
        await pg.screenshot({ path: path.join(outDir, name), clip: { x: 0, y: 0, width: w, height: h } });
        await pg.close();
        files.push(name);
        console.log('rendered', path.join(outDir, name));
      }
    }
    if (!PROOF_DIR) fs.writeFileSync(path.join(outDir, 'preview.html'), previewHtml(clinic, files));
  }
  await browser.close();
})();
