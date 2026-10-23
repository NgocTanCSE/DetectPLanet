const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// Admin app uses Metro port 8082 to avoid conflict with the user app
// (which runs on the default port 8081 from the project root).
// Always start Metro from frontend_admin/ so the correct bundle is served.
module.exports = mergeConfig(getDefaultConfig(__dirname), {
  server: {
    port: 8082,
  },
  resolver: {
    sourceExts: [...getDefaultConfig(__dirname).resolver.sourceExts, 'mjs', 'cjs'],
  },
});
