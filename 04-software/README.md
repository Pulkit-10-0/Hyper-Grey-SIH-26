# SeaNergy software

The operator console, static engineering website and release packages for SeaNergy.

| Folder | Start here | Current scope |
|---|---|---|
| [Android app](mobile-android/README.md) | Source, build commands and screen map | Expo/React Native v2.2.0 with a tracked Android native project |
| [iOS app](mobile-ios/README.md) | Platform status and native build path | Mirrored application source and Xcode project; no installable IPA is included |
| [Website](website/README.md) | Open or serve the dossier | Static HTML/CSS/JavaScript with model-generated chart data |
| [Releases](releases/README.md) | APK selection and integrity checks | Four Android v2.2.0 packages and the recorded build results |

## Application and hardware boundary

The app has eleven tab destinations, a Scenario screen and a ping-detail route. Its simulation mode computes acoustic models, waveform synthesis, echo correlation and adaptation on the handset. Those outputs demonstrate the model; they are not measured underwater range or power results.

The application also implements an NDJSON telemetry client: Wi-Fi via WebSocket or HTTP polling, and Android USB/BLE through a local Kotlin module. The iOS target has the Wi-Fi client but no native USB/BLE implementation. The current [TX and RX firmware](../02-firmware/README.md) does not emit the app's NDJSON contract. Connecting these projects requires firmware/protocol integration and a hardware test; a cable alone does not complete that integration.

Read the app-side [protocol](mobile-android/docs/11-link-protocol.md) together with the current firmware guide before attempting a live session.

## Source and verification

The two app folders retain mirrored TypeScript/UI source so each platform checkout is self-contained. Keep shared changes aligned across both folders. Expo SDK 57, React Native 0.86.2, React 19.2.3 and TypeScript 6 are declared in their `package.json` files.

From either app root, with Node and dependencies installed:

```sh
npm ci
npm run check
```

`check` runs strict type checking, the core verifier and Jest. The [v2.2.0 build record](releases/BUILDS.md) records 106 core assertions and 33 render tests passing at release time. That historical record is separate from a fresh run of today's source and from physical-device installation, which the record marks pending.

Native platform tools and signing are additional requirements for making installable packages. See the platform READMEs and [signing-key note](releases/keystore-note.md). Generated dependencies, native build output and private signing keys are excluded from version control.
