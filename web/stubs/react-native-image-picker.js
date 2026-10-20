/**
 * Web stub for react-native-image-picker.
 * In the browser we can't access the system camera, so both
 * launchCamera and launchImageLibrary return didCancel=true.
 * The E2E tests for camera controls (flash, grid, flip) still work
 * because they only test the *UI controls*, never the actual image
 * capture result.
 */
const stub = {
  launchCamera: async () => ({ didCancel: true, assets: [] }),
  launchImageLibrary: async () => ({ didCancel: true, assets: [] }),
};

module.exports = stub;
module.exports.default = stub;
