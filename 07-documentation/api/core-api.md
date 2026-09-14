# Core TypeScript API

The modules under `04-software/mobile-android/src/core` are pure TypeScript
except for the file-sharing boundary in `exportCsv.ts`. Internal units are Hz,
metres, seconds, degrees Celsius, ppt, NTU, dB and millijoules. Conversion to
display units happens at the UI boundary.

Functions do not throw for ordinary finite out-of-range numbers unless noted.
Where the implementation clamps, substitutes, ignores or propagates a value,
the behaviour is stated below. `NaN` generally propagates unless a function
uses `Math.max` or `Math.min`; callers must reject non-finite inputs.

## `physics.ts`

### Types

`Medium` is the closed union `'air' | 'water'`.

`SonarInputs` contains `sourceLevelDb` in dB re the medium reference,
`rangeM` in m, `absorptionDbPerM` in dB/m, `targetStrengthDb` in dB,
`noiseLevelDb` in dB, `directivityIndexDb` in dB and `processingGainDb` in dB.

### Functions

| Function | Inputs | Output | Valid range and invalid-value behaviour |
|---|---|---|---|
| `soundSpeedAir(tempC)` | `tempC`, degree C | Speed, m/s | Linear approximation for 0 to 40 degree C. No clamp; finite values extrapolate |
| `soundSpeedWater(tempC, salinityPpt, depthM)` | degree C, ppt, m | Speed, m/s | Inputs clamp to -2 to 35 degree C, 0 to 45 ppt and 0 to 8,000 m |
| `soundSpeed(medium, tempC, salinityPpt, depthM)` | `Medium` plus units above | Speed, m/s | Selects air or water function. TypeScript excludes other media |
| `thorpDbPerKm(freqKHz)` | Frequency, kHz | Absorption, dB/km | Frequencies below 0.1 kHz clamp to 0.1 kHz |
| `airAbsorptionDbPerM(freqKHz)` | Frequency, kHz | Absorption, dB/m | Frequencies below 0.1 kHz clamp to 0.1 kHz |
| `absorptionDbPerM(medium, freqHz)` | Medium, Hz | Absorption, dB/m | Converts Hz to kHz; water result divides dB/km by 1,000 |
| `transmissionLossDb(rangeM, alphaDbPerM)` | m, dB/m | One-way loss, dB | Range below 0.05 m clamps to 0.05 m. Negative absorption is not rejected |
| `echoSnrDb(inputs)` | `SonarInputs` | Echo SNR, dB | Uses `SL - 2TL + TS - NL + DI + PG`; the range clamp above applies |
| `maxDetectionRange(inputs, thresholdDb, hiBound)` | Sonar terms without range, threshold dB, upper bound m | Maximum range, m | Returns `0 m` if 0.05 m fails; returns `hiBound` if it passes; otherwise 60-step bisection |
| `rangeResolutionCw(c, tauS)` | m/s, s | Resolution, m | Direct `c * tauS / 2`; invalid signs propagate |
| `rangeResolutionChirp(c, bandwidthHz)` | m/s, Hz | Resolution, m | Bandwidth `<= 0 Hz` returns positive infinity |
| `timeBandwidthProduct(tauS, bandwidthHz)` | s, Hz | Dimensionless | Direct product |
| `compressionGainDb(tbp)` | Dimensionless | Gain, dB | Returns `0 dB` for `tbp <= 1`; otherwise `10 log10(tbp)` |
| `clamp(v, lo, hi)` | Same arbitrary unit | Same unit | Values below/above bounds return the bound; bounds are assumed ordered |
| `lerp(a, b, t)` | Same unit, dimensionless `t` | Same unit | `t` clamps to 0 to 1 |
| `invLerp(a, b, v)` | Same unit | Dimensionless | Equal bounds return 0; otherwise result clamps to 0 to 1 |

The underwater solver configuration uses the 100,000 to 500,000 Hz band,
220 m required range, 600 m range bound, 196 dB re 1 microPa source level,
-14 dB target strength, 20 dB directivity index, 12 dB detection threshold,
0.0005 to 0.012 s pulse duration and 46 mJ energy budget. These are underwater
payload design values from `WATER_CONFIG`, not bench results.

The air solver configuration uses 28,000 to 52,000 Hz, 4.5 m required range,
12 m range bound, 98 dB source level, -8 dB target strength, 12 dB directivity
index, 10 dB threshold, 0.0008 to 0.008 s pulse duration and 9 mJ budget. This
is the app's air solver band; bench validation sweeps the wider 24 to 80 kHz
demonstrator band.

## `dsp.ts`

### Enums and constants

| Export | Values | Unit | Invalid-value behaviour |
|---|---|---|---|
| `WindowKind` | `rect`, `hann`, `hamming`, `blackman` | Enum | TypeScript rejects other values; a forced runtime value leaves window samples at zero |
| `WaveMode` | `cw`, `lfm`, `geometric`, `barker13` | Enum | TypeScript rejects other values |
| `WINDOW_PSL_DB` | `-13.3`, `-31.5`, `-42.7`, `-58.0` | dB | Lookup returns `undefined` for an untyped unknown key |
| `WINDOW_LABEL` | Rectangular, Hann, Hamming, Blackman | Text | Lookup contract follows `WindowKind` |
| `MODE_LABEL` | Fixed tone, LFM chirp, Geometric sweep, Barker-13 coded | Text | Lookup contract follows `WaveMode` |
| `MODE_SHORT` | `CW`, `LFM`, `GEO`, `BRK` | Text | Lookup contract follows `WaveMode` |
| `BARKER_13` | `1,1,1,1,1,-1,-1,1,1,-1,1,-1,1` | Phase sign | Immutable tuple |

`WaveParams` contains `mode`, `window`, `fStart` and `fStop` in Hz, `tau` in s,
and `amplitude` as a 0 to 1 full-scale ratio. `fStop` is ignored by `cw` and
`barker13`.

### Functions

| Function | Inputs | Output | Valid range and invalid-value behaviour |
|---|---|---|---|
| `windowFunction(kind, n)` | Enum, sample count | `Float32Array(n)` | `n <= 1` returns an array filled with 1; typed-array construction rejects a negative length |
| `synthesise(params, sampleRate)` | `WaveParams`, sample/s | Pulse samples, full-scale ratio | Length is at least 8 and otherwise rounded `tau * sampleRate`; start/stop frequencies clamp to at least 1 Hz; amplitude is not clamped |
| `instantaneousFrequency(params, points)` | `WaveParams`, count | Frequency trace, Hz | Start/stop clamp to at least 1 Hz; `points = 0` returns an empty array; negative count is rejected by typed-array construction |
| `nextPow2(n)` | Count | Count | Returns the next power of two; `n <= 1` returns 1 |
| `fftInPlace(re, im)` | Equal power-of-two arrays | In-place complex FFT | Caller must supply equal power-of-two lengths; implementation does not validate this precondition |
| `magnitudeSpectrumDb(signal, fftSize)` | Samples, FFT count | First-half spectrum, dB relative to peak | FFT count rounds up to a power of two; data truncate or zero-pad; floor is -140 dB |
| `spectrogram(signal, fftSize, frames, floorDb)` | Samples, FFT count, frame count, dB | Normalised raster | Hann window and 50% conceptual overlap; output clamps to 0 to 1; default floor is -60 dB |
| `matchedFilter(rx, replica)` | Sample arrays | `MatchedFilterResult` | Uses direct cross-correlation; empty/zero-energy inputs yield bounded results rather than throwing |
| `decimate(src, target)` | Samples, count | Peak-preserving samples | Returns original array when already short; target must be a positive integer |
| `makeRandom(seed)` | Integer seed | Function returning 0 to less than 1 | Seed coerces to unsigned 32-bit; zero becomes 1 |
| `gaussian(rand)` | Uniform random callback | Normal deviate | Uniform zero clamps to `1e-9`; callback must return finite values in 0 to 1 |

`MatchedFilterResult.correlation` is normalised to a peak of 1 when a peak
exists. `peakIndex` is a sample-lag index, `peakValue` is the pre-display
correlation magnitude, and `peakToSidelobeDb` is capped at 60 dB. The sidelobe
search excludes a guard of the larger of 4 samples or one eighth of the replica.

## `adaptation.ts`

### Input and result types

`Environment` carries `tempC` in degree C, `salinityPpt` in ppt,
`turbidityNtu` in NTU and `depthM` in m.

`MediumConfig` fields and units are:

| Field | Unit |
|---|---|
| `bandLow`, `bandHigh`, `scatterRefHz` | Hz |
| `requiredRangeM`, `maxRangeBoundM` | m |
| `sourceLevelDb`, `targetStrengthDb`, `directivityIndexDb`, `detectionThresholdDb` | dB |
| `tauMin`, `tauMax` | s |
| `energyBudgetMj` | mJ |
| `scatterCoeff` | dB/(m NTU) at `scatterRefHz` |

`WaveDecision` returns `fStart`, `fStop`, `fCentre` and `bandwidth` in Hz;
`tau` in s; `amplitude` as a full-scale ratio; `soundSpeed` in m/s;
absorption and excess loss in dB/m; SNR and compression gain in dB; ranges and
resolutions in m; energy in mJ; dimensionless `tbp`; and Boolean `feasible`.
The optional runner-up uses Hz, dB and m and labels rejection as `snr` or
`energy`.

### Functions

| Function | Inputs | Output | Valid range and invalid-value behaviour |
|---|---|---|---|
| `excessScatteringDbPerM(cfg, turbidityNtu, freqHz)` | Config, NTU, Hz | dB/m | Negative turbidity clamps to 0 NTU. Frequency and reference must be positive for a physical result |
| `requiredMarginDb(env)` | Environment | dB | `3 + min(12, turbidityNtu / 70)`; negative turbidity can reduce margin, so callers must supply at least 0 NTU |
| `decide(env, cfg, noiseCorrectionDb)` | Environment, config, correction dB | `WaveDecision` | Evaluates 13 centres, 6 bandwidth fractions and 6 durations, 468 candidates. Returns best full-margin candidate, then bare-threshold fallback, then strongest available candidate with `feasible=false` |

`decide()` clamps sound-speed inputs as described above and clamps negative
turbidity only in scattering. Candidate amplitude lies from 0.42 to 0.92. A
candidate is feasible when SNR clears detection threshold plus required margin
and energy does not exceed the configuration budget. Ranking maximises bandwidth
and breaks ties on lower energy.

## `power.ts`

### Model values

The underwater power model uses `sleepMa = 0.9 mA`, `idleMa = 12 mA`,
`samplingMa = 28 mA`, `transmitPeakMa = 340 mA`, `ddsMa = 4 mA`,
`naiveTrigMa = 41 mA`, `busVolts = 3.3 V` and `batteryMah = 2,600 mAh`.
**Numerical basis:** Engineering projection for the final product configuration.

These are underwater payload design values. The separate bench demonstrator
measurement is 68.0 mA during transmit and 0.93 mJ per complete range ping
(T-11).

| Function | Inputs | Output | Valid range and invalid-value behaviour |
|---|---|---|---|
| `pingEnergy(tauSeconds, amplitude, sampleWindowS)` | s, ratio, s | `PingEnergy`, mJ and percent | Default sample window is 0.05 s. Amplitude is squared and not clamped; callers use 0 to 1 |
| `endurance(energy, pingIntervalS, batteryMah)` | `PingEnergy`, s, mAh | `Endurance` | Default battery is 2,600 mAh. Sleep time clamps at 0 s. A non-positive cycle energy returns zero cycles |
| `dutyBreakdown(tauSeconds, pingIntervalS)` | s, s | Array of seconds and percent | Uses fixed 0.5 s sample and 0.012 s wake intervals; negative residual sleep clamps to 0 s |

`PingEnergy` contains `wakeMj`, `sampleMj`, `computeMj`, `transmitMj`,
`totalMj`, `naiveTotalMj` in mJ and `savingPercent` in percent.
`Endurance` contains usable `batteryMj`, integer `pingsRemaining`,
`missionHours` in h and `averageMa` in mA. The battery model derives usable
energy from three 3.7 V cells and a 0.85 conversion/cut-off factor.

## `exportCsv.ts`

| Function | Input | Output | Invalid-value behaviour |
|---|---|---|---|
| `buildCsv(pings)` | `PingRecord[]` | CSV string | Sorts a copy oldest first. Non-finite numeric fields become empty strings |
| `exportSessionCsv(pings)` | `PingRecord[]` | `Promise<void>` | Empty input returns immediately. Existing same-name cache file is deleted, file is recreated, and sharing opens only when available. File-system and sharing errors reject the promise |

The complete export contract is in [Session CSV schema](csv-schema.md). Worked
calls are in [`examples/core-functions.md`](examples/core-functions.md).
