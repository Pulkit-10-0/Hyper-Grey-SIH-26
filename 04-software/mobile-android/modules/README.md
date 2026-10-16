# Local Expo modules

[seanergy-link](seanergy-link/README.md) is the local Kotlin transport module discovered through the app's `expo.autolinking.nativeModulesDir` configuration. It provides Android USB host serial and BLE access behind the TypeScript [native adapter](../src/core/nativeLink.ts).

Only Android is declared in the module configuration. Including this folder in the mirrored iOS source does not add an iOS native implementation. Use a compatible endpoint and integration tests to verify a live session.
