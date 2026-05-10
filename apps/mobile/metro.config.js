const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Ensure react-native-css-interop resolves from app's own node_modules
config.resolver.extraNodeModules = {
  'react-native-css-interop': path.resolve(projectRoot, 'node_modules/react-native-css-interop'),
};

module.exports = withNativeWind(config, { input: './src/styles/global.css' });
