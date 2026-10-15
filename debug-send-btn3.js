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
  await page.waitForTimeout(500);
  
  // Get the send button element and check its handlers
  const sendBtnInfo = await page.evaluate(() => {
    const btn = document.querySelector('[aria-label="Gửi tin nhắm"], [aria-label="Gửi tin nhắn"]');
    if (!btn) {
      // Try to find by class
      const buttons = document.querySelectorAll('div');
      for (const b of buttons) {
        const al = b.getAttribute('aria-label');
        if (al === 'Gửi tin nhắn') {
          return {
            found: true,
            ariaLabel: al,
            className: b.className,
            hasOnPress: b.onclick !== null || b.getAttribute('onclick') !== null,
            listeners: JSON.stringify(getEventListeners(b)),
          };
        }
      }
      return { found: false };
    }
    return { found: true, ariaLabel: btn.getAttribute('aria-label') };
  });
  console.log('Send button info:', JSON.stringify(sendBtnInfo));
  
  // Try clicking with JavaScript
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('div');
    for (const b of buttons) {
      if (b.getAttribute('aria-label') === 'Gửi tin nhắn') {
        b.click();
        return 'clicked';
      }
    }
    return 'not found';
  });
  
  await page.waitForTimeout(5000);
  
  // Check for user message
  const msgCount = await page.locator('text=Test message').count();
  console.log('After JS click - message count:', msgCount);
  
  const allTestTexts = await page.locator('*').evaluateAll(elements => 
    elements.map(el => el.textContent).filter(t => t && t.includes('Test'))
  );
  console.log('All texts containing "Test":', allTestTexts);
  
  await browser.close();
})();