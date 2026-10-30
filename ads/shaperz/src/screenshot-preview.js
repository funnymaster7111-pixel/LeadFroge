// Full-page screenshot of preview.html for review
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1560, height: 900 } });
  await page.goto('file://' + path.join(__dirname, '..', 'preview.html'));
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(__dirname, '..', 'preview-screenshot.png'), fullPage: true });
  await browser.close();
})();
