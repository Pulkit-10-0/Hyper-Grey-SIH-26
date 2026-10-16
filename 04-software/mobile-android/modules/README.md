# Local Expo modules

[seanergy-link](seanergy-link/README.md) is the local Kotlin transport module discovered through the app's `expo.autolinking.nativeModulesDir` configuration. It provides Android USB host serial and BLE access behind the TypeScript [native adapter](../src/core/nativeLink.ts).

The module configuration targets Android. The mirrored application uses the shared Wi-Fi client for iOS telemetry. See the module guide for the byte transport and protocol interfaces.
