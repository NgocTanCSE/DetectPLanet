# AgriScan AI — React Native CLI (Android + Web)

> **Migrated from Expo Go (SDK 57) → pure React Native CLI.** No Expo SDK dependency. Android native builds + web E2E.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (Metro bundler)
npm start          # metro on http://localhost:8081

# 3a. Run on Android (emulator must be running)
npm run android    # or: npx react-native run-android

# 3b. Run web E2E tests
npm run web:bundle  # bundle for web
npm run web:serve   # serve on http://localhost:8081
npm run e2e         # Playwright tests (17 tests)

# 4. Validate modules + light render test
npm run validate
```

## Build

### Android (local)
```bash
npm run android:release   # ./gradlew assembleRelease → app-release.apk
```

### Android (EAS cloud — requires Expo account)
```bash
npx eas-cli build --platform android --profile production
```

## Project Structure

| Path | Description |
|------|-------------|
| `index.js` | Native entry — registers `AgriScanAI` with AppRegistry |
| `index.web.js` | Web entry — registers + `AppRegistry.runApplication` |
| `frontend/` | All React Native components & screens (flat) |
| `frontend/camera/code.js` | Camera screen (uses `react-native-image-picker`) |
| `web/` | Web bundling config: `index.html`, `stubs/` for native modules |
| `android/` | Android native project (RN CLI 0.86.3) |
| `eas.json` | EAS build profiles (dev: debug, prod: release) |
| `metro.config.js` | Metro config with web platform support |
| `_validate.js` | Module resolution + component render validation harness |
| `e2e.test.js` | 17 Playwright E2E tests (web) |
| `playwright.config.js` | Playwright config (Chromium, headless) |

## Key Migration Decisions

| Old (Expo) | New (RN CLI) |
|-----------|--------------|
| `expo-constants` | `react-native-config` (build-time env vars via `.env`) |
| `expo-secure-store` | `react-native-encrypted-storage` |
| `expo-font` | Native TTF fonts in `android/app/src/main/assets/fonts/` |
| `expo-camera` + `expo-image-picker` | `react-native-image-picker` (launchCamera + launchImageLibrary) |
| `expo-splash-screen` | Native `SplashTheme` + delayed `window.decorView.background = null` in `MainActivity.kt` |
| `expo-splash-screen` v3 | ❌ Removed (AndroidX conflict) |
| `react-native-vision-camera` | ❌ Removed (simplified to system camera) |

## Environment

See `.env.example` for all required variables. Key ones:

```bash
API_URL=http://10.0.2.2:887        # Android emulator localhost
REQUIRE_AUTH=false                 # Turn on for Google OAuth
GOOGLE_CLIENT_ID=...               # From Google Cloud Console
```

## Web E2E Setup

The E2E tests require the backend to be running:

```bash
# Start backend (Postgres + PHP API on port 887)
docker compose -f docker-compose.e2e.yml up -d --build

# Bundle + serve web app, then run tests
npm run web:bundle
npm run web:serve &    # serves on port 8081
npm run e2e
```
