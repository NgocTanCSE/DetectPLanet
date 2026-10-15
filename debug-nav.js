const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Find bottom nav buttons by their exact text content
  const buttons = await page.locator('*').all();
  for (const btn of buttons) {
    const text = await btn.textContent();
    const ariaLabel = await btn.getAttribute('aria-label');
    const className = await btn.getAttribute('class');
    if (text && (text.includes('Trang chủ') || text.includes('Lịch sử') || text.includes('Cẩm nang') || text.includes('Chat AI') || text.includes('Cài đặt')) && text.trim().length < 20) {
      console.log(`Element: text="${text.trim()}", aria-label="${ariaLabel}", class="${className}"`);
    }
  }
  
  await browser.close();
})();