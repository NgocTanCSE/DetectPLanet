const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Click on "Chat AI" tab
  await page.click('text=Chat AI');
  await page.waitForTimeout(2000);
  
  // Find the send button - it's a TouchableOpacity that wraps the send icon
  const sendBtn = await page.locator('[aria-label="Gửi tin nhắn"]').first();
  const exists = await sendBtn.count();
  console.log('Send button exists:', exists);
  
  // Also check all elements with "Gửi" in aria-label or text
  const allBtns = await page.locator('*').all();
  for (const btn of allBtns) {
    const ariaLabel = await btn.getAttribute('aria-label');
    const text = await btn.textContent();
    if (ariaLabel && ariaLabel.includes('Gửi')) {
      console.log('Found send button by aria-label:', ariaLabel);
    }
    if (text && text.includes('Gửi')) {
      console.log('Found send button by text:', text.trim());
    }
  }
  
  await browser.close();
})();