# Android native project

The tracked Gradle project for the [Android console](../README.md). [build.gradle](build.gradle), [settings.gradle](settings.gradle) and [gradle.properties](gradle.properties) configure the native build; [app](app/README.md) contains the application module. The [Gradle wrapper](gradle/README.md) pins its launcher.

Use the app root commands for type checking and tests before native compilation. `npm run apk` is the recorded Windows release path and invokes `gradlew.bat`; it requires Node dependencies, JDK/SDK/NDK and the private release keystore. On other hosts, follow the platform build setup and invoke the matching wrapper only after the software gate passes.

`npm run prebuild` uses a clean Expo prebuild and reapplies Android settings. It recreates this tree, so preserve and review native changes and documentation before regenerating. Local SDK paths, caches, signing keys and generated build output are ignored.
