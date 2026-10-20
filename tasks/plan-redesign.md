# AgriScan AI — Redesign Plan (No Icons, Softer Whitespace, Anti-SaaS Minimalism)

> **Design read:** AgriScan AI is a React Native mobile+web app for Vietnamese farmers — camera capture → AI leaf disease diagnosis. Reading this as a **farmer-focused utility tool** (not a SaaS dashboard), leaning toward **premium utilitarian minimalism** — clean editorial layout, text-first hierarchy, dense-but-breathable spacing, forest-green accent, zero decorative icons.
>
> **Dials:** `DESIGN_VARIANCE: 4` · `MOTION_INTENSITY: 3` · `VISUAL_DENSITY: 7`
>
> **Core invariant:** camera capture → AI diagnosis flow must remain byte-for-byte functional. All E2E test selectors (visible text + aria-labels) must be preserved.

---

## 1. Current State Audit

### 1.1 Icon Inventory (55+ usages across 10 screens + BottomNav + AppHeader + LoginScreen)

| Component | Icon count | Icons used |
|---|---|---|
| **BottomNav.js** | 8 | home, history, qr_code_scanner, photo_camera (×2), menu_book, psychology, settings |
| **AppHeader.js** | 2 | arrow_back_ios_new, eco |
| **HomeScreen** | 9 | notifications, share, partly_cloudy_day, eco, photo_camera, arrow_forward (×2), chevron_right, dynamic stat icon |
| **CameraScreen** | 11 | share, photo_camera (×2), flash_on/flash_off, grid_on, center_focus_strong, photo_library, flip_camera_ios, chevron_right, refresh, arrow_forward |
| **ScanScreen** | 6 | share, eco, error, check_circle, sync, close |
| **ResultScreen** | 14 | bookmark/bookmark_border (×2), share (×2), eco (×2), zoom_in/zoom_out, check_circle, expand_more, support_agent, call, photo_camera |
| **HistoryScreen** | 9 | notifications, search (×2), close, verified, schedule, chevron_right, analytics |
| **GuideScreen** | 6 | menu_book, error_outline, eco, expand_more, check_circle/eco |
| **ChatScreen** | 3 | refresh, psychology, send |
| **SettingsScreen** | 6 | person, logout, account_circle, info, dns, psychology |
| **LoginScreen** | 1 | eco |

**Icons are pervasive** — nearly every interactive element, badge, status indicator, and decorative element uses an icon. The icon set lives in `frontend/icons.js` (391 lines, 45+ SVG path definitions) and is imported via a custom `Icon` component that renders `react-native-svg`.

### 1.2 Whitespace Audit (current 4px-grid system)

| Element | Current value | Density level |
|---|---|---|
| Page gutter (`spacing.gutter`) | 16px | Medium |
| Card padding (hero, stat, scan) | 12–16px | Generous |
| Accordion section padding | 12px | Generous |
| Section gap between blocks | 10–24px (space-lg) | Spacious |
| ScrollView paddingBottom | 96–110px | Very spacious |
| Tab row height (BottomNav) | 60px (mobile), 72px (desktop) | Oversized |
| Header height | 54px | Standard |
| Hero CTA height | 50px | Generous |
| Stat card gap | 4–10px | Moderate |
| Label gap in rows | 8–12px | Moderate |

**The layout is "airy SaaS" tier** — cards breathe, sections have ample vertical rhythm, the bottom nav floats with shadow, and the hero CTA is a prominent pill.

### 1.3 SaaS Template Anti-patterns Identified

| # | Pattern | Current instance | Why it reads "SaaS template" |
|---|---|---|---|
| 1 | **Elevated cards with border + shadow** | `shadowPaper`/`shadowCard`/`shadowElevated` on nearly every container | Generic "material card" look |
| 2 | **Rounded corners everywhere** | `borderRadius: 10–20` on cards, pills, buttons, inputs | Pill-shaped buttons and rounded cards are SaaS cliché |
| 3 | **Floating bottom nav** | `position: absolute, bottom: 0` with shadow | Mobile SaaS app pattern |
| 4 | **Floating action button** | Green circular camera button floats above nav at `top: -16` | Classic FAB pattern |
| 5 | **Pill-shaped badges/tags** | `borderRadius: 20` on status pills, filter pills, severity badges | Overused in dashboards |
| 6 | **Icon + text button combos** | Every button has an icon + label | Template default |
| 7 | **Hero card with green CTA + arrow** | Hero CTA is an elevated green pill with camera icon + arrow icon | SaaS landing hero cliché |
| 8 | **Stat card grid** | 3-4 stat cards in a flex-wrap grid with icons | Dashboard default |
| 9 | **Weather badge with icon** | Partly-cloudy icon + "29°C, Nắng ráo" decorative pill | Dashboard weather widget |
| 10 | **Corner brackets** | SVG-like border brackets on camera/scan viewfinders | Tech-app aesthetic |
| 11 | **Tag + badge layering** | Tags with background colors + icons inside cards | Over-designed info density |
| 12 | **Multiple shadow layers** | `shadowElevated` (elevation 6, opacity 0.1) + `shadowCard` + `shadowPaper` | Shadow stacking looks AI-generated |

---

## 2. Redesign Strategy

### Aesthetic Direction: Premium Utilitarian Minimalism

**Reading this as:** A farmer's diagnostic tool. The user is a Vietnamese farmer, not an enterprise SaaS buyer. The aesthetic should be:
- **Text-first hierarchy** — let typography carry the information
- **Flat, border-only surfaces** — no shadows, no elevation
- **Single accent** — forest green (#006c49) only for active states and primary CTAs
- **Clean geometric shapes** — sharp 8px radius max, no pills
- **Dense-but-breathable** — tighter spacing (density: 7) without feeling cramped

### Design Dials (per taste-skill framework)

| Dial | Current | Target | Rationale |
|---|---|---|---|
| `DESIGN_VARIANCE` | 7 (zigzag, asymmetric cards) | 4 (symmetric, consistent) | Farmers need predictable, not "artsy" |
| `MOTION_INTENSITY` | 1 (static) | 3 (subtle hover/active) | Micro-interactions only for feedback |
| `VISUAL_DENSITY` | 3 (airy SaaS) | 7 (daily app, denser) | More content per viewport, less scrolling |

---

## 3. File-by-File Change Plan

### Phase A: Theme System (`frontend/theme.js`)

**Goal:** Collapse the 20+ color variants + 6 shadow variants into a minimal system.

**Changes:**
- **Colors:** Reduce from ~50 keys to ~12 core roles:
  - `background` / `surface` / `on-surface` (text) — warm off-white + charcoal (keep current values, remove tinted surface-container variants)
  - `muted` — secondary text (keep `#64748b`)
  - `outline` — borders (keep `#6c7a71`, simplify to one outline color)
  - `primary` — forest green `#006c49` (the ONE accent, used sparingly)
  - `on-primary` — white text on primary CTA
  - `primary-subtle` — `#e8f5e9` (very light green bg, used for active/hover states only, NOT for large surfaces)
  - Remove: `primary-container`, `primary-fixed`, `primary-fixed-dim`, `on-primary-fixed`, `secondary`, `tertiary`, all `surface-container-*`, `inverse-*` variants
  - Add: `danger` `#b91c1c`, `warning` `#ea580c` (for status, simplified)

- **Shadows:** Replace 4 shadow objects with ONE:
  - `shadowFlat` — `{ elevation: 0, shadowOpacity: 0 }` (zero — pure border-only surfaces)
  - Remove: `shadowPaper`, `shadowCard`, `shadowStrong`, `shadowElevated`
  - All cards become border-only (`borderWidth: 1` instead of shadow)

- **Typography:** Tighten the system:
  - Headings: `fontWeight: 600` (down from 700), slightly tighter line-height
    - `headline.lg`: 22px/28/600 (down from 24/32/600) — less heroic
    - `headline.md`: 18px/24/600 (down from 20/28/600)
    - `headline.sm`: 16px/22/600 (down from 18/24/600)
  - Body: keep at 14–16px but reduce line-height by 2px for denser text
    - `body.lg`: 15px/22/400 (from 16/24/400)
    - `body.md`: 13px/18/400 (from 14/20/400)
  - Labels: merge `label` into `body` (remove separate label family)
  - `metric-confidence`: 24px/30/600 (down from 28/32/700) — still prominent but less aggressive

- **Spacing:** Tighten the 4px grid:
  - `gutter`: 12 (down from 16)
  - `space-xs`: 4 (keep)
  - `space-sm`: 6 (down from 8)
  - `space-md`: 12 (down from 16)
  - `space-lg`: 18 (down from 24)
  - `space-xl`: 24 (down from 32)

- **Radius:** Flatten the corner radius scale:
  - `sm`: 2
  - `DEFAULT`: 6 (down from 8)
  - `md`: 8 (down from 12)
  - `lg`: 12 (down from 16)
  - `full`: 9999 (keep — used for the camera shutter circle only)

### Phase B: Icon Removal — `frontend/icons.js`

**Goal:** Remove all icon usages from the UI while keeping the file importable for `_validate.js`.

**Approach:** Keep `icons.js` as-is (it's a pure SVG component, no native deps) but **remove all `import Icon from '../icons'`** statements from every screen component. The `Icon` component itself stays in the codebase — just unused in the UI.

**Rationale:** Removing the file entirely would break `_validate.js` (which tests `Icon` rendering). We'll update `_validate.js` to remove the Icon render test and the file from the module-resolution list.

### Phase C: Keep `ProgressCircle.js` as-is ✅ (Revision)

`ProgressCircle` is a **data visualization component** (shows confidence %, progress %), not a decorative icon. It uses `react-native-svg` which is a legitimate dependency for SVG-based charts. **Decision: keep it unchanged.**

**Revised package.json strategy:** Keep `react-native-svg` in dependencies (needed by ProgressCircle). Remove icon *usages* from screens, but keep `icons.js` as a codebase artifact (still tested by `_validate.js`).

### Phase D: BottomNav.js — Text-only, flat strip

**Goal:** Replace the floating icon-heavy nav with a flat text-only strip.

**Changes:**
- Remove `import Icon from './icons'`
- `TABS` array: all tabs get text labels. The `scan` tab currently has `label: ''` → change to `label: 'Quét'`
- Remove all `Icon` renders from `renderTab()`
- **Mobile layout:** flat strip at bottom, `height: 48px`, no shadow, no floating FAB
  - The central scan button: instead of a floating green circle with camera icon, make it a text button "Quét lá" in the tab strip (same style as other tabs, green text when active)
  - Remove the `position: absolute, top: -16` floating behavior — it sits in the normal tab flow
- **Desktop layout:** same flat strip, all 6 tabs inline, height: 48px
- Remove all shadow styles (`shadowPaper`)
- Tab width: auto (shrink-wrapped) instead of fixed 60px
- Tab padding: `paddingVertical: 10, paddingHorizontal: 8`
- Active tab color: `colors.primary` (forest green), inactive: `colors.muted`
- Tab font: `typography.label` at 13px, `fontWeight: 600`
- Remove `borderTopWidth` + shadow — instead, a single `borderTopWidth: 1` in `colors.outline`

**E2E compatibility:** Tests check `text=Trang chủ`, `text=Lịch sử`, `text=Cẩm nang`, `text=Chat AI`, `text=Cài đặt` — all preserved. No test clicks the "Quét" scan tab directly (navigation is via the hero CTA button).

### Phase E: AppHeader.js — Text-only header

**Goal:** Remove all icons from the header, use text-only buttons.

**Changes:**
- Remove `import Icon from './icons'`
- **Back button:** Replace icon with text "Quay lại" (13px, `fontWeight: 500`, `color: colors.muted`)
  - Keep `accessibilityLabel: "Quay lại"` — E2E test uses `clickThroughJS(page, 'Quay lại')` via aria-label
- **Logo badge:** Remove the `eco` icon + colored circle. Replace with plain text "AgriScan AI" in the title.
- **Action buttons:** Replace each `{ icon, label, onPress }` action button with a text-only button showing just the label (or aria-label text). Keep `accessibilityLabel={a.label}` for screen readers and E2E.
  - Example: `notifications` → text button "Thông báo", `share` → text button "Chia sẻ"
  - For actions without labels (e.g., some have `label` but no visible text), add visible text = the label
- Remove `logoBadge` style entirely
- Height: reduce from 54px to 44px
- Remove shadow (`elevation: 1`, `shadowOpacity: 0.05`)
- Keep `borderBottomWidth: 1` for separation
- `headerInner` padding: 12 (down from 16)

**E2E compatibility:** Tests use `aria-label` for back/refresh/send buttons, and visible text for nav tabs. All preserved.

### Phase F: LoginScreen.js — Text-only logo

**Goal:** Remove the `eco` icon from the login screen.

**Changes:**
- Remove `import Icon from '../icons'`
- Replace the logo circle + `eco` icon with a simple text-based logo: "AgriScan AI" in large type with a small green accent dot (using a `View` with `width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary`) before the text
- Keep everything else the same (Google button already uses text + Google logo image)
- Remove `logoCircle` style, replace with `logoMark` (just the green dot)

### Phase G: HomeScreen (`home/code.js`) — Editorial, dense layout

**Goal:** Transform from SaaS dashboard to editorial farmer's overview.

**Changes:**
1. **Header actions:** Remove icons. "Thông báo" and "Chia sẻ" become text-only buttons.
2. **Greeting row:** Remove the `partly_cloudy_day` icon from weather badge → weather becomes plain text "29°C, Nắng ráo" (no icon, no pill background — just muted text).
3. **Hero card:**
   - Remove `shadowCard` → border-only
   - Remove `eco` icon from hero pill → the pill becomes a plain text tag "CHẨN ĐOÁN LÁ CÂY" with no icon
   - Remove `photo_camera` icon from CTA → CTA button is text-only "Bắt đầu quét mẫu lá" (green fill, no shadow)
   - Remove `arrow_forward` icon from CTA → remove the trailing arrow
   - Tighten padding: 20 → 14
   - Reduce border radius: 18 → 10
4. **Stat cards:**
   - Remove icon from each stat card → stat card is just value + label (text-only)
   - Remove `shadowPaper` → border-only
   - Tighten padding: 14 → 10
   - Reduce border radius: 14 → 8
5. **Recent scans section:**
   - Remove `chevron_right` icon from "Xem tất cả" → text-only link with underline on hover (web)
   - ScanCard: remove `shadowPaper` → border-only, padding 12 → 8, radius 14 → 8
6. **Article cards:**
   - Remove `arrow_forward` icon from action link → text-only "Đọc thêm" with underline
   - Remove `shadowPaper` → border-only, padding 12 → 10, radius 14 → 8
7. **Section spacing:** Reduce gap between sections: `space-lg` (24) → `space-md` (12)
8. **Scroll padding:** `paddingBottom: 96` → `paddingBottom: 48`

**E2E compatibility:** All visible text preserved ("Chào Bác Ba", "Phát hiện sâu bệnh tức thì", "Bắt đầu quét mẫu lá", etc.).

### Phase H: CameraScreen (`camera/code.js`) — Focus on the capture action

**Goal:** Remove decorative icons, keep all functional controls as text-only buttons.

**Changes:**
1. **AppHeader actions:** Remove `share` icon → text-only "Chia sẻ"
2. **Feed placeholder:** Remove `photo_camera` icon (48px) → replace with a simple border-dashed box (no icon, no text inside — just the dashed border + a small instruction text below it)
3. **Mode switcher:** Keep as-is (already text-only tabs "Chụp trực tiếp" / "Chọn từ thư viện") — no icons here, just remove any icon imports
4. **Flash toggle:** Replace `flash_on`/`flash_off` icon with text label "Flash" (toggles between "Bật" / "Tắt" text inside the button). Keep `accessibilityLabel="Bật tắt Flash"`.
5. **Grid toggle:** Replace `grid_on` icon with text "Lưới". Keep `accessibilityLabel="Lưới căn chỉnh"`.
6. **Guidance banner:** Remove `center_focus_strong` icon → text-only guidance (remove icon, keep the text)
7. **Controls row:**
   - Library button: Remove `photo_library` icon → text-only "Thư viện"
   - Shutter button: Remove `photo_camera` icon → the shutter remains a green circle but with NO icon inside (just the circle). The accessibility label "Chụp ảnh" stays.
   - Flip camera: Remove `flip_camera_ios` icon → text-only label that changes with mode ("Chế độ" or text showing current mode)
8. **Review strip:** Remove `chevron_right` icon from "Xem lại" → text-only with underline
9. **Preview sheet:**
   - Remove `refresh` icon from "Chụp lại" → text-only button
   - Remove `arrow_forward` icon from "Phân tích ngay" → text-only button (keep green background)
   - Remove `clarityBadge` background styling — "Chất lượng tốt" becomes plain text
10. **Corner brackets:** Remove the 4 corner frame views (`cornerTL/TR/BL/BR`) entirely — they're decorative
11. **Viewport bottom pill:** Keep the text but remove the pill background → plain text at bottom of viewport

**E2E compatibility:** Tests check `text=Chụp ảnh mẫu lá`, `text=Chụp trực tiếp`, `text=Chọn từ thư viện` — all preserved. aria-labels "Bật tắt Flash", "Lưới căn chỉnh", "Lật camera" preserved.

### Phase I: ScanScreen (`scan/code.js`) — Cleaner analysis state

**Goal:** Remove decorative icons from the scanning progress screen.

**Changes:**
1. **AppHeader actions:** Remove `share` icon → text-only "Chia sẻ"
2. **Status pill:** Remove the colored dot → text-only status "Đang xử lý" / "Đã hoàn tất"
3. **Model pill:** Remove `eco` icon → text-only "Nhận diện bệnh hại"
4. **Error banner:** Remove `error` icon → text-only with bold error text
5. **Viewfinder:** Remove corner bracket frames (same as camera)
6. **Detection bounding boxes:** Keep the boxes (they're data-driven annotations) but remove text badges → simplified to just a small colored dot on the box
7. **Progress card:** Remove `shadowPaper` → border-only, padding 16 → 12
8. **Stepper:**
   - Remove `sync`/`step.icon` icons → use a simple numbered circle (1, 2, 3...) or a colored dot
   - Reduce padding: 16 → 12, radius 16 → 8
9. **Telemetry footer:** Remove `check_circle` icon → text-only
10. **Cancel button:** Remove `close` icon → text-only "Hủy bỏ phân tích"
11. **Scroll padding:** 96 → 48

### Phase J: ResultScreen (`result/code.js`) — Authoritative report, no chrome

**Goal:** Make the diagnosis report look authoritative and clean, like a printed agricultural bulletin.

**Changes:**
1. **AppHeader actions:** Remove `bookmark`/`bookmark_border` icons → text-only "Lưu" / "Bỏ lưu". Remove `share` icon → text-only "Chia sẻ"
2. **Leaf image:**
   - Remove `eco` fallback icon → plain colored placeholder box (no icon)
   - Remove `eco` from plant tag → plain text "Tên cây #id" (no green icon dot)
   - Remove `zoom_in`/`zoom_out` icon → text-only "Phóng to" / "Thu nhỏ" button (small, text-only)
3. **Diagnosis card:**
   - Remove `shadowPaper` → border-only, padding 16 → 14
   - Remove `severityPill` icon → text-only severity tag
4. **Status matrix:** Remove background fill → plain 3-column text grid, no pill backgrounds
5. **Accordion:**
   - Remove `eco`/`check_circle` section icons → remove icon column, just text
   - Remove `expand_more` → use plain text "Mở rộng" / "Thu gọn" or a simple CSS caret (border-based triangle, not SVG icon)
   - Remove `accordionIcon` circle background → remove entirely
   - Remove `sectionBadge` backgrounds → plain text tags
6. **Consult card:**
   - Remove `support_agent` icon → plain text card
   - Remove `call` icon from consult button → text-only "Gọi tổng đài"
7. **Quick action bar:**
   - Remove `bookmark`/`bookmark_border` icon → text-only
   - Remove `photo_camera` icon from "Quét mẫu lá khác" → text-only
   - Remove `share` icon → text-only
   - Simplify from icon buttons to text labels
8. **Toast:** Remove `check_circle` icon → text-only toast

### Phase K: HistoryScreen (`history/code.js`) — Field log, not dashboard

**Goal:** Transform from dashboard cards to a clean field log.

**Changes:**
1. **AppHeader actions:** Remove `notifications` icon → text-only "Thông báo"
2. **Search:** Remove `search` icon → just the text input with placeholder (no icon prefix). Remove `close` icon from clear button → text-only "Xóa"
3. **Filter pills:**
   - Remove icon from filters → the default "Tất cả" filter has `icon: 'apps'` → remove
   - Simplify pills to text-only, border-only (no filled backgrounds for active state — use border-bottom instead)
4. **Records list:**
   - Remove `verified` icon from confidence badge → text-only "92%"
   - Remove `schedule` icon from time → plain text
   - Remove `chevron_right` from record → text-only (or remove entirely)
   - Remove `shadowPaper` from records → border-only
   - Reduce padding: 10 → 8, radius 14 → 8
5. **Health summary banner:**
   - Remove `analytics` icon → section heading text only
   - Remove `summaryTag` pill → plain text "Tổng kết"
   - Simplify health bar → keep colored segments (they're data visualization, not decoration)
6. **Empty state:** Remove `search` icon → plain text message

**E2E compatibility:** All text preserved: "Nhật ký chẩn đoán", "Tất cả", "Lúa", "Cà chua", "Trái cây", "Báo động", "Tìm theo cây trồng...".

### Phase L: GuideScreen (`guides/code.js`) — Simple reference list

**Goal:** Clean reference material, no decorative icons.

**Changes:**
1. **Loading state:** Remove `menu_book` icon → plain text "Đang tải..."
2. **Error state:** Remove `error_outline` icon → plain text message
3. **Accordion:**
   - Remove `eco` accordion icon → remove icon circle
   - Remove `expand_more` → CSS caret or text
   - Remove `check_circle`/`eco` section icons → remove icon column
   - Use border-bottom separators instead of `accordionSection` background fills
4. **Empty card:** Remove icon

### Phase M: ChatScreen (`chat/code.js`) — Conversation, no chrome

**Goal:** Clean chat interface focused on conversation.

**Changes:**
1. **AppHeader actions:** Remove `refresh` icon → text-only "Làm mới"
2. **AI avatar:** Remove `psychology` icon → remove avatar circle (or use a simple colored dot as the avatar indicator — a 6px circle, not an icon)
3. **Send button:**
   - Remove `send` icon → text-only "Gửi"
   - Keep `accessibilityLabel="Gửi tin nhắn"`
   - Simplify button: text-only, no icon
4. **Message bubbles:** Remove `psychology` avatar → user messages right-aligned, AI messages left-aligned as plain text bubbles (no avatar icon)
5. **Input:** Remove `borderRadius: 16` from input → `borderRadius: 6`
6. **Send button:** Remove `borderRadius: 22` → `borderRadius: 6`

**E2E compatibility:** Tests check `text=AgriScan AI Chat`, `placeholder="Nhập câu hỏi..."`, `aria-label="Gửi tin nhắn"`. All preserved.

### Phase N: SettingsScreen (`settings/code.js`) — Plain settings list

**Goal:** Clean settings list with text-only rows.

**Changes:**
1. **Account section:**
   - Remove `person` avatar icon → use text initial (already partially done with `profileInitial`)
   - Remove `logout` icon → text-only "Đăng xuất"
   - Remove `account_circle` icon from login button → text-only "Đăng nhập bằng Google"
2. **App info rows:** Remove `info`, `dns`, `psychology` icons → text-only rows
3. **Cards:** Remove `shadowPaper` → border-only, padding 16 → 12, radius 14 → 8

**E2E compatibility:** All text preserved: "Cài đặt", "Tài khoản", "Ứng dụng", "Cloudflare Workers AI", "Giới thiệu".

### Phase O: dto.js — Clean up icon fields

**Changes:**
- Remove `icon` and `color` properties from `HealthStat` typedef (no longer needed — stat cards are text-only, color derived from severity)
- Remove `icon` property from `FilterPill` typedef (already has empty default `'filter_list'`, no icon needed)
- Remove `icon` property from `ReportSection` typedef (accordion sections are text-only)
- Remove `icon` property from `ScanPipelineStep` typedef (steps use numbered dots instead)
- Keep `emptyStat` factory but simplify (remove `icon` field, keep `color` for severity coloring)

### Phase P: _validate.js — No changes needed ✅

`icons.js` is kept in the codebase (still tested by `_validate.js` for Icon rendering). Since screens will no longer import `Icon`, the render tests just produce fewer children — no breakage. svgStub stays for `icons.js` and `ProgressCircle.js`.

### Phase Q: package.json — No dependency changes ✅

`react-native-svg` stays (needed by `ProgressCircle.js`). No `package.json` changes required.

### Phase R: Web stubs — No changes needed ✅

No new stubs needed. `react-native-svg` resolves natively on web (no stub in metro.config.js).

---

## 4. E2E Test Compatibility Matrix

| Test | Selector | Status after redesign |
|---|---|---|
| `home_renders_real_data` | `text=AgriScan AI`, `Chào Bác Ba`, `Phát hiện sâu bệnh tức thì`, `Bắt đầu quét mẫu lá` | ✅ Preserved |
| `camera_screen_renders_no_crash` | `text=Chụp ảnh mẫu lá`, `Chụp trực tiếp`, `Chọn từ thư viện` | ✅ Preserved |
| `camera_mode_switcher` | clicks on `text=Chọn từ thư viện`, `Chụp trực tiếp` | ✅ Preserved (already text-only tabs) |
| `camera_flash_toggle` | `aria-label=Bật tắt Flash` | ✅ Preserved (text button keeps aria-label) |
| `camera_grid_toggle` | `aria-label=Lưới căn chỉnh` | ✅ Preserved |
| `camera_flip_camera` | `aria-label=Lật camera` | ✅ Preserved |
| `history_renders_records` | `text=Nhật ký chẩn đoán`, search placeholder, `Tất cả`, `Lúa`, `Cà chua`, `Trái cây`, `Báo động` | ✅ Preserved |
| `guides_renders_real_data` | `text=Cẩm nang`, `Bệnh Đốm Nâu`, `Nguyên nhân` | ✅ Preserved |
| `chat_renders_and_sends_message` | `text=AgriScan AI Chat`, input placeholder, `aria-label=Gửi tin nhắn` | ✅ Preserved |
| `chat_refresh_clears_history` | `aria-label=Làm mới` | ✅ Preserved |
| `settings_renders_real_data` | `text=Cài đặt`, `Tài khoản`, `Ứng dụng`, `Cloudflare Workers AI`, `Giới thiệu` | ✅ Preserved |
| `bottom_nav_navigation` | `text=Trang chủ`, `Lịch sử`, `Cẩm nang`, `Chat AI`, `Cài đặt` | ✅ Preserved |
| `home_hero_cta_navigates_to_camera` | clicks `text=Bắt đầu quét mẫu lá` | ✅ Preserved |
| `navigation_back_from_camera` | `aria-label=Quay lại` | ✅ Preserved |
| `navigation_back_from_chat` | `aria-label=Quay lại` | ✅ Preserved |
| `navigation_via_bottom_nav` | clicks `text=Lịch sử`, `Cài đặt`, `Cẩm nang`, `Trang chủ` | ✅ Preserved |
| `history_search_filter` | input placeholder, clicks `text=Lúa`, `Báo động`, `Tất cả` | ✅ Preserved |

**Key insight:** All E2E tests use either visible text or aria-labels. No test relies on icons. The redesign preserves all text content and aria-labels exactly.

---

## 5. Implementation Order (after approval)

```
Phase 1: theme.js          → Collapse colors, shadows, typography, spacing (DONE)
Phase 2: ProgressCircle.js → KEEP as-is (data viz, not decorative icon)
Phase 3: BottomNav.js      → Text-only flat strip
Phase 4: AppHeader.js      → Text-only header
Phase 5: LoginScreen.js    → Text-only logo
Phase 6: camera/code.js    → Text-only controls + Image Quality Check feature
Phase 7: scan/code.js      → Text-only status
Phase 8: result/code.js    → Authoritative report + Saved Reports feature
Phase 9: home/code.js      → Editorial overview + Saved Reports display
Phase 10: history/code.js  → Field log + Scan Stats feature
Phase 11: guides/code.js   → Reference list
Phase 12: chat/code.js     → Conversation
Phase 13: settings/code.js → Settings list
Phase 14: dto.js           → Remove icon fields
Phase 15: _validate.js     → No changes needed
Phase 16: package.json     → No changes needed
Phase 17: VERIFY           → node _validate.js + npx playwright test
```

---

## 6. What Stays Untouched

- **All API logic** (`api.js`, `auth.js`) — no UI changes
- **All native Android code** — no manifest/gradle changes needed
- **Web stubs** (`web/stubs/`) — no new stubs needed (react-native-svg removal makes this simpler)
- **Metro config** — no changes
- **Babel config** — no changes
- **index.js / index.web.js** — no changes
- **app.json / eas.json** — no changes

---

---

## 8. New Feature Proposals (Added to Redesign)

Three small features that complement the minimalist redesign and enhance the core camera → AI diagnosis flow:

### Feature 1: Image Quality Check (camera flow)
**What:** Before the "Phân tích ngay" button appears in the review sheet, run a quick blur check on the captured image using a canvas-based variance-of-Laplacian approach (or a simple heuristic via `Image.resolveAssetSource` + canvas in web / native blur detection in RN). Show a text-only quality indicator:
- "Chất lượng ảnh tốt" (green) when sharp enough
- "Ảnh mờ, vui lòng chụp lại" (amber) when too blurry

**Why:** Farmers often take blurry photos. Catching this early saves them the 2s AI round-trip on a bad image.

**Files:** `frontend/camera/code.js` (add quality check logic), `frontend/dto.js` (add `sharpness` field to `CameraCapture`)

### Feature 2: Saved Reports (result screen)
**What:** The bookmark button in ResultScreen is currently a no-op visual toggle. Make it functional:
- Save the current report to `react-native-encrypted-storage` (or in-memory on web stub)
- On home screen, show a small "Báo cáo đã lưu" section (max 3 items) below the hero
- Use text-only styling (no icons)

**Why:** Farmers need to reference treatment advice later, offline.

**Files:** `frontend/result/code.js`, `frontend/home/code.js`, `frontend/auth.js` (or new `frontend/storage.js`)

### Feature 3: Scan Statistics Summary (history screen)
**What:** At the top of the HistoryScreen, add a simple text-based summary:
- "Tổng cộng: N mẫu" with severity breakdown (healthy/warning/danger) as plain text, not the current segmented bar

**Why:** The current health bar is a dashboard pattern (SaaS aesthetic). Replace with plain text summary that's cleaner.

**Files:** `frontend/history/code.js` (simplify the healthBanner)

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Removing icons makes certain controls ambiguous (e.g., what does "Flash" button do?) | Add explicit text labels. Use aria-labels for screen readers. The `accessibilityLabel` already exists — we just add visible text. |
| Camera shutter button without icon looks like just a green circle | Keep the green circle shape (it's the visual anchor) — it's clearly a shutter button from context (camera screen, large circular button) |
| Search input without icon prefix looks bare | The placeholder text "Tìm theo cây trồng..." provides context |
| Removing react-native-svg might break something unexpected | We run `_validate.js` (19 modules) and E2E (17 tests) after — if anything breaks, we rollback the ProgressCircle rewrite and keep react-native-svg |
| BottomNav scan tab without icon — is "Quét" clear enough? | "Quét lá" (scan leaf) in hero CTA is the primary entry. The tab is secondary navigation. "Quét" as a tab label is standard Vietnamese UI. |
| Text-only buttons might look like links | Use appropriate styling (filled green for primary CTAs, text-only with border for secondary) |
