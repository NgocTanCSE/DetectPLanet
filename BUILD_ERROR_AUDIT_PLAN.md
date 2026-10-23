# AgriScan AI — Build Error Audit & Fix Plan

> Scope: Full project scan for **build errors** across the React Native CLI
> app (`frontend/`), native Android (`android/`), config files, and shared
> source.  
> Status: Phase 1 (Audit) complete; issues catalogued below in priority order.

---

## 1. Scan Summary

| Area | Files Scanned | Issues Found | Status |
|------|-------------|-------------|--------|
| JS syntax validation | 32 files | 0 syntax errors | ✅ Pass |
| Import path resolution | 12 screens, 14 components, 3 services, 2 utils, App.js, icons.js | 4 path errors | ⚠️ 1 fixed, 3 remaining |
| Export/import consistency | All barrels + screens | 1 mismatch | ⚠️ Needs fix |
| Dependency presence | package.json vs imports | All packages installed | ✅ Pass |
| Native module linking | Android settings.gradle + build.gradle | Autolink configured | ✅ Pass |
| Android native config | Manifest, resources, MainActivity | 2 issues | ⚠️ Needs fix |
| Metro / Babel config | metro.config.js, babel.config.js | OK | ✅ Pass |

---

## 2. Issues by Priority

### 🔴 CRITICAL — Must fix before build/bundle
<!-- These will cause Metro or Gradle to fail. -->

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `frontend/screens/AlertScreen.js` (lines 21–23) | **ALREADY FIXED** — Three imports used `../../` (resolves to project root, where `components/`, `utils/` don't exist) instead of `../` (resolves to `frontend/`). | Changed `../../` → `../` for `theme`, `AppHeader`, and `components` barrel imports. |
| 2 | `frontend/components/index.js` (line 7) | Barrel export `export { default as IconButton } from './Button'` re-exports the **default** export (which is `Button`, not `IconButton`) as `IconButton`. Anyone importing `{ IconButton }` from the barrel silently gets the `Button` component. | Change to `export { IconButton } from './Button'` (named export). |

### 🟠 HIGH — Will cause runtime crashes / native failures
<!-- These won't block JS bundling but will crash at runtime or break features. -->

| # | File | Issue | Fix |
|---|------|-------|-----|
| 3 | `android/app/src/main/AndroidManifest.xml` | No `<intent-filter>` for deep link `com.agriscan.ai://auth` on `MainActivity`. Google OAuth redirect URI is defined in `services/auth.js` but the Android manifest cannot intercept it → Google login **silently fails** on Android. | Add `<intent-filter android:autoVerify="true">` with `<data android:scheme="com.agriscan.ai" android:host="auth" />` inside the existing activity. |
| 4 | `android/app/src/main/assets/` | Missing `fonts/` directory — `useFonts.js` states custom TTF fonts (`Geist-*, PlusJakartaSans-*`) are bundled as native assets in `android/app/src/main/assets/fonts/`, but the directory doesn't exist. Custom fonts fall back to system defaults on Android. | Create `android/app/src/main/assets/fonts/` and copy the TTF files. Add `android/app/src/main/res/font/` XML references if needed. |

### 🟡 MEDIUM — Will cause missing UI / silent failures
<!-- These produce incorrect UI or silently broken features. -->

| # | File | Issue | Fix |
|---|------|-------|-----|
| 5 | `frontend/screens/LoginScreen.js` (line ~48) | `<Button>` is passed `iconName="google"` and `iconSize={18}` props, but the `Button` component (lines 14–23 of `Button.js`) **does not accept or render** `iconName`/`iconSize`. The Google icon won't appear. | Either (a) use `<IconButton iconName="google" ...>` from the barrel, or (b) add `iconName`/`iconSize` handling to the `Button` component. |
| 6 | `jsconfig.json` | `frontend/screens/AlertScreen.js` is **missing** from the `include` array (all other screens are listed). IDE/JSDoc type-checking won't cover it. Not a Metro build error, but a config inconsistency. | Add `"frontend/screens/AlertScreen.js"` to the `include` array. |
| 7 | `frontend/screens/AlertScreen.js` (line 67) | Uses a **local** `apiFetch` function that calls `/alerts` and `/user-crop-preferences`, but `services/api.js` does **not** export an `alerts` or `user-crop-preferences` endpoint. The AlertScreen data flow is decoupled from the shared API layer. | Decide: either add `/alerts` + `/user-crop-preferences` to `api.js`, or wire AlertScreen to use existing `api.js` endpoints. For build purposes this is OK (no import error) but it's an architectural inconsistency. |

### 🟢 LOW — Cleanup / hygiene (not blocking, not crashing)

| # | File | Issue | Fix |
|---|------|-------|-----|
| 8 | `frontend/components/layout/index.js` | Barrel exports `BOTTOM_NAV_HEIGHT` as a named re-export, but no screen imports it from the barrel (all import directly from `../components/layout/BottomNav`). Unused barrel — not an error, just dead code. | Optional: remove or leave as-is. |
| 9 | `frontend/screens/AlertScreen.js` (line 87–95) | `togglePreference` compares `p.cropId === cropId` and reads `p.isActive`, but the DTO shapes in `utils/dto.js` don't define a `cropId`/`isActive` model. If the backend response shape doesn't match, filter logic silently returns empty. | Verify backend `/user-crop-preferences` response shape matches the DTO expectations. |
| 10 | `frontend/screens/HomeScreen.js` | Imports `{ getCurrentUser, onAuthStateChanged }` from auth but the file's full body wasn't audited for unused imports. | Run `npm run lint` (if configured) or `eslint --fix` to catch unused vars. |

---

## 3. Action Plan — Execution Order

### Phase A: Fix Critical Build Errors (5 min)
1. **✅ DONE** — `AlertScreen.js` import paths (`../../` → `../`)  
2. **TODO** — Fix `IconButton` barrel export in `components/index.js`

### Phase B: Verify Bundle Compiles (5 min)
3. Start Metro with `--reset-cache` and fetch `index.bundle`  
   ```bash
   npx react-native start --reset-cache
   curl -s "http://localhost:8081/index.bundle?platform=android" | head -c 200
   ```
   Expected: bundle output with no "Unable to resolve module" errors.

### Phase C: Fix High-Priority Native Issues (10 min)
4. Add deep-link intent-filter to `AndroidManifest.xml` for `com.agriscan.ai://auth`  
5. Create `android/app/src/main/assets/fonts/` directory and place TTF files

### Phase D: Fix Medium-Priority UI Issues (5 min)
6. Add `iconName`/`iconSize` support to `Button.js` OR switch `LoginScreen.js` to `IconButton`  
7. Add `AlertScreen.js` to `jsconfig.json` include list

### Phase E: Final Validation (10 min)
8. Run `node --check` on all JS files (already passes ✅)  
9. Re-start Metro, confirm clean bundle  
10. Review `npm run android` build output for new errors

---

## 4. Verification Checklist

- [x] All 32 JS/TS files pass `node --check` (syntax valid)
- [x] All npm imports resolve to installed packages
- [x] `react-native-config`, `react-native-svg`, `react-native-image-picker`,
      `react-native-encrypted-storage`, `react-native-device-info`,
      `react-native-safe-area-context` — all installed and autolinked
- [x] `metro.config.js` and `babel.config.js` are valid
- [x] `app.json` + `index.js` entry point resolves correctly
- [todotxt] Bundle compiles via `index.bundle` fetch (will re-verify after Phase A fix)
- [ ] `AndroidManifest.xml` has OAuth deep-link intent-filter
- [ ] Custom font TTF assets present in `android/app/src/main/assets/fonts/`

---

## 5. Notes

- **DevTools sandbox error** (`chrome-sandbox` mode 4755): This is an environment/
  permissions issue, not a code bug. It does not block the JS bundle from compiling
  or the app from running. Can be resolved by `sudo chown root:root .../chrome-sandbox`
  and `sudo chmod 4755 .../chrome-sandbox`, or by setting `DOTSLASH_NO_SANDBOX=1`
  (which the user is already doing — the error persists because the env var isn't
  propagated to the DevTools subprocess).
