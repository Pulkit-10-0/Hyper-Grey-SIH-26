# BUILDS

Every published package, newest first. One entry per build. A build that is not
recorded here does not exist.

Naming convention: `SeaNergy-<version>___<platform>[-<abi>].<ext>`

---

## 2.1.0 — 10 September 2026

**versionCode 4 · minSdk 24 · targetSdk 36 · compileSdk 36 · signature scheme v2**

| File | ABI | Bytes | Size |
|---|---|---:|---:|
| `SeaNergy-2.1.0___android.apk` | universal | 129,548,087 | 123.5 MB |
| `SeaNergy-2.1.0___android-arm64-v8a.apk` | arm64-v8a | 60,187,481 | 57.4 MB |
| `SeaNergy-2.1.0___android-armeabi-v7a.apk` | armeabi-v7a | 50,175,865 | 47.9 MB |
| `SeaNergy-2.1.0___android-x86_64.apk` | x86_64 | 61,058,543 | 58.2 MB |

**Install `SeaNergy-2.1.0___android.apk`** unless you know the phone's ABI. Every
Android phone sold in the last decade takes it. The per-ABI files exist only to
save download size.

### SHA-256

```
d22b0569b725ae71d7d2de6e069bb1c6b7f3ee7a7bb50d2e226de0410beb90cb  ___android-arm64-v8a.apk
8b698508359bf8e2f9a0c083360e8949de5cf5ab58005a13d8cbc883f5a8774f  ___android-armeabi-v7a.apk
871a35cb205ca5e688bbfca8ed733c2636737e7b8fb25b99853d1152b43d153f  ___android-x86_64.apk
a31bbcc86e33715c855117a6c4e3441ac93fe4cabb533cdfd7244dc50c149202  ___android.apk
```

Verify before installing:

```powershell
Get-FileHash .\SeaNergy-2.1.0___android.apk -Algorithm SHA256
```

### Signature

```
Verified using v1 scheme (JAR signing):              false
Verified using v2 scheme (APK Signature Scheme v2):  true
Number of signers: 1
Signer #1 certificate DN:  CN=SeaNergy, OU=SIH 2026, O=SeaNergy, L=India, ST=India, C=IN
Signer #1 certificate SHA-256:  de484e574d8938a37b2760430c7163c08c5182222c7a78dcc151a540165fb6ca
Signer #1 certificate SHA-1:    799f0c3320e81c758d1e626b2da52d8ed54e61eb
Signer #1 key algorithm:  RSA, 2048 bits
Certificate validity:     25 Aug 2026 to 17 Aug 2056
```

Reproduce with:

```powershell
apksigner verify --print-certs --verbose SeaNergy-2.1.0___android.apk
```

### What changed from 2.0.1

- iOS target added: native project generated, iOS JS bundle built and verified.
  See [`../mobile-ios/`](../mobile-ios/). No iOS package is produced yet.
- `ios.buildNumber` added to `app.json` so the iOS build number tracks
  versionCode.
- npm scripts added: `ios`, `prebuild:ios`, `bundle:ios`, `site-data`.
- No change to `src/` — the physics, the solver and the screens are byte-identical
  to 2.0.1. The 85 assertions produce the same values.

### Gate

Built by `npm run apk`, which refuses to invoke Gradle unless all three stages
pass first:

```
tsc --noEmit                              typecheck, strict     PASS
npm run verify                            85 assertions          85 passed, 0 failed
jest --ci                                 33 render tests        33 passed, 33 total
gradlew.bat assembleRelease --no-daemon                          BUILD SUCCESSFUL in 6m 30s
```

### Build environment

| | |
|---|---|
| Host | Windows 11 Pro 26200 |
| Node | 22 (project-local, `.toolchain/node`) |
| JDK | Temurin 17.0.20.1 (project-local, `.toolchain/jdk`) |
| Android SDK build-tools | 36.0.0 (project-local) |
| Gradle | 9.3.1 |
| Expo | SDK 57 · React Native 0.86.2 · React 19.2.3 |
| Commit | Repository initialised; this is the first build recorded, no commit yet |

---

## 2.0.1 — 28 August 2026

**versionCode 3.** Superseded by 2.1.0 and removed from this folder to avoid
handing a judge the wrong file. Recorded here so the history is not lost.

- First build to pass the render-test gate.
- Fixed the 2.0.0 startup crash: `useSyncExternalStore(link.onChange, ...)`
  passed an unbound method, so `this` was undefined the moment the store
  subscribed. Every member of `link.ts` became an arrow property.
- The 33-test render harness was written in response and proved by reverting the
  fix and confirming the suite went red.

## 2.0.0 — 28 August 2026

**versionCode 2. Withdrawn — crashed on launch.**

Shipped without a render test. The v2 instrument redesign was correct; the store
binding was not. Nothing was checking that a screen could mount. This build is
the reason `npm run apk` is now gated on `npm run check`.

## 1.0.0 — 25 August 2026

**versionCode 1.** First working package. Light theme, five tabs, explanatory
prose on every screen. Replaced by the v2 instrument console.

---

## Rules for this folder

1. Version and versionCode increment on every published build. `app.json` is the
   source of truth; `scripts/apply-android-config.mjs` re-stamps Gradle from it,
   because Gradle otherwise keeps whatever was stamped at prebuild time.
2. No package is published unless the gate passed. Record the gate output above.
3. Superseded builds are deleted from this folder, not left beside the current
   one. Their entry stays in this file.
4. An APK counts as verified only when a person has installed it on a physical
   phone and opened it. A successful Gradle build is not that.
5. Record the SHA-256. It is the only way to tell which file someone actually
   installed when a bug is reported.

## Verification status

| Build | Gate | Installed and opened on a physical phone |
|---|---|---|
| 2.1.0 | Passed | **Not yet — pending** |
| 2.0.1 | Passed | Not recorded |

That column is deliberately not filled in by the build machine. Sign it off when
someone has actually done it, and put the phone model next to it.
