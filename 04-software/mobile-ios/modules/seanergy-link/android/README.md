# Android transport implementation

[build.gradle](build.gradle) configures the local Expo Android library. [src/main/AndroidManifest.xml](src/main/AndroidManifest.xml) declares the USB/Bluetooth requirements. The Kotlin implementation is [SeanergyLinkModule.kt](src/main/java/expo/modules/seanergylink/SeanergyLinkModule.kt).

The module handles USB CDC-ACM/CP210x serial and Nordic UART Service BLE connections, with data/status/device events passed to JavaScript. For accessory setup, confirm Android transport permissions and the connected device's CDC-ACM/CP210x or Nordic UART Service compatibility.

The [Kotlin source tree](src/main/java/README.md) indexes the package namespace. See the [module guide](../README.md) for the byte transport and NDJSON interfaces.
