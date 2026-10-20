# TODO — Production: No Mock, Real AI, All Gates Green

Gates: `node _validate.js` 19/19 · `php -l index.php` OK · Playwright 17/17 · Android build APK OK · web bundle HTTP 200.

## Completed
- [x] T6.1 Remove mock fallbacks from PHP (`mockPrediction()`, AGRISCAN_DEMO branches, `is_mock` fields) → 503 on AI/DB failure
- [x] T6.2 Set `AGRISCAN_DEMO=0` in `.env`, `.env.example`, `docker-compose.yml`; `depends_on postgres required: true`
- [x] T6.3 Remove `import * as mockData` from `frontend/api.js`; `fetchHome()` → empty state; `chatWithAI()` → honest error text
- [x] T6.4 Update e2e tests: chat asserts real AI (no mock text), guides asserts real DB content, settings asserts real content
- [x] T6.5 UI polish: BottomNav → `useWindowDimensions` + theme shadows + z-scale; AppHeader → `z.header` + theme shadows; all screens → `useTopInset()` + `HEADER_HEIGHT`
- [x] Remove dead `frontend/mockData.js` (no longer imported)

## Final GREEN verification
- [x] `node _validate.js` → 19/19 modules resolved, 14/14 ALL COMPONENTS RENDERED
- [x] `php -l` → No syntax errors
- [x] Playwright e2e → 17/17 PASS
- [x] `react-native bundle --platform web` → bundle compiles, HTTP 200
- [x] Android `./gradlew assembleRelease` → BUILD SUCCESSFUL, app-release.apk (60MB)
- [x] Real AI /analyze → `is_mock: false` (removed), crop="Hoa hồng", confidence=100, healthy
- [x] Real AI /chat → `is_mock: false` (removed), Vietnamese response on agriculture
- [x] `/health` → status:ok, db:true, ai.configured:true
