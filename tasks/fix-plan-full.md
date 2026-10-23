# Audit & Fix Plan — AgriScan AI (React Native CLI)

> Generated: 2026-10-23  
> Scope: User app (`frontend/`), Admin app (`frontend_admin/`), Backend API

---

## 1. Audit Summary — Current State

### 1.1 Project Structure

| Layer | Location | Entry file | AppRegistry name | Package ID | Metro port (default) |
|---|---|---|---|---|---|
| User app | `/DetectPLanet/` (root) | `index.js` (`import App from './frontend/App'`) | `AgriScanAI` | `com.agriscan.ai` | 8081 |
| Admin app | `/DetectPLanet/frontend_admin/` | `index.js` (`import App from './src/App'`) | `AgriScanAdmin` | `com.agriscan.admin` | 8081 (conflict!) |
| API | `/DetectPLanet/api/` | `index.php` → `router.php` | n/a | n/a | HTTP :887 |

### 1.2 User App — 10 screens

| Screen | File | Nav key | Status |
|---|---|---|---|
| HomeScreen | `frontend/screens/HomeScreen.js` | `home` | ✅ |
| ScanScreen | `frontend/screens/ScanScreen.js` | `scan` | ✅ |
| CameraScreen | `frontend/screens/CameraScreen.js` | `camera` | ✅ |
| ResultScreen | `frontend/screens/ResultScreen.js` | `result` | ✅ |
| HistoryScreen | `frontend/screens/HistoryScreen.js` | `history` | ✅ |
| GuidesScreen | `frontend/screens/GuidesScreen.js` | `guides` | ✅ |
| ChatScreen | `frontend/screens/ChatScreen.js` | `chat` | ✅ |
| AlertScreen | `frontend/screens/AlertScreen.js` | `alerts` | ✅ (api decoupled) |
| ReportScreen | `frontend/screens/ReportScreen.js` | `report` | ✅ |
| NotificationsScreen | `frontend/screens/NotificationsScreen.js` | `notifications` | ✅ |
| SettingsScreen | `frontend/screens/SettingsScreen.js` | `settings` | ✅ |
| LoginScreen | `frontend/screens/LoginScreen.js` | `login` | ✅ |

**BottomNav tabs:** home(0), scan(1), chat(2), settings(3). Other screens are sub-screens.

### 1.3 Admin App — 12 screens

| Screen | File | Status | Notes |
|---|---|---|---|
| DashboardScreen | `src/screens/DashboardScreen.js` | ✅ | KPI, charts, AI summary |
| UsersScreen | `src/screens/UsersScreen.js` | ✅ | search/filter/pagination |
| ScansScreen | `src/screens/ScansScreen.js` | ✅ | search/filter/pagination |
| GuidesScreen | `src/screens/GuidesScreen.js` | ✅ | 2-col editor, CRUD + reorder |
| AlertsScreen | `src/screens/AlertsScreen.js` | ✅ | CRUD, filter, toggle |
| CommunityScreen | `src/screens/CommunityScreen.js` | ✅ | pending/verified/rejected tabs |
| OfficialScreen | `src/screens/OfficialScreen.js` | ✅ | pending/approved/rejected tabs |
| NotificationsScreen | `src/screens/NotificationsScreen.js` | ✅ | broadcast + stats |
| AiReportsScreen | `src/screens/AiReportsScreen.js` | ✅ | 7/30/90/custom summary |
| AuditScreen | `src/screens/AuditScreen.js` | ✅ | audit log |
| SystemScreen | `src/screens/SystemScreen.js` | ✅ | health + jobs |
| SettingsScreen | `src/screens/SettingsScreen.js` | ✅ | API URL + admin token |

**Drawer:** 12 items across 5 groups (Tổng quan, DỮ LIỆU, NỘI DUNG, CỘNG ĐỒNG, VẬN HÀNH).

### 1.4 Backend API

| Layer | Path | Status |
|---|---|---|
| Router | `api/router.php` | ✅ 14 controllers |
| Controllers | `api/controllers/*.php` | ✅ User + Admin controllers |
| Middleware | `api/middleware/admin.php` | ✅ X-Admin-Token auth |
| Jobs | `api/jobs/*.php` | ✅ weather-risk, official-alerts, aggregate-reports, weekly-report |
| Services | `api/services/*.php` | ✅ database, AI, weather, provinces, admin_report |
| DB Schema | `db/agriscan_schema_postgres.sql` | ✅ |
| Seed data | `db/seed_data.sql` | ✅ |

### 1.5 Already Fixed (DO NOT REDO)

| Issue | File | Fix | Status |
|---|---|---|---|
| AlertScreen imports `../../` → `../` | `frontend/screens/AlertScreen.js` | Fixed | ✅ |
| Button barrel `IconButton` re-export | `frontend/components/index.js` | Already correct: `export { IconButton } from './Button'` | ✅ |
| LoginScreen passes `iconName` to Button | `frontend/screens/LoginScreen.js` | Button.js already accepts `iconName/iconSize/iconColor` | ✅ |
| Fonts directory missing | `android/app/src/main/assets/fonts/` | Already exists (11 TTF files) | ✅ |
| Deep link intent-filter | `android/app/src/main/AndroidManifest.xml` | Already present | ✅ |
| Button layout `Animated.View` missing flexDirection | `frontend_admin/src/components/UI.js` | Fixed: added `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'center'`, `gap: 6` | ✅ |
| Button `flex: 1` collapse bug | `frontend_admin/src/components/UI.js` | Fixed: removed `flex: 1` from both Button and IconButton `Animated.View` | ✅ |
| `scripts/validate.js` missing | `frontend_admin/scripts/validate.js` | Created — 78/78 checks pass | ✅ |
| `useReduceMotion` hook | `frontend_admin/src/utils/motion.js` | Created with `MOTION` token, `staggerDelay`, `useReduceMotion` | ✅ |
| User API `normalizeImageUrl` localhost→10.0.2.2 | `frontend/services/api.js` | Fixed | ✅ |
| Admin README | `frontend_admin/README.md` | Updated with new structure, animation docs, changelog 1.1.0 | ✅ |

### 1.6 Remaining Issues to Fix

| # | Priority | Category | Description | Files |
|---|---|---|---|---|
| F1 | 🔴 CRITICAL | Config | **Metro port conflict** — both apps use port 8081; running both → "AgriScanAI/AgriScanAdmin has not been registered" | `frontend_admin/package.json`, `frontend_admin/metro.config.js` |
| F2 | 🟡 MEDIUM | Config | **jsconfig.json** missing `NotificationsScreen.js` and `ReportScreen.js` from include array | `jsconfig.json` |
| F3 | 🟡 MEDIUM | Config | **Admin `npm start`** script doesn't set custom Metro port; admin app can't auto-connect to 8082 | `frontend_admin/package.json` |
| F4 | 🟢 LOW | Config | **Admin `android:reverse`** script doesn't reverse port 8082 | `frontend_admin/package.json` |
| F5 | 🟡 MEDIUM | Docs | Admin README needs port conflict documentation | `frontend_admin/README.md` |
| F6 | 🟡 MEDIUM | Config | User app `android:reverse` script reverses 8081 + 1887 — good, but no documentation about not running both apps simultaneously | `frontend_admin/README.md` |
| F7 | 🟢 LOW | Code | **AlertScreen** `apiFetch` is local; doesn't use shared `api.js` endpoints for `/alerts` and `/user-crop-preferences` | `frontend/screens/AlertScreen.js` |

---

## 2. Fix Plan

### Phase A — Fix Metro port conflict (F1, F3, F4) 🔴

**Root cause:** Both `frontend/` and `frontend_admin/` default Metro to port 8081. If a Metro instance from one directory is running when the other app starts, the app receives the wrong bundle → `AppRegistry` error.

**Fix:**
1. Add `"start:prod": "react-native start --port 8082"` to `frontend_admin/package.json` scripts
2. Update `"android"` script in admin to use `--port 8082`
3. Update `"android:reverse"` in admin to reverse 8082 instead of 8081
4. Document: run user app on 8081, admin app on 8082, never the same port simultaneously

**Expected result:** Both apps can build and run independently. `npm run android` from root → user app on 8081. `npm run android` from `frontend_admin/` → admin app on 8082.

### Phase B — Fix jsconfig.json missing screens (F2) 🟡

**Fix:** Add `"frontend/screens/NotificationsScreen.js"` and `"frontend/screens/ReportScreen.js"` to `jsconfig.json` include array.

### Phase C — Fix AlertScreen API decoupling (F7) 🟢

**Fix:** Wire `AlertScreen.js` to use `api.js` client for `/alerts` and `/user-crop-preferences` endpoints, replacing local `apiFetch`.

### Phase D — Documentation updates (F5, F6) 🟢

**Fix:**
1. Add "Metro port conflict" section to `frontend_admin/README.md`
2. Document: "Never run `npm run android` from both directories simultaneously — use different Metro ports"
3. Update `npm start` instructions for admin app: `npx react-native start --port 8082`

### Phase E — Verify all fixes

1. `npm run bundle:check` from `frontend_admin/` — must pass
2. `node scripts/validate.js` — must pass 78/78
3. Build & launch admin APK — Dashboard loads real data
4. Build & launch user APK — Home screen loads
5. No AppRegistry errors when running each app from its correct directory

---

## 3. Feature Coverage Matrix

### 3.1 User App Features

| Feature | Screen | Implementation | Verified |
|---|---|---|---|
| Google Login | LoginScreen | `react-native-image-picker` + OAuth relay `:1887` | ⚠️ Code exists, not emulator-tested |
| Scan (image pick) | CameraScreen | `react-native-image-picker` | ⚠️ |
| Real-time diagnosis | ScanScreen | API `/scan/analyze` | ⚠️ |
| Diagnosis result | ResultScreen | Image + AI results | ⚠️ |
| Scan history | HistoryScreen | API `/history` | ⚠️ |
| Disease guides | GuidesScreen | API `/guides` | ✅ (verified: 12 guides load) |
| AI chat | ChatScreen | Cloudflare Workers AI proxy | ⚠️ |
| Weather alerts | AlertScreen | Local `apiFetch('/alerts')` | ⚠️ Decoupled from api.js |
| Report disease | ReportScreen | API `/reports` | ⚠️ |
| Notifications | NotificationsScreen | API `/notifications` | ⚠️ |
| Settings | SettingsScreen | API base, auth | ⚠️ |
| BottomNav | App.js | 4 tabs + tab→screen mapping | ✅ |
| Screen transitions | App.js + ScreenTransition | direction-based slide | ✅ |
| Reduce motion | motion.js | `useReduceMotion` | ✅ |

### 3.2 Admin App Features

| Feature | Screen | Implementation | Verified |
|---|---|---|---|
| Dashboard | DashboardScreen | KPI cards, charts, AI summary | ✅ (Users:2, Scans:119, Alerts:12, Rel:86%) |
| Users mgmt | UsersScreen | search/filter/pagination | ⚠️ |
| Scans log | ScansScreen | search/filter/pagination | ⚠️ |
| Guides mgmt | GuidesScreen | 2-col editor, CRUD + reorder | ✅ (9 guides, Thêm button aligned) |
| Alerts mgmt | AlertsScreen | CRUD, filter, toggle | ⚠️ |
| Community reports | CommunityScreen | pending/verified/rejected | ⚠️ |
| Official news | OfficialScreen | pending/approved/rejected, manual + URL ingest | ⚠️ |
| Notifications | NotificationsScreen | broadcast + read stats | ⚠️ |
| AI reports | AiReportsScreen | 7/30/90/custom summary | ⚠️ |
| Audit log | AuditScreen | audit trail | ⚠️ |
| System health | SystemScreen | health + jobs | ⚠️ |
| Settings | SettingsScreen | API URL + admin token | ⚠️ |
| Drawer nav | Drawer.js | 12 items, 5 groups | ✅ |
| Screen transitions | ScreenTransition.js | Animated slide | ✅ |
| Toast | Toast.js | success/error/info | ✅ |
| Reduce motion | motion.js | `useReduceMotion` | ✅ |
| Button spring | UI.js | scale 1→0.97 on press | ✅ |

### 3.3 Backend API Endpoints

| Endpoint | Controller | Description | Status |
|---|---|---|---|
| `GET /health` | — | Health check | ✅ |
| `GET /` | HomeController | Home data | ✅ |
| `GET /guides` | GuidesController | Disease guides | ✅ |
| `GET /alerts` | AlertController | Weather+community alerts | ✅ |
| `GET /auth/google` | AuthController | Google OAuth start | ✅ |
| `GET /auth/google/callback` | AuthController | OAuth callback | ✅ |
| `POST /scan/analyze` | ScanController | Image analysis | ✅ |
| `GET /history` | HistoryController | User scan history | ✅ |
| `POST /reports` | ReportController | Community report | ✅ |
| `GET /notifications` | NotificationsController | User notifications | ✅ |
| `POST /notifications/read` | NotificationsController | Mark read | ✅ |
| `POST /chat` | ChatController | AI chat | ✅ |
| `POST /jobs/run` | JobController | Manual job trigger | ✅ |
| `GET /admin/*` | AdminController(s) | Admin CRUD endpoints | ✅ |
