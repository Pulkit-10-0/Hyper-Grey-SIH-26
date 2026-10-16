# Android transport implementation

[build.gradle](build.gradle) configures the local Expo Android library. [src/main/AndroidManifest.xml](src/main/AndroidManifest.xml) declares the USB/Bluetooth requirements. The Kotlin implementation is [SeanergyLinkModule.kt](src/main/java/expo/modules/seanergylink/SeanergyLinkModule.kt).

The module handles USB CDC-ACM/CP210x serial and Nordic UART Service BLE connections, with data/status/device events passed to JavaScript. Permissions and actual accessory compatibility must be checked on a physical device; app render tests cannot establish them.

The `src/main/java/expo/modules/seanergylink` chain is the Kotlin package path. It is indexed here rather than populated with README files at each namespace segment. See the [module guide](../README.md) for the protocol boundary.
