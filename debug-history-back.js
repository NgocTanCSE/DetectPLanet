const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Check history screen for back button
  await page.click('text=Lịch sử');
  await page.waitForTimeout(2000);
  
  const buttons = await page.locator('[aria-label="Quay lại"]').all();
  console.log('Back buttons count:', buttons.length);
  
  for (const btn of buttons) {
    const isVisible = await btn.isVisible();
    const isEnabled = await btn.isEnabled();
    const box = await btn.boundingBox();
    console.log(`Back button: visible=${isVisible}, enabled=${isEnabled}, box=${JSON.stringify(box)}`);
  }
  
  // Also check what text is on the page
  const texts = await page.locator('*').evaluateAll(elements => 
    elements.map(el => el.textContent).filter(t => t && t.trim().length > 0)
  );
  
  console.log('\n=== HISTORY SCREEN TEXTS ===');
  texts.filter(t => t.includes('Quay') || t.includes('Lịch sử') || t.includes('Nhật ký')).forEach(t => console.log(t.trim()));
  
  await browser.close();
})();