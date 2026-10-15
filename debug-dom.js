const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  const content = await page.content();
  console.log(content.substring(0, 5000));
  
  await browser.close();
})();