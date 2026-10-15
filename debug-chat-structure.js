const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Go to chat
  await page.click('text=Chat AI');
  await page.waitForTimeout(2000);
  
  // Get all div elements
  const allDivs = await page.locator('div').all();
  console.log('Total divs:', allDivs.length);
  
  // Find elements containing chat-related text
  const allElements = await page.locator('*').all();
  for (const el of allElements) {
    const text = await el.textContent();
    if (text && (text.includes('AgriScan AI') || text.includes('Xin chào') || text.includes('AgriScan AI Chat'))) {
      const className = await el.getAttribute('class') || '';
      console.log(`Element: text="${text.trim().substring(0, 60)}", class="${className.substring(0, 80)}"`);
    }
  }
  
  await browser.close();
})();