# 01 — Stack

Every dependency, and the reason it earns its place. Nothing here is optional decoration;
if a line cannot be justified in one sentence it should not be installed.

## Base

| Package | Why |
|---|---|
| **Expo SDK 56** | Released May 2026. Ships React Native 0.85 and React 19.2. |
| **React Native 0.85** | New Architecture (Fabric + TurboModules) is always on from SDK 55 — it cannot be disabled, so build for it from the start. |
| **TypeScript (strict)** | The physics layer is the heart of this app. Types are how you stop a kHz being passed where a Hz was expected. |
| **expo-router v6** | File-based routing, typed routes, tabs and modals out of the box. Default choice for new Expo apps. |
| **expo-dev-client** | Required: BLE needs native code, so Expo Go will not run this app. |

Create with:

```bash
npx create-expo-app@latest SeaNergy --template default
cd SeaNergy
npx expo install expo-dev-client expo-router
```

## Rendering and motion

| Package | Why |
|---|---|
| **@shopify/react-native-skia** | Every plot in this app — waveform, spectrogram, A-scan, correlation — is custom. Skia draws on the GPU and never touches the JS thread per frame. This is the single most important dependency for "smooth". |
| **react-native-reanimated** | Animations and gauge needles run as worklets on the UI thread. Nothing animates via `setState`. |
| **react-native-gesture-handler** | Native-thread gestures for the sliders and chart scrubbing. |
| **victory-native** *(optional)* | Only if you want axis-heavy standard charts. Built on Skia + Reanimated. Skip it if the hand-rolled Skia plots cover you — one less dependency. |

## Layout, insets, keyboard

| Package | Why |
|---|---|
| **react-native-safe-area-context v5** | Android 15 enforces edge-to-edge, and Android 16 removes the opt-out entirely. Insets are not optional any more. v5 also exposes IME insets. |
| **react-native-edge-to-edge** | Comes in through Expo's own system-bar handling. Use its `SystemBars` for status/nav bar styling. |
| **react-native-keyboard-controller** | Replaces RN's `KeyboardAvoidingView`, which behaves differently on each platform and jitters. This one runs on the UI thread. Needed for the manual-override and settings forms. |

## State and data

| Package | Why |
|---|---|
| **zustand** | Small, no boilerplate, and selector-based subscriptions mean a telemetry tick re-renders one gauge instead of the tree. |
| **react-native-mmkv** | Synchronous key-value storage for settings and the last session. Faster than AsyncStorage and the sync API removes a class of race conditions. |
| **@shopify/flash-list** | The ping log will hold hundreds of rows. FlashList keeps scrolling at 60 fps where FlatList starts dropping frames. |

## Device features

| Package | Why |
|---|---|
| **react-native-ble-plx** | The BLE transport. Mature, maintained, ships its own Expo config plugin from v3. **Not available in Expo Go** — this is what forces the dev build. |
| **expo-audio** | Sonification: play the scaled-down chirp through the phone speaker. (`expo-av` is deprecated — do not use it.) |
| **expo-haptics** | A short tap on ping fire. Small touch, makes the app feel built rather than assembled. |
| **expo-file-system** + **expo-sharing** | CSV export of a session. |
| **expo-keep-awake** | The screen must not sleep during a judging demo. |
| **expo-screen-orientation** | Lock to portrait. One less layout to test. |

## Install

```bash
npx expo install \
  @shopify/react-native-skia react-native-reanimated react-native-gesture-handler \
  react-native-safe-area-context react-native-keyboard-controller \
  react-native-ble-plx expo-audio expo-haptics expo-file-system expo-sharing \
  expo-keep-awake expo-screen-orientation @shopify/flash-list

npm i zustand react-native-mmkv
```

## app.json / app.config.ts essentials

```jsonc
{
  "expo": {
    "name": "SeaNergy",
    "slug": "seanergy",
    "scheme": "seanergy",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "android": {
      "package": "in.seanergy.console",
      "edgeToEdgeEnabled": true,
      "permissions": [
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.ACCESS_FINE_LOCATION"
      ]
    },
    "plugins": [
      "expo-router",
      "expo-audio",
      ["react-native-ble-plx", { "isBackgroundEnabled": false }]
    ]
  }
}
```

Note on permissions: Android 12+ needs `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT`.
`ACCESS_FINE_LOCATION` is still needed for scanning on some OEM builds unless you set
`neverForLocation` on the scan permission. Request them at runtime before the first scan,
with a plain-English rationale sheet — a permission dialog appearing with no explanation
during a judging demo looks broken.

## Deliberately not used

- **Expo Go** — cannot load BLE native code.
- **expo-av** — deprecated, replaced by expo-audio.
- **react-native-chart-kit / svg-charts** — SVG-based, they jank on live data.
- **Redux / RTK** — the state here is small; the boilerplate is not worth it.
- **A backend** — everything is on-device. No network dependency at the judging table, ever.
