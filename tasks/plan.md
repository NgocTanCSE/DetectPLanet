# Implementation Plan: AgriScan AI — tiệm cận Production, không mock

## Overview
Loại bỏ toàn bộ mock/demo fallback (AI giả, dữ liệu giả, auth giả), triển khai
Cloudflare Worker AI thật, hoàn thiện các màn hình còn placeholder (Guides,
Settings), sửa các bug chặn luồng OAuth/analyze, và validate end-to-end bằng
Docker stack thật + worker đã deploy.

## Quyết định đã chốt
- **Auth**: bỏ gate đăng nhập + bỏ user giả ("Dev"). Code OAuth Google đầy đủ,
  gate chỉ bật khi `extra.requireAuth = true` (user tự bật khi có credentials).

## Task List

### Phase 1 — AI Worker thật
- [x] T1.1 Prompt trả regions thật; normalize confidence 0–100; validate severity; bỏ crons
- [x] T1.2 Deploy worker lên Cloudflare (`wrangler deploy --env production`)
- [x] T1.3 Shared-secret auth giữa PHP ↔ worker (wrangler secret + AI_BEARER env)

### Phase 2 — PHP API: xóa mock, sửa bug
- [x] T2.1 Xóa mockPrediction/mockHome/mockGuides/mockPipeline/mockDetections + mọi nhánh AGRISCAN_DEMO; DB/AI down → 503/500 trung thực
- [x] T2.2 Fix /analyze: gửi URL công khai (không gửi localPath); detections từ regions thật của model; thêm GET /health
- [x] T2.3 /auth/me: xóa nhánh "chấp nhận mọi token" khi không có DB
- [x] T2.4 config.php: bỏ fallback AI_BEARER = CLOUDFLARE_API_TOKEN

### Phase 3 — Infra config
- [x] T3.1 docker-compose + .env(.example): tắt AGRISCAN_DEMO, thêm AI_BEARER, healthcheck /health
- [x] T3.2 Dockerfile.api healthcheck trỏ /health

### Phase 4 — Frontend: đủ tính năng, không dữ liệu giả
- [x] T4.1 App.js: bỏ SKIP_AUTH + fake user; REQUIRE_AUTH từ extra.requireAuth
- [x] T4.2 auth.js: sửa Linking.removeEventListener (RN 0.86 đã gỡ); persist token bằng expo-secure-store (web: localStorage)
- [x] T4.3 Guides screen thật (fetchGuides + accordion)
- [x] T4.4 Settings screen thật (user info, version, API URL, logout)
- [x] T4.5 History dùng filters từ API; api.js: timeout đủ lớn cho /analyze (60s+)
- [x] T4.6 result screen: nút Lưu báo cáo → saveRecord thật

### Checkpoint — Validation
- [ ] C1. `npm run validate` pass
- [ ] C2. Worker đã deploy: curl /health + /predict ảnh thật + /chat thật
- [ ] C3. `docker compose up` stack đầy đủ; curl: /health, /home, /history,
      /guides, /analyze (ảnh thật từ uploads/), /chat, /auth/me → 401
- [ ] C4. Không còn chuỗi "mock/is_mock/demo" trong luồng trả về API

## Risks
| Risk | Mitigation |
|------|-----------|
| Model vision không trả regions | Detections rỗng là hợp lệ UI; không bịa toạ độ |
| Wrangler token thiếu quyền deploy | Token đã verify có Workers Scripts (Edit); nếu fail → báo user |
| expo-secure-store version lệch SDK | Dùng `npx expo install` để lấy version tương thích |

## Open Questions
- Domain production (hiện app.json trỏ LAN IP) — để ngoài scope, đã ghi chú.
