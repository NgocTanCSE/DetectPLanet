const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Check chat screen
  await page.click('text=Chat AI');
  await page.waitForTimeout(2000);
  
  await page.fill('input[placeholder="Nhập câu hỏi về bệnh cây..."]', 'Test message');
  await page.locator('[aria-label="Gửi tin nhắn"]').click({ force: true });
  await page.waitForTimeout(5000);
  
  // Check for user message in DOM
  const userMsg = await page.locator('text=Test message').count();
  console.log('User message count:', userMsg);
  
  // Check all message containers
  const msgContainers = await page.locator('[class*="msgContainer"]').all();
  console.log('Message containers:', msgContainers.length);
  
  for (const container of msgContainers) {
    const text = await container.textContent();
    console.log('Container text:', text?.trim());
  }
  
  await browser.close();
})();