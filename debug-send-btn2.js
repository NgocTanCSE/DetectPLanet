const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Go to chat
  await page.click('text=Chat AI');
  await page.waitForTimeout(2000);
  
  // Fill input
  await page.fill('input[placeholder="Nhập câu hỏi về bệnh cây..."]', 'Test message');
  await page.waitForTimeout(1000);
  
  // Check send button state
  const sendBtn = page.locator('[aria-label="Gửi tin nhắn"]');
  const isDisabled = await sendBtn.getAttribute('data-disabled');
  console.log('Send button data-disabled:', isDisabled);
  
  // Check class
  const className = await sendBtn.getAttribute('class');
  console.log('Send button class:', className);
  
  // Check for pointer events
  const computedStyle = await sendBtn.evaluate(el => {
    const style = window.getComputedStyle(el);
    return {
      pointerEvents: style.pointerEvents,
      opacity: style.opacity,
      cursor: style.cursor,
    };
  });
  console.log('Send button styles:', JSON.stringify(computedStyle));
  
  // Try clicking directly
  await sendBtn.click({ force: true });
  await page.waitForTimeout(2000);
  
  // Check for user message
  const msgCount = await page.locator('text=Test message').count();
  console.log('After click - message count:', msgCount);
  
  await browser.close();
})();