const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// STRICT ISOLATION: Prevent Metro bundler from looking up into the parent folder
// The root directory 'vibesphere-media' has conflicting React Native and Expo dependencies
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
