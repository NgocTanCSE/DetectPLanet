# AgriScan AI — React Native CLI (Android + Web)

> Ứng dụng chẩn đoán bệnh cây trồng cho nông dân, viết bằng React Native CLI (phiên bản 0.86.3), React 19. Đã chuyển hoàn toàn khỏi Expo SDK.

## Quick Start

```bash
# 1. Cài đặt dependencies
npm install

# 2. Khởi động Metro dev server
npm start

# 3. Chạy trên Android (emulator/thiết bị phải đang bật)
npm run android

# 4. Chạy web bundle (dùng để test nhanh trên trình duyệt)
npm run web:bundle   # build bundle -> web/index.bundle
npm run web:serve    # serve trên http://localhost:8081

# 5. Kiểm tra module + render (luôn chạy sau khi sửa code)
npm run validate     # 19/19 modules, 14/14 render tests
```

## Build Android

```bash
# Local production APK
npm run android:release   # ./gradlew assembleRelease -> app-release.apk
```

## Cấu trúc dự án

| Đường dẫn | Mô tả |
|-----------|-------|
| `index.js` | Entry native — đăng ký `App` với `AppRegistry` |
| `index.web.js` | Entry web — chạy qua `react-native-web` |
| `frontend/` | Tất cả component & màn hình React Native (thuộc flat structure) |
| `frontend/components/` | Thư viện component tái dùng: `Button`, `Card`, `Input`, `Avatar`, `Badge`, `Pill`, `SectionHeader`, `EmptyState`, `ProgressStep` |
| `frontend/App.js` | Navigation shell — định hướng màn hình, xử lý nútBack Android |
| `frontend/AppHeader.js` | Header chung — render icon actions, tiêu đề 2 dòng |
| `frontend/BottomNav.js` | Bottom navigation bar |
| `frontend/api.js` | Wrapper gọi API (fetch, timeout, retry, normalize URL ảnh) |
| `frontend/auth.js` | Xác thực Google OAuth + encrypted storage |
| `frontend/theme.js` | Design system: màu, typography, spacing, radius, z-index |
| `frontend/dto.js` | Kiểu dữ liệu (JSDoc typedef) + giá trị rỗng |
| `frontend/storage.js` | Lưu/lưu bỏ báo cáo lịch sử |
| `frontend/icons.js` | Hệ thống biểu tượng SVG (react-native-svg) |
| `frontend/ProgressCircle.js` | Thanh tiến trình tròn SVG |
| `frontend/useFonts.js` | Hook load font (đóng gói sẵn trong assets) |
| `android/` | Dự án Android native (RN CLI 0.86.3) |
| `assets/` | Icon, splash screen (PNG) |
| `metro.config.js` | Cấu hình Metro với hỗ trợ web |
| `_validate.js` | Script kiểm tra module resolution + render component |
| `tsconfig.json` | TypeScript config (dự án dùng JS thuần, file này giữ để tương lai) |
| `jsconfig.json` | JavaScript config |
| `babel.config.js` | Cấu hình Babel |
| `.env` | Biến môi trường (API_URL, REQUIRE_AUTH, GOOGLE_CLIENT_ID, …) |

## Màn hình (screens)

| Màn hình | File | Chức năng |
|----------|------|-----------|
| Đăng nhập | `frontend/LoginScreen.js` | Đăng nhập bằng Google |
| Trang chủ | `frontend/home/code.js` | Chào hỏi, hero CTA, báo cáo đã lưu, thống kê, bài viết |
| Chụp ảnh | `frontend/camera/code.js` | Chụp qua máy ảnh hệ thống, chọn từ thư viện, flash, lưới |
| Phân tích | `frontend/scan/code.js` | Thanh tiến trình thật, quy trình xử lý mẫu, nút tiếp tục |
| Kết quả | `frontend/result/code.js` | Báo cáo chẩn đoán, phác đồ can thiệp, tư vấn, lưu/chia sẻ |
| Lịch sử | `frontend/history/code.js` | Danh sách mẫu đã quét, lọc, tìm kiếm, thống kê 7 ngày |
| Cẩm nang | `frontend/guides/code.js` | Danh sách bài hướng dẫn dạng accordion |
| Cài đặt | `frontend/settings/code.js` | Tài khoản, thông tin ứng dụng, giới thiệu |
| Trò chuyện AI | `frontend/chat/code.js` | Gửi tin nhắn hỏi về bệnh cây |

## Biến môi trường (.env)

Xem `.env.example` để có toàn bộ biến. Các biến chính:

```bash
API_URL=http://10.0.2.2:887        # Android emulator localhost
REQUIRE_AUTH=false                 # Bật lên true để dùng Google OAuth
GOOGLE_CLIENT_ID=...               # Từ Google Cloud Console
GOOGLE_CLIENT_SECRET=...           # Từ Google Cloud Console
GOOGLE_REDIRECT_URI=com.agriscan.ai://auth
CLOUDFLARE_ACCOUNT_ID=...          # Cloudflare Workers AI
CLOUDFLARE_API_TOKEN=...           # Cloudflare Workers AI token
```

## Backend (Docker)

API viết bằng PHP 8.2 + PostgreSQL, chạy qua Docker:

```bash
# Khởi động toàn bộ stack (PostgreSQL + PHP API)
docker compose up --build -d

# Xem trạng thái container
docker compose ps

# Xem log
docker compose logs -f

# Dừng + xóa volume
docker compose down -v

# Truy cập PostgreSQL
npm run db:psql
```

API lắng nghe trên cổng 887. AI inference được offload sang Cloudflare Workers AI (không cần container AI cục bộ).

## Cải tiến đã thực hiện (phiên bản gần nhất)

- Thêm thư viện component tái dùng tại `frontend/components/` (9 component)
- Tái cấu trúc tất cả 9 màn hình để dùng component chung, giảm mã trùng lặp
- Sửa biểu tượng actions trên header (trước đây bị mất hoàn toàn)
- Sửa BottomNav hiển thị đúng trên mọi màn hình (trừ camera toàn màn hình & kết quả)
- Thêm xử lý nútBack phần cứng Android
- Sửa nhãn hành động sai chức năng (ví dụ "Thông báo" → "Lịch sử", "Cài đặt")
- Gỡ phần thời tiết giả trên trang chủ
- Sửa nút flash và lưới camera làm việc thật
- Sửa thanh tiến trình phân tích (không còn giả tiến độ)
- Gỡ khóa nút "Phân tích ngay" do heuristic chất lượng ảnh
- Xóa file debug-*.js, file E2E, ảnh chụp màn hình, design.md cũ, build artifact
- Kiểm tra an toàn: `npm run validate` pass 19/19 modules, 14/14 render tests