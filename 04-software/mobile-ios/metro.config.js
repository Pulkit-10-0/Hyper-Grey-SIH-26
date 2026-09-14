// Expo's Metro defaults. Without this file the transformer is not wired up and
// release bundling fails with "Cannot read properties of undefined
// (reading 'transformFile')".
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;
