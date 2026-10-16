# SeaNergy iOS console

The iOS target of the SeaNergy operator console, version **2.2.0**, build **5**, bundle identifier `in.seanergy.console`. It carries the same application source and twelve primary screens as the [Android target](../mobile-android/README.md), plus the ping-detail route.

## Current status

| Item | Evidence and limit |
|---|---|
| Application source | Expo Router, Skia charts and the on-device acoustic simulation are present |
| Native project | [Xcode project and application files](ios/README.md) are tracked |
| JavaScript export | The [build record](../releases/BUILDS.md) records an iOS Hermes export; this is not a signed native application |
| Software gate | The release record reports 106 core assertions and 33 render tests passing at release time |
| Installable package | No IPA is included; native compilation, signing and device verification remain separate steps |

Simulation computes the environment, waveform, echo and feedback in the handset model. Its range, resolution and power values are predictions. The app-side Wi-Fi telemetry client can consume compatible NDJSON packets, but the current [TX/RX firmware](../../02-firmware/README.md) does not implement that contract yet.

The bundled [local link module](modules/seanergy-link/README.md) declares Android only. iOS has **no native USB or BLE implementation** in this tree. Wi-Fi client source is shared, and still requires a compatible endpoint and device testing.

## Run the software checks

From this folder with Node and dependencies installed:

```sh
npm ci
npm run check
npm run bundle:ios
```

The first command installs dependencies, `check` runs the type checker/core verifier/Jest, and `bundle:ios` exports the JavaScript bundle. Neither check creates an installable IPA.

## Build the native target

On a Mac with a compatible Xcode installation, CocoaPods and the native dependencies:

```sh
npx pod-install
npx expo run:ios
```

After CocoaPods creates the workspace, open `ios/SeaNergy.xcworkspace` in Xcode for native configuration, signing and an archive. Device distribution requires the appropriate signing identity and provisioning; simulator builds follow a separate path. The existing [iOS build notes](ios-build-notes.md) preserve the original build investigation and must be read as historical context, not a completed native release.

The source of application version and platform settings is [app.json](app.json). Review native changes before regenerating with `npm run prebuild:ios`; regeneration can replace native project files.

## Folder guide

- [Routes](app/README.md): eleven tabs, Scenario and ping detail.
- [Source](src/README.md): numerical model, runtime, telemetry, charts and UI.
- [Assets](assets/README.md): icons and launch artwork.
- [Tests](__tests__/README.md): render test scope and limitations.
- [Documentation](docs/README.md): current protocol and older design notes.
- [Scripts](scripts/README.md): website-data generation and the Android configuration helper retained by the mirrored project.
- [Native project](ios/README.md): Xcode, app bootstrap and asset-catalog map.
