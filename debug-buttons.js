const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Check for back button in camera screen
  await page.click('text=Bắt đầu quét mẫu lá');
  await page.waitForTimeout(3000);
  
  const buttons = await page.locator('button, [role="button"], [tabindex="0"]').all();
  for (const btn of buttons) {
    const ariaLabel = await btn.getAttribute('aria-label');
    const text = await btn.textContent();
    const className = await btn.getAttribute('class');
    if (ariaLabel || (text && text.trim().length > 0 && text.trim().length < 20)) {
      console.log(`Button: aria-label="${ariaLabel}", text="${text?.trim()}", class="${className}"`);
    }
  }
  
  await browser.close();
})();