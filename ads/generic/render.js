// Exports every ad to PNG at feed (1080x1080) and story (1080x1920) sizes.
// Usage (from this folder):  node render.js
const path = require('path');
const { chromium } = require('playwright');

const ads = ['ad1-local-doctor', 'ad2-free-offer', 'ad3-testimonial'];
const sizes = [
  { name: 'feed', width: 1080, height: 1080 },
  { name: 'story', width: 1080, height: 1920 },
];

(async () => {
  const browser = await chromium.launch();
  for (const size of sizes) {
    const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
    for (const ad of ads) {
      await page.goto('file://' + path.join(__dirname, ad + '.html'));
      await page.evaluate(() => document.fonts.ready);
      const out = path.join(__dirname, 'png', `${ad}-${size.name}.png`);
      await page.screenshot({ path: out });
      console.log('wrote', path.relative(__dirname, out));
    }
    await page.close();
  }
  await browser.close();
})();
