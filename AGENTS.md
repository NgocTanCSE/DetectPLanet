# Project Guide: AgriScan AI (React Native CLI)

This project has been **migrated from Expo Go (SDK 57) to pure React Native CLI**.
Expo SDK is fully removed — no `expo*` packages remain in `package.json`.

## React Native docs
- Main docs: https://reactnative.dev/
- Android setup: https://reactnative.dev/docs/environment-setup
- AppRegistry: https://reactnative.dev/docs/appregistry
- react-native-web: https://github.com/necolas/react-native-web
- react-native-image-picker: https://github.com/react-native-image-picker/react-native-image-picker
- react-native-encrypted-storage: https://github.com/emeraldsanto/react-native-encrypted-storage

## Build commands
```bash
npm start                  # Metro dev server
npm run android            # Run on connected emulator/device
npm run android:release    # Local production APK
npm run validate           # Module + render validation (19/19, 14/14)
npm run web:bundle         # Bundle for web E2E
npm run web:serve          # Serve web on :8081
npm run e2e                # Playwright E2E (17 tests)
npx eas-cli build --platform android --profile production   # EAS cloud (needs Expo account)
```
