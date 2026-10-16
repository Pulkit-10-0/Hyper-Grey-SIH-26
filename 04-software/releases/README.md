# releases

Shippable packages. **Current version 2.2.0.**

---

## Which file do I install?

**[`SeaNergy-2.2.0___android.apk`](SeaNergy-2.2.0___android.apk)** — 123.6 MB,
the universal package for the supported ABIs on Android 7.0/API 24 or later.
The [build record](BUILDS.md) includes package hashes, signatures and software-check results.

The other three files are the same app compiled for one processor architecture
each. They exist only to save download size and they will refuse to install on
the wrong phone. If you are not certain what the phone is, take the file above.

| File | For | Size |
|---|---|---:|
| `SeaNergy-2.2.0___android.apk` | supported ABIs, universal package | 123.6 MB |
| `SeaNergy-2.2.0___android-arm64-v8a.apk` | most phones sold since ~2016 | 57.4 MB |
| `SeaNergy-2.2.0___android-armeabi-v7a.apk` | older 32-bit phones | 47.9 MB |
| `SeaNergy-2.2.0___android-x86_64.apk` | x86 tablets and emulators | 58.3 MB |

## Installing

1. Copy the APK to the phone, or download it there.
2. Open it. Android will warn that it is from an unknown source — that is
   expected for anything not from the Play Store. Allow the file manager or
   browser to install apps, then continue.
3. It needs **Android 7.0 or later** (minSdk 24).

## Permissions

This table covers transport permissions. The generated
[app manifest](../mobile-android/android/app/src/main/AndroidManifest.xml) also
declares permissions from Expo audio/storage/runtime support; review it and the
[link-module manifest](../mobile-android/modules/seanergy-link/android/src/main/AndroidManifest.xml)
when checking the full merged permission set.


Version 2.2.0 includes transport permissions for compatible telemetry endpoints:

| Permission | What it is for | When it is asked for |
|---|---|---|
| USB host (feature, not required) | opening the payload's native USB port | Android prompts when you connect a device |
| `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT` | finding and opening the payload over BLE | only if you choose the Bluetooth transport |
| `ACCESS_FINE_LOCATION` (maxSdk 30 only) | Android 11 and earlier tie BLE scanning to location | as above, on old phones only |
| `INTERNET`, `ACCESS_NETWORK_STATE` | the socket to the payload's own access point | never prompted; Android grants it at install |

Simulation runs locally in aeroplane mode. For telemetry, choose the transport
and endpoint address in Settings.

## First thirty seconds, with no payload attached

Open it, go to **Environment**, and drag the turbidity slider from clear water to
the top of its range. Watch the centre frequency on **Console** fall from about
350 kHz to about 148 kHz, and the range resolution coarsen from 2.6 mm to 8 mm.

These simulation outputs come from a search over 468 candidate waveforms scored
against the sonar equation on the phone.

## Telemetry with a compatible endpoint

The Android app includes USB host serial, Wi-Fi and BLE clients. Live sessions
use an endpoint implementing the [app NDJSON protocol](../mobile-android/docs/11-link-protocol.md);
the [TX/RX firmware guide](../../02-firmware/README.md) describes the separate
firmware serial formats for endpoint integration.

Select **Telemetry** on Console, choose and configure a transport in Settings,
and inspect connection state, packet counts and decoded records in Diagnostics.
The [Wi-Fi design note](../mobile-android/docs/12-firmware-wifi.md) is an endpoint
integration reference; compare it with the current TX source when adapting it.

## Related source

The [iOS target](../mobile-ios/README.md) includes mirrored application source,
a recorded Hermes JavaScript export and the native Xcode project. Its guide
covers native compilation and signing; packages in this folder are Android APKs.

The [firmware tree](../../02-firmware/README.md) contains the TX and RX source,
build instructions and verification records.

---

## Records

- [`BUILDS.md`](BUILDS.md) — every build: version, size, SHA-256, signature,
  gate output, and what changed
- [`keystore-note.md`](keystore-note.md) — where the signing key lives, and what
  happens if it is lost. The key itself is not in this repository.

## Verifying a download

```powershell
Get-FileHash .\SeaNergy-2.2.0___android.apk -Algorithm SHA256
```

Compare against the hash in `BUILDS.md`.
