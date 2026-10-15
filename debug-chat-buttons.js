const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Click on "Chat AI" tab
  await page.click('text=Chat AI');
  await page.waitForTimeout(2000);
  
  const buttons = await page.locator('button, [role="button"], [tabindex="0"]').all();
  for (const btn of buttons) {
    const ariaLabel = await btn.getAttribute('aria-label');
    const text = await btn.textContent();
    const className = await btn.getAttribute('class');
    if (ariaLabel || (text && text.trim().length > 0 && text.trim().length < 20)) {
      console.log(`Button: aria-label="${ariaLabel}", text="${text?.trim()}", class="${className}"`);
    }
  }
  
  // Check input
  const inputs = await page.locator('input, textarea').all();
  for (const input of inputs) {
    const placeholder = await input.getAttribute('placeholder');
    const type = await input.getAttribute('type');
    const tag = await input.evaluate(el => el.tagName);
    console.log(`Input: tag=${tag}, placeholder="${placeholder}", type="${type}"`);
  }
  
  await browser.close();
})();