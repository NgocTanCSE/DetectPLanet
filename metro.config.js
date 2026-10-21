const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
  resolver: {
    sourceExts: [...getDefaultConfig(__dirname).resolver.sourceExts, 'mjs', 'cjs'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
