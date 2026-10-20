# Implementation Plan: Migration Expo Go → React Native CLI (Plan B)

## Overview

Migrate the **AgriScan AI** application from the **Expo Go managed workflow** to a
**pure React Native CLI** project — **completely removing Expo**. Android-only
(no iOS). Local builds for development (Android Studio), EAS cloud build for
production. No app store accounts required (dev + internal distribution only).

> **User decision:** "Dùng Plan B. Android only, bỏ iOS. Build local trước,
> EAS cloud khi ổn định. Chưa có tài khoản developer nên không publish app store."

> **Version note:** Project uses Expo SDK 57 (`expo: ^57.0.29`) + React Native
> `0.86.3`. The RN CLI migration targets RN 0.86.3 (same version). AGENTS.md
> references v54 docs; CNG/concepts are stable across SDK 47–58, but Plan B
> removes Expo entirely so SDK version docs are less relevant (we use RN CLI
> docs instead).

---

## 1. Current State Analysis

### Tech stack (frontend)
```
expo: ^57.0.29 (framework — TO REMOVE)
react-native: 0.86.3 (already present)
react-native-web: ^0.21.0
react-native-safe-area-context: ~5.7.0
react-native-svg: 15.15.4
```

### Expo modules used (được import trong code)
| Module | File(s) dùng | Cách dùng |
|--------|-------------|-----------|
| `expo` (registerRootComponent) | `index.js` | Entry point registration |
| `expo-constants` | `App.js`, `api.js`, `auth.js`, `settings/code.js` | `expoConfig.extra.*` (apiUrl, googleClientId, requireAuth, nativeApplicationVersion) |
| `expo-camera` | `camera/code.js` | `CameraView`, `useCameraPermissions`, `CameraType`, `FlashMode` |
| `expo-image-picker` | `camera/code.js` | `launchCameraAsync`, `launchImageLibraryAsync`, permission APIs |
| `expo-secure-store` | `auth.js` | `getItemAsync`, `setItemAsync`, `deleteItemAsync` |
| `expo-font` | `useFonts.js` | `loadAsync` với `@expo-google-fonts/geist`, `@expo-google-fonts/plus-jakarta-sans` |

### Expo modules NOT directly imported (chỉ trong app.json plugins + deps)
- `expo-splash-screen` — quản lý bởi Expo runtime, không import trực tiếp
- `expo-status-bar` — không import (App.js dùng `StatusBar` từ `react-native`)
- `@expo/vector-icons` — không import (app dùng icon SVG tùy chỉnh từ `react-native-svg`)

### Cấu trúc thư mục
```
.
├── index.js          → expo entry point (registerRootComponent)
├── frontend/         → ALL app code (flat structure)
│   ├── App.js        → shell + navigation + auth gate
│   ├── api.js        → API client (uses expo-constants)
│   ├── auth.js       → Google OAuth (uses expo-secure-store + expo-constants)
│   ├── BottomNav.js
│   ├── AppHeader.js
│   ├── theme.js
│   ├── icons.js      → custom SVG icons (react-native-svg)
│   ├── dto.js        → JSDoc typedefs
│   ├── useFonts.js   → font loading (expo-font)
│   ├── LoginScreen.js
│   ├── ProgressCircle.js
│   ├── camera/code.js → camera screen (expo-camera + expo-image-picker)
│   ├── scan/code.js
│   ├── result/code.js
│   ├── history/code.js
│   ├── chat/code.js
│   ├── guides/code.js
│   └── settings/code.js
├── assets/           → icon.png, splash-icon.png, favicon.png, adaptive-icon.png
├── app.json          → Expo config (scheme, plugins, ios/android, extra.*)
├── eas.json          → EAS build profiles
├── _validate.js      → custom validation harness (stubbed RN modules)
├── e2e.test.js       → Playwright E2E tests (web)
├── package.json
├── tsconfig.json     → extends expo/tsconfig.base
├── jsconfig.json
└── frontend/DESIGN.md
```

### Điểm mạnh
- `react-native` + `react-native-svg` + `react-native-safe-area-context` đã là
  dependencies (native modules đã có)
- `react-native-web` cho phép web build (cần giữ cho e2e tests)
- `app.json` plugins đã config đầy đủ permissions
- `eas.json` đã có profiles

### Rào cản (must-fix trong Plan B)
- ❌ `index.js` dùng `registerRootComponent` từ `expo`
- ❌ `api.js`, `auth.js`, `App.js`, `settings/code.js` dùng `expo-constants` để đọc `app.json extra.*`
- ❌ `camera/code.js` dùng `expo-camera` + `expo-image-picker` (API hoàn toàn khác)
- ❌ `useFonts.js` dùng `expo-font` + `@expo-google-fonts/*`
- ❌ `auth.js` dùng `expo-secure-store`
- ❌ Không có `babel.config.js` (Expo tự tạo)
- ❌ Không có `metro.config.js`
- ❌ Không có `android/` native project
- ❌ `expo-splash-screen` cần thay bằng `react-native-splash-screen` (native)
- ❌ Font phụ thuộc vào `@expo-google-fonts/*` — cần chuyển sang native `.ttf`
- ❌ `_validate.js` stubs `expo-*` modules — cần cập nhật stubs

---

## 2. Module Replacement Matrix

| Expo module | RN CLI replacement | Version (suggested) | Complexity |
|-------------|-------------------|---------------------|------------|
| `expo` (registerRootComponent) | `AppRegistry` (react-native built-in) | built-in | **Easy** |
| `expo-constants` (extra.* config) | `react-native-config` + native `build.gradle` | ^4.1.1 | Medium |
| `expo-camera` | `react-native-vision-camera` | ^4.0.0+ | **Hard** (rewrite CameraScreen) |
| `expo-image-picker` | `react-native-image-picker` | ^5.0.0 | Medium |
| `expo-secure-store` | `react-native-encrypted-storage` | ^6.1.0 | Medium |
| `expo-font` + `@expo-google-fonts/*` | Native fonts (.ttf in `android/app/src/main/assets/fonts/`) | — | Medium |
| `expo-splash-screen` | `react-native-splash-screen` | ^3.3.0 | Medium |
| `expo-status-bar` | Remove (App.js already uses RN built-in `StatusBar`) | — | **Easy** |
| `@expo/vector-icons` | Remove (not used; app has custom SVG icons) | — | **Easy** |
| `expo-constants.nativeApplicationVersion` | `react-native-device-info` `getVersion()` | ^11.0.0 | Easy |

### Sources
- [react-native-vision-camera](https://github.com/bluesky/vision-camera)
- [react-native-image-picker](https://github.com/react-native-image-picker/react-native-image-picker)
- [react-native-encrypted-storage](https://github.com/emeraldsanto/react-native-encrypted-storage)
- [react-native-config](https://github.com/lzdevs/react-native-config)
- [react-native-splash-screen](https://github.com/react-native-community/react-native-splash-screen)
- [React Native CLI — Integrating with existing app](https://reactnative.dev/docs/environment-setup)

---

## 3. Task List

### Phase 1: Foundation — RN CLI project setup

**T1.1 — Install RN CLI packages** (babel, metro config, community modules)
```sh
# Remove Expo packages
npm uninstall expo expo-camera expo-image-picker expo-font expo-secure-store \
  expo-splash-screen expo-status-bar expo-constants expo-system-constants \
  @expo-google-fonts/geist @expo-google-fonts/plus-jakarta-sans \
  @expo-google-fonts/space-grotesk @expo/vector-icons

# Install RN CLI + community replacements
npm install react-native-vision-camera react-native-image-picker \
  react-native-encrypted-storage react-native-config \
  react-native-splash-screen react-native-device-info

# Install dev presets for bare RN
npm install -D @react-native/babel-preset @react-native/dev-metro-config \
  react-native-cli
```

**T1.2 — Create `babel.config.js`**
```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
};
```
→ Thay thế Expo's auto babel config.
Source: https://reactnative.dev/docs/running-on-device

**T1.3 — Create `metro.config.js`**
```js
const { getDefaultConfig } = require('@react-native/metro-config');
const config = getDefaultConfig(__dirname);
// Keep react-native-web support for E2E tests
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];
module.exports = config;
```

**T1.4 — Update `index.js` entry point**
```js
// OLD (Expo):
// import { registerRootComponent } from 'expo';
// registerRootComponent(App);

// NEW (RN CLI):
import { AppRegistry } from 'react-native';
import App from './frontend/App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
```
→ `app.json` `name` field sẽ là `appName`. RN CLI uses `AppRegistry.registerComponent`.

**T1.5 — Install Android native modules (pods equivalent)**
- `react-native-vision-camera` → cần native Camera permission + implementation
- `react-native-image-picker` → cần native permission
- `react-native-encrypted-storage` → cần native init (Android Keystore)
- `react-native-config` → cần gradle config
- `react-native-splash-screen` → cần native splash screen resources
- `react-native-device-info` → cần native link

→ Chạy `npx react-native-clean-project` nếu cần sau này.

**Checkpoint 1:**
- [ ] `npm install` hoàn tất, không lỗi
- [ ] `babel.config.js` + `metro.config.js` tạo xong
- [ ] `index.js` dùng `AppRegistry`
- [ ] `node _validate.js` → module resolution check (có thể fail do stubs chưa update, ghi chú)

### Phase 2: Replace Expo module imports trong code

**T2.1 — `api.js`: Replace `expo-constants` with `react-native-config`**
```js
// OLD:
const { expoConfig } = require("expo-constants");
if (expoConfig && expoConfig.extra && expoConfig.extra.apiUrl) {
  BASE_URL = expoConfig.extra.apiUrl;
}

// NEW:
import Config from 'react-native-config';
const BASE_URL = Config.API_URL || _DEV_URL;
```
→ Cấu hình `API_URL` trong `android/gradle.properties` + `android/app/build.gradle`.

**T2.2 — `App.js`: Replace `expo-constants`**
```js
// OLD:
const { expoConfig } = require("expo-constants");
return !!(expoConfig && expoConfig.extra && expoConfig.extra.requireAuth);

// NEW:
import Config from 'react-native-config';
function isAuthRequired() {
  return Config.REQUIRE_AUTH === 'true';
}
```
→ Thêm `REQUIRE_AUTH=false` vào `android/local.properties` hoặc `gradle.properties`.

**T2.3 — `auth.js`: Replace `expo-secure-store` + `expo-constants`**
```js
// OLD:
const SecureStore = require('expo-secure-store');
// getItemAsync, setItemAsync, deleteItemAsync

// NEW:
import EncryptedStorage from 'react-native-encrypted-storage';
// getItem, setItem, removeItem (async, needs init)
```
→ `react-native-encrypted-storage` API: `EncryptedStorage.setItem(key, val)`,
  `EncryptedStorage.getItem(key)`, `EncryptedStorage.removeItem(key)`.
  Cần `await EncryptedStorage.init()` hoặc đảm bảo đã hoạt động trước khi dùng.

**T2.4 — `auth.js`: Replace `expo-constants` (googleClientId)**
```js
// OLD:
const { expoConfig } = require('expo-constants');
GOOGLE_CLIENT_ID = expoConfig.extra.googleClientId;

// NEW:
GOOGLE_CLIENT_ID = Config.GOOGLE_CLIENT_ID;
```

**T2.5 — `settings/code.js`: Replace `expo-constants`**
```js
// OLD:
const { expoConfig, nativeApplicationVersion } = require('expo-constants');
APP_VERSION = nativeApplicationVersion || expoConfig?.version || '1.0.0';
API_URL = expoConfig?.extra?.apiUrl || '';

// NEW:
import DeviceInfo from 'react-native-device-info';
const APP_VERSION = DeviceInfo.getVersion();
import Config from 'react-native-config';
const API_URL = Config.API_URL || '';
```

**T2.6 — `useFonts.js`: Replace `expo-font` + `@expo-google-fonts/*`**
→ Xóa `useFonts.js` hoặc chuyển thành font loading native.
→ Tải `.ttf` font files (Geist, PlusJakartaSans) vào `android/app/src/main/assets/fonts/`.
→ Font names: `Geist`, `PlusJakartaSans-Regular`, `PlusJakartaSans-Medium`,
  `PlusJakartaSans-SemiBold`, `PlusJakartaSans-Bold`.
→ `useFonts()` trả về `{ loaded: true }` ngay (fonts đã load native).
→ Hoặc dùng `react-native-fonts` package.

**T2.7 — `camera/code.js`: Replace `expo-camera` → `react-native-vision-camera`**
→ API hoàn toàn khác:
```js
// OLD:
import { CameraView, useCameraPermissions, CameraType, FlashMode } from 'expo-camera';
// <CameraView ref={cameraRef} facing={facing} flash={...} onCameraReady={...} onMountError={...} />

// NEW:
import { Camera } from 'react-native-vision-camera';
// <Camera ref={cameraRef} device={device} format={format} style={...} 
//   isActive={true} torch={torch} onInitialized={...} onError={...} />
```
→ Cần rewrite toàn bộ phần renderFeed() trong CameraScreen.

**T2.8 — `camera/code.js`: Replace `expo-image-picker` → `react-native-image-picker`**
```js
// OLD:
import * as ImagePicker from 'expo-image-picker';
const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], ... });
// result.assets[0].uri, result.assets[0].base64

// NEW:
import { launchImageLibrary, launchCamera, requestCameraPermission, ... } from 'react-native-image-picker';
const result = await launchImageLibrary({ mediaType: 'photo', includeBase64: true, ... });
// result.assets[0].uri, result.assets[0].base64
```

**T2.9 — Splash screen: Add `react-native-splash-screen`**
→ `index.js` — `SplashScreen.hide()` sau khi app load.
→ `android/app/src/main/res/drawable/splash.xml` (native splash screen).
→ `android/app/src/main/res/values/styles.xml` — splash screen theme.

**T2.10 — Update `_validate.js` stubs**
→ Thay `expo-image-picker`, `expo-camera`, `expo-crypto` stubs bằng
  `react-native-vision-camera`, `react-native-image-picker`,
  `react-native-encrypted-storage`, `react-native-config`,
  `react-native-device-info`, `react-native-splash-screen`.

**Checkpoint 2:**
- [ ] `node _validate.js` → 19/19 modules resolved
- [ ] `node _validate.js` → 14/14 components rendered

### Phase 3: Generate Android native project

**T3.1 — Initialize RN CLI Android project**
```sh
# Tạo project mẫu để lấy android/ directory
npx react-native init TempAgriScan --version 0.86.3 --skip-install --package-name com.agriscan.ai
# Copy android/ từ temp project
# Xóa temp project
```

**T3.2 — Integrate `android/` với existing project**
- `android/app/build.gradle` — cập nhật `applicationId`, `versionCode`, `versionName`
- `android/app/src/main/AndroidManifest.xml` — thêm permissions:
  - `CAMERA`
  - `READ_EXTERNAL_STORAGE`
  - `WRITE_EXTERNAL_STORAGE`
- `android/gradle.properties` — thêm config vars (API_URL, GOOGLE_CLIENT_ID, etc.)
  ```properties
  API_URL=http://10.0.2.2:887
  REQUIRE_AUTH=false
  GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
  ```
- `android/app/build.gradle` — truyền config vars:
  ```gradle
  defaultConfig {
      buildConfigField "String", "API_URL", "\"${project.ext.API_URL}\""
      buildConfigField "String", "GOOGLE_CLIENT_ID", "\"${project.ext.GOOGLE_CLIENT_ID}\""
  }
  ```

**T3.3 — Native module linking**
→ `react-native-vision-camera`, `react-native-image-picker`,
  `react-native-encrypted-storage`, `react-native-config`,
  `react-native-splash-screen`, `react-native-device-info` — autolinked
  by RN 0.86 (hầu hết đã tự động link trong RN 0.71+).

**T3.4 — Native fonts**
→ Tải `.ttf` files vào `android/app/src/main/assets/fonts/`:
  - `Geist-Regular.ttf`, `Geist-Medium.ttf`, `Geist-SemiBold.ttf`, `Geist-Bold.ttf`
  - `PlusJakartaSans-Regular.ttf`, `PlusJakartaSans-Medium.ttf`,
    `PlusJakartaSans-SemiBold.ttf`, `PlusJakartaSans-Bold.ttf`

**T3.5 — Native splash screen**
→ Tạo `android/app/src/main/res/drawable/splash.xml`
→ Cập nhật `android/app/src/main/res/values/styles.xml`

**Checkpoint 3:**
- [ ] `android/` directory tích hợp xong
- [ ] Tất cả permissions + config vars có trong native
- [ ] Fonts đặt đúng vị trí

### Phase 4: Dev build + run (local, Android)

**T4.1 — Build dev APK**
```sh
npx react-native run-android
```
→ Cần Android SDK (API 35+), Android Studio emulator hoặc thiết bị vật lý.

**T4.2 — Dev workflow**
```sh
# Terminal 1: Metro bundler
npx react-native start

# Terminal 2: build + run
npx react-native run-android
```
→ Không dùng Expo Go. App chạy trực tiếp trên thiết bị/emulator.

**T4.3 — Debug menu**
→ Dùng `react-native-devtools` hoặc React DevTools (cài đặt bundle).
→ Shake device / `adb shell input keyevent 82` để mở dev menu.

**Checkpoint 4:**
- [ ] `npx react-native run-android` build thành công
- [ ] App khởi chạy, home screen render
- [ ] Camera permission work (native prompt)
- [ ] Image picker work (from library)

### Phase 5: Web + E2E support (cho test)

**T5.1 — Cấu hình web bundler**
→ `react-native-web` + Metro config để build cho web.
→ `npx react-native bundle` hoặc dùng `react-native-web` trực tiếp với Metro web.
→ Cần cấu hình Metro cho web target.

**T5.2 — Chạy e2e tests**
```sh
# Start web dev server
npx react-native start --port 8081  # (hoặc expo/web equivalent)

# Run Playwright
npx playwright test e2e.test.js
```

**Checkpoint 5:**
- [ ] Web build works (cho e2e tests)
- [ ] Playwright e2e → 17/17 pass

### Phase 6: EAS cloud build (production)

**T6.1 — EAS build config**
→ `.gitignore` đã có `/android` — **cần remove dòng này** nếu dùng EAS
   local build, hoặc giữ nếu dùng EAS remote build (EAS sẽ tạo android/ tạm thời).
→ Cập nhật `eas.json`:
```json
{
  "build": {
    "development": {
      "distribution": "internal",
      "android": {
        "gradleCommand": ":app:assembleDebug"
      }
    },
    "production": {
      "android": {
        "gradleCommand": ":app:assembleRelease"
      }
    }
  }
}
```

**T6.2 — EAS build command**
```sh
eas build --platform android --profile development
eas build --platform android --profile production
```
→ EAS sẽ chạy trong môi trường có Android SDK, không cần local Android Studio.
→ Cần `eas-cli` và đăng nhập Expo account (miễn phí).

**T6.3 — App signing**
→ Android: `eas build` tự động generate keystore mặc định, hoặc dùng
  `eas credentials` để setup. Phải có Google Play account để publish.
→ Vì user chưa có account, chỉ build APK/AAB để test cài trực tiếp.

**Checkpoint 6:**
- [ ] EAS build development thành công
- [ ] EAS build production thành công (debug keystore)
- [ ] APK có thể cài trực tiếp trên thiết bị Android

### Phase 7: Cleanup + documentation

**T7.1 — Cập nhật `package.json` scripts**
```json
{
  "scripts": {
    "start": "react-native start",
    "android": "react-native run-android",
    "web": "react-native bundle ...",  // hoặc giữ expo cho web dev
    "validate": "node _validate.js",
    "e2e": "playwright test e2e.test.js"
  }
}
```

**T7.2 — Xóa `expo` khỏi `app.json`**
→ Chuyển `app.json` sang `react-native.config.js` hoặc `gradle.properties`.
→ Giữ `name`, `slug`, `version`, `orientation`, `icon`.
→ Loại bỏ `plugins`, `scheme`, `ios`, `android.expo*` (thay bằng native config).
→ Hoặc: giữ `app.json` dưới dạng cấu hình chung, dùng `react-native-config`
  để đọc `extra.*`.

→ **Đề xuất:** Xóa `app.json`, tạo `android/gradle.properties` + `android/app/build.gradle`
  để cấu hình native. `ts-config.json` cập nhật `extends` → bỏ `expo/tsconfig.base`.

**T7.3 — Cập nhật `ts-config.json`**
```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "jsx": "react-native",
    "skipLibCheck": true,
    "checkJs": false,
    "maxNodeModuleJsDepth": 0
  },
  "include": [
    "index.js",
    "frontend/**/*.js"
  ],
  "exclude": ["node_modules", "android"]
}
```

**T7.4 — Cập nhật `jsconfig.json`** (include tất cả frontend files)

**T7.5 — Cập nhật `.gitignore`**
→ Thêm `/android/app/build/`, `/android/.gradle/`, `/android/local.properties`
→ Bỏ `/ios` (không có iOS), giữ `/android` (EAS sinh tạm thời)

**T7.6 — Dev docs (`frontend/DESIGN.md` append or new `README.rn.md`)**
→ Document RN CLI workflow (không Expo Go).

**Final checkpoint:**
- [ ] `node _validate.js` → 19/19 modules, 14/14 renders
- [ ] Web E2E → 17/17 tests pass
- [ ] `npx react-native run-android` build + run thành công
- [ ] Camera + image picker + secure storage hoạt động trên device
- [ ] EAS build dev + production thành công
- [ ] package.json / babel.config.js / metro.config.js cập nhật
- [ ] Dev docs cập nhật

---

## 4. Risk Analysis & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `react-native-vision-camera` API rewrite lỗi | **High** | CameraScreen phứ tạp (preview, capture, flash, grid, flip). Plan: rewrite dần, test từng phần. Dùng VisionCamera v4 API (Camera + useCameraDevice). |
| Font native setup (Geist, PlusJakartaSans) | Medium | Cần `.ttf` files. Có thể dùng `expo-google-fonts` để download, hoặc dùng Google Fonts CDN để tải font. |
| `react-native-encrypted-storage` init trên Android | Low | Cần `MainApplication.java` update (autolinked, nhưng test cần device thực). |
| Web build (cho E2E) — react-native-web cấu hình | Medium | Các modules native (camera, image-picker) không work trên web. Stub hoặc skip. |
| EAS build chậm (first build ~10-15 phút) | Low | Chấp nhận được — build một lần, cache sau này. |
| Loosing Expo benefits (OTA updates, eas submit) | Medium | Dùng `react-native-update` hoặc custom OTA. Không cần thiết cho giai đoạn dev. |

## 5. Open Questions (đã trả lời)
1. ✅ Nền tảng: **Android only** (bỏ iOS)
2. ✅ Build: **Local** (`npx react-native run-android`) → **EAS cloud** (production)
3. ✅ Tài khoản: **Chưa có** → chỉ dev internal APK, không publish store
4. ✅ Lựa chọn: **Plan B** (bỏ Expo hoàn toàn, RN CLI)

## 6. Phụ thuộc & thứ tự thực hiện
```
T1.1 → T1.2 → T1.3 → T1.4 → T1.5        (Foundation: 1-2 ngày)
  ↓
T2.1 → T2.2 → T2.3 → T2.7 → T2.8        (Code replacement: 3-4 ngày)
  ↓
T3.1 → T3.2 → T3.3 → T3.4 → T3.5        (Native project: 1 ngày)
  ↓
T4.1 → T4.2                              (Dev build: 1 ngày, Android Studio)
  ↓
T5.1 → T5.2                              (Web/E2E: 0.5 ngày)
  ↓
T6.1 → T6.2 → T6.3                       (EAS: 0.5 ngày)
  ↓
T7.1 → T7.2 → T7.3 → T7.4 → T7.5 → T7.6  (Cleanup: 1 ngày)
```
Tổng thời gian ước tính: **7-9 ngày làm việc** (có đoạn nghỉ + cài native modules).

## 7. Sources
- [Expo CNG — why "eject" no longer exists](https://docs.expo.dev/workflow/continuous-native-generation.md)
- [React Native — Integrating with Existing Apps](https://reactnative.dev/docs/environment-setup)
- [react-native-vision-camera](https://github.com/bluesky/vision-camera)
- [react-native-image-picker](https://github.com/react-native-image-picker/react-native-image-picker)
- [react-native-encrypted-storage](https://github.com/emeraldsanto/react-native-encrypted-storage)
- [react-native-config](https://github.com/lzdevs/react-native-config)
- [react-native-splash-screen](https://github.com/react-native-community/react-native-splash-screen)
- [EAS Build](https://docs.expo.dev/build/setup.md)
