// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add extra resolver settings
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'expo-router/entry': require.resolve('expo-router/entry'),
};

// Add asset extensions
config.resolver.assetExts = [...config.resolver.assetExts, 'db', 'sqlite'];

module.exports = config;
