# TODO chi tiết — Cảnh báo dịch bệnh theo khu vực (GĐ 2 → 3 → 4)

Kế hoạch đầy đủ: `tasks/plan.md`. Mỗi task nhỏ ≤ 1 ngày, có tiêu chí "Xong khi".
Thứ tự trong file = thứ tự làm. Task có 🔒 là chặn task khác.

---

## GĐ 2 — Rủi ro theo thời tiết (3–4 ngày)

### Chuẩn bị dữ liệu

- [x] **G2-01 🔒 Chuẩn hoá bảng `crops`** (~0.5 ngày)
  - Thêm 7 dòng còn thiếu: `maize` (Ngô), `potato` (Khoai tây), `coffee` (Cà phê), `pepper` (Hồ tiêu), `soybean` (Đậu nành), `vegetable` (Rau cải), `other` (Cây khác).
  - Giữ nguyên `fruit` (id 3) cho dữ liệu cũ; **không** đưa `fruit`/`other` vào danh sách chọn quét.
  - Ẩn `other` khỏi `GET /user-crop-preferences` (không ai theo dõi "Cây khác").
  - Cập nhật `db/seed_data.sql` + `db/agriscan_schema_postgres.sql`.
  - Files: `db/*.sql`, `api/controllers/AlertController.php`.
  - **Xong khi:** `select count(*) from crops` = 10; `/user-crop-preferences` trả 9 dòng (không có `other`); chọn "Ngô" trong app không lỗi.

- [x] **G2-02 🔒 Toạ độ 34 tỉnh** (~0.25 ngày)
  - Thêm `vnProvinceCoords()` vào `api/services/provinces.php`: `['Hà Nội' => [21.0285, 105.8542], ...]` (tâm hành chính, 2 chữ số thập phân).
  - Test: 34/34 tỉnh trong `vnProvinces()` đều có toạ độ, không trùng.
  - **Xong khi:** `php -r` in ra 34 dòng, không warning; test PHP pass.

### Hạ tầng job

- [x] **G2-03 🔒 Migration GĐ2** (~0.5 ngày)
  - Thêm cột `source`, `risk_score`, `valid_from`, `valid_to`, `external_id` + unique partial index (mục 4.1 plan).
  - Tạo bảng `weather_snapshots`, `job_runs`.
  - Viết `ensureSchema()` trong `AlertController` (hoặc service dùng chung `api/services/schema.php`) + cập nhật file schema.
  - **Xong khi:** DB cũ chạy API → cột tự xuất hiện; chạy lại không lỗi; `\d crop_disease_alerts` thấy đủ 5 cột mới.

- [x] **G2-04 Adapter Open-Meteo** (~0.5 ngày)
  - `api/services/weather.php`: `fetchForecast($lat, $lon, $days = 7)`.
  - Timeout 15s, retry 1 lần, `User-Agent: AgriScanAI/1.0`.
  - Chuẩn hoá về cấu trúc `days[]` (mục 5.1 plan); lưu raw vào `weather_snapshots`.
  - **Xong khi:** gọi thật 1 tỉnh trả đủ 7 ngày; ngắt mạng → trả `null` + log, không throw ra ngoài.

- [x] **G2-05 Bảng luật rủi ro + unit test** (~1 ngày)
  - `api/services/disease_risk.php`: `riskRules()` trả 6 luật (lúa: đạo ôn/khô vằn/bạc lá; cà chua: mốc sương/đốm lá sớm; khoai tây: mốc sương).
  - `scoreRisk($forecast, $rule)` → 0–100, cap 100, cửa sổ 5 ngày.
  - Comment ghi nguồn tham chiếu từng ngưỡng.
  - Fixture: `api/tests/fixtures/open_meteo_hanoi.json` (mưa + ẩm cao), `..._nanglien.json` (khô).
  - **Xong khi:** fixture ẩm → đạo ôn ≥ 60; fixture khô → 0; test chạy `php tests/run.php` xanh.

- [x] **G2-06 Job `weather-risk`** (~1 ngày)
  - `api/jobs/run.php` (dispatch theo argv) + `api/jobs/weather_risk.php`.
  - Vòng 34 tỉnh → chấm điểm → upsert alert theo `external_id` (`weather:{crop}:{disease_slug}:{province}:{valid_from}`).
  - Ghi `description` có số liệu thật; `recommendation` lấy từ template theo bệnh.
  - Expire alert hết `valid_to`; bỏ qua nếu đã có alert manual/official cùng (crop, disease, province).
  - Ghi `job_runs` (status, message, duration).
  - **Xong khi:** chạy 2 lần liên tiếp → `count(*)` alert không đổi; tỉnh không mưa không sinh alert; `job_runs` có dòng `weather_risk`.

### Vận hành & API

- [x] **G2-07 🔒 Docker + scheduler + env** (~0.5 ngày)
  - `Dockerfile.api`: thêm `COPY api/jobs /var/www/html/jobs` và `api/tests`.
  - `docker-compose.yml`: service `scheduler` dùng cùng image, `command: sh -c "while true; do php /var/www/html/jobs/run.php loop; sleep 1800; done"`, `depends_on: api`.
  - `.env` / `.env.example`: `WEATHER_ENABLED=1`, `OPEN_METEO_BASE`, `RISK_THRESHOLD=40`, `JOB_SECRET`, `OFFICIAL_ENABLED=0`.
  - **Xong khi:** `docker compose up -d --build` có 3 container; log scheduler hiện "weather-risk done"; tắt `WEATHER_ENABLED` → job skip.

- [x] **G2-08 API jobs + health** (~0.5 ngày)
  - `POST /jobs/run` body `{job: "weather-risk"}`; header `X-Job-Token` = `JOB_SECRET`; sai/rỗng → 401/404.
  - `/health` trả `jobs` (last_run, status, duration) từ `job_runs`.
  - **Xong khi:** curl đúng token chạy job; sai token 401; `/health` hiện dữ liệu job.

- [x] **G2-09 `/alerts` trả nguồn + rủi ro** (~0.5 ngày)
  - Thêm `source`, `riskScore`, `validFrom`, `validTo`, `sourceUrl` vào response.
  - Lọc `valid_to IS NULL OR valid_to >= today`; sort `official` → `community` → `weather`, rồi `severity`, rồi `risk_score`.
  - **Xong khi:** response có đủ field; alert hết hạn không xuất hiện; thứ tự đúng.

### Giao diện

- [x] **G2-10 AlertScreen: chip nguồn + % rủi ro** (~0.5 ngày)
  - Chip: `Chính thức` (xanh đậm) / `Cộng đồng` (cam) / `Dự báo thời tiết` (xám xanh).
  - Dòng `Nguy cơ 75%` khi `riskScore > 0`.
  - Chân danh sách: "Dữ liệu thời tiết: Open-Meteo" + disclaimer "Tham khảo, đối chiếu khuyến nông địa phương".
  - **Xong khi:** 3 loại cảnh báo hiện đúng nhãn trên emulator; không vỡ layout.

- [x] **G2-11 Kiểm thử GĐ2** (~0.5 ngày)
  - Chạy job thật cho 3 tỉnh, đối chiếu thời tiết ngoài đời (mưa/khô) với alert sinh ra.
  - Test idempotency, expire, lọc tỉnh, job lỗi mạng.
  - Ghi kết quả vào cuối task này.
  - **Xong khi:** 5/5 mục DoD GĐ2 trong `plan.md` mục 5.5 đạt.

- [x] **G2-12 Cập nhật tài liệu** (~0.25 ngày)
  - `AGENTS.md`: lệnh chạy job, biến môi trường mới.
  - `README`/`plan.md`: cách tắt tính năng, cách thêm luật rủi ro.
  - **Xong khi:** người mới đọc chạy được job bằng 3 lệnh.

---

## GĐ 3 — Tin chính thức từ Cục Trồng trọt & BVTV (4–6 ngày)

> **Kết quả 2026-10-23:** xong phần code + test (54/54). Spike cho thấy ppd.gov.vn
> không còn mục cảnh báo cập nhật → pipeline chạy ở chế độ "đề xuất, người duyệt",
> cộng thêm 2 đường nhập tay cho admin. Chi tiết: `tasks/notes-ppd.md`.
>
> Khác so với kế hoạch ban đầu:
> - Unique key `official_ingest` là `(source_url, disease_label, province)` (không phải `disease_name`).
> - Job `official-feed` chạy mỗi **12 giờ** theo `job_runs`, không phải cố định 06:00/17:00.
> - Thêm `POST /admin/ingest` (nhập tay) và `POST /admin/ingest/fetch` (nhập theo URL).
> - Tự đăng chỉ khi `AUTO_APPROVE_OFFICIAL=true` **và** tin không phải "hết dịch".

### Khảo sát trước khi code

- [x] **G3-01 🔒 Spike ppd.gov.vn** (~0.5 ngày)
  - Kiểm tra `robots.txt`, xem có RSS/sitemap/JSON không.
  - Lưu 5 file HTML mẫu vào `api/tests/fixtures/ppd/` (1 bài "Cảnh báo SVGH", 1 bài "7 ngày", 1 "Công bố dịch", 2 bài không nhắc tỉnh).
  - Ghi selector + cấu trúc vào `tasks/notes-ppd.md`.
  - **Xong khi:** có kết luận rõ "parse HTML được / cần RSS / không khả thi" + selector cụ thể.

- [x] **G3-02 🔒 Alias tên tỉnh 63 → 34** (~0.5 ngày)
  - `vnProvinceAliases()` trong `provinces.php`: map tên cũ/viết tắt về 34 tên mới (Bình Dương, Hà Nam, Nam Định, Nghệ An cũ, Kon Tum, Bình Định, Phú Yên, Ninh Thuận, Đắk Nông, Bình Thuận, Bình Phước, Quảng Nam, Thái Bình, Hà Giang, Yên Bái, Bắc Kạn, Vĩnh Phúc, Hòa Bình, Bắc Giang, Bắc Ninh cũ, Hải Dương, Quảng Bình, Quảng Trị cũ, Quảng Ngãi cũ, Phú Thọ cũ, Thanh Hóa, …).
  - Hàm `matchProvinces($text)` trả mảng tỉnh, ưu tiên khớp dài nhất, không khớp nhầm "Hà Nội" trong "Hà Nam".
  - **Xong khi:** test 20 câu mẫu đúng 20/20; "Hà Nam" không ra "Hà Nội".

- [x] **G3-03 Từ điển cây/bệnh/mức độ** (~0.5 ngày)
  - `api/services/keywords.php`: tên cây (lúa, ngô, cà chua, khoai tây, cà phê, hồ tiêu, đậu nành, rau), tên bệnh (đạo ôn, khô vằn, bạc lá, vàng lùn, lùn xoắn lá, rầy nâu, mốc sương, đốm lá sớm, gỉ sắt, thán thư, …), từ khoá mức độ.
  - Chuẩn hoá chữ thường, bỏ dấu khi so khớp nhưng lưu bản có dấu.
  - **Xong khi:** `extractEntities($text)` trả đúng cây/bệnh/mức độ cho 5 fixture G3-01.

### Pipeline nhập tin

- [x] **G3-04 Parser bài viết** (~1 ngày)
  - `api/services/official_feed.php`: `fetchListing()`, `fetchArticle()`, `parseArticle()`.
  - `parseArticle` → `{title, published_at, provinces[], crops[], diseases[], severity, summary, source_url}`.
  - Rate limit 1 req/2s; timeout 20s; UA có tên app + email liên hệ.
  - **Xong khi:** parse 5 fixture cho kết quả đúng; fixture thiếu tỉnh trả `provinces = []` (không bịa).

- [x] **G3-05 Bảng duyệt tin** (~0.5 ngày)
  - Tạo `official_ingest` (mục 4.2 plan) + unique `(source_url, disease_name, province)`.
  - Ghi mọi bài vào đây với `status='pending'`; chỉ bài đủ dữ kiện mới được duyệt tự động (nếu `AUTO_APPROVE_OFFICIAL=true`).
  - **Xong khi:** crawl 5 bài → 5 dòng; crawl lại → vẫn 5 dòng.

- [x] **G3-06 Job `official-feed`** (~1 ngày)
  - `api/jobs/official_alerts.php`: lấy listing → bài mới → parse → ghi `official_ingest` → tạo alert `source='official'` cho bài đã duyệt.
  - `valid_to = published_at + 30 ngày`; `external_id = "official:" . sha1(source_url|disease|province)`.
  - Lịch: 06:00 & 17:00 (kiểm tra trong `run.php`).
  - **Xong khi:** chạy job → alert xuất hiện ở `/alerts` đúng tỉnh; chạy lại không nhân bản; `OFFICIAL_ENABLED=0` → skip.

- [x] **G3-07 Admin API duyệt tin** (~0.5 ngày)
  - `GET /admin/ingest?status=pending`, `POST /admin/ingest/{id}/approve|reject`.
  - Guard `X-Admin-Token` = `ADMIN_TOKEN`; rỗng → 404.
  - Approve → tạo alert + cập nhật `status`; reject → không tạo alert.
  - **Xong khi:** duyệt 1 tin → alert xuất hiện; reject → không; sai token 401.

### Giao diện & kiểm thử

- [x] **G3-08 AlertScreen: nguồn chính thức** (~0.5 ngày)
  - Chip `Chính thức` + nút "Xem nguồn" mở `source_url` bằng `Linking.openURL`.
  - Ghi rõ "Nguồn: Cục Trồng trọt & BVTV".
  - **Xong khi:** bấm mở đúng bài báo trên trình duyệt; tin không có URL thì ẩn nút.

- [x] **G3-09 Kiểm thử GĐ3** (~0.5 ngày)
  - Fixture đủ/thiếu dữ kiện; trùng URL; site lỗi (giả lập 500).
  - So khớp 10 tin thật gần nhất: đếm đúng/sai, ghi tỉ lệ vào task.
  - **Xong khi:** 5 mục DoD GĐ3 (plan 6.5) đạt; tỉ lệ parse đúng ≥ 80% trên tin thật.

- [x] **G3-10 Tài liệu + lưu ý pháp lý** (~0.25 ngày)
  - Ghi rõ: chỉ lưu tiêu đề + tóm tắt + link, không đăng lại toàn văn; tôn trọng robots.txt.
  - Hướng dẫn bật/tắt `OFFICIAL_ENABLED`, cấu hình `ADMIN_TOKEN`.
  - **Xong khi:** có mục "Nguồn dữ liệu & bản quyền" trong `plan.md` hoặc README.

---

## GĐ 4 — Báo cáo cộng đồng + thông báo (4–5 ngày + 2–3 ngày tuỳ chọn)

> **Kết quả 2026-10-23:** xong 4a (báo cáo + thông báo trong app), test 15/15.
> G4-10 (FCM) chưa làm — cần Firebase project.
>
> Khác so với kế hoạch:
> - `GET /reports?province=&days=` (danh sách ẩn danh) thay cho `/reports/mine`.
> - `POST /reports/{id}/confirm` ("Tôi cũng thấy") thay cho việc chỉ admin duyệt;
>   2 người xác nhận → `status='verified'` (tính hệ số 2 khi xét mức độ).
> - `external_id` cộng đồng **không** gồm tuần ISO (nếu có sẽ nhân bản mỗi tuần);
>   upsert theo `(tỉnh, cây, bệnh)` và gia hạn `valid_to = today + 7`.
> - Thông báo gửi cho **mọi** người cùng tỉnh đang theo dõi cây (kể cả người báo).
> - Bell + badge nằm ở góc phải lời chào Trang chủ (Home không dùng ScreenHeader).

### Chuẩn bị

- [x] **G4-01 🔒 Schema GĐ4** (~0.5 ngày)
  - Tạo `disease_reports` + index (mục 4.3 plan); `device_tokens` chỉ khi làm 4b.
  - **Xong khi:** bảng tồn tại ở DB cũ (tự tạo) và trong file schema.

- [x] **G4-02 Bật `REQUIRE_AUTH=true`** (~0.25 ngày)
  - Kiểm tra lại toàn bộ màn hình đã gửi token (AlertScreen đã sửa; rà Chat/History/Result/Guides).
  - Test app khi chưa đăng nhập → hiện màn Login, không crash.
  - **Xong khi:** không còn route nào âm thầm fallback user 1; `GET /alerts` không token trả 401.

### API báo cáo

- [x] **G4-03 `ReportController`** (~1 ngày)
  - `POST /reports`: validate crop/province (dùng `isVnProvince`), `note ≤ 500` ký tự, `image_url` tuỳ chọn; rate limit 3/ngày/user → 429.
  - `GET /reports/mine?limit=20`; `DELETE /reports/{id}` (chỉ chủ sở hữu).
  - `status='pending'` mặc định; lưu `crop_id` suy ra từ `crop_slug`.
  - **Xong khi:** tạo 4 báo cáo trong ngày → cái thứ 4 trả 429; user A không xoá được báo cáo user B (403).

- [x] **G4-04 Job `aggregate-reports`** (~1 ngày)
  - `api/jobs/aggregate_reports.php`, chạy mỗi giờ.
  - Nhóm `(province, crop_slug, disease_label)` trong 7 ngày; đếm `distinct user_id` (`verified` tính 2).
  - `>= 3` → upsert alert `source='community'`, `severity='warning'` (`>= 5` → `danger`), `valid_to = today + 7`.
  - `external_id = "community:{crop}:{hash(disease)}:{province}:{tuần ISO}"` để không nhân bản theo tuần.
  - Với mỗi user cùng tỉnh đang theo dõi cây đó (trừ người báo) → insert `notifications`.
  - **Xong khi:** seed 3 báo cáo 3 user → 1 alert + 2 notification; chạy lại → không tăng; báo cáo rejected không tính.

### Thông báo trong app (4a)

- [x] **G4-05 `NotificationController`** (~0.5 ngày)
  - `GET /notifications?limit=50`, `GET /notifications/unread-count`, `POST /notifications/read` (body `{ids: []}` hoặc `{all: true}`).
  - **Xong khi:** đánh dấu đã đọc → `unread-count` giảm; user khác không đọc được notification của mình.

- [x] **G4-06 Màn `NotificationsScreen` + chuông ở Home** (~1 ngày)
  - Chuông có badge số chưa đọc ở `ScreenHeader` của Home; polling 60s khi app foreground (`AppState`).
  - Chạm notification → điều hướng tới Cảnh báo hoặc Kết quả (`data.deepLink`).
  - Trạng thái rỗng: "Chưa có thông báo nào."
  - **Xong khi:** tạo notification bằng SQL → badge xuất hiện trong 60s; bấm vào mở đúng màn; đọc xong badge về 0.

- [x] **G4-07 Màn `ReportScreen` + nút "Báo dịch"** (~1 ngày)
  - Entry: `ResultScreen` (prefill cây/bệnh) và `AlertScreen` (nút "Báo dịch khu vực này").
  - Form: cây (readonly từ prefill hoặc chip chọn), bệnh nghi ngờ (text), tỉnh (prefill `user-location`), xã/phường (text), ghi chú, ảnh (tuỳ chọn).
  - Gửi xong: toast "Đã gửi, cảm ơn bạn" + reset; lỗi 429 hiện thông điệp rõ.
  - **Xong khi:** gửi từ Kết quả có prefill đúng; báo cáo hiện trong "Báo cáo của tôi"; ảnh không bắt buộc.

- [x] **G4-08 Admin duyệt báo cáo** (~0.5 ngày)
  - `GET /admin/reports?status=pending`, `POST /admin/reports/{id}/verify|reject`.
  - **Xong khi:** verify → báo cáo tính hệ số 2 khi gom cụm; reject → không tính.

### Kiểm thử & tuỳ chọn

- [x] **G4-09 Kiểm thử GĐ4** (~1 ngày)
  - Kịch bản: 3 user / 4 báo cáo / user tỉnh khác / spam 429 / xoá báo cáo / notification badge.
  - Chạy trên emulator với 2 tài khoản thật trong DB.
  - **Xong khi:** 6 mục DoD GĐ4 (plan 7.3) đạt.

- [ ] **G4-10 (Tuỳ chọn) Push FCM** (~2–3 ngày)
  - Tạo Firebase project → `google-services.json` → cài `@react-native-firebase/app` + `messaging`.
  - `AndroidManifest`: `POST_NOTIFICATIONS`; xin quyền runtime Android 13+.
  - Backend: `POST /device-tokens`, gửi FCM HTTP v1 bằng service account.
  - **Xong khi:** tắt app vẫn nhận push; logout xoá token; token chết được dọn khi FCM trả `UNREGISTERED`.
  - **Chỉ làm nếu bạn có Firebase project** — nếu không, 4a đã đủ.

- [x] **G4-11 Tài liệu + quyền riêng tư** (~0.25 ngày)
  - Ghi rõ dữ liệu nào thu thập (ảnh, tỉnh, xã, ghi chú), ai xem được, cách xoá.
  - Cập nhật `AGENTS.md`: lệnh job, biến môi trường, quy trình duyệt tin.
  - **Xong khi:** có mục "Quyền riêng tư" trong README/plan.

---

## Thứ tự gợi ý khi bắt tay làm

1. **G2-01 → G2-02 → G2-03** (nền dữ liệu, làm 1 buổi)
2. **G2-04 → G2-05** (adapter + luật, có test)
3. **G2-06 → G2-07 → G2-08** (job chạy được, xem được qua `/health`)
4. **G2-09 → G2-10 → G2-11** (UI + nghiệm thu GĐ2)
5. Sang GĐ3 khi GĐ2 đã chạy ổn định ≥ 2 ngày, không có alert sai.

## Định nghĩa "hoàn thành" toàn dự án

- Mỗi cảnh báo hiển thị cho người dùng đều có: nguồn, thời hạn, mức độ, và căn cứ.
- Không có cảnh báo trùng; chạy lại job bao nhiêu lần cũng không đổi kết quả.
- Không có job nào làm app chậm hoặc trắng màn hình khi lỗi.
- Tắt được từng nguồn bằng biến môi trường mà không cần sửa code.
