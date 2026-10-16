# Android application module

[build.gradle](build.gradle) defines application identity, SDK targets, release signing and ABI splits. [proguard-rules.pro](proguard-rules.pro) carries app-specific shrinking rules. [src](src/README.md) contains manifests, Kotlin bootstrap classes and Android resources.

Release signing expects a private `seanergy-release.keystore` provisioned outside version control; see the [key-management note](../../../releases/keystore-note.md). APKs are generated under ignored `build/outputs/apk/` paths and the reviewed distributable copies live in [releases](../../../releases/README.md).

Use the [app build guide](../../README.md); running Gradle directly skips the package script's TypeScript/core/render gate.
