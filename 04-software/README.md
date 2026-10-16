# SeaNergy software

The operator console, static engineering website and release packages for SeaNergy.

| Folder | Start here | Included work |
|---|---|---|
| [Android app](mobile-android/README.md) | Source, build commands and screen map | Expo/React Native v2.2.0, native Android project and release APKs |
| [iOS app](mobile-ios/README.md) | Source, export and native build workflow | Mirrored application source, Xcode project and recorded Hermes export |
| [Website](website/README.md) | Open or serve the dossier | Offline static HTML/CSS/JavaScript with model-generated charts |
| [Releases](releases/README.md) | APK selection and integrity checks | Four Android v2.2.0 packages and recorded build results |

## Operator console

The app has eleven tab destinations, a Scenario screen and a ping-detail route. Simulation mode computes acoustic models, waveform synthesis, echo correlation and adaptation on the handset, with modelled range, resolution and power views.

The NDJSON telemetry client supports Wi-Fi through WebSocket or HTTP polling. Android also includes USB/BLE through a local Kotlin module; iOS telemetry uses Wi-Fi. A live session needs an endpoint that implements the [app protocol](mobile-android/docs/11-link-protocol.md). The current [TX/RX firmware guide](../02-firmware/README.md) documents its separate serial formats for endpoint integration.

## Source and verification

The two app folders retain mirrored TypeScript/UI source so each platform checkout is self-contained. Keep shared changes aligned across both folders. Expo SDK 57, React Native 0.86.2, React 19.2.3 and TypeScript 6 are declared in their package manifests.

From either app root, with Node available:

```sh
npm ci
npm run check
```

`check` runs strict type checking, the core verifier and Jest. The [v2.2.0 build record](releases/BUILDS.md) records 106 core assertions and 33 render tests passing at release time.

The platform READMEs document native build tools and packaging. See the [signing-key note](releases/keystore-note.md) for Android release signing; dependencies, generated output and private signing keys remain local.
