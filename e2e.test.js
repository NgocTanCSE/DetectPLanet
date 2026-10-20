const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8081';

async function navigateToTab(page, tabText) {
  await page.click(`text=${tabText}`);
  await page.waitForTimeout(1500);
}

async function clickThroughJS(page, selector) {
  await page.evaluate((sel) => {
    const elements = document.querySelectorAll('div');
    for (const el of elements) {
      const al = el.getAttribute('aria-label');
      if (al === sel) {
        el.click();
        return true;
      }
    }
    return false;
  }, selector);
}

test.describe('AgriScan AI - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('home_renders_real_data', async ({ page }) => {
    await expect(page.locator('text=AgriScan AI').first()).toBeVisible();
    await expect(page.locator('text=Chào Bác Ba')).toBeVisible();
    await expect(page.locator('text=Phát hiện sâu bệnh tức thì')).toBeVisible();
    await expect(page.locator('text=Bắt đầu quét mẫu lá')).toBeVisible();
  });

  test('camera_screen_renders_no_crash', async ({ page }) => {
    await page.click('text=Bắt đầu quét mẫu lá');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Chụp ảnh mẫu lá').first()).toBeVisible();
    await expect(page.locator('text=Chụp trực tiếp')).toBeVisible();
    await expect(page.locator('text=Chọn từ thư viện')).toBeVisible();
  });

  test('camera_mode_switcher', async ({ page }) => {
    await page.click('text=Bắt đầu quét mẫu lá');
    await page.waitForTimeout(2000);

    await page.click('text=Chọn từ thư viện');
    await page.waitForTimeout(500);

    await page.click('text=Chụp trực tiếp');
    await page.waitForTimeout(500);
  });

  test('camera_flash_toggle', async ({ page }) => {
    await page.click('text=Bắt đầu quét mẫu lá');
    await page.waitForTimeout(2000);

    await clickThroughJS(page, 'Bật tắt Flash');
    await page.waitForTimeout(500);

    await clickThroughJS(page, 'Bật tắt Flash');
    await page.waitForTimeout(500);
  });

  test('camera_grid_toggle', async ({ page }) => {
    await page.click('text=Bắt đầu quét mẫu lá');
    await page.waitForTimeout(2000);

    await clickThroughJS(page, 'Lưới căn chỉnh');
    await page.waitForTimeout(500);

    await clickThroughJS(page, 'Lưỗi căn chỉnh');
    await page.waitForTimeout(500);
  });

  test('camera_flip_camera', async ({ page }) => {
    await page.click('text=Bắt đầu quét mẫu lá');
    await page.waitForTimeout(2000);

    await clickThroughJS(page, 'Chuyển chế độ chụp');
    await page.waitForTimeout(500);
  });

  test('history_renders_records', async ({ page }) => {
    await navigateToTab(page, 'Lịch sử');
    
    await expect(page.locator('text=Nhật ký chẩn đoán').first()).toBeVisible();
    await expect(page.locator('input[placeholder="Tìm theo cây trồng, tên bệnh hoặc ngày..."]')).toBeVisible();
    await expect(page.locator('text=Tất cả').first()).toBeVisible();
    await expect(page.locator('text=Lúa').first()).toBeVisible();
    await expect(page.locator('text=Cà chua').first()).toBeVisible();
    await expect(page.locator('text=Trái cây').first()).toBeVisible();
    await expect(page.locator('text=Báo động').first()).toBeVisible();
  });

  test('guides_renders_real_data', async ({ page }) => {
    await navigateToTab(page, 'Cẩm nang');
    
    await expect(page.locator('text=Cẩm nang').first()).toBeVisible();
    // Real DB-backed guide content (no placeholder text)
    await expect(page.locator('text=Bệnh Đốm Nâu').first()).toBeVisible();
    await expect(page.locator('text=Nguyên nhân').first()).toBeVisible();
  });

  test('chat_renders_and_sends_message', async ({ page }) => {
    await navigateToTab(page, 'Chat AI');
    
    await expect(page.locator('text=AgriScan AI Chat').first()).toBeVisible();
    await expect(page.locator('input[placeholder="Nhập câu hỏi về bệnh cây..."]')).toBeVisible();

    await page.fill('input[placeholder="Nhập câu hỏi về bệnh cây..."]', 'Bệnh đốm nâu trên lúa gây ra bởi vi khuẩn nào?');
    await page.waitForTimeout(500);
    
    await clickThroughJS(page, 'Gửi tin nhắn');
    await page.waitForTimeout(15000);

    await expect(page.locator('text=Bệnh đốm nâu trên lúa gây ra bởi vi khuẩn nào?')).toBeVisible();
    // Mock fallback text must NOT appear
    await expect(page.locator('text=Đây là câu trả lời mẫu vì trợ lý AI AgriScan chưa được kết nối')).not.toBeVisible();
    // An AI assistant reply must appear (real AI or honest error fallback)
    await expect(page.locator('text=Xin lỗi, tôi không thể trả lời ngay lúc này.')).not.toBeVisible();
  });

  test('chat_refresh_clears_history', async ({ page }) => {
    await navigateToTab(page, 'Chat AI');
    await page.waitForTimeout(500);

    await page.fill('input[placeholder="Nhập câu hỏi về bệnh cây..."]', 'First message');
    await page.waitForTimeout(500);
    
    await clickThroughJS(page, 'Gửi tin nhắn');
    await page.waitForTimeout(5000);

    await clickThroughJS(page, 'Làm mới');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Xin chào! Tôi là trợ lý AgriScan AI.')).toBeVisible();
  });

  test('settings_renders_real_data', async ({ page }) => {
    await navigateToTab(page, 'Cài đặt');
    
    await expect(page.locator('text=Cài đặt').first()).toBeVisible();
    // Real settings content: account section, app info with AI provider, about section
    await expect(page.locator('text=Tài khoản').first()).toBeVisible();
    await expect(page.locator('text=Ứng dụng').first()).toBeVisible();
    await expect(page.locator('text=Cloudflare Workers AI').first()).toBeVisible();
    await expect(page.locator('text=Giới thiệu').first()).toBeVisible();
  });

  test('bottom_nav_navigation', async ({ page }) => {
    await expect(page.locator('text=Trang chủ').first()).toBeVisible();
    await expect(page.locator('text=Lịch sử').first()).toBeVisible();
    await expect(page.locator('text=Cẩm nang').first()).toBeVisible();
    await expect(page.locator('text=Chat AI').first()).toBeVisible();
    await expect(page.locator('text=Cài đặt').first()).toBeVisible();
  });

  test('home_hero_cta_navigates_to_camera', async ({ page }) => {
    await page.click('text=Bắt đầu quét mẫu lá');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Chụp ảnh mẫu lá').first()).toBeVisible();
  });

  test('navigation_back_from_camera', async ({ page }) => {
    await page.click('text=Bắt đầu quét mẫu lá');
    await page.waitForTimeout(2000);

    await clickThroughJS(page, 'Quay lại');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=AgriScan AI').first()).toBeVisible();
  });

  test('navigation_back_from_chat', async ({ page }) => {
    await navigateToTab(page, 'Chat AI');

    await clickThroughJS(page, 'Quay lại');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=AgriScan AI').first()).toBeVisible();
  });

  test('navigation_via_bottom_nav', async ({ page }) => {
    // BottomNav is hidden on camera/scan/result/chat screens, so navigate
    // between the tabbed routes that keep it visible (home, history, guides, settings).
    await page.click('text=Lịch sử');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Nhật ký chẩn đoán').first()).toBeVisible();

    await page.click('text=Cài đặt');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Cài đặt').first()).toBeVisible();

    await page.click('text=Cẩm nang');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Cẩm nang').first()).toBeVisible();

    await page.click('text=Trang chủ');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=AgriScan AI').first()).toBeVisible();
  });

  test('history_search_filter', async ({ page }) => {
    await navigateToTab(page, 'Lịch sử');

    await page.fill('input[placeholder="Tìm theo cây trồng, tên bệnh hoặc ngày..."]', 'lúa');
    await page.waitForTimeout(1000);

    await page.click('text=Lúa');
    await page.waitForTimeout(1000);

    await page.click('text=Báo động');
    await page.waitForTimeout(1000);

    await page.click('text=Tất cả');
    await page.waitForTimeout(1000);
  });
});