# Android application bootstrap and resources

[AndroidManifest.xml](AndroidManifest.xml) defines the app entry point, deep-link scheme, components and manifest permissions. Native bootstrap classes are [MainActivity.kt](java/in/seanergy/console/MainActivity.kt) and [MainApplication.kt](java/in/seanergy/console/MainApplication.kt).

The [java source tree](java/README.md) documents the Kotlin package namespace and its bootstrap classes.

## Resource map

| Resource path | Contents |
|---|---|
| [res/drawable](res/drawable/) | Launcher background and React Native edit-text drawable |
| `res/drawable-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}` | Density-specific splash logos |
| [res/mipmap-anydpi-v26](res/mipmap-anydpi-v26/) | Adaptive launcher-icon XML |
| `res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}` | Density-specific launcher-icon artwork |
| [res/values](res/values/) | Colours, strings and theme definitions |
| [res/values-night](res/values-night/) | Dark-mode colour overrides |

This resource map documents the native artwork and XML variants while keeping Android resource folders in their required formats. Change the [Expo artwork/configuration](../../../../assets/README.md) and native generation settings together, then inspect the resulting splash and icons on a device.
