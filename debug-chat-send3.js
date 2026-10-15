const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Go to chat
  await page.click('text=Chat AI');
  await page.waitForTimeout(2000);
  
  // Count text elements before sending
  const beforeCount = await page.locator('text=Test message').count();
  console.log('Before send - "Test message" count:', beforeCount);
  
  // Fill and send
  await page.fill('input[placeholder="Nhập câu hỏi về bệnh cây..."]', 'Test message');
  
  // Check if input has the value
  const inputValue = await page.locator('input[placeholder="Nhập câu hỏi về bệnh cây..."]').inputValue();
  console.log('Input value:', inputValue);
  
  // Click send
  await page.locator('[aria-label="Gửi tin nhắn"]').click({ force: true });
  
  // Check immediately
  await page.waitForTimeout(1000);
  const afterImmediate = await page.locator('text=Test message').count();
  console.log('After 1s - "Test message" count:', afterImmediate);
  
  // Check after more time
  await page.waitForTimeout(10000);
  const afterWait = await page.locator('text=Test message').count();
  console.log('After 11s - "Test message" count:', afterWait);
  
  // Check for any error messages
  const errorMsg = await page.locator('text=Xin lỗi').count();
  console.log('Error message count:', errorMsg);
  
  // Check for all text nodes
  const allTexts = await page.locator('*').evaluateAll(elements => 
    elements.map(el => el.textContent).filter(t => t && t.includes('Test'))
  );
  console.log('All texts containing "Test":', allTexts);
  
  await browser.close();
})();