const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure web support
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Disable static rendering for web
config.transformer.enableBabelRCLookup = false;

module.exports = config;