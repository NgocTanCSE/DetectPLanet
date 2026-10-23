# Kế hoạch: Cảnh báo dịch bệnh theo khu vực (GĐ 2 – 3 – 4)

- **Trạng thái:** bản nháp để duyệt — chưa viết code.
- **Cập nhật:** 2026-10-23
- **Phạm vi:** GĐ2 (rủi ro theo thời tiết), GĐ3 (nguồn chính thức), GĐ4 (cộng đồng + thông báo).
- **KHÔNG nằm trong phạm vi:** dự báo sâu bệnh bằng ML tự huấn luyện, bản đồ GIS, đa ngôn ngữ.

---

## 0. TL;DR

| GĐ | Mục tiêu | Cơ chế | Thời gian | Phụ thuộc |
|---|---|---|---|---|
| **2** | Tự sinh cảnh báo nguy cơ cho 34 tỉnh | Cron 6h → Open-Meteo → chấm điểm rủi ro → ghi `crop_disease_alerts` (`source='weather'`) | 3–4 ngày | GĐ1 (xong) |
| **3** | Đưa tin chính thức của Cục Trồng trọt & BVTV vào app | Crawler 2 lần/ngày → tách tỉnh/cây/bệnh → duyệt → ghi alert (`source='official'`) | 4–6 ngày | GĐ2 (dùng chung hạ tầng job) |
| **4** | Người dùng báo dịch + nhận thông báo | `disease_reports` → gom cụm ≥3 người/7 ngày → alert (`source='community'`) + notification | 4–5 ngày (4a, không cần build lại APK) + 2–3 ngày (4b, FCM) | GĐ2, `REQUIRE_AUTH=true` |

**Nguyên tắc xuyên suốt:** app chỉ hiển thị cảnh báo có nguồn và có hạn dùng; mọi cảnh báo ghi rõ "nguy cơ" hay "đã xác nhận"; job phải **idempotent** (chạy lại không sinh trùng).

---

## 1. Hiện trạng (đã có, tận dụng lại)

| Thành phần | Trạng thái |
|---|---|
| `user_profiles.province` + `GET/POST /user-location` | ✅ chọn tỉnh, validate 34 tỉnh |
| `crop_disease_alerts.province` | ✅ `''` = toàn quốc, lọc theo tỉnh ở `/alerts` |
| `user_crop_preferences` | ✅ theo dõi cây trồng theo tài khoản |
| `notifications` (bảng) | ✅ có schema, **chưa có API/UI** |
| `api/services/provinces.php` | ✅ danh sách 34 tỉnh |
| Docker | 2 service: `postgres`, `api` — **chưa có scheduler/cron** |
| `crops` | ⚠️ chỉ có 3 dòng (`rice`, `tomato`, `fruit`) trong khi app có 9 lựa chọn quét |
| `REQUIRE_AUTH` | ⚠️ đang `false` → mọi request không token dùng chung user 1 |

---

## 2. Nguyên tắc thiết kế

1. **Một nguồn sự thật cho mỗi loại dữ liệu:** thời tiết → Open-Meteo; chính thức → ppd.gov.vn; cộng đồng → `disease_reports`. Không trộn.
2. **Job tách khỏi request người dùng:** mọi tác vụ nặng chạy trong `api/jobs/*` bằng PHP CLI, không chạy trong lúc người dùng mở app.
3. **Idempotent + có hạn:** mỗi cảnh báo có `external_id` duy nhất, `valid_from`/`valid_to`; hết hạn thì `is_active = 0`.
4. **Không bịa dữ liệu:** chỉ dùng ngưỡng đã có tài liệu; nhãn "Nguy cơ" khác "Đã xác nhận"; thiếu dữ liệu thì không hiển thị.
5. **Suy giảm mềm:** nguồn lỗi (mất mạng, đổi HTML) → job ghi log, cảnh báo cũ vẫn còn, app không trắng màn hình.

---

## 3. Kiến trúc bổ sung

```
docker compose
├── postgres      (giữ nguyên)
├── api           (giữ nguyên + thêm route /jobs/run, /notifications, /reports)
└── scheduler     (MỚI) — cùng image api, chạy: php /var/www/html/jobs/run.php loop
                       mỗi 30 phút: kiểm tra job nào "đến giờ" rồi chạy
                       lịch: weather-risk 6h/lần · official-feed 06:00 & 17:00
                             · aggregate-reports mỗi giờ · expire mỗi 30 phút
```

Thư mục mới:

```
api/
├── jobs/
│   ├── run.php                # CLI entry: run.php loop | weather-risk | official-feed | aggregate-reports | expire
│   ├── weather_risk.php
│   ├── official_alerts.php
│   └── aggregate_reports.php
├── services/
│   ├── weather.php            # gọi Open-Meteo + cache
│   ├── disease_risk.php       # bảng luật + chấm điểm
│   ├── official_feed.php      # fetch/parse ppd.gov.vn
│   ├── keywords.php           # từ điển cây/bệnh/mức độ
│   └── provinces.php          # + toạ độ 34 tỉnh, alias tên cũ → mới
├── controllers/
│   ├── ReportController.php   # MỚI
│   ├── NotificationController.php # MỚI
│   └── AdminController.php    # MỚI (duyệt tin, duyệt báo cáo)
└── tests/
    ├── run.php
    └── fixtures/              # JSON Open-Meteo, HTML ppd.gov.vn
```

---

## 4. Thay đổi dữ liệu

Tất cả áp dụng theo **cả hai** đường: `ensureSchema()` khi API khởi động (dev) **và** cập nhật `db/agriscan_schema_postgres.sql` (cài mới).

### 4.1. GĐ2

```sql
ALTER TABLE crop_disease_alerts
  ADD COLUMN IF NOT EXISTS source      VARCHAR(16)  NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS risk_score  SMALLINT     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valid_from  DATE         NULL,
  ADD COLUMN IF NOT EXISTS valid_to    DATE         NULL,
  ADD COLUMN IF NOT EXISTS external_id VARCHAR(160) NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_crop_alerts_external
  ON crop_disease_alerts (external_id) WHERE external_id <> '';

CREATE TABLE IF NOT EXISTS weather_snapshots (
  id         BIGSERIAL PRIMARY KEY,
  province   VARCHAR(64) NOT NULL,
  fetched_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  forecast   JSONB       NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_weather_province_time
  ON weather_snapshots (province, fetched_at DESC);

CREATE TABLE IF NOT EXISTS job_runs (
  name             VARCHAR(48) PRIMARY KEY,
  last_run_at      TIMESTAMP NULL,
  last_status      VARCHAR(16) NOT NULL DEFAULT '',
  last_message     TEXT        NOT NULL DEFAULT '',
  last_duration_ms INTEGER     NOT NULL DEFAULT 0
);
```

### 4.2. GĐ3

```sql
CREATE TABLE IF NOT EXISTS official_ingest (
  id           BIGSERIAL PRIMARY KEY,
  source_url   VARCHAR(512)  NOT NULL,
  title        TEXT          NOT NULL,
  published_at DATE          NULL,
  province     VARCHAR(64)   NOT NULL DEFAULT '',
  crop_slug    VARCHAR(32)   NOT NULL DEFAULT '',
  disease_name VARCHAR(128)  NOT NULL DEFAULT '',
  severity     VARCHAR(32)   NOT NULL DEFAULT 'warning',
  summary      TEXT          NOT NULL DEFAULT '',
  status       VARCHAR(16)   NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  alert_id     VARCHAR(32)   NULL,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at  TIMESTAMP     NULL,
  UNIQUE (source_url, disease_name, province)
);
CREATE INDEX IF NOT EXISTS idx_ingest_status ON official_ingest (status, created_at DESC);
```

### 4.3. GĐ4

```sql
CREATE TABLE IF NOT EXISTS disease_reports (
  id            VARCHAR(32)  PRIMARY KEY,
  user_id       INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  crop_id       INTEGER      NULL REFERENCES crops(id) ON DELETE SET NULL,
  crop_slug     VARCHAR(32)  NOT NULL DEFAULT '',
  disease_label VARCHAR(128) NOT NULL DEFAULT '',
  province      VARCHAR(64)  NOT NULL DEFAULT '',
  ward          VARCHAR(128) NOT NULL DEFAULT '',
  note          TEXT         NOT NULL DEFAULT '',
  image_url     VARCHAR(512) NOT NULL DEFAULT '',
  lat           DECIMAL(9,6) NULL,
  lon           DECIMAL(9,6) NULL,
  status        VARCHAR(16)  NOT NULL DEFAULT 'pending', -- pending|verified|rejected
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reports_cluster
  ON disease_reports (province, crop_slug, created_at DESC);

-- chỉ dùng nếu làm GĐ4b (FCM)
CREATE TABLE IF NOT EXISTS device_tokens (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(255) NOT NULL UNIQUE,
  platform   VARCHAR(16)  NOT NULL DEFAULT 'android',
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. GĐ2 — Rủi ro theo thời tiết

### 5.1. Nguồn dữ liệu

**Open-Meteo** (`https://api.open-meteo.com/v1/forecast`) — miễn phí cho phi thương mại, không cần key.
Lấy 7 ngày, `timezone=Asia/Ho_Chi_Minh`:

```
daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,
      relative_humidity_2m_mean,precipitation_sum
hourly=relative_humidity_2m,precipitation
```

`weather.php::fetchForecast($lat, $lon)` chuẩn hoá về:

```php
['province' => 'Hà Nội', 'days' => [
   ['date' => '2026-10-23', 'tmax' => 31.2, 'tmin' => 24.1, 'tmean' => 27.4,
    'rh' => 88, 'rain' => 3.4, 'humid_hours' => 11],
   ...
]]
```

Tần suất: **34 tỉnh × 4 lần/ngày = 136 request/ngày** (giới hạn miễn phí ~10.000/ngày → an toàn).
Bắt buộc ghi công: "Dữ liệu thời tiết: Open-Meteo" ở màn Cảnh báo.

### 5.2. Bảng luật rủi ro (giai đoạn đầu: 3 cây, 6 bệnh)

| Cây | Bệnh | Điều kiện/ngày | Điểm/ngày | Ngưỡng cảnh báo |
|---|---|---|---|---|
| Lúa | Đạo ôn (`Pyricularia oryzae`) | `tmin 20–26°C` **và** `rh ≥ 90%` **và** (`rain > 0` hoặc `humid_hours ≥ 10`) | +25 | ≥ 60 → `danger`, 40–59 → `warning` |
| Lúa | Khô vằn (`Rhizoctonia solani`) | `tmean 28–32°C` **và** `rh ≥ 85%` **và** `rain ≥ 5mm` | +20 | như trên |
| Lúa | Bạc lá (`Xanthomonas oryzae`) | `tmean 25–30°C` **và** `rain ≥ 10mm` | +15 | như trên |
| Cà chua | Mốc sương (`Phytophthora infestans`) | `tmean 15–22°C` **và** `rh ≥ 90%` ≥ 2 ngày liên tiếp | +35 | như trên |
| Cà chua | Đốm lá sớm (`Alternaria solani`) | `tmean 24–29°C` **và** `rh ≥ 85%` **và** `rain > 0` | +15 | như trên |
| Khoai tây | Mốc sương | như cà chua | +35 | như trên |

- Điểm cộng dồn trong cửa sổ 5 ngày, **cap 100**.
- Mỗi luật ghi chú nguồn tham chiếu trong comment (FAO / hướng dẫn BVTV) — **cần chuyên gia nông nghiệp duyệt trước khi bật cho người dùng thật**.
- Các cây còn lại (ngô, cà phê, hồ tiêu, đậu nành, rau cải) **chưa đưa vào GĐ2** vì chưa đủ căn cứ ngưỡng.

### 5.3. Luồng sinh cảnh báo

```
mỗi 6h:
  for province in 34 tỉnh:
      forecast = fetchForecast(lat, lon)        // cache vào weather_snapshots
      for (crop, disease, rule) in RULES:
          score = scoreRisk(forecast, rule)
          if score >= RISK_THRESHOLD:
              upsert alert:
                external_id = "weather:{crop}:{disease_slug}:{province}:{valid_from}"
                source      = 'weather'
                province    = province
                severity    = score >= 60 ? 'danger' : 'warning'
                risk_score  = score
                valid_from  = today
                valid_to    = today + 5 ngày
                is_active   = 1
              description   = mô tả điều kiện thời tiết thực tế (số liệu, không chung chung)
              recommendation = template IPM theo bệnh
  expire: is_active = 0 WHERE source='weather' AND valid_to < today
  dedupe: nếu đã có alert manual/official cùng (crop, disease, province) còn hiệu lực
          → không tạo bản weather (hoặc cập nhật risk_score vào bản chính thức)
```

`description` phải nêu số liệu cụ thể, ví dụ:
> "Dự báo 3 ngày tới: đêm 22–24°C, độ ẩm 92–95%, mưa 12mm — điều kiện thuận lợi cho bào tử đạo ôn nảy mầm."

### 5.4. API & UI

- `/alerts` trả thêm `source`, `riskScore`, `validFrom`, `validTo`, `sourceUrl`.
- Sắp xếp: `official` → `community` → `weather`, trong cùng nhóm theo `severity` rồi `risk_score`.
- AlertScreen: chip nguồn (`Chính thức` / `Cộng đồng` / `Dự báo thời tiết`), hiện `Nguy cơ 75%` nếu có `riskScore`, chân thẻ ghi "Dữ liệu thời tiết: Open-Meteo".
- `POST /jobs/run` (header `X-Job-Token`, so với `JOB_SECRET`) để chạy tay khi test/ops. `JOB_SECRET` rỗng → route 404.
- `/health` trả `jobs: { weather_risk: {...}, official_feed: {...} }` từ `job_runs`.

### 5.5. Điều kiện hoàn thành (DoD)

- [ ] Chạy job 2 lần liên tiếp → số dòng alert không đổi (idempotent).
- [ ] 3 tỉnh mẫu (Hà Nội, An Giang, Lâm Đồng) sinh alert đúng luật từ fixture.
- [ ] Alert hết `valid_to` tự tắt, không còn hiện trong `/alerts`.
- [ ] Tỉnh A không thấy cảnh báo riêng của tỉnh B; vẫn thấy cảnh báo toàn quốc.
- [ ] Job lỗi mạng → `job_runs.last_status='error'`, app vẫn trả cảnh báo cũ.
- [ ] `/alerts` p95 < 800ms với 34 tỉnh × ~20 alert.

---

## 6. GĐ3 — Tin chính thức từ Cục Trồng trọt & BVTV

### 6.1. Nguồn

| Trang | Dùng để |
|---|---|
| `ppd.gov.vn/canh-bao-svgh.html` | cảnh báo sinh vật gây hại định kỳ |
| mục "Tình hình SXTT & BVTV 7 ngày" | tình hình dịch theo tỉnh |
| mục "Công bố dịch" | dịch đã được công bố (mức cao nhất) |

Trước khi code: **spike 0.5 ngày** kiểm tra `robots.txt`, cấu trúc HTML, xem có RSS/sitemap/JSON không. Nếu có RSS → ưu tiên RSS (bền hơn parse HTML).

### 6.2. Pipeline

```
fetch listing (2 trang gần nhất)
  → với mỗi bài chưa có trong official_ingest:
      fetch article (rate limit 1 req/2s, UA: "AgriScanAI/1.0 (+contact)")
      parse:
        - title, published_at
        - provinces[]  : so khớp 34 tên mới + alias 63 tên cũ (longest-match)
        - crops[]      : từ điển keywords
        - diseases[]   : từ điển keywords
        - severity     : "công bố dịch" → danger
                         "nguy cơ cao"/"diện rộng" → danger
                         "xuất hiện rải rác"/"gây hại" → warning
      nếu thiếu province hoặc disease → lưu pending (KHÔNG hiện cho người dùng)
      nếu đủ → lưu pending + chờ duyệt (mặc định) hoặc auto-approve nếu AUTO_APPROVE_OFFICIAL=true
  → job duyệt/expire: alert valid_to = published_at + 30 ngày (hoặc end_date nếu có)
```

### 6.3. Chống trùng & chống sai

- Unique `(source_url, disease_name, province)` → crawl lại không nhân bản.
- `external_id = "official:" . sha1(source_url|disease|province)`.
- Chỉ publish khi: có ≥1 tỉnh **và** ≥1 bệnh thuộc từ điển.
- Giữ nguyên tiêu đề gốc + `source_url`; **không** đăng lại toàn văn. UI ghi "Nguồn: Cục Trồng trọt & BVTV" + link mở trình duyệt.
- Nếu HTML đổi cấu trúc → job fail rõ ràng (`last_message` nêu selector không khớp), không ghi rác vào DB.

### 6.4. API/UI

- `GET /admin/ingest?status=pending` (header `X-Admin-Token` = `ADMIN_TOKEN`).
- `POST /admin/ingest/{id}/approve` → tạo alert `source='official'`, `severity`, `valid_to`.
- `POST /admin/ingest/{id}/reject`.
- AlertScreen: thẻ chính thức có nút "Xem nguồn" (mở `source_url`).

### 6.5. DoD

- [ ] Fixture 5 bài báo thật → parse đúng tỉnh/cây/bệnh/ngày ở 5/5.
- [ ] Bài không nhắc tỉnh → `pending`, không lên `/alerts`.
- [ ] Crawl lại cùng URL → 1 dòng `official_ingest`, 1 alert.
- [ ] Tên tỉnh cũ ("An Giang" giữ nguyên, "Bình Dương" → "TP. Hồ Chí Minh", "Hà Nam" → "Ninh Bình"…) map đúng.
- [ ] Site chặn/đổi HTML → job error, alert cũ vẫn hoạt động.

---

## 7. GĐ4 — Báo cáo cộng đồng + thông báo

### 7.1. Luồng

```
Người dùng bấm "Báo dịch" (từ Kết quả quét hoặc màn Cảnh báo)
  → form: cây (prefill), bệnh nghi ngờ (prefill), tỉnh (prefill user-location),
          xã/phường (text), ghi chú, ảnh (tuỳ chọn)
  → POST /reports (status=pending, tối đa 3 báo cáo/ngày/user)
  → job aggregate mỗi giờ:
        nhóm theo (province, crop_slug, disease_label) trong 7 ngày
        nếu count(distinct user_id) >= 3:
            upsert alert source='community', severity='warning' (>=5 → danger)
            valid_from=today, valid_to=today+7
            tạo notification cho user cùng tỉnh đang theo dõi cây đó
```

- Báo cáo `rejected` không tính vào cụm; `verified` tính hệ số 2 (khuyến khích kiểm chứng).
- Alert cộng đồng hiển thị "3 người tại An Giang báo cáo trong 7 ngày" — không nêu tên ai.

### 7.2. Thông báo

**4a — trong app (không cần build lại APK):**
- `GET /notifications?limit=50`, `POST /notifications/read`, `GET /notifications/unread-count`.
- Màn `NotificationsScreen` + chuông có badge ở Home; polling 60s khi app foreground.
- Dùng bảng `notifications` sẵn có, `data = {alertId, deepLink}`.

**4b — push thật (tuỳ chọn, cần build lại):**
- Thêm `@react-native-firebase/app` + `@react-native-firebase/messaging`, `google-services.json`, quyền `POST_NOTIFICATIONS`.
- Backend lưu `device_tokens`, gửi FCM HTTP v1 (service account JSON) khi tạo alert.
- Chỉ làm khi bạn đã có Firebase project; nếu không, 4a là đủ.

### 7.3. DoD

- [ ] 3 user cùng tỉnh báo cùng bệnh trong 7 ngày → đúng 1 alert + N notification.
- [ ] Báo cáo thứ 4 không tạo alert trùng, không gửi lại notification.
- [ ] User tỉnh khác không nhận notification.
- [ ] Spam: user thứ 3 trong ngày bị chặn 429.
- [ ] Báo cáo của user A không lộ danh tính cho user B.
- [ ] (4b) App nhận push khi tắt app; token được xoá khi logout.

---

## 8. Bảo mật, pháp lý, dữ liệu

| Vấn đề | Xử lý |
|---|---|
| `REQUIRE_AUTH=false` | **Bắt buộc bật `true` trước GĐ4** — nếu không, mọi báo cáo cộng đồng bị gán cho user 1 |
| Job endpoint | `X-Job-Token` so với `JOB_SECRET`; rỗng → 404; không log token |
| Admin endpoint | `X-Admin-Token` so với `ADMIN_TOKEN`; rỗng → 404 |
| Rate limit | `/reports` 3/ngày/user; `/jobs/run` 4/giờ; crawler 1 req/2s |
| robots.txt & bản quyền | Chỉ lấy tiêu đề + tóm tắt + link; không đăng lại toàn văn; ghi nguồn rõ ràng |
| Dữ liệu cá nhân | Ảnh + toạ độ báo cáo: chỉ hiện cho admin; cho phép user xoá báo cáo của mình; không hiện toạ độ chính xác cho người khác |
| Sai lệch nội dung | Mọi cảnh báo weather/community có disclaimer "Tham khảo, đối chiếu khuyến nông địa phương" |
| Lưu trữ | Xoá `weather_snapshots` > 30 ngày, `notifications` > 90 ngày (job dọn dẹp) |

---

## 9. Kiểm thử

| Tầng | Cách làm |
|---|---|
| Unit (PHP) | `api/tests/run.php` chạy bằng `docker exec agriscan-api php /var/www/html/tests/run.php` — test `disease_risk` với fixture JSON, test parse HTML với fixture, test map tên tỉnh |
| Tích hợp job | Chạy `php jobs/run.php weather-risk` trong container, kiểm tra DB bằng SQL |
| Idempotency | Chạy mỗi job 2 lần, so `count(*)` trước/sau |
| API | `curl` các route mới với token hợp lệ/không hợp lệ |
| UI | Emulator: chọn tỉnh → thấy cảnh báo đúng; báo dịch → thấy trong "Báo cáo của tôi"; chuông có badge |
| Hồi quy | `/alerts` cũ vẫn trả 3 cảnh báo manual; chat/scan không đổi |

---

## 10. Rủi ro & giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Ngưỡng rủi ro sai → cảnh báo sai | **Cao** | Chỉ 3 cây/6 bệnh có tài liệu; nhãn "nguy cơ"; chuyên gia duyệt; có thể tắt bằng `WEATHER_ENABLED=0` |
| ppd.gov.vn đổi HTML / chặn crawl | Cao | Spike trước; fixture test; job fail rõ ràng; feature flag `OFFICIAL_ENABLED` |
| Crawl vi phạm bản quyền | Trung bình | Chỉ tiêu đề + tóm tắt + link; robots.txt; ghi nguồn |
| Push notification cần Firebase | Trung bình | 4a làm trước, 4b tuỳ chọn |
| Báo cáo cộng đồng bị spam/nhiễu | Trung bình | Rate limit, ngưỡng ≥3 user khác nhau, duyệt thủ công, hệ số verified |
| `crops` lệch với app (3 vs 9) | Trung bình | Task G2-01 chuẩn hoá trước khi làm bất cứ thứ gì |
| Cron trùng lặp khi scale nhiều API | Thấp | Chỉ 1 service `scheduler`; khoá `job_runs` + `SELECT ... FOR UPDATE` |
| Open-Meteo đổi hạn mức | Thấp | Cache `weather_snapshots`; có thể đổi sang OpenWeatherMap bằng 1 adapter |

---

## 11. Thứ tự thực hiện & ước lượng

```
G2-01 crops ──► G2-03 schema ──► G2-04 weather ──► G2-05 rules ──► G2-06 job
                                                                      │
                            G2-02 toạ độ ─────────────────────────────┘
                                                                      ▼
                                              G2-07 scheduler ──► G2-08 API ──► G2-09/10 UI ──► G2-11 test

G3-01 spike ──► G3-02 alias ──► G3-03 keywords ──► G3-04 parser ──► G3-06 job ──► G3-07 admin ──► G3-08 UI
                                                                                     └── G3-05 review

G4-01 schema ──► G4-02 report API ──► G4-05 form ──► G4-03 aggregate ──► G4-04 notif API ──► G4-06 UI
                                                                              └── G4-09 FCM (tuỳ chọn)
```

Ước lượng: **GĐ2: 3–4 ngày** · **GĐ3: 4–6 ngày** · **GĐ4a: 4–5 ngày** · **GĐ4b: 2–3 ngày**.

---

## 12. Ngoài phạm vi (ghi nhận để sau)

- Dự báo dịch bằng mô hình ML (chỉ làm khi có dữ liệu lịch sử đủ lớn).
- Bản đồ nhiệt dịch bệnh theo xã.
- Đồng bộ hai chiều với hệ thống của Chi cục BVTV tỉnh.
- Đa ngôn ngữ cho nội dung cảnh báo.
- Gửi SMS/Zalo OA.


## Quyền riêng tư (GĐ4)

| Dữ liệu | Lưu ở đâu | Ai xem được | Cách xoá |
|---|---|---|---|
| Ảnh lá quét | `scans.image` | Chủ tài khoản | Xoá lịch sử trong app |
| Tỉnh/thành | `user_profiles.province` | Chủ tài khoản (admin: số lượng) | Đổi khu vực trong Cảnh báo |
| Báo cáo dịch (cây, bệnh, xã, ghi chú) | `disease_reports` | Ẩn danh với mọi người dùng; admin thấy email để chống spam | `DELETE /reports/{id}` (chỉ chủ báo cáo) |
| Lượt xác nhận | `disease_report_votes` | Không ai thấy danh tính | Xoá kèm báo cáo |
| Thông báo | `notifications` | Chỉ người nhận | Đánh dấu đọc / xoá tài khoản |

Không thu thập GPS: người dùng chọn tỉnh thủ công. Không gửi dữ liệu sang bên thứ ba
ngoài Open-Meteo (toạ độ tỉnh, không định danh) và nhà cung cấp AI (ảnh khi người dùng
chủ động phân tích).
