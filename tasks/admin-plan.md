# Kế hoạch: AgriScan Admin (`frontend_admin`) — **React Native CLI (APK Android riêng)**

> Trạng thái: **đã triển khai (23/10/2026)** — backend + 12 màn hình RN CLI hoạt động với dữ liệu thật.
> Ngày lập: 23/10/2026

---

## 1. Mục tiêu

Xây một **app Android riêng (React Native CLI)** tại `frontend_admin/`, dùng **cùng database PostgreSQL và cùng API PHP** của app người dùng, để:
- Cài song song với app người dùng (`com.agriscan.ai` vs `com.agriscan.admin`).
- Toàn bộ 12 màn hình: Dashboard, Nhật ký quét, Người dùng, Cẩm nang, Cảnh báo, Báo cáo cộng đồng, Tin chính thức, Thông báo, Báo cáo AI, Lịch sử thao tác, Hệ thống, Cài đặt.
- Không cần màn đăng nhập — mọi request gửi `X-Admin-Token` từ `EncryptedStorage` (cấu hình qua màn Cài đặt).

---

## 2. Phạm vi

### Làm
| Nhóm | Nội dung |
|---|---|
| Dashboard | KPI, biểu đồ theo thời gian (DayBars, HBar, SeverityBar), phân bố bệnh/mức độ, top tỉnh, hoạt động gần đây, tổng hợp AI |
| Người dùng | Danh sách, tìm kiếm, xem chi tiết (modal), sửa tên, khóa/mở khóa, xóa mềm/khôi phục |
| Cẩm nang | CRUD guide + CRUD section + sắp xếp thứ tự kéo-thả (modal editor) |
| Cảnh báo | CRUD `crop_disease_alerts`, lọc theo nguồn/tỉnh/cây/hiệu lực, toggle bật/tắt |
| Nhật ký quét | Bảng phân trang, lọc, xem chi tiết (modal, ảnh + detections + pipeline), xóa mềm/khôi phục |
| Báo cáo cộng đồng | Hàng chờ duyệt, xác minh/từ chối (API có sẵn) |
| Tin chính thức | Hàng chờ duyệt, duyệt/từ chối, nhập tay, nhập theo URL (API có sẵn) |
| Thông báo | Soạn broadcast (tất cả / theo tỉnh / theo cây / 1 người), lịch sử, tỉ lệ đọc, xoá |
| AI | Tổng hợp số liệu → tóm tắt + điểm bất thường + khuyến nghị; lưu báo cáo; xem chi tiết metrics |
| Hệ thống | Health, trạng thái job nền (chạy tay), cấu hình AI, audit log |
| Cài đặt | API base URL + Admin token (lưu EncryptedStorage), kiểm tra kết nối |

### Không làm (trừ khi bạn yêu cầu thêm)
- Phân quyền nhiều cấp admin / đăng nhập riêng cho admin.
- Upload ảnh trong cẩm nang (hiện schema chưa có cột ảnh).
- Sửa trực tiếp dữ liệu AI đã chẩn đoán (chỉ xem/xóa mềm).
- Realtime websocket (dùng polling 30–60s).
- iOS build (chỉ Android APK).

---

## 3. Kiến trúc & công nghệ

```
┌──────────────────────────┐        ┌──────────────────────────┐
│ frontend_admin (RN CLI)  │  /api  │ API PHP (Docker :887)    │
│ React Native 0.86.3      │ ─────► │ AdminController mới      │
│ Animated (chuyển trang)  │        │ + controllers cũ tái dùng│
│ Design token (theme.js)  │        └──────────┬───────────────┘
└──────────────────────────┘                   │ PDO
                                               ▼
                                      PostgreSQL (agriscan)
```

**Stack**: React Native CLI 0.86.3 + React 19.2.3 + `react-native-safe-area-context` + `react-native-svg` + `react-native-encrypted-storage` + `react-native-config`. Không TypeScript, không Reanimated/Gesture Handler (dùng `Animated` có sẵn của RN).

**Design token** lấy từ `frontend/utils/theme.js` (app người dùng) và mở rộng:
- Nền `#f6f8fb`, paper `#ffffff`, viền `#e2e8f0`
- Chữ `#0f172a`, muted `#94a3b8`
- Primary `#22c55e`, cảnh báo `#f59e0b`, nguy hiểm `#ef4444`
- Font: Inter (Regular/SemiBold/Bold) + Geist

**Chạy dev**:
```bash
cd frontend_admin
npm install
npm run android            # Cài debug APK + Metro (cổng 8081)
npm run android:reverse    # adb reverse tcp:8081 tcp:8081
```

**Build APK release**:
```bash
npm run android:release    # → android/app/build/outputs/apk/release/app-release.apk
```

**Validate JS bundle**:
```bash
npm run bundle:check       # react-native bundle --platform android --dev false
```

**Bảo mật (không đăng nhập)**:
- `frontend_admin/.env`: `API_URL=http://10.0.2.2:887`, `ADMIN_TOKEN=<ADMIN_TOKEN trong .env gốc>`.
- Build-time: `react-native-config` + `dotenv.gradle` nhúng token vào APK release.
- Runtime: Token/API base lưu trong `EncryptedStorage`, ưu tiên hơn giá trị build-time.
- Mọi request admin gửi header `X-Admin-Token`.
- Chỉ dùng nội bộ/LAN, không public Internet.

---

## 4. Thay đổi backend
## 4. Thay đổi backend

### 4.1 Schema mới (idempotent, thêm vào `api/services/schema.php` + mirror vào `db/agriscan_schema_postgres.sql`)

```sql
-- Khóa / mở khóa người dùng
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);

-- Báo cáo do AI tổng hợp, lưu lại để tra cứu
CREATE TABLE IF NOT EXISTS admin_reports (
  id           VARCHAR(32) PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  summary      TEXT NOT NULL,
  highlights   JSONB,
  actions      JSONB,
  metrics      JSONB,
  model        VARCHAR(128) NOT NULL DEFAULT '',
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_reports_created ON admin_reports (created_at DESC);

-- Một lần gửi thông báo hàng loạt
CREATE TABLE IF NOT EXISTS notification_broadcasts (
  id           VARCHAR(32) PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  body         TEXT NOT NULL,
  type         VARCHAR(32) NOT NULL DEFAULT 'info',
  target       VARCHAR(16) NOT NULL DEFAULT 'all',   -- all|province|crop|user
  target_value VARCHAR(128) NOT NULL DEFAULT '',
  recipients   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS broadcast_id VARCHAR(32) NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_broadcast ON notifications (broadcast_id);

-- Cẩm nang: thứ tự hiển thị + bật/tắt
ALTER TABLE guides ADD COLUMN IF NOT EXISTS sort_order SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS is_published SMALLINT NOT NULL DEFAULT 1;
```

### 4.2 CORS (`api/middleware/cors.php`)

- Thêm `X-Admin-Token` vào `Access-Control-Allow-Headers`.
- Thêm `DELETE, PATCH, PUT` vào `Access-Control-Allow-Methods`.
- Thêm origin admin dev vào `ALLOWED_ORIGINS` (`http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:8080`).

### 4.3 Chặn người dùng bị khóa

- `getUserIdFromToken()` / `AuthController::handleMe()`: nếu `users.status = 'suspended'` → trả 403 `{error:'account_suspended'}`, xóa session.
- `POST /auth/google`: từ chối đăng nhập mới nếu email thuộc user đang bị khóa.
- App người dùng hiện tại sẽ hiện lỗi khi gọi API — cần thêm thông báo thân thiện ở `frontend/services/auth.js` (nhỏ, 1 chỗ).

### 4.4 API mới

Tất cả nằm dưới `/admin/*`, dùng chung kiểm tra `X-Admin-Token` (tách thành helper `requireAdmin()` để tái dùng).

| Method | Route | Chức năng |
|---|---|---|
| GET | `/admin/overview?range=7\|30\|90` | KPI + chuỗi theo ngày + phân bố + top list + hoạt động gần đây |
| GET | `/admin/scans?q&crop&severity&status&from&to&page&per_page` | Nhật ký quét (join users, crops) |
| GET | `/admin/scans/{id}` | Chi tiết 1 lượt quét (kèm detections, pipeline) |
| DELETE | `/admin/scans/{id}` | Xóa mềm (`deleted_at`) |
| POST | `/admin/scans/{id}/restore` | Khôi phục |
| GET | `/admin/users?q&status&page` | Danh sách + số lượt quét mỗi người |
| GET | `/admin/users/{id}` | Chi tiết + thống kê + 10 lượt quét gần nhất |
| PATCH | `/admin/users/{id}` | Sửa `name`, `email` |
| POST | `/admin/users/{id}/suspend` | Khóa (kèm `reason`) |
| POST | `/admin/users/{id}/unsuspend` | Mở khóa |
| DELETE | `/admin/users/{id}` | Xóa vĩnh viễn (cascade scans/sessions/notifications) |
| GET | `/admin/guides` | Danh sách kèm sections |
| POST | `/admin/guides` | Tạo guide |
| PATCH | `/admin/guides/{id}` | Sửa guide |
| DELETE | `/admin/guides/{id}` | Xóa guide (cascade sections) |
| POST | `/admin/guides/{id}/sections` | Thêm mục |
| PATCH | `/admin/guides/{id}/sections/{sid}` | Sửa mục |
| DELETE | `/admin/guides/{id}/sections/{sid}` | Xóa mục |
| POST | `/admin/guides/{id}/sections/reorder` | Đổi thứ tự |
| GET | `/admin/alerts?q&source&province&crop&active&page` | Danh sách cảnh báo |
| POST | `/admin/alerts` | Tạo cảnh báo |
| PATCH | `/admin/alerts/{id}` | Sửa |
| DELETE | `/admin/alerts/{id}` | Xóa |
| GET | `/admin/notifications` | Lịch sử broadcast |
| POST | `/admin/notifications/broadcast` | Gửi thông báo |
| GET | `/admin/notifications/{id}` | Chi tiết + số người đã đọc |
| GET | `/admin/ai/reports` | Danh sách báo cáo AI đã lưu |
| POST | `/admin/ai/summary` | Sinh tóm tắt bằng AI (không lưu) |
| POST | `/admin/ai/reports` | Lưu báo cáo AI |
| DELETE | `/admin/ai/reports/{id}` | Xóa báo cáo |
| GET | `/admin/audit?page&action&table` | Audit log |
| GET | `/admin/system` | Health, job runs, cấu hình AI, dung lượng dữ liệu |

**Tái dùng, không viết lại**: `GET/POST /admin/reports*` (duyệt báo cáo cộng đồng), `GET/POST /admin/ingest*` (tin chính thức).

### 4.5 Quy ước chung

- Response danh sách: `{ items: [], page, per_page, total, total_pages }`.
- Lỗi: `{ error, message }` (giữ như hiện tại).
- Mọi thao tác ghi đều ghi `audit_log` với `action` dạng `admin.user.suspend`, `admin.guide.update`, `admin.alert.delete`, `admin.broadcast.create`…
- Validate đầu vào: độ dài, enum (`severity`, `type`, `source`), ngày hợp lệ; trả 400 kèm field lỗi.

---

## 5. Giao diện admin

**Layout**: sidebar trái (240px, thu gọn được) + topbar (breadcrumb, ô tìm kiếm nhanh, nút "Tạo mới" theo ngữ cảnh) + vùng nội dung.

| Route | Trang | Thành phần chính |
|---|---|---|
| `/` | Tổng quan | 4–6 KPI card, biểu đồ quét theo ngày, donut mức độ, top bệnh, top tỉnh, feed hoạt động, panel "Tổng hợp AI" |
| `/scans` | Nhật ký quét | FilterBar (tìm, cây, mức độ, trạng thái, khoảng ngày), DataTable, drawer chi tiết, nút xóa/khôi phục |
| `/users` | Người dùng | DataTable (avatar, tên, email, ngày tạo, số lượt quét, trạng thái), modal sửa, menu khóa/xóa |
| `/guides` | Cẩm nang | Danh sách guide (kéo thả thứ tự), editor 2 cột: thông tin guide + danh sách section (thêm/sửa/xóa/đổi thứ tự) |
| `/alerts` | Cảnh báo | Bảng + filter, modal tạo/sửa (cây, bệnh, tỉnh, mức độ, mùa vụ, mô tả, khuyến xử lý, hiệu lực), toggle bật/tắt |
| `/community` | Báo cáo cộng đồng | Hàng chờ, nhóm theo tỉnh+bệnh, nút xác minh/từ chối |
| `/official` | Tin chính thức | Hàng chờ, duyệt/từ chối, form nhập tay, ô nhập URL để bóc tách |
| `/notifications` | Thông báo | Composer (tiêu đề, nội dung, loại, đối tượng), preview số người nhận, lịch sử broadcast + tỉ lệ đọc |
| `/ai` | Báo cáo AI | Chọn khoảng thời gian → "Tổng hợp", hiển thị tóm tắt/điểm bất thường/khuyến nghị, nút "Lưu báo cáo", danh sách báo cáo đã lưu |
| `/audit` | Lịch sử thao tác | Bảng phân trang, filter theo hành động/bảng |
| `/system` | Hệ thống | DB/AI/job status, nút chạy job thủ công (đã có `POST /jobs/run`), thông tin phiên bản |

**Component dùng lại**: `StatCard`, `ChartCard`, `DataTable` (sort + phân trang), `FilterBar`, `Modal`, `Drawer`, `ConfirmDialog`, `Toast`, `Badge`, `EmptyState`, `Skeleton`.

**Chi tiết UI**: bảng gọn (dòng 48px), số liệu tabular-nums, badge màu theo mức độ, biểu đồ không viền thừa, tối đa 2 font weight. Không dùng gradient/shadow nặng — đồng bộ ngôn ngữ "flat, border-only" của app.

---

## 6. Dashboard — chỉ số & biểu đồ

**KPI (theo khoảng thời gian chọn)**
- Người dùng: tổng · mới trong kỳ · đang hoạt động (có quét 7 ngày) · bị khóa
- Lượt quét: trong kỳ · hôm nay · tỉ lệ lỗi · độ tin cậy trung bình
- Cảnh báo: đang hiệu lực · theo nguồn (weather/official/community/manual) · sắp hết hạn ≤3 ngày
- Hàng chờ: báo cáo cộng đồng · tin chính thức

**Biểu đồ**
1. Area chart: lượt quét theo ngày (kỳ đã chọn).
2. Donut: tỉ lệ healthy / warning / danger.
3. Bar ngang: top 8 bệnh xuất hiện nhiều nhất.
4. Bar: top 8 tỉnh có cảnh báo/báo cáo cộng đồng.
5. Line: người dùng mới theo ngày.
6. Stacked bar: cảnh báo theo nguồn (tuần/tháng).
7. (tuỳ chọn) Heatmap 7×24: giờ nông dân quét nhiều nhất.

**API** `GET /admin/overview` trả tất cả trong 1 lần gọi (tránh 7 request).

---

## 7. AI tổng hợp & báo cáo

### Cách hoạt động
1. Server gom số liệu (đã aggregate, **không gửi dữ liệu cá nhân**) thành JSON nhỏ:
   ```json
   {
     "period": {"from":"2026-10-16","to":"2026-10-23"},
     "users": {"total":2,"new":1,"suspended":0,"active7d":2},
     "scans": {"total":232,"failed":1,"avg_confidence":82.4,
               "by_severity":{"healthy":84,"warning":50,"danger":98},
               "top_diseases":[{"name":"Bệnh đạo ôn","count":31}],
               "by_day":[{"date":"2026-10-17","count":42}]},
     "alerts": {"active":7,"by_source":{"weather":5,"official":1,"community":1},
                "expiring_soon":2},
     "community": {"pending":0,"verified":0,"top_provinces":[]},
     "official": {"pending":3}
   }
   ```
2. Gọi Cloudflare Workers AI (`cfAiRun($AI['chat_model'])`) với system prompt:
   > "Bạn là chuyên gia phân tích dữ liệu nông nghiệp của AgriScan. Chỉ dùng số liệu được cung cấp, không bịa. Viết tiếng Việt, giọng điệu điềm tĩnh, cụ thể. Trả về **JSON thuần** đúng schema: `{summary, highlights[], actions[]}`."
3. Parse bằng `parseLLMJson()` có sẵn; nếu fail → trả 502 + nút "Thử lại".
4. Người dùng bấm **Lưu báo cáo** → ghi vào `admin_reports` (kèm metrics gốc để đối chiếu).

### Nội dung trả về
- `summary`: 150–250 từ, nêu xu hướng + điểm bất thường.
- `highlights[]`: 3–5 gạch đầu dòng (`level`: info/warning/danger).
- `actions[]`: 3 khuyến nghị ưu tiên (`priority`: high/medium/low).

### Bảo vệ
- `temperature: 0.3`, `max_tokens: 900`.
- Nếu AI lỗi/timeout → báo lỗi rõ, không hiển thị số liệu giả.
- Không gửi email/tên người dùng vào prompt.

---

## 8. Kế hoạch thực hiện

### Phase 1 — Nền tảng backend (1 lượt làm việc)
1. Schema mới + migration idempotent.
2. Tách `requireAdmin()` dùng chung; sửa CORS.
3. `GET /admin/overview` (KPI + series + top list).
4. `GET /admin/system`, `GET /admin/audit`.
5. Test PHP: token sai → 401; overview đúng số liệu; audit ghi nhận.

### Phase 2 — CRUD backend (1–2 lượt)
1. Users: list/detail/patch/suspend/unsuspend/delete + chặn phiên bị khóa.
2. Guides + sections: CRUD + reorder.
3. Alerts: CRUD + filter.
4. Scans: list/detail/soft delete/restore.
5. Notifications: broadcast + lịch sử + tỉ lệ đọc.
6. AI: `/admin/ai/summary`, lưu/liệt kê/xóa báo cáo.
7. Test: 25–30 case mới (chạy cùng `tests/run.php`).

### Phase 3 — Khung UI + Dashboard (1–2 lượt)
1. Khởi tạo Vite, router, layout sidebar/topbar, CSS token.
2. API client (`fetch` + token + xử lý lỗi + toast).
3. Dashboard: KPI, 4–6 biểu đồ, feed hoạt động.
4. Trang Nhật ký quét (bảng + filter + drawer + xóa/khôi phục).

### Phase 4 — Các trang còn lại + AI + hoàn thiện (2 lượt)
1. Người dùng, Cẩm nang, Cảnh báo.
2. Báo cáo cộng đồng, Tin chính thức, Thông báo.
3. Trang Báo cáo AI + Lịch sử thao tác + Hệ thống.
4. Responsive (≥1280 desktop, ≥768 tablet), skeleton loading, empty state.
5. (Tuỳ chọn) Docker nginx phục vụ bản build ở `:8080`.
6. README `frontend_admin/README.md` + cập nhật `AGENTS.md`.

---

## 9. Kiểm thử & nghiệm thu

| Hạng mục | Cách kiểm |
|---|---|
| API | `docker exec agriscan-api php /var/www/html/tests/run.php` (bổ sung test admin) |
| Bảo mật | Không có/sai token → 401; token đúng → 200 |
| CRUD | Tạo → sửa → xóa trên dữ liệu thật, xác nhận DB |
| Khóa user | Khóa → app người dùng nhận 403; mở khóa → dùng lại bình thường |
| Broadcast | Gửi cho 1 tỉnh → đúng số người nhận, `notifications` có bản ghi |
| AI | Gọi summary với 7/30 ngày → JSON đúng schema, lưu báo cáo, mở lại xem được |
| UI | Mở từng trang trên Chrome 1440px + 1024px, không tràn layout, bảng phân trang đúng |
| Hồi quy | App mobile vẫn chạy: Home, Quét, Chat, Cảnh báo, Báo dịch |

**Tiêu chí xong**: mọi trang trong mục 5 hoạt động với dữ liệu thật, không lỗi console, test PHP xanh, tài liệu cập nhật.

---

## 10. Rủi ro & câu hỏi cần chốt

### Rủi ro
1. **Token nằm trong bundle** — ai mở được app admin là có toàn quyền. Chấp nhận được khi chạy nội bộ; nếu deploy public phải thêm login.
2. **Xóa user là xóa vĩnh viễn** (cascade scans) — sẽ hỏi xác nhận 2 bước và ưu tiên "khóa" thay vì xóa.
3. **AI có thể viết sai** — đã giới hạn prompt + hiển thị kèm số liệu gốc để đối chiếu; báo cáo lưu kèm metrics.
4. **CORS/DELETE**: phải sửa middleware, nếu quên sẽ lỗi preflight khi gọi trực tiếp (dev qua Vite proxy thì không gặp).
5. **Dữ liệu ít** (2 users, 232 scans) — dashboard vẫn đúng nhưng biểu đồ sẽ thưa; có thể seed thêm dữ liệu demo nếu bạn muốn.

### Cần bạn chốt
1. **Stack**: React + Vite (web) như đề xuất, hay muốn dùng React Native Web cho đồng bộ?
2. **Biểu đồ**: dùng `recharts` (nhanh, đẹp) hay tự vẽ SVG (không thêm dependency)?
3. **Xóa người dùng**: cho xóa vĩnh viễn, hay chỉ cho khóa + xóa mềm?
4. **AI báo cáo**: chỉ tổng hợp theo khoảng ngày, hay cần thêm "báo cáo tuần tự động" (job chạy thứ Hai)?
5. **Chạy admin**: chỉ dev (`:5173`) hay cần luôn bản build trong Docker (`:8080`)?

---

## 11. Ước lượng

| Phase | Nội dung | Khối lượng |
|---|---|---|
| 1 | Backend nền tảng | ~15 file sửa/thêm |
| 2 | CRUD + AI API | ~10 file mới, ~30 test |
| 3 | UI khung + dashboard | ~20 file |
| 4 | Trang còn lại + hoàn thiện | ~20 file |

Tổng: **~60–65 file**, chủ yếu là file mới trong `frontend_admin/`; backend chỉ thêm controller/service mới, không phá code cũ.

---

## 12. Trạng thái triển khai (23/10/2026)

### Đã xong

| Hạng mục | Kết quả |
|---|---|
| Schema | `ensureAdminSchema()` + mirror trong `db/agriscan_schema_postgres.sql` (mục 21): users status/suspended/deleted, guides sort/publish, `admin_reports`, `notification_broadcasts`, `notifications.broadcast_id` |
| Middleware | `api/middleware/admin.php`: `requireAdmin`, `adminBody`, `adminPagination`, `adminList`, `adminAudit`, `adminNewId`, validate field/enum |
| Controller | `AdminOverviewController`, `AdminUsersController`, `AdminGuidesController`, `AdminAlertsController`, `AdminScansController`, `AdminNotificationsController`, `AdminAiController`; `AdminController` cũ refactor dùng helper |
| AI | `api/services/admin_report.php`: metrics tổng hợp, prompt, retry 2 lần, parse JSON, lưu báo cáo; job `weekly-ai-report` (`weekday => 1`) |
| Router | `adminRoute()` dispatch mọi `admin/*` (trừ `admin/ingest|admin/reports` cũ) trước các block method → hỗ trợ GET/POST/PATCH/DELETE |
| CORS | Thêm `PATCH/PUT/DELETE`, header `X-Admin-Token`/`X-Auth-Token`, origin `:5173`/`:8080` |
| Chặn tài khoản | `assertUserNotBlocked()` dùng ở `getUserIdFromToken` (cả 2 nhánh), `/auth/me`, Google exchange → 403 `ACCOUNT_SUSPENDED` |
| Test PHP | **62/62 pass**, gồm `adminExtractJson`, `adminMetrics`, `adminSaveReport`, overview `top_provinces` |
| UI | 11 trang React + Vite, Recharts, lazy-load theo route; layout responsive 1440/1024/390; không lỗi console |
| Kiểm thử UI | Playwright: mở cả 11 trang, drawer user, editor cẩm nang, modal cảnh báo, compose + preview + gửi broadcast, nhập tay tin chính thức, tổng hợp AI — tất cả OK |
| Tài liệu | `frontend_admin/README.md`, mục "App quản trị" trong `AGENTS.md`, mục này |

### Khác so với kế hoạch

1. **AI báo cáo** nhận cả `response` dạng string và array; nếu model trả sai JSON sau 2 lần → 502 `ai_failed` kèm `metrics` để đối chiếu.
2. **Dashboard** thêm `scans.top_provinces` (suy từ `user_profiles.province`, vì app không gửi GPS).
3. **Bundle** tách theo route (dynamic import): entry ~274 kB, Dashboard ~405 kB (Recharts).
4. **Xoá user** là xoá mềm + khôi phục được, không xoá cascade như bản nháp rủi ro.

### Còn lại (không chặn)

- [ ] Docker hoá admin (`nginx` phục vụ `dist/` ở `:8080`) — hiện chạy `npm run dev`/`preview`.
- [ ] Đăng nhập cho admin nếu deploy ra ngoài mạng nội bộ (token đang nằm trong bundle).
- [ ] Seed dữ liệu demo để biểu đồ dày hơn khi thuyết trình.
