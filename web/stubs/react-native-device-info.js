/**
 * Web stub for react-native-device-info.
 * Returns minimal info needed by the Settings screen (version, bundleId).
 */
module.exports = {
  getVersion: () => '1.0.0',
  getBundleId: () => 'com.agriscan.ai',
  getDeviceId: () => 'web',
  getModel: () => 'Web',
  getSystemName: () => 'Web',
  getSystemVersion: () => '1.0',
};
module.exports.default = module.exports;
