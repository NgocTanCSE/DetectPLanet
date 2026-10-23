# AgriScan Admin — React Native CLI (APK Android riêng)

App quản trị nội bộ cho AgriScan AI. **Không phải web app** — đây là dự án React Native CLI độc lập, build ra APK Android cài song song với app người dùng.

## Thông tin cơ bản

| Thuộc tính | Giá trị |
|---|---|
| Tên hiển thị | AgriScan Admin |
| Package ID | `com.agriscan.admin` |
| React Native | 0.86.3 |
| React | 19.2.3 |
| Platform | Android (x86_64 + arm64-v8a) |
| API backend | `http://10.0.2.2:887` (emulator) / IP LAN (máy thật) |
| Auth | `X-Admin-Token` (lưu EncryptedStorage) |

## Cài đặt & Chạy

```bash
cd frontend_admin
npm install

# Dev: cài debug APK + Metro (cổng 8082 — tránh conflict với app user trên 8081)
npm run android            # Metro cổng 8082, cài debug APK
npm run android:reverse    # adb reverse tcp:8082 tcp:8082

# Release APK (standalone, không cần Metro)
npm run android:release    # → android/app/build/outputs/apk/release/app-release.apk

# Validate JS bundle
npm run bundle:check

# Validate cấu trúc module + exports (78 checks)
npm run validate
```

**Yêu cầu**: Android SDK, emulator/device, Node.js 20+, JDK 17.

### Metro port: admin (8082) vs user (8081) — chạy đồng thời được!

| App | Thư mục | Metro port | Package ID |
|---|---|---|---|
| User app | `/DetectPLanet/` (root) | **8081** (default) | `com.agriscan.ai` |
| Admin app | `/DetectPLanet/frontend_admin/` | **8082** (custom) | `com.agriscan.admin` |

Hai app **có thể cài song song** trên 1 emulator (package ID khác nhau). Để chạy cùng lúc:

```bash
# Terminal 1 — Metro cho user app (port 8081)
cd /home/ngoctan/Downloads/DetectPLanet
npx react-native start --port 8081   # để chạy nền (Ctrl+C để dừng)

# Terminal 2 — Metro cho admin app (port 8082)
cd /home/ngoctan/Downloads/DetectPLanet/frontend_admin
npx react-native start --port 8082   # để chạy nền (Ctrl+C để dừng)

# Cài APK (từ 2 thư mục khác nhau)
cd /home/ngoctan/Downloads/DetectPLanet && npx react-native run-android --port 8081
cd /home/ngoctan/Downloads/DetectPLanet/frontend_admin && npx react-native run-android --port 8082

# ADB reverse cho cả 2 port
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8082 tcp:8082
```

> ⚠️ **Nếu chỉ chạy 1 app:** `npm run android` từ thư mục tương ứng — nó tự động khởi động Metro trên đúng port rồi cài APK. Không cần chạy Metro thủ công.

## Cấu trúc thư mục

```
frontend_admin/
├── android/                 # Android project (copy từ app chính, rename package)
│   └── app/src/main/java/com/agriscan/admin/
│       ├── MainActivity.kt
│       └── MainApplication.kt
├── src/
│   ├── App.js               # Entry: Shell + Drawer + ScreenTransition + Toast
│   ├── config.js            # DEFAULT_API_BASE, DEFAULT_ADMIN_TOKEN (từ react-native-config)
│   ├── theme.js             # Design token (color, font, radius, spacing)
│   ├── icons.js             # Vector icons (react-native-svg)
│   ├── api/client.js        # API client (fetch + X-Admin-Token + EncryptedStorage)
│   ├── hooks/useApi.js      # useApi, useDebounced
│   ├── utils/format.js      # fmtDate, fmtNumber, severityLabel, statusLabel...
│   ├── components/
│   │   ├── UI.js            # Screen, Card, Button, Input, Select, ModalSheet, Badge...
│   │   ├── Charts.js        # DayBars, HBar, SeverityBar
│   │   ├── Drawer.js        # Navigation drawer (12 màn, 5 nhóm)
│   │   ├── Toast.js         # Toast provider (success/error/info)
│   │   └── ScreenTransition.js
│   ├── utils/
│   │   ├── format.js        # fmtDate, fmtNumber, severityLabel, statusLabel...
│   │   └── motion.js        # useReduceMotion, MOTION tokens, staggerDelay
│   └── screens/             # 12 màn hình
│       ├── DashboardScreen.js
│       ├── UsersScreen.js
│       ├── ScansScreen.js
│       ├── GuidesScreen.js
│       ├── AlertsScreen.js
│       ├── CommunityScreen.js
│       ├── OfficialScreen.js
│       ├── NotificationsScreen.js
│       ├── AiReportsScreen.js
│       ├── AuditScreen.js
│       ├── SystemScreen.js
│       └── SettingsScreen.js
├── .env                     # API_URL + ADMIN_TOKEN (gitignore, build-time)
├── .env.example             # Template
├── app.json                 # { name: "AgriScanAdmin", displayName: "AgriScan Admin" }
├── index.js                 # AppRegistry.registerComponent(appName, () => App)
├── package.json
├── babel.config.js
├── metro.config.js
├── scripts/
│   └── validate.js        # Module + render validation (78 checks)
└── README.md
```

## Màn hình (12 màn)

| Màn | Route/Key | Chức năng chính |
|---|---|---|
| Dashboard | `Dashboard` | KPI cards, DayBars (quét/ngày), SeverityBar, HBar (bệnh/tỉnh), Activity feed, AI summary |
| Nhật ký quét | `Scans` | Tìm kiếm + filter (cây, mức độ), phân trang, modal chi tiết (ảnh + detections + pipeline), xoá mềm/khôi phục |
| Người dùng | `Users` | Tìm kiếm, tab trạng thái, modal detail (stats + recent scans), sửa tên, khoá/mở khoá (lý do), xoá mềm/khôi phục |
| Cẩm nang | `Guides` | Danh sách guide (switch publish), modal editor 2 cột: info + sections (CRUD + reorder mũi tên) |
| Cảnh báo | `Alerts` | CRUD, filter nguồn/tỉnh/cây/hiệu lực, toggle Switch, modal tạo/sửa |
| Báo cáo cộng đồng | `Community` | Tab pending/verified/rejected, duyệt/từ chối |
| Tin chính thức | `Official` | Tab pending/approved/rejected, duyệt/từ chối, modal nhập tay, modal nhập từ URL |
| Thông báo | `Notifications` | Compose broadcast (target all/province/crop/user + preview), lịch sử + tỉ lệ đọc, xoá |
| Báo cáo AI | `AiReports` | Chọn khoảng (7/30/90/tùy chỉnh) → Tổng hợp AI → xem highlights/actions → Lưu báo cáo |
| Lịch sử thao tác | `Audit` | Phân trang, filter action/table, modal chi tiết old/new values |
| Hệ thống | `System` | DB/AI health, job scheduler (chạy tay), counts bảng, config |
| Cài đặt | `Settings` | API base URL, Admin token (show/hide), Lưu EncryptedStorage, Kiểm tra kết nối `/admin/system` |

## Cấu hình (`.env`)

Tạo file `frontend_admin/.env` từ `.env.example`:

```bash
API_URL=http://10.0.2.2:887
ADMIN_TOKEN=your_admin_token_from_root_env
```

- **Build-time**: `react-native-config` đọc `.env` qua `dotenv.gradle`, nhúng vào `BuildConfig` và JS module `Config`.
- **Runtime**: Màn `SettingsScreen` ghi đè vào `EncryptedStorage` (keys: `agriscan_admin_api_base`, `agriscan_admin_token`). Giá trị runtime ưu tiên hơn build-time.

Lấy token thật từ root `.env`:
```bash
grep '^ADMIN_TOKEN=' .env | cut -d= -f2
```

## Emulator vs Máy thật

| Môi trường | API Base |
|---|---|
| Android Emulator | `http://10.0.2.2:887` (mặc định `.env`) |
| Thiết bị thật (USB) | `http://<IP_LAN_MÁY_CHỦ>:887` (đổi trong Cài đặt) |
| Genymotion | `http://10.0.3.2:887` |

Sau khi đổi `.env` hoặc cài đặt app, **rebuild APK** hoặc **reload Metro**.

## Build APK Release

```bash
cd frontend_admin/android
./gradlew assembleRelease -PreactNativeArchitectures=x86_64,arm64-v8a
# APK: app/build/outputs/apk/release/app-release.apk
```

- Ký bằng `debug.keystore` (đã copy từ app chính) — phù hợp cho nội bộ.
- Token `ADMIN_TOKEN` đã nhúng vào APK qua `react-native-config`.
- Cài: `adb install -r app-release.apk`

## Navigation (Drawer)

Mở bằng nút ☰ góc trái topbar. 5 nhóm:

1. **Tổng quan** — Dashboard
2. **Dữ liệu** — Nhật ký quét, Người dùng
3. **Nội dung** — Cẩm nang, Cảnh báo
4. **Cộng đồng** — Báo cáo cộng đồng, Tin chính thức
5. **Vận hành** — Thông báo, Báo cáo AI, Lịch sử thao tác, Hệ thống, Cài đặt

Chuyển trang có animation `ScreenTransition` (fade + translateY, native driver).

## Animation

Chỉ dùng `Animated` có sẵn của React Native (không Reanimated/Gesture Handler):

- `ScreenTransition`: fade + trượt 8px khi đổi màn (native driver)
- `Drawer`: slide từ trái, backdrop mờ (native driver)
- `Button/IconButton`: spring scale (0.94x) khi nhấn, qua `Animated.spring`
- `ModalSheet`: slide up từ dưới (`Modal animationType="slide"`)
- `Toast`: fade in/out (native driver)
- `DayBars/HBar/SeverityBar`: render thuần View (không SVG chart lib)

Tôn trợ `reduce-motion`: hook `useReduceMotion()` trong `utils/motion.js` tắt animation
và chuyển sang opacity feedback khi người dùng bật "Reduce Motion" trên thiết bị.

## Test trên Emulator

```bash
# Khởi động emulator
emulator -avd dtct -no-audio -no-boot-anim

# Cài debug + Metro
cd frontend_admin
npm run android

# Hoặc cài release APK standalone
npm run android:release
adb install -r android/app/build/outputs/apk/release/app-release.apk

# Mở app
adb shell monkey -p com.agriscan.admin -c android.intent.category.LAUNCHER 1

# Screenshot
adb exec-out screencap -p > admin.png
```

## API Admin (đều cần `X-Admin-Token`)

Xem chi tiết: `api/controllers/` + `api/middleware/admin.php`

| Module | Endpoints chính |
|---|---|
| Overview | `GET /admin/overview?range=7\|30\|90` |
| Users | `GET/POST/PATCH/DELETE /admin/users*`, `/suspend`, `/unsuspend`, `/restore` |
| Scans | `GET/DELETE/POST /admin/scans*`, `/restore` |
| Guides | `GET/POST/PATCH/DELETE /admin/guides*`, `/sections*`, `/reorder` |
| Alerts | `GET/POST/PATCH/DELETE /admin/alerts*`, `/toggle`, `/meta` |
| Community | `GET /admin/reports`, `POST /admin/reports/{id}/verify\|reject` |
| Official | `GET /admin/ingest`, `POST /admin/ingest/{id}/approve\|reject`, `/fetch`, manual create |
| Notifications | `GET /admin/notifications`, `POST /preview`, `/broadcast`, `GET/{id}`, `DELETE/{id}` |
| AI | `POST /admin/ai/summary`, `GET/POST/DELETE /admin/ai/reports*`, `/save` |
| Audit | `GET /admin/audit?action&table&page` |
| System | `GET /admin/system`, `POST /admin/jobs/run` |

## Lưu ý vận hành

- **Token**: APK release nhúng token build-time. Nếu token đổi → rebuild APK. Runtime có thể đổi trong Settings.
- **Xoá mềm**: User/Scan/Guide/Alert xoá = set `deleted_at`/`status='deleted'`, khôi phục được.
- **Khóa tài khoản**: Ưu tiên khoá (suspend) thay vì xoá. Khoá → thu hồi sessions, user nhận 403.
- **Backend rebuild**: Sửa PHP → `docker compose up -d --build api scheduler` (image không bind mount).
- **Docker**: API chạy `:887` trong container. Emulator truy cập `10.0.2.2:887`.
- **Song song**: App admin (`com.agriscan.admin`) và app user (`com.agriscan.ai`) cài cùng lúc không xung đột.

## Screenshots (emulator)

| Dashboard | Drawer | Users | Settings |
|---|---|---|---|
| ![Dashboard](/tmp/opencode/admin-dashboard-loaded.png) | ![Drawer](/tmp/opencode/admin-drawer.png) | ![Users](/tmp/opencode/admin-users.png) | ![Settings](/tmp/opencode/admin-settings.png) |

| Scans | System |
|---|---|
| ![Scans](/tmp/opencode/admin-scans.png) | ![System](/tmp/opencode/admin-system.png) |

## Troubleshooting

| Vấn đề | Nguyên nhân | Cách sửa |
|---|---|---|
| Metro không connect | Cổng 8082 bị chiếm (hoặc Metro chưa chạy) | `npm run start` trong `frontend_admin/`, rồi `adb reverse tcp:8082 tcp:8082` |
| API 401/403 | Token sai/hết hạn | Kiểm tra `.env` + Settings, rebuild APK |
| Ảnh không load | `getApiBase()` sai | Đổi API base trong Settings → IP LAN máy chủ |
| Build fail Gradle | Cache cũ | `cd android && ./gradlew clean` |
| `react-native-config` undefined | `.env` thiếu | Tạo `.env` từ `.env.example`, rebuild |

## Phiên bản & Changelog

- **1.2.0** (23/10/2026): Cấu hình Metro port 8082 để tránh conflict với app user (8081). Cập nhật `package.json` scripts (`start`, `android`, `android:reverse` dùng 8082), `metro.config.js` (server.port=8082), README hướng dẫn chạy 2 app đồng thời. Fix Button `Animated.View` layout (bỏ `flex: 1`, thêm `flexDirection: 'row'`).
- **1.1.0** (23/10/2026): Thêm `scripts/validate.js` (78 module+export checks), `useReduceMotion()` hook trong `utils/motion.js` (tôn trọng AccessibilityInfo), spring scale animation trên Button/IconButton. Update README cấu trúc.
- **1.0.0** (23/10/2026): Scaffold RN CLI, 12 màn hình, Drawer nav, Animated transition, EncryptedStorage config, react-native-config build-time, APK release 21MB x86_64.

## Liên quan

- App người dùng: `../frontend/` (React Native CLI, 4 tab)
- Backend API: `../api/` (PHP 8.2, PostgreSQL)
- Tài liệu tổng thể: `../AGENTS.md`
- Kế hoạch admin: `../tasks/admin-plan.md`