const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Click on "Bắt đầu quét mẫu lá" to go to camera
  await page.click('text=Bắt đầu quét mẫu lá');
  await page.waitForTimeout(3000);
  
  const texts = await page.locator('*').evaluateAll(elements => 
    elements.map(el => el.textContent).filter(t => t && t.trim().length > 0)
  );
  
  console.log('=== CAMERA SCREEN ===');
  texts.forEach((t, i) => console.log(`${i}: ${t.trim()}`));
  
  await browser.close();
})();