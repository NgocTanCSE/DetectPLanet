/**
 * Web stub for react-native-config.
 * On web, env vars are not available at build time the same way as native.
 * We use the same values that would be in .env for dev / Playwright.
 */
module.exports = {
  API_URL: process.env.API_URL || 'http://localhost:887',
  GOOGLE_CLIENT_ID:
    process.env.GOOGLE_CLIENT_ID ||
    'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
  REQUIRE_AUTH: process.env.REQUIRE_AUTH || 'false',
  IMAGE_PICKER_QUALITY: '0.8',
  IMAGE_PICKER_BASE64: 'true',
};
