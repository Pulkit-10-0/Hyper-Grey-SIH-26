/**
 * Headless render harness.
 *
 * The point of this config is narrow and important: mount every screen in a
 * simulated React Native runtime so that render-time crashes are caught here
 * instead of on a phone. A `this`-binding bug in a store subscription shipped
 * twice because nothing ever rendered these components outside the device.
 */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/__tests__/**/*.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@shopify/react-native-skia|react-native-reanimated|react-native-worklets|react-native-gesture-handler)',
  ],
};
