# Tiến độ triển khai — Cảnh báo dịch bệnh theo khu vực

Cập nhật: 2026-10-23 · Kế hoạch: `tasks/plan.md` · Todo: `tasks/todo.md`

## Tổng quan

| GĐ | Trạng thái | Ghi chú |
|---|---|---|
| **1** — Chọn tỉnh, lọc cảnh báo | ✅ Xong | `/user-location`, cột `province`, modal chọn 34 tỉnh |
| **2** — Rủi ro theo thời tiết | ✅ Xong | Open-Meteo + 6 luật + job + scheduler + UI |
| **3** — Tin chính thức | ✅ Xong (code) | ppd.gov.vn không có feed mới → duyệt tay + nhập URL |
| **4** — Cộng đồng + thông báo | ✅ Xong 4a | Báo cáo ẩn danh + gom cụm + thông báo trong app; FCM để sau |

## GĐ2 — chi tiết đã làm

| Task | Kết quả | Bằng chứng |
|---|---|---|
| G2-01 Chuẩn hoá `crops` | 10 dòng (9 hiển thị + `other` ẩn) | `select count(*) from crops` → 10; prefs trả 9 |
| G2-02 Toạ độ 34 tỉnh | `vnProvinceCoords()` | test: 34/34, không thiếu/thừa |
| G2-03 Schema | 6 cột mới + `weather_snapshots`, `job_runs` | `\d crop_disease_alerts` |
| G2-04 Open-Meteo | `weather.php`, timeout 20s, retry 1 | 34/34 tỉnh lấy được, 0 lỗi mạng |
| G2-05 Luật rủi ro | 6 luật (lúa 3, cà chua 2, khoai tây 1) | 27 test PHP pass |
| G2-06 Job | upsert theo `external_id`, expire, dedupe | chạy 2 lần: 0 tạo mới, 5 cập nhật |
| G2-07 Docker | service `scheduler` (30 phút/lượt) | `docker compose ps` có 3 container |
| G2-08 API job | `POST /jobs/run` + `/health.jobs` | sai token → 401, job lạ → 400 |
| G2-09 `/alerts` | trả `source/riskScore/validTo/sourceUrl` | thứ tự official → community → weather |
| G2-10 UI | chip nguồn + `Rủi ro x/100` + attribution | JS parse OK (chưa chạy emulator) |
| G2-11 Test | 27/27 pass | `docker exec agriscan-api php tests/run.php` |
| G2-12 Tài liệu | mục "Background jobs" trong `AGENTS.md` | — |

### Dữ liệu thật hiện tại (2026-10-23)

- 5 cảnh báo `weather`: bệnh đốm lá sớm (cà chua) tại Nghệ An, Quảng Trị, Cà Mau, Hà Tĩnh, Lào Cai — rủi ro 45/100.
- 3 cảnh báo `manual` cũ giữ nguyên.
- Chạy lại job: `tạo mới=0, cập nhật=5` → idempotent.

### Việc còn treo của GĐ2

- [ ] Chạy thử UI trên emulator (hiện `adb devices` trống) để xác nhận chip nguồn + `Rủi ro x/100` không vỡ layout.
- [ ] Chuyên gia nông nghiệp duyệt 6 ngưỡng rủi ro trước khi dùng cho người dùng thật.
- [ ] Chỉnh ngưỡng nếu thấy quá nhiều/ít cảnh báo sau 1 tuần chạy thật.

## GĐ3 — chi tiết đã làm

| Task | Kết quả | Bằng chứng |
|---|---|---|
| G3-01 Spike | ppd.gov.vn: không RSS/sitemap; "Cảnh báo SVGH" dừng 2017 | `tasks/notes-ppd.md` |
| G3-02 Alias tỉnh | 63 tên cũ → 34 tỉnh, bỏ dấu, khớp dài trước | 8 test, gồm "Bà Rịa - Vũng Tàu" → TP.HCM |
| G3-03 Từ điển | 16 dịch hại + 10 cây + 3 mức độ | test "đạo ôn" → lúa, "công bố dịch" → danger |
| G3-04 Parser | tiêu đề/ngày/nội dung/tiền tố link | 4 fixture thật, 11 test |
| G3-05 Bảng duyệt | `official_ingest` + unique `(url, label, province)` | tự tạo khi khởi động |
| G3-06 Job | lọc tin >2 năm, giãn cách 2s, tự tắt bản weather trùng | chạy thật: 9 ứng viên, 0 tin mới (site cũ) |
| G3-07 Admin API | list/approve/reject + nhập tay + nhập theo URL | duyệt → alert official; reject → không; sai token 401; SSRF 400 |
| G3-08 UI | chip nguồn + link "Xem nguồn" (đã có từ G2-10) | `AlertScreen.js` |
| G3-09 Test | **54/54 pass** | `docker exec agriscan-api php tests/run.php` |
| G3-10 Tài liệu | mục pháp lý + cách bật/tắt trong `notes-ppd.md` | — |

### Hạn chế đã biết của GĐ3

- Không có tin dịch hại mới trên ppd.gov.vn → job thường trả `thêm chờ duyệt=0`.
  Đường dùng thật: cán bộ dán URL hoặc nhập tay qua `/admin/ingest`.
- Chưa có giao diện web duyệt tin; hiện duyệt bằng API (curl/Postman).
- Chưa crawl site của 34 tỉnh (mỗi site một cấu trúc).
- Dữ liệu test đã xoá khỏi DB; không để tin giả trong `crop_disease_alerts`.


## GĐ4 — chi tiết đã làm (4a)

| Task | Kết quả | Bằng chứng |
|---|---|---|
| G4-01 Schema | `disease_reports` + `disease_report_votes` | tự tạo ở DB cũ, có trong file schema |
| G4-02 Auth | `REQUIRE_AUTH` (backend) + `REQUIRE_LOGIN` (app), cả hai mặc định `false` | `/alerts`, `/reports` không token → 200; bật `true` → 401 |
| G4-03 API báo cáo | tạo/liệt kê/xác nhận/xoá; 3 báo cáo/ngày → 429 | xoá hộ → 403, chủ → 200 |
| G4-04 Job gom cụm | ≥3 người → 1 alert `community`; ≥5 → `danger`; chạy lại không nhân bản | integration 15/15 |
| G4-05 Thông báo API | list / unread-count / read | unread 1 → 0 |
| G4-06 UI thông báo | `NotificationsScreen` + chuông badge ở Home, polling 60s | JS parse OK |
| G4-07 UI báo dịch | `ReportScreen`, entry từ Cảnh báo / Trang chủ / Kết quả | prefill cây + bệnh |
| G4-08 Admin duyệt | `/admin/reports` list + verify/reject | verify → verified, reject → rejected |
| G4-09 Test | 15/15 integration + 54/54 unit | `tests/integration_g4.php` |
| G4-10 FCM | ⬜ chưa làm | cần Firebase project |
| G4-11 Tài liệu | mục "Quyền riêng tư" trong `plan.md`, GĐ4 trong `AGENTS.md` | — |

### Việc còn treo

- [x] Chạy thử UI trên emulator: Home mở trực tiếp (không chặn Login), Cài đặt → Google login
      chạy trọn vòng (callback 302 → `/auth/me` 200 → hiện tên + avatar).
- [ ] Quyết định có làm FCM (4b) hay không.
- [ ] Chuyên gia nông nghiệp duyệt ngưỡng 3 người/7 ngày và 6 ngưỡng thời tiết.

### Sự cố đã sửa (23/10)

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| Mở app là hiện màn Login | Gate GĐ4 bật cứng `REQUIRE_AUTH` trong `App.js` | Gate đổi thành `REQUIRE_LOGIN` (mặc định `false`), backend `REQUIRE_AUTH=false` |
| Google báo `Error 400: redirect_uri_mismatch` | `redirect_uri` suy ra từ host đang mở (887), chưa đăng ký; `isPrivateHost` không nhận `localhost` nên không chuyển sang 1887 | Ghim `GOOGLE_REDIRECT_URI=http://localhost:1887/auth/google/callback`; `isPrivateHost` nhận `localhost`/`::1`/`0.0.0.0`; luôn mở flow qua 1887 + `adb reverse tcp:1887 tcp:1887` |


### Animation (23/10)

| Hạng mục | Chi tiết |
|---|---|
| Chuyển trang | `ScreenTransition` bọc `ActiveScreen`, trượt phải khi đi sâu, trái khi quay lại, mờ + nhích lên khi đổi tab |
| Trang chủ | 6 khối so le 0–310ms; bỏ 3 đốm màu ở thẻ "Hôm nay" |
| Danh sách | Lịch sử / Cảnh báo / Cẩm nang / Thông báo so le từng item; chat bubble fade-in |
| Phản hồi chạm | `Card` + `Button` nhún spring; tab bar icon pop + chấm xanh |
| Kết quả | Vòng tròn độ tin cậy đếm 0 → giá trị thật (component riêng, không re-render cả màn) |
| A11y | `useReduceMotion()` tôn trọng cài đặt giảm chuyển động của hệ điều hành |
| Sửa kèm | Dedupe filter ở `HistoryScreen` (API trả trùng key → React cảnh báo "same key") |

### App quản trị `frontend_admin` — **React Native CLI APK (23/10)**

| Task | Kết quả | Bằng chứng |
|---|---|---|
| A-01 Schema | users status/suspend/delete, guides publish/sort, `admin_reports`, `notification_broadcasts` | `ensureAdminSchema()` + schema SQL mục 21 |
| A-02 Middleware | `requireAdmin`, phân trang, audit, validate dùng chung | token sai → 401, đúng → 200 |
| A-03 Overview | KPI 7/30/90, series ngày, phân bố mức độ, top bệnh/cây/tỉnh, activity | `top_provinces` = Nghệ An 118 |
| A-04 CRUD | users (khoá/mở/xoá mềm/khôi phục), guides + sections + reorder, alerts, scans | curl + UI thật, audit ghi đủ |
| A-05 Thông báo | preview người nhận, broadcast, thống kê đọc, xoá | gửi 1 tỉnh → 1 người nhận, xoá sạch |
| A-06 AI | summary + lưu báo cáo + job tuần thứ Hai | `rpt_6156d57472ac382b8939` |
| A-07 UI | **12 màn RN CLI** (Drawer nav, ScreenTransition), Design token, Animated | Screenshots emulator: Dashboard, Users, Scans, Settings, System |
| A-08 Test | 62/62 unit/integration PHP | `tests/run.php` |
| A-09 Docs | `AGENTS.md` + `admin-plan.md` (đã cập nhật RN CLI) | — |
| A-10 Build APK | `npm run android:release` → `app-release.apk` (21MB, x86_64) | Cài emulator thành công, token build-time OK |

**Kiến trúc mới**: 
- Dự án RN CLI riêng tại `frontend_admin/` (không dùng Expo)
- `package.json` riêng, `android/` copy từ app chính, rename `com.agriscan.admin`
- `react-native-config` + `.env` cho build-time token
- `EncryptedStorage` cho runtime config (API base + token)
- Custom drawer navigation + `ScreenTransition` (Animated native driver)
- Biểu đồ tự vẽ (DayBars, HBar, SeverityBar) — không `recharts`
- Tất cả 12 màn: Dashboard, Users, Scans, Guides, Alerts, Community, Official, Notifications, AiReports, Audit, System, Settings
