const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Check guides screen for back button
  await page.click('text=Cẩm nang');
  await page.waitForTimeout(2000);
  
  const buttons = await page.locator('[aria-label="Quay lại"]').all();
  console.log('Back buttons count:', buttons.length);
  
  for (const btn of buttons) {
    const isVisible = await btn.isVisible();
    const isEnabled = await btn.isEnabled();
    const box = await btn.boundingBox();
    console.log(`Back button: visible=${isVisible}, enabled=${isEnabled}, box=${JSON.stringify(box)}`);
  }
  
  await browser.close();
})();