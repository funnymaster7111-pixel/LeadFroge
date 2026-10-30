// Renders the photo layouts (Ads 1–2) to a given folder, with the same story safe-zone check as render.js
const { chromium } = require('playwright');
const path = require('path');
const outDir = process.argv[2] || path.join(__dirname, '..');
(async () => {
  const browser = await chromium.launch();
  for (const [file, name] of [['ad1-photo.html', 'ad1-local'], ['ad2-photo.html', 'ad2-offer']]) {
    for (const [w, h] of [[1080, 1080], [1080, 1920]]) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.goto('file://' + path.join(__dirname, file));
      await page.evaluate(() => document.fonts.ready);
      if (h === 1920) {
        const bad = await page.evaluate(() =>
          [...document.querySelectorAll('.logo, h1, .sub, .badge, .price, .offer, .tagline')]
            .map(el => ({ el: el.className || el.tagName, r: el.getBoundingClientRect() }))
            .filter(({ r }) => r.top < 250 || r.bottom > 1570)
            .map(({ el, r }) => `${el} [${Math.round(r.top)}-${Math.round(r.bottom)}]`));
        console.log(bad.length ? `SAFE-ZONE VIOLATION ${name}: ${bad.join(', ')}` : `${name} story: safe zone OK`);
      }
      await page.screenshot({ path: path.join(outDir, `${name}-${w}x${h}.png`) });
      await page.close();
    }
  }
  await browser.close();
})();
