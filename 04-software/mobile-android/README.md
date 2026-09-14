# mobile-android

The SeaNergy operator console, Android target. Working tree, not an archive.

**Version 2.1.0, versionCode 4.** Built package: [`../releases/`](../releases/).

---

## What it is

An Android app that reads the environment, decides what acoustic pulse to
transmit and shows why, synthesises and visualises that pulse, compresses the
returning echo, and reports the power budget.

Everything runs on the device. No server, no pairing, no network call. Fonts are
bundled in the package rather than fetched, so it opens with the radio off.

| Layer | What runs |
|---|---|
| Environment | Temperature, salinity, turbidity and depth, drifting the way real probes behave |
| Physics | Mackenzie sound speed, Thorp absorption, an air-absorption fit, frequency-dependent scattering from suspended sediment |
| Decision | 468 candidate parameter sets scored against the active sonar equation each tick; the best feasible one wins |
| Synthesis | Pulse built sample by sample with a phase accumulator, windowed, then FFT'd for the spectrogram |
| Compression | Real cross-correlation of the echo against the transmitted replica |
| Closed loop | Measured SNR compared against prediction; the residual feeds back and changes the next decision |

Nothing about the adaptation is a lookup table. Raise the turbidity and the
centre frequency drops because the optimiser recomputed the link budget and
found the high-frequency candidates no longer clear their margin.

### The behaviour, measured

Water configuration, 220 m required range, sweeping turbidity:

| Turbidity | Centre | Bandwidth | Pulse | Resolution | Usable range |
|---:|---:|---:|---:|---:|---:|
| 5 NTU | 350.7 kHz | 298.7 kHz | 0.50 ms | 2.6 mm | 365 m |
| 180 NTU | 350.7 kHz | 298.7 kHz | 0.50 ms | 2.6 mm | 275 m |
| 320 NTU | 350.7 kHz | 298.7 kHz | 2.80 ms | 2.6 mm | 250 m |
| 550 NTU | 274.7 kHz | 247.2 kHz | 7.40 ms | 3.1 mm | 252 m |
| 1000 NTU | 148.0 kHz | 96.0 kHz | 2.80 ms | 8.0 mm | 294 m |

Read the 180 to 320 NTU step carefully: the solver does not drop frequency
there, it **lengthens the pulse**, buying 7.5 dB of compression gain and holding
resolution at 2.6 mm. Only when that runs out does it give up bandwidth. That
ordering was not programmed; it falls out of scoring the candidates.

---

## Two modes

| Mode | What it does |
|---|---|
| **Simulation** | The full physics engine runs on the handset against a modelled environment |
| **Telemetry** | The same screens read the payload over the link |

The mode is on screen at all times and every displayed value carries its
provenance in its colour. There is no state in which a simulated number can be
mistaken for a live one.

## Screens

Twelve, on a scrollable strip.

| Screen | Route | Carries |
|---|---|---|
| Console | `app/(tabs)/index.tsx` | Solve card, chosen parameters, fire |
| Sonar | `app/(tabs)/sonar.tsx` | PPI display, contact list |
| Waveform | `app/(tabs)/wave.tsx` | Envelope, spectrogram, window selector, sonification |
| Echo | `app/(tabs)/echo.tsx` | A-scan, matched-filter output, predicted against measured |
| Environment | `app/(tabs)/env.tsx` | Sensor values and the derived physics |
| Mission | `app/(tabs)/mission.tsx` | Endurance and coverage |
| Power | `app/(tabs)/power.tsx` | Per-ping energy, duty cycle, DDS comparison |
| Spec | `app/(tabs)/spec.tsx` | The link budget, term by term |
| Diagnostics | `app/(tabs)/diag.tsx` | Self test |
| Log | `app/(tabs)/log.tsx` | Ping history and CSV export |
| Scenario | `app/scenario.tsx` | Preset environments |
| Settings | `app/(tabs)/settings.tsx` | Mode, medium |

Plus `app/ping/[id].tsx`, the detail view for a single ping.

---

## Build it

Everything needed is inside this folder. Nothing is installed on the C: drive.

```powershell
. .\.toolchain\env.ps1      # Node 22, JDK 17, Android SDK - all local
npm install
npm run apk
```

`npm run apk` is **gated**. It runs, in order:

1. `tsc --noEmit` — typecheck, strict
2. `npm run verify` — 85 physics, DSP and engine assertions under plain node
3. `jest --ci` — 33 render tests, all twelve screens in both modes

and only then invokes Gradle. If any stage fails there is no APK. That gate
exists because version 2.0.0 shipped and crashed on launch; the render harness
was written afterwards and proved by reintroducing the bug and watching it fail.

### Output

```
android/app/build/outputs/apk/release/
  app-universal-release.apk      installs anywhere
  app-arm64-v8a-release.apk      modern phones
  app-armeabi-v7a-release.apk    older 32-bit
  app-x86_64-release.apk         x86 tablets
```

Per-ABI splits plus a universal fallback, so an arm64 phone installs 57 MB
instead of the 124 MB fat binary.

### Signing

The release keystore is **not in this tree**. See
[`../releases/keystore-note.md`](../releases/keystore-note.md) for where it lives
and what happens if it is lost. Drop it at `android/app/seanergy-release.keystore`
before running `npm run apk`, or Gradle will fail at the signing step.

### Regenerating the native project

```powershell
npm run prebuild     # expo prebuild --clean, then re-applies the Android config
```

`expo prebuild --clean` wipes `android/`, taking the release signing block, the
per-ABI splits and the splash colours with it.
`scripts/apply-android-config.mjs` puts them back and is chained into both
`npm run prebuild` and `npm run apk`, so it is hard to forget. It also re-stamps
the version from `app.json`, because Gradle otherwise keeps whatever was stamped
at prebuild time — that is how a build once shipped with a stale versionCode.

### Other commands

| Command | Does |
|---|---|
| `npm run check` | The full gate on its own, without building |
| `npm run verify` | Physics and engine assertions only |
| `npm test` | Render tests only |
| `npm run site-data` | Regenerates the website's chart data from `src/core` |
| `npx expo start --dev-client` | Development |

---

## One Windows gotcha worth knowing

Ninja — the compiler driver the Android NDK uses — is still limited to the old
260-character `MAX_PATH` on Windows, **even though `LongPathsEnabled` is set on
this machine**. React Native's prefab header tree is deep enough that a Gradle
cache sitting under the project pushes header paths past the limit and the
native build dies with:

```
ninja: error: Stat(...RuntimeSchedulerIntersectionObserverDelegate.h):
Filename longer than 260 characters
```

`.toolchain/env.ps1` handles this. The cache files stay inside the project, but
Gradle is pointed at a short **junction** at `D:\sng` that targets them, taking
36 characters off every path the compiler sees. The junction is created
automatically if missing.

Two consequences:

- `D:\sng` is a link, not a copy. Deleting the project deletes the data; remove
  the leftover stub with `cmd /c rmdir D:\sng`.
- If the project moves, delete `D:\sng` first so it is recreated pointing at the
  new location, and clear the stale ninja dependency caches:
  `Get-ChildItem node_modules -Recurse -Directory -Filter .cxx | Remove-Item -Recurse -Force`

---

## Layout

```
app/                 expo-router routes - thin, screens only
src/
  core/              PURE TypeScript. No React, no React Native.
    physics.ts       sound speed, absorption, sonar equation, resolution
    dsp.ts           windows, synthesis, FFT, spectrogram, matched filter
    adaptation.ts    the candidate search and the decision
    explain.ts       decision -> English
    power.ts         energy and endurance model
    engine.ts        the runtime that ties it together
    link.ts          the telemetry transport
    useEngine.ts     useSyncExternalStore binding
    __verify__.ts    85 assertions against published values
  ui/                design system: tokens, Screen, kit, Slider
  charts/            Skia plots - Plot, Ppi, Spectrogram
  data/scenarios.ts  the operating scenarios
__tests__/           33 render tests
android/             the native project - tracked, minus build output
scripts/             apply-android-config.mjs, site-data.mjs
docs/                the build plan and the v2 rationale
.toolchain/          env.ps1 is source; the downloaded Node, JDK and SDK are not
```

`src/core` never imports React. It runs under plain node, which is what makes
`npm run verify` possible and the physics trustworthy.

---

## Design notes

**No text input anywhere.** Every control is a slider, chip, segmented control or
toggle. That is deliberate: it removes the entire class of keyboard-overlap and
input-clipping bugs, and it means the app can be driven with wet hands on a deck.

**Dark only.** A single committed instrument look, palette in `src/ui/tokens.ts`.
Value colour encodes provenance rather than decoration.

**Edge-to-edge is mandatory** on Android 15+, and Android 16 removed the opt-out.
Every screen goes through one `<Screen>` primitive that applies safe-area insets,
and the tab strip's height is a shared constant so bottom padding is never
applied twice.

**Numbers that change use tabular figures**, so a reading going from 199 to 211
does not shift the row.

---

## What `npm run verify` actually checks

Against published values, not against itself:

- Mackenzie sound speed at a known (T, S, Z) point
- Thorp absorption: 34 / 51 / 87 dB per km at 100 / 200 / 400 kHz
- Range resolution `c/2B` and `c·τ/2`; time-bandwidth product and compression gain
- Barker-13 peak-to-sidelobe ratio 22.28 dB, every sidelobe magnitude exactly 1
- Measured window sidelobes against theory: rect −13.4, Hann −31.5,
  Hamming −44.8, Blackman −58.3 dB
- Matched filter recovering a known delay from an echo buried in noise
- Adaptation direction: rising turbidity must lower the centre frequency
- Closed loop settles rather than drifting, and does not pin at its clamp

Those numbers are quotable in the report because they are measured from the same
code the app runs.

---

## Toolchain pinned

| Component | Version |
|---|---|
| Node | 22 (bundled under `.toolchain/node`) |
| JDK | 17 (bundled under `.toolchain/jdk`) |
| Android SDK build-tools | 36.0.0 |
| compileSdk / targetSdk | 36 |
| minSdk | 24 |
| Expo | SDK 57 |
| React Native | 0.86.2 |
| React | 19.2.3 |
| TypeScript | 6.0, strict |

---

## iOS

The same source builds for iOS. The native iOS project and its status are in
[`../mobile-ios/`](../mobile-ios/).
