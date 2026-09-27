# 04-software

Everything that runs somewhere other than the payload: the operator console for
both mobile platforms, the engineering dossier website, and the shipped packages.

---

## Contents

| Folder | What is in it | State |
|---|---|---|
| [`mobile-android/`](mobile-android/) | Full Expo React Native project including the native `android/` project and the local native link module | **Built.** v2.2.0, gate passing |
| [`mobile-ios/`](mobile-ios/) | The same project including the native `ios/` Xcode project | **Source complete, package not built** — needs macOS |
| [`website/`](website/) | The engineering dossier, static, no build step | **Complete** |
| [`releases/`](releases/) | Shipped packages, hashes, signature record, keystore note | **4 Android packages, v2.2.0** |

---

## One app, two platforms

`mobile-android/` and `mobile-ios/` hold the **same application**. The `app/`,
`src/`, `assets/` and `__tests__/` trees are identical; they differ only in the
generated native project each carries and in what has been built from it.

That is not duplication for the sake of filling folders — it is how React Native
targets work. Each folder is independently buildable for its platform, which
means neither one has a hidden dependency on the other, and a judge opening
either finds a complete project rather than half of one.

| | Android | iOS |
|---|---|---|
| Application source | identical | identical |
| Native project | `android/`, tracked | `ios/`, tracked |
| Native link module | autolinked | declares `platforms: [android]`, so iOS has Wi-Fi telemetry and not USB or BLE |
| Typecheck, 106 assertions, 33 render tests | passing | passing |
| Platform bundle built | yes, inside the APK | yes, 4.4 MB Hermes, verified |
| Installable package | **yes** — 4 APKs in `releases/` | **no** — requires macOS and Xcode |

The iOS blocker is documented precisely, with the two routes to a package and
what each costs, in [`mobile-ios/ios-build-notes.md`](mobile-ios/ios-build-notes.md).

---

## Naming

Packages are named `SeaNergy-<version>___<platform>[-<abi>].<ext>`. The triple
underscore is a deliberate separator that survives being pasted into a chat, a
form field or a filename-sanitising upload widget without being mistaken for part
of the version.

```
SeaNergy-2.2.0___android.apk               <- install this one
SeaNergy-2.2.0___android-arm64-v8a.apk
SeaNergy-2.2.0___android-armeabi-v7a.apk
SeaNergy-2.2.0___android-x86_64.apk
SeaNergy-2.2.0___ios.ipa                   <- does not exist yet, and is not faked
```

---

## The one command

From `mobile-android/`, on Windows:

```powershell
. .\.toolchain\env.ps1
npm install
npm run apk
```

`npm run apk` will not call Gradle unless `tsc --noEmit`, the 106 physics and
protocol assertions and the 33 render tests all pass first. That gate exists because
version 2.0.0 shipped and crashed on launch — the harness was written afterwards
and proved by putting the bug back and watching the suite go red.

## Version 2.2.0, in one line each

- Two sensors were added to the payload, **pH and depth**, so absorption moved
  from Thorp to **Francois-Garrison**, which is the model that has a term for
  each of them
- **The telemetry link was built.** One NDJSON wire format across USB-C, Wi-Fi
  and Bluetooth LE, with a local Kotlin native module behind the first and third
- Wi-Fi falls back from WebSocket to HTTP polling, so the firmware needs no
  WebSocket library — only `WebServer.h` from the ESP32 core
- The engine now consumes packets: in telemetry mode the payload's probes are
  the environment and the pulse it reports is the displayed decision
- The wire format is now under test; the suite went from 85 assertions to **106**
- **First release that requests permissions.** USB host, Bluetooth and a network
  socket. `releases/README.md` lists every one and when it is asked for

Previous release: 2.1.0 added the iOS target. Full history in
[`releases/BUILDS.md`](releases/BUILDS.md).

Full record: [`releases/BUILDS.md`](releases/BUILDS.md).

---

## What is deliberately not here

- **The payload firmware.** That is [`../02-firmware/`](../02-firmware/).
- **The dataset and the learned surrogate.** That is [`../05-models/`](../05-models/).
- **Signing keys.** See [`releases/keystore-note.md`](releases/keystore-note.md).
- **`node_modules/`, build output and the downloaded toolchain.** Each folder's
  `.gitignore` says exactly what is excluded and why.
