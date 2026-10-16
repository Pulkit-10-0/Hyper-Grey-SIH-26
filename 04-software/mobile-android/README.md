# mobile-android

The SeaNergy operator console, Android target. Working tree, not an archive.

**Version 2.2.0, versionCode 5.** Built package: [`../releases/`](../releases/).

---

## What it is

An Android operator console with an on-device acoustic simulation, waveform and
echo visualisation, a modelled power budget, and clients for compatible telemetry
endpoints. Its [source guide](src/README.md) maps the implementation.

The physics runs on the device. The numerical model runs locally. Telemetry opens the endpoint selected
by the operator; simulation does not need that connection. Fonts are bundled in
the package rather than fetched, so it opens with the radio off, and simulation
mode still works end to end in aeroplane mode.

Version 2.2.0 includes an NDJSON telemetry client. **The current repository TX/RX
firmware does not yet emit this protocol.** Live operation requires a compatible
endpoint and integration testing; see [the current firmware guide](../../02-firmware/README.md).
The physics, echo processing and feedback described below operate within the app
simulation unless a compatible endpoint supplies the corresponding data.

| Layer | What runs |
|---|---|
| Environment | Temperature, salinity, turbidity, depth and **pH** — simulated with realistic drift, or read from the payload's probes |
| Physics | Mackenzie sound speed, **Francois-Garrison** absorption with its pH and pressure terms, an air-absorption fit, frequency-dependent scattering from suspended sediment |
| Decision | 468 candidate parameter sets scored against the active sonar equation each tick; the best feasible one wins |
| Synthesis | Pulse built sample by sample with a phase accumulator, windowed, then FFT'd for the spectrogram |
| Compression | Numerical cross-correlation of the modelled or supplied echo against the replica |
| Closed loop | Simulated echo SNR compared against prediction; the residual feeds back within the handset model |

Nothing about the adaptation is a lookup table. Raise the turbidity and the
centre frequency drops because the optimiser recomputed the link budget and
found the high-frequency candidates no longer clear their margin.

### Example simulation behaviour

Model outputs for the water configuration, 220 m requested range, sweeping
turbidity. These are numerical predictions, not tank measurements:

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
| **Telemetry** | Compatible NDJSON endpoint records supply the environment and reported pulse decision |

The interface displays the selected mode and uses colour to distinguish value
provenance. Review the link state and packet record in Diagnostics when verifying
a live session; selecting Telemetry alone does not establish that data arrived.

In telemetry mode the handset stops deciding and starts reporting. Resolution
and compression gain are recomputed from the pulse the payload says it actually
transmitted, not from the one this phone would have picked — so if the firmware's
solver and this one disagree, the screen shows the disagreement rather than
hiding it.

## The link

One wire format, three transports. The screens never learn which one delivered a
reading, so adding a transport is a new class and nothing else changes.

| | Transport | When it is the right one |
|---|---|---|
| 1 | **USB host serial** | A compatible CDC-ACM/CP210x endpoint, USB host support and a data cable are required. |
| 2 | **Wi-Fi** | A compatible NDJSON WebSocket or HTTP endpoint on the selected network. |
| 3 | **Bluetooth LE** | Android client for the configured Nordic UART Service endpoint. |

The format is **newline-delimited JSON**: one object per line, `\n` as the frame
boundary, no length prefix and no CRC. A line that will not parse is counted on
Diagnostics and rejected by the parser.

Wi-Fi tries a WebSocket first and falls back to polling an HTTP endpoint, which
means a firmware built on the ESP32 core's own `WebServer.h` needs no WebSocket
library at all. The operator does not choose; the status line reports which one
it settled on.

The Android USB and Bluetooth client implementations are a local Expo native module in
[`modules/seanergy-link/`](modules/seanergy-link/) — Kotlin, autolinked, speaking
CDC-ACM directly with a CP210x branch for boards that use a bridge.

App-side specification for firmware integration:
[`docs/11-link-protocol.md`](docs/11-link-protocol.md). A historical Wi-Fi integration sketch (review against the current TX source before use): [`docs/12-firmware-wifi.md`](docs/12-firmware-wifi.md).

## Permissions

The table describes transport-related permissions. The generated app manifest
also declares Expo audio/storage/runtime permissions; inspect
[`AndroidManifest.xml`](android/app/src/main/AndroidManifest.xml) and the
[link-module manifest](modules/seanergy-link/android/src/main/AndroidManifest.xml)
for the actual declarations merged during a native build.


| Permission | For | Prompted |
|---|---|---|
| USB host (feature, `required="false"`) | the payload's native USB port | by Android, on connect |
| `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT` | finding and opening the payload over BLE | only on choosing that transport |
| `ACCESS_FINE_LOCATION`, maxSdk 30 | Android 11 and earlier tie BLE scanning to location | as above, old phones only |
| `INTERNET`, `ACCESS_NETWORK_STATE` | the socket to the payload's access point | granted at install |

`usb.host` is declared `required="false"` on purpose: a phone without USB host
support can use the other supported transports, subject to device capabilities.

## Screens

Eleven destinations on a scrollable tab strip, plus the separate Scenario screen.

| Screen | Route | Carries |
|---|---|---|
| Console | `app/(tabs)/index.tsx` | Solve card, chosen parameters, fire |
| Sonar | `app/(tabs)/sonar.tsx` | PPI display, contact list |
| Waveform | `app/(tabs)/wave.tsx` | Envelope, spectrogram, window selector, sonification |
| Echo | `app/(tabs)/echo.tsx` | A-scan, matched-filter output and SNR comparison |
| Environment | `app/(tabs)/env.tsx` | Sensor values and the derived physics |
| Mission | `app/(tabs)/mission.tsx` | Endurance and coverage |
| Power | `app/(tabs)/power.tsx` | Per-ping energy, duty cycle, DDS comparison |
| Spec | `app/(tabs)/spec.tsx` | Spectrum, frequency track and spectrogram |
| Diagnostics | `app/(tabs)/diag.tsx` | Self test, transport state, packet counters, raw decoded record |
| Log | `app/(tabs)/log.tsx` | Ping history and CSV export |
| Scenario | `app/scenario.tsx` | Preset environments |
| Settings | `app/(tabs)/settings.tsx` | Mode, medium, transport selection and connection |

Plus `app/ping/[id].tsx`, the detail view for a single ping.

---

## Build it

This folder contains the application and native Android project. Node, JDK 17,
the Android SDK/NDK and dependencies must also be available. The optional Windows
helper expects separately provisioned tools; the downloads are not in Git.

```powershell
. .\.toolchain\env.ps1      # if its expected local tool directories are provisioned
npm ci
npm run apk
```

`npm run apk` is **gated**. It runs, in order:

1. `tsc --noEmit` — typecheck, strict
2. `npm run verify` — 106 physics, DSP, protocol and engine assertions under plain node
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

Review and preserve native changes before using the clean prebuild command; it
recreates the native tree, including any folder documentation added there.


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
  core/              numerical modules, runtime, link and platform adapters
    physics.ts       sound speed, absorption, sonar equation, resolution
    dsp.ts           windows, synthesis, FFT, spectrogram, matched filter
    adaptation.ts    the candidate search and the decision
    explain.ts       decision -> English
    power.ts         energy and endurance model
    engine.ts        the runtime that ties it together
    link.ts          the three transports, one interface
    protocol.ts      the wire format: NDJSON, framing, reassembly
    useEngine.ts     useSyncExternalStore binding
    __verify__.ts    106 assertions against published values
  ui/                design system: tokens, Screen, kit, Slider
  charts/            Skia plots - Plot, Ppi, Spectrogram
  data/scenarios.ts  the operating scenarios
__tests__/           33 render tests
android/             the native project - tracked, minus build output
scripts/             apply-android-config.mjs, site-data.mjs
docs/                the build plan and the v2 rationale
.toolchain/          env.ps1 is source; the downloaded Node, JDK and SDK are not
```

The numerical modules in `src/core` run under Node for verification. That folder
also contains React subscription hooks and Expo-backed export/audio adapters;
see [its README](src/core/README.md) for the separation.

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

The verifier covers numerical reference values, analytic DSP properties and
engine/protocol behaviour. The [release record](../releases/BUILDS.md) records 106
assertions and 33 render tests; rerun the gate after changes. Examples include:

- Mackenzie sound speed at a known (T, S, Z) point
- Thorp absorption: 34 / 51 / 87 dB per km at 100 / 200 / 400 kHz
  (kept and still asserted; the solver now runs on Francois-Garrison, which
  adds the pH and pressure terms the two new probes measure)
- Range resolution `c/2B` and `c·τ/2`; time-bandwidth product and compression gain
- Barker-13 peak-to-sidelobe ratio 22.28 dB, every sidelobe magnitude exactly 1
- Measured window sidelobes against theory: rect −13.4, Hann −31.5,
  Hamming −44.8, Blackman −58.3 dB
- Matched filter recovering a known delay from an echo buried in noise
- Adaptation direction: rising turbidity must lower the centre frequency
- Closed loop settles rather than drifting, and does not pin at its clamp

These are checks on software-generated data. They do not establish acoustic
output, real-target detection, electrical power or firmware timing on the bench.

---

## Toolchain pinned

| Component | Version |
|---|---|
| Node | 22 used by the recorded build; local download is not tracked |
| JDK | 17 used by the recorded build; install or provision it locally |
| Android SDK build-tools | 36.0.0 |
| compileSdk / targetSdk | 36 |
| minSdk | 24 |
| Expo | SDK 57 |
| React Native | 0.86.2 |
| React | 19.2.3 |
| TypeScript | 6.0, strict |

---

## iOS

The shared source and native project are also provided for iOS; native packaging
and device verification remain separate steps. The native iOS project and its status are in
[`../mobile-ios/`](../mobile-ios/).
