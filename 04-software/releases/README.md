# releases

Shippable packages. **Current version 2.1.0.**

---

## Which file do I install?

**`SeaNergy-2.1.0___android.apk`** — 123.5 MB, installs on any Android phone.

The other three files are the same app compiled for one processor architecture
each. They exist only to save download size and they will refuse to install on
the wrong phone. If you are not certain what the phone is, take the file above.

| File | For | Size |
|---|---|---:|
| `SeaNergy-2.1.0___android.apk` | anything | 123.5 MB |
| `SeaNergy-2.1.0___android-arm64-v8a.apk` | most phones sold since ~2016 | 57.4 MB |
| `SeaNergy-2.1.0___android-armeabi-v7a.apk` | older 32-bit phones | 47.9 MB |
| `SeaNergy-2.1.0___android-x86_64.apk` | x86 tablets and emulators | 58.2 MB |

## Installing

1. Copy the APK to the phone, or download it there.
2. Open it. Android will warn that it is from an unknown source — that is
   expected for anything not from the Play Store. Allow the file manager or
   browser to install apps, then continue.
3. It needs **Android 7.0 or later** (minSdk 24).

The app requests no permissions and makes no network call. It opens in
aeroplane mode.

## First thirty seconds

Open it, go to **Environment**, and drag the turbidity slider from clear water to
the top of its range. Watch the centre frequency on **Console** fall from about
350 kHz to about 148 kHz, and the range resolution coarsen from 2.6 mm to 8 mm.

That is not a scripted animation. Each frame is the winner of a fresh search over
468 candidate waveforms scored against the sonar equation, computed on the phone.

## iOS

There is no iOS package. The iOS source and native project are complete and the
iOS JavaScript bundle builds; producing an `.ipa` needs macOS. The full status
and the exact route to a build are in [`../mobile-ios/`](../mobile-ios/).

## Firmware

`firmware-<version>.bin` belongs in this folder once the payload firmware has a
tagged release. It is not here yet. Firmware source is in
[`../../02-firmware/`](../../02-firmware/).

---

## Records

- [`BUILDS.md`](BUILDS.md) — every build: version, size, SHA-256, signature,
  gate output, and what changed
- [`keystore-note.md`](keystore-note.md) — where the signing key lives, and what
  happens if it is lost. The key itself is not in this repository.

## Verifying a download

```powershell
Get-FileHash .\SeaNergy-2.1.0___android.apk -Algorithm SHA256
```

Compare against the hash in `BUILDS.md`.
