const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Check chat screen
  await page.click('text=Chat AI');
  await page.waitForTimeout(2000);
  
  await page.fill('input[placeholder="Nhập câu hỏi về bệnh cây..."]', 'Test message');
  await page.locator('[aria-label="Gửi tin nhắn"]').click({ force: true });
  await page.waitForTimeout(15000);
  
  const texts = await page.locator('*').evaluateAll(elements => 
    elements.map(el => el.textContent).filter(t => t && t.trim().length > 0)
  );
  
  console.log('=== CHAT SCREEN AFTER SEND ===');
  texts.filter(t => t.includes('Test') || t.includes('Xin lỗi') || t.includes('AgriScan') || t.includes('chào')).forEach(t => console.log(t.trim()));
  
  await browser.close();
})();