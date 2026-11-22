// Metro's settings (Metro packs the app's code for the phone and the browser). Learn more:
// https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// The browser build includes expo-sqlite's web part, which ships a .wasm file (Expo's SQLite web setup). The web
// join page never opens the database, so the extra web headers that setup also lists aren't needed.
config.resolver.assetExts.push('wasm');

module.exports = config;
