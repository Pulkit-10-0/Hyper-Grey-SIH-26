# SeaNergy iOS console

The iOS target of the SeaNergy operator console, version **2.2.0**, build **5**, bundle identifier `in.seanergy.console`. It carries the same application source and twelve primary screens as the [Android target](../mobile-android/README.md), plus the ping-detail route.

## Included work

| Component | Implementation and record |
|---|---|
| Application source | Expo Router, Skia charts and the on-device acoustic simulation |
| Native project | [Xcode project and application files](ios/README.md) |
| JavaScript export | iOS Hermes export recorded in the [build record](../releases/BUILDS.md) |
| Software gate | 106 core assertions and 33 render tests passing in the release record |

Simulation computes the environment, waveform, echo and feedback in the handset model, with predicted range, resolution and power views. Wi-Fi telemetry consumes compatible [NDJSON records](docs/11-link-protocol.md). The [TX/RX firmware guide](../../02-firmware/README.md) describes the separate firmware interfaces used for endpoint integration.

The shared Wi-Fi client provides iOS telemetry. The bundled [local link module](modules/seanergy-link/README.md) targets Android USB/BLE.

## Run the software checks

From this folder with Node installed:

```sh
npm ci
npm run check
npm run bundle:ios
```

`check` runs the type checker, core verifier and Jest. `bundle:ios` exports the JavaScript bundle. Build and sign the native application through the workflow below.

## Build the native target

On a Mac with a compatible Xcode installation, CocoaPods and the native dependencies:

```sh
npx pod-install
npx expo run:ios
```

After CocoaPods creates the workspace, open `ios/SeaNergy.xcworkspace` in Xcode for native configuration, signing and an archive. Device distribution requires the appropriate signing identity and provisioning; simulator builds use a simulator destination. The [iOS build notes](ios-build-notes.md) preserve the original build investigation. Distributable packages in [releases](../releases/README.md) are Android APKs.

The source of application version and platform settings is [app.json](app.json). Review native changes before regenerating with `npm run prebuild:ios`; regeneration can replace native project files.

## Folder guide

- [Routes](app/README.md): eleven tabs, Scenario and ping detail.
- [Source](src/README.md): numerical model, runtime, telemetry, charts and UI.
- [Assets](assets/README.md): icons and launch artwork.
- [Tests](__tests__/README.md): screen-render coverage.
- [Documentation](docs/README.md): current protocol and design history.
- [Scripts](scripts/README.md): website-data generation and the Android configuration helper retained by the mirrored project.
- [Native project](ios/README.md): Xcode, app bootstrap and asset-catalog map.
