const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const webStubsDir = path.resolve(__dirname, 'web/stubs');

/**
 * Metro configuration with React Native CLI + react-native-web support.
 *
 * For native builds (android/ios) the config is the standard RN default.
 * For web builds (`--platform web`) we alias:
 *   - `react-native` → `react-native-web` (DOM-compatible rendering)
 *   - native-only packages → web stubs in web/stubs/
 */
const config = {
  resolver: {
    sourceExts: [...getDefaultConfig(__dirname).resolver.sourceExts, 'mjs', 'cjs'],
    platforms: [...getDefaultConfig(__dirname).resolver.platforms, 'web'],
    resolveRequest: (context, moduleName, platform) => {
      if (platform === 'web') {
        // Alias react-native to react-native-web for web platform
        if (moduleName === 'react-native') {
          return context.resolveRequest(context, 'react-native-web', platform);
        }
        // Map native-only modules to web stubs by resolving the stub file
        // through Metro's own resolver (preserves correct return shape).
        const stubMap = {
          'react-native-config': path.join(
            webStubsDir,
            'react-native-config.js'
          ),
          'react-native-encrypted-storage': path.join(
            webStubsDir,
            'react-native-encrypted-storage.js'
          ),
          'react-native-image-picker': path.join(
            webStubsDir,
            'react-native-image-picker.js'
          ),
          'react-native-device-info': path.join(
            webStubsDir,
            'react-native-device-info.js'
          ),
          'react-native-safe-area-context': path.join(
            webStubsDir,
            'react-native-safe-area-context.js'
          ),
        };
        if (stubMap[moduleName]) {
          return context.resolveRequest(context, stubMap[moduleName], platform);
        }
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
