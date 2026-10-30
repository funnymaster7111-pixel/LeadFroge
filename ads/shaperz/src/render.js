// Renders each ad at 1080x1080 (feed) and 1080x1920 (stories/reels) to ../
const { chromium } = require('playwright');
const path = require('path');
const ads = ['ad1-local', 'ad2-offer', 'ad3-testimonial'];
const only = process.argv.slice(2);
if (!require('fs').existsSync(path.join(__dirname, 'assets', 'shaperz-logo.png')))
  console.warn('WARNING: src/assets/shaperz-logo.png is missing; ads will render with an empty logo slot.');
(async () => {
  const browser = await chromium.launch();
  for (const ad of ads.filter(a => !only.length || only.includes(a))) {
    for (const [w, h] of [[1080, 1080], [1080, 1920]]) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.goto('file://' + path.join(__dirname, ad.split('-')[0] + '.html'));
      await page.evaluate(() => document.fonts.ready);
      const out = path.join(__dirname, '..', `${ad}-${w}x${h}.png`);
      await page.screenshot({ path: out });
      console.log('wrote', out);
      await page.close();
    }
  }
  await browser.close();
})();
