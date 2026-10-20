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
- [x] C1. `node _validate.js` pass → 14/14 ALL COMPONENTS RENDERED, 19/19 modules resolved
- [x] C2. Worker deployed: curl /health (configured:true) + /analyze real vision (Rose→Hoa hồng, healthy) + /chat real AI (Xanthomonas oryzae answer)
- [x] C3. `docker compose up` stack running; curl: /health ✓ · /home (real DB stats+recent+articles) · /history (real crop filters) · /guides (real guide accordion) · /analyze (real AI, 269KB JPEG) · /chat (real AI Vietnamese) · /auth/me → 401
- [x] C4. No "mock/is_mock/demo" strings in API responses (is_mock removed from /analyze, /chat, /result; mockPrediction() deleted; AGRISCAN_DEMO=0)

## Risks
| Risk | Mitigation |
|------|-----------|
| Model vision không trả regions | Detections rỗng là hợp lệ UI; không bịa toạ độ |
| Wrangler token thiếu quyền deploy | Token đã verify có Workers Scripts (Edit); nếu fail → báo user |
| expo-secure-store version lệch SDK | Dùng `npx expo install` để lấy version tương thích |

## Open Questions
- Domain production (hiện app.json trỏ LAN IP) — để ngoài scope, đã ghi chú.

---

## Phase 5 (current) — UI Redesign: Android SafeArea + Desktop Dashboard + Visual Polish + Seed

### Bối cảnh
- 3 bug gốc + e2e 6/6 + _validate 12/12 + php lint OK → **GREEN, không được regressed**.
- Stack: Expo SDK 57 / React-Native-Web + flat theme (`theme.js`/`icons.js`/`AppHeader.js`/`BottomNav.js`).
- Base URL `http://192.168.2.188:887`; expo web `localhost:8081`.

### Phân tích vấn đề
- **Android status bar overlay**: `AppHeader.js` chỉ set `paddingTop: 44` cho iOS (`hasSafeTop = Platform.OS === 'ios'`); Android không → tiêu đề bị status bar che. → fix: `StatusBar.currentHeight` (RN API, không cần provider → an toàn với `_validate`).
- **Scan 6 nút BottomNav**: ALREADY có (`TABS` 6 mục, scan = nút nổi trung tâm `top:-16`). Refactor: đảm bảo Desktop BottomNav hiển thị 6 nút thẳng hàng (không floating) để trông dashboard, Mobile giữ floating.
- **Desktop bị kéo dài**: Home là vertical ScrollView fixed-width ~390 → desktop co giãn lẫn nhau. → fix: `useWindowDimensions` chuyển desktop (>=768px) sang dashboard grid 2-cột.
- **UI thô/AI**: shadow mặc định `#141414`, thẻ trắng generic, typography weight rời rạc, không trạng thái hover/press/focus, tabular-nums chưa áp dụng cho số liệu. → fix: theme polish + interactive states.
- **Chống chéo**: result/camera/scan absolute overlays (badge, zoom, detections, corners) z-index chưa tỉ lệ + thiếu safe-top. → fix: z-index scale + safe insets.
- **Seed DB**: Postgres (`agriscan`). Check tables; thêm seed SQL cho thực thể nếu gập (articles/guides/stats).

### Task List (hiện tại)
- [x] T5.1 Android SafeArea: AppHeader + camera/result/scan top overlays (StatusBar.currentHeight)
- [x] T5.2 Desktop dashboard: Home responsive grid (>=768px) + BottomNav desktop straight row
- [x] T5.3 UI polish: theme typography/numeric weights, tinted shadows, hover/press/focus states, surface depth
- [x] T5.4 Overlap fix: z-index scale + safe-top cho result/camera/detection overlays
- [x] T5.5 Seed data: audit DB + seed script → Postgres

### Gates (verify sau mỗi T5.x)
- [x] `node _validate.js` → 14/14 "ALL COMPONENTS RENDERED" (added GuidesScreen + SettingsScreen)
- [x] `docker compose exec -T api php -l /var/www/html/index.php` → No syntax errors
- [x] Playwright e2e.test.js → 17/17 PASS (real AI chat, real guides, real settings)
- [x] `expo start --web --port 8081` bundle OK; web bundle serves HTTP 200

### Final State — GREEN gates
- [x] T6.1 Mock removal: deleted `mockPrediction()` in PHP; removed AGRISCAN_DEMO branches in /analyze & /chat; removed `is_mock` from all responses
- [x] T6.2 Env: `AGRISCAN_DEMO=0` in .env, .env.example, docker-compose.yml; `depends_on postgres required: true`
- [x] T6.3 Frontend: removed `import * as mockData` from api.js; fetchHome() returns empty state (no mock); chatWithAI() returns honest error text (no mock)
- [x] T6.4 e2e: updated chat/guides/settings tests to assert real AI responses; fixed history filter labels to match DB; fixed navigation_via_bottom_nav (BottomNav hidden on Chat)
- [x] T6.5 UI polish: BottomNav → useWindowDimensions (responsive resize) + theme shadow colors + z-scale; AppHeader → z.header + theme shadows; all screens → useTopInset() + HEADER_HEIGHT (not hardcoded 64); removed dead mockData.js
