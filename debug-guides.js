const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Click on "Cẩm nang" tab
  await page.click('text=Cẩm nang');
  await page.waitForTimeout(2000);
  
  const texts = await page.locator('*').evaluateAll(elements => 
    elements.map(el => el.textContent).filter(t => t && t.trim().length > 0)
  );
  
  console.log('=== GUIDES SCREEN ===');
  texts.forEach((t, i) => console.log(`${i}: ${t.trim()}`));
  
  await browser.close();
})();