# Main transport-module sources

[AndroidManifest.xml](AndroidManifest.xml) declares the transport module's Android features and permissions. [SeanergyLinkModule.kt](java/expo/modules/seanergylink/SeanergyLinkModule.kt) implements USB host serial and BLE operations and emits events to JavaScript.

The [java source tree](java/README.md) documents the Kotlin package namespace and module implementation. NDJSON parsing belongs to the app's TypeScript client, and compatible current-firmware integration still has to be implemented and tested. See the [module overview](../../../README.md).
