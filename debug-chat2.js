const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Click on "Chat AI" tab
  await page.click('text=Chat AI');
  await page.waitForTimeout(2000);
  
  // Check for input elements
  const inputs = await page.locator('input, textarea').all();
  for (const input of inputs) {
    const placeholder = await input.getAttribute('placeholder');
    const type = await input.getAttribute('type');
    const tag = await input.evaluate(el => el.tagName);
    console.log(`Input: tag=${tag}, placeholder="${placeholder}", type="${type}"`);
  }
  
  // Check for elements with specific text
  const allElements = await page.locator('*').all();
  for (const el of allElements) {
    const text = await el.textContent();
    if (text && text.includes('Nhập câu hỏi')) {
      console.log('Found placeholder text:', text.trim());
    }
  }
  
  await browser.close();
})();