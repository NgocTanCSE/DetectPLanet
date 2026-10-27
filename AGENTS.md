# Project Guide: AgriScan AI (React Native CLI)

This project has been **migrated from Expo Go (SDK 57) to pure React Native CLI**.
Expo SDK is fully removed — no `expo*` packages remain in `package.json`.

## React Native docs
- Main docs: https://reactnative.dev/
- Android setup: https://reactnative.dev/docs/environment-setup
- AppRegistry: https://reactnative.dev/docs/appregistry
- react-native-web: https://github.com/necolas/react-native-web
- react-native-image-picker: https://github.com/react-native-image-picker/react-native-image-picker
- react-native-encrypted-storage: https://github.com/emeraldsanto/react-native-encrypted-storage

## Build commands
```bash
npm start                  # Metro dev server
npm run android            # Run on connected emulator/device
npm run android:reverse    # adb reverse 8081 (Metro) + 1887 (Google OAuth relay)
npm run android:release    # Local production APK (build only, does not install)
npm run android:install    # Build APK + adb install -r
npm run validate           # Module + render validation (19/19, 14/14)
npm run web:bundle         # Bundle for web E2E
npm run web:serve          # Serve web on :8081
npm run e2e                # Playwright E2E (17 tests)
npx eas-cli build --platform android --profile production   # EAS cloud (needs Expo account)
```

## Background jobs (cảnh báo dịch bệnh)

```bash
# Xem trạng thái job gần nhất
curl -s http://localhost:887/health | python3 -m json.tool

# Chạy tay job thời tiết (34 tỉnh, ~40s) — cần JOB_SECRET trong .env
curl -s -X POST http://localhost:887/jobs/run \
  -H "Content-Type: application/json" \
  -H "X-Job-Token: $JOB_SECRET" \
  -d '{"job":"weather-risk"}'

# Hoặc chạy trong container
docker exec agriscan-api php /var/www/html/jobs/run.php weather-risk

# Test offline (không gọi mạng): dùng fixture + giới hạn tỉnh
docker exec -e WEATHER_FIXTURE=/var/www/html/tests/fixtures/open_meteo_blight.json \
  -e WEATHER_PROVINCES="Hà Nội" \
  agriscan-api php /var/www/html/jobs/run.php weather-risk

# Chạy test PHP
docker exec agriscan-api php /var/www/html/tests/run.php
```

Env liên quan (`/.env`):

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `WEATHER_ENABLED` | `1` | `0` = tắt hoàn toàn cảnh báo thời tiết |
| `RISK_THRESHOLD` | `40` | Điểm rủi ro tối thiểu để tạo cảnh báo (0–100) |
| `OPEN_METEO_BASE` | `https://api.open-meteo.com/v1/forecast` | Endpoint dự báo |
| `WEATHER_PROVINCES` | *(rỗng = 34 tỉnh)* | Giới hạn tỉnh khi test/ops |
| `JOB_SECRET` | random | Token cho `POST /jobs/run`; rỗng = tắt route |
| `OFFICIAL_ENABLED` | `0` | Bật job nhập tin chính thức (GĐ3) |
| `AUTO_APPROVE_OFFICIAL` | `false` | `true` = tự đăng tin đủ tỉnh + bệnh + mức độ (không đăng tin "hết dịch") |
| `ADMIN_TOKEN` | random | Token cho `/admin/ingest*`, `/admin/reports*`; rỗng = tắt route |
| `REQUIRE_AUTH` | `false` | `true` = bắt buộc Bearer token cho mọi route dữ liệu (GĐ4) |
| `REQUIRE_LOGIN` | `false` | `true` = app chặn ở màn Login ngay khi mở; `false` = mở Trang chủ, đăng nhập tự nguyện trong Cài đặt |
| `COMMUNITY_MIN_USERS` | `3` | Số người khác nhau tối thiểu để gom thành cảnh báo cộng đồng |

Scheduler (`agriscan-scheduler`) gọi `php jobs/run.php loop` mỗi 30 phút; job nào đã đến giờ
(theo bảng `job_runs`) thì chạy. Không cần cron hệ điều hành.

## Tin chính thức (GĐ3) — duyệt tay

`ppd.gov.vn` **không còn** mục cảnh báo cập nhật (bài mới nhất 2017, không RSS/sitemap).
Vì vậy job `official-feed` chỉ *đề xuất* tin vào bảng `official_ingest` (status `pending`),
mặc định không tự đăng. Chi tiết khảo sát: `tasks/notes-ppd.md`.

```bash
ADMIN=$(grep '^ADMIN_TOKEN=' .env | cut -d= -f2)

# 1. Chạy job (chỉ khi OFFICIAL_ENABLED=1)
docker exec -e OFFICIAL_ENABLED=1 agriscan-api php /var/www/html/jobs/run.php official-feed

# 2. Xem tin chờ duyệt
curl -s "http://localhost:887/admin/ingest?status=pending" -H "X-Admin-Token: $ADMIN"

# 3. Duyệt / từ chối
curl -s -X POST "http://localhost:887/admin/ingest/12/approve" -H "X-Admin-Token: $ADMIN"
curl -s -X POST "http://localhost:887/admin/ingest/12/reject"  -H "X-Admin-Token: $ADMIN"

# 4. Nhập tay (khi đọc công văn giấy / site tỉnh)
curl -s -X POST http://localhost:887/admin/ingest \
  -H "Content-Type: application/json" -H "X-Admin-Token: $ADMIN" \
  -d '{"title":"Nghệ An: công bố dịch đạo ôn","disease_label":"Bệnh đạo ôn",
       "province":"Nghệ An","crop":"rice","severity":"danger",
       "summary":"...","auto_publish":false}'

# 5. Nhập theo URL bài báo (tự bóc tỉnh/bệnh, vẫn chờ duyệt)
curl -s -X POST http://localhost:887/admin/ingest/fetch \
  -H "Content-Type: application/json" -H "X-Admin-Token: $ADMIN" \
  -d '{"url":"https://ppd.gov.vn/..."}'
```

Cảnh báo `source='official'` hết hạn sau 30 ngày kể từ `published_at`. Khi duyệt một tin,
hệ thống tự tắt cảnh báo `weather` trùng bệnh + khu vực để không hiện hai thẻ giống nhau.


## Báo cáo cộng đồng + thông báo (GĐ4)

Người dùng gửi báo cáo dịch (ẩn danh, tối đa 3/ngày). Job `aggregate-reports` chạy mỗi giờ:
≥3 người cùng tỉnh báo cùng bệnh trong 7 ngày → 1 cảnh báo `source='community'`
(≥5 người → `danger`), hiệu lực 7 ngày, kèm thông báo trong app cho người cùng tỉnh
đang theo dõi cây đó.

```bash
# Chạy job gom cụm
docker exec agriscan-api php /var/www/html/jobs/run.php aggregate-reports

# Test tích hợp (transaction + rollback, không để lại dữ liệu)
docker exec agriscan-api php /var/www/html/tests/integration_g4.php

# API (cần Bearer token)
curl -s http://localhost:887/reports -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://localhost:887/reports -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"disease_label":"Bệnh đạo ôn","crop":"rice","province":"Nghệ An","ward":"Diễn Châu"}'
curl -s -X POST http://localhost:887/reports/rep_xxx/confirm -H "Authorization: Bearer $TOKEN"
curl -s -X DELETE http://localhost:887/reports/rep_xxx -H "Authorization: Bearer $TOKEN"

# Thông báo
curl -s http://localhost:887/notifications -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:887/notifications/unread-count -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://localhost:887/notifications/read -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{}'

# Admin duyệt báo cáo
curl -s "http://localhost:887/admin/reports?status=pending" -H "X-Admin-Token: $ADMIN"
curl -s -X POST http://localhost:887/admin/reports/rep_xxx/verify -H "X-Admin-Token: $ADMIN"
curl -s -X POST http://localhost:887/admin/reports/rep_xxx/reject -H "X-Admin-Token: $ADMIN"
```

**Quyền riêng tư:** API công khai không trả `user_id`/email/tên — chỉ trả `mine` (báo cáo
của chính mình). Người dùng xoá được báo cáo của mình (`DELETE /reports/{id}`, người khác
nhận 403). Admin thấy email để chống spam, không hiển thị cho người dùng cuối.

**Đăng nhập:** mặc định app mở thẳng Trang chủ và cho dùng như khách; người dùng đăng nhập
Google trong **Cài đặt** khi muốn đồng bộ nhật ký / gửi báo dịch. Đặt `REQUIRE_LOGIN=true`
để chặn ở màn Login ngay khi mở, và `REQUIRE_AUTH=true` để backend đòi Bearer token.
Cả hai đọc lúc chạy — đổi xong chỉ cần reload Metro (backend cần `docker compose up -d api`).

**Google OAuth trên emulator/máy thật:** `GOOGLE_REDIRECT_URI` được ghim thành
`http://localhost:1887/auth/google/callback` (đúng URI đã đăng ký trong Google Console).
Cần `adb reverse tcp:1887 tcp:1887` (và `tcp:8081` cho Metro); cổng 887 không reverse được
vì dưới 1024. Nếu Google báo `Error 400: redirect_uri_mismatch`, kiểm tra lại 2 điều này.

## App quản trị (frontend_admin) — **React Native CLI (APK Android riêng)**

Bảng điều khiển nội bộ riêng, **React Native CLI 0.86** (dùng chung DB + API với app người dùng).
Tên hiển thị: **AgriScan Admin**, package: `com.agriscan.admin`.
Không có màn đăng nhập: mọi request gửi `X-Admin-Token` từ `EncryptedStorage` (cấu hình qua màn Cài đặt).

```bash
cd frontend_admin
npm install
npm run android            # Cài debug APK + Metro (cổng 8081)
npm run android:reverse    # adb reverse tcp:8081 tcp:8081
npm run android:release    # Build APK release (android/app/build/outputs/apk/release/app-release.apk)
npm run bundle:check       # Validate JS bundle
```

Màn hình: Dashboard, Nhật ký quét, Người dùng, Cẩm nang, Cảnh báo, Báo cáo cộng đồng,
Tin chính thức, Thông báo, Báo cáo AI, Lịch sử thao tác, Hệ thống, Cài đặt.

Backend admin (đều cần `X-Admin-Token`, xem `api/middleware/admin.php`):

- `admin/overview|system|audit` — KPI 7/30/90 ngày, health, audit log.
- `admin/users*` — sửa, **khoá có lý do**, mở khoá, xoá mềm, khôi phục.
- `admin/guides*`, `admin/alerts*`, `admin/scans*` — CRUD + reorder + xoá mềm/khôi phục.
- `admin/notifications*` — preview số người nhận, broadcast, thống kê đọc, xoá.
- `admin/ai/summary|reports*` — tổng hợp bằng Cloudflare Workers AI, lưu kèm `metrics` gốc.
- Route cũ dùng chung: `admin/ingest*` (duyệt tin chính thức), `admin/reports*` (duyệt báo cáo).

Job `weekly-ai-report` chạy **thứ Hai** qua scheduler (registry `weekday => 1`), tạo báo cáo
tuần và lưu vào `admin_reports`. Chạy tay:

```bash
docker exec agriscan-api php /var/www/html/jobs/run.php weekly-ai-report
```

Lưu ý vận hành:

- Token lưu trong `EncryptedStorage` thiết bị; APK release nhúng token build-time từ `frontend_admin/.env` (đọc qua `react-native-config`).
- Xoá người dùng là xoá mềm (`deleted_at`, `status='deleted'`), khôi phục được; tài khoản
  bị khoá/xoá nhận 403 khi gọi API.
- Sửa PHP phải `docker compose up -d --build api scheduler` (image không bind mount).
- Emulator: API base mặc định `http://10.0.2.2:887`; máy thật đổi trong Cài đặt → IP LAN máy chủ.
- Chỉ cài song song app người dùng (`com.agriscan.ai`) — không xung đột.

## Animation (chuyển trang + phần tử)

Toàn bộ dùng `Animated` có sẵn của React Native — **không** thêm Reanimated /
Gesture Handler, nên không phải build lại APK.

| File | Vai trò |
|---|---|
| `frontend/utils/motion.js` | token thời lượng/easing/lò xo, `staggerDelay()`, `useReduceMotion()`, `useCountUp()` |
| `frontend/components/motion/FadeInView.js` | khối xuất hiện (opacity + translate + scale), có `delay` để so le |
| `frontend/components/motion/ScreenTransition.js` | bọc `ActiveScreen` trong `App.js`, trượt theo hướng `forward` / `back` / `tab` |
| `frontend/components/Card.js`, `Button.js` | nhún nhẹ (spring scale) khi chạm |
| `frontend/components/layout/BottomNav.js` | icon tab active pop + chấm xanh fade/scale |

Quy ước khi thêm mới:

- Chỉ animate `opacity` + `transform` để dùng native driver (`nativeDriver` trong
  `utils/motion.js` tự tắt trên web).
- Danh sách dùng `delay={staggerDelay(index)}` để so le, tối đa ~8 item.
- Tôn trọng "giảm chuyển động": hook `useReduceMotion()` trả `true` thì hiện ngay,
  không animate.
- Hướng chuyển trang do `getTransitionDirection(from, to)` trong `App.js` quyết định;
  thêm màn mới thì bổ sung vào `SCREEN_TAB_INDEX` nếu nó thuộc một tab.

## Lỗi thường gặp khi chạy dev

**1. Metro báo `An unknown error occurred while installing React Native DevTools` +
`The SUID sandbox helper binary ... chrome-sandbox is owned by root and has mode 4755`.**
Electron của DevTools cần `chrome-sandbox` thuộc root. Sửa một lần:

```bash
sudo chown root:root ~/.cache/dotslash/64/*/React\ Native\ DevTools-linux-x64/chrome-sandbox
sudo chmod 4755 ~/.cache/dotslash/64/*/React\ Native\ DevTools-linux-x64/chrome-sandbox
```

Không có sudo thì chạy tạm: `ELECTRON_DISABLE_SANDBOX=1 npm start`
(lỗi này **không** ảnh hưởng bundler — chỉ `j`/DevTools không mở được).

**2. Trình duyệt trong emulator báo `localhost refused to connect` / `ERR_CONNECTION_REFUSED`
ở `http://localhost:1887/auth/google/start`.**
`adb reverse` bị mất mỗi lần khởi động lại emulator/adb. Chạy lại:

```bash
npm run android:reverse        # 8081 (Metro) + 1887 (Google OAuth relay)
```

**3. APK release mở lên nhưng mọi dữ liệu trống (`Chưa có dữ liệu`), không có request nào
tới API.** Nguyên nhân: plugin Gradle của RN 0.86 ép
`manifestPlaceholders["usesCleartextTraffic"]="false"` cho **mọi** build release, nên
placeholder cũ trong `AndroidManifest.xml` làm release chặn toàn bộ HTTP tới
`10.0.2.2:887`. Manifest giờ ghi cứng `android:usesCleartextTraffic="true"` — **đừng**
đổi lại thành `${usesCleartextTraffic}`. Khi backend có domain HTTPS thì thay bằng
`network_security_config`.

**4. `npm run android:release` chỉ build APK, KHÔNG cài.** Dùng:

```bash
npm run android:install        # build + adb install -r
```

