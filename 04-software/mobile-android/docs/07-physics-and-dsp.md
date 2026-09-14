# 07 — Physics and DSP

Everything in `src/core`. Pure TypeScript, no React, no React Native, unit-tested under
node. These functions are also the source of the numbers that go in the written report, so
treat the tests as evidence, not chores.

## Units convention

Pick one and enforce it with branded types, because a kHz passed where a Hz was expected is
the bug you will lose an evening to.

```ts
type Hz = number & { __hz: true };
type Metres = number & { __m: true };
type Seconds = number & { __s: true };
```

Internally: **Hz, metres, seconds, celsius, ppt, dB.** Convert only at the UI boundary.

---

## Sound speed — Mackenzie

```ts
export function soundSpeedMackenzie(T: number, S: number, Z: number): number {
  return 1448.96
    + 4.591 * T
    - 5.304e-2 * T ** 2
    + 2.374e-4 * T ** 3
    + (S - 35) * (1.340 - 1.025e-2 * T)
    + 1.630e-2 * Z
    + 1.675e-7 * Z ** 2
    - 7.139e-13 * T * Z ** 3;
}
```

T °C, S ppt, Z metres. Valid roughly 2–30 °C, 25–40 ppt, 0–8000 m — **clamp inputs and
surface a warning when out of range** rather than returning nonsense.

For the v1 air build, sound speed is instead:

```ts
export const soundSpeedAir = (T: number) => 331.3 + 0.606 * T;   // m/s
```

Switch on `DEVICE.transducer.medium`. Showing both, and explaining that the same code path
serves either medium, is a good answer to "how does this scale to water?"

## Absorption — Thorp

```ts
export function absorptionThorp(fKHz: number): number {   // dB/km
  return 0.11 * fKHz ** 2 / (1 + fKHz ** 2)
       + 44 * fKHz ** 2 / (4100 + fKHz ** 2)
       + 2.75e-4 * fKHz ** 2
       + 0.003;
}
```

Sanity values to assert in tests: ~34 dB/km at 100 kHz, ~51 at 200 kHz, ~87 at 400 kHz.
That 100-vs-400 ratio *is* the range-versus-resolution argument, and it should appear in the
UI as a live number.

Thorp is fitted at lower frequencies. Add **Francois–Garrison** as an upgrade — it covers
400 Hz to 1 MHz and takes temperature, salinity, depth and pH. Implement Thorp first, ship,
then upgrade if the schedule holds.

## Sonar equation

```ts
export function snrDb(p: {
  sourceLevel: number; range: number; alphaDbPerKm: number;
  targetStrength: number; noiseLevel: number; directivityIndex: number;
}): number {
  const tl = 20 * Math.log10(p.range) + (p.alphaDbPerKm * p.range) / 1000;
  return p.sourceLevel - 2 * tl + p.targetStrength - p.noiseLevel + p.directivityIndex;
}
```

Then `maxRange(threshold)` by bisection over range. This is what fills the "predicted range"
figure and what the closed loop compares against.

## Resolution and compression

```ts
export const rangeResolutionCw    = (c: number, tau: number) => (c * tau) / 2;
export const rangeResolutionChirp = (c: number, bw: number)  =>  c / (2 * bw);
export const timeBandwidth        = (tau: number, bw: number) => tau * bw;
export const compressionGainDb    = (tbp: number) => 10 * Math.log10(tbp);
```

Test targets, in water at c = 1500:
5 ms CW → 3.75 m. 100 kHz chirp → 7.5 mm. TBP 500 → 27 dB.

---

## Waveform generation

One function, three modes, always windowed.

```ts
export function generate(p: WaveformParams, sampleRate: number): Float32Array {
  const n = Math.round(p.tau * sampleRate);
  const out = new Float32Array(n);
  const w = windowFn(p.window, n);
  let phase = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let f: number;
    switch (p.mode) {
      case 'cw':        f = p.fStart; break;
      case 'lfm':       f = p.fStart + (p.fStop - p.fStart) * (t / p.tau); break;
      case 'geometric': f = p.fStart * Math.pow(p.fStop / p.fStart, t / p.tau); break;
      case 'barker13':  f = p.fStart; break;
    }
    phase += 2 * Math.PI * f / sampleRate;
    const sign = p.mode === 'barker13' ? barkerSign(t, p.tau) : 1;
    out[i] = Math.sin(phase) * sign * w[i] * p.amplitude;
  }
  return out;
}
```

Note the **phase accumulator** — frequency is integrated into phase rather than evaluated as
`sin(2*pi*f*t)`. The naive form produces a phase discontinuity every time `f` changes, which
shows up as spectral splatter. This mirrors exactly what the firmware does with its DDS, so
the app's preview and the hardware's output agree.

Barker-13: `+ + + + + - - + + - + - +`, thirteen equal sub-pulses, sign flips the phase 180°.
Peak-to-sidelobe 22.3 dB. Assert that in a test.

## Windows

```ts
export const WINDOW_PSL_DB = {
  rect: -13.3, hann: -31.5, hamming: -42.7, blackman: -58.0,
} as const;
```

Hann `0.5 - 0.5cos`, Hamming `0.54 - 0.46cos`, Blackman `0.42 - 0.5cos + 0.08cos2`.
The UI shows the theoretical PSL from this table beside the measured value from the FFT —
agreement between the two is itself a demo beat.

## FFT

A plain iterative radix-2 Cooley–Tukey is enough. Sizes 256–2048, zero-padded. At those
sizes it runs in well under a frame on any phone; do not reach for a native module.

Spectrogram = sliding window (Hann, 50% overlap) → magnitude → dB → colour map. Render into
a Skia image, not a React tree.

## Matched filter

```ts
export function matchedFilter(rx: Float32Array, replica: Float32Array) {
  // correlate, then report
  return { peakIndex, peakValue, snrDb, sidelobeDb, rangeM };
}
```

Direct time-domain correlation is fine for a few thousand samples. If it ever feels slow,
move to FFT-based correlation using the FFT you already have — but measure before optimising.

`rangeM = (peakIndex / sampleRate) * c / 2`, where `c` comes from the sound-speed function
above. That coupling — the measured range depends on the measured temperature — is worth
pointing out explicitly during the demo.

---

## The adaptation engine

`core/adaptation/select.ts`. This is the project. It must be genuinely computed.

```
1. Read environment.
2. Compute c, alpha(f) across the candidate band, and the noise floor.
3. Build candidate parameter sets (a coarse grid over f_centre, bandwidth, tau, amplitude).
4. Score each: predicted SNR at required range must clear the detection threshold,
   energy per ping must fit the budget, then maximise bandwidth (= resolution).
5. Return the winner plus the runner-up and the reason the winner beat it.
```

Returning the runner-up is what lets the explainer say *"120 kHz beat 200 kHz because..."*
rather than just stating the result. That comparative phrasing is what makes the screen read
as reasoning.

## The closed loop

```
predicted = snrDb(chosen)
measured  = matchedFilter(echo).snrDb
error     = measured - predicted
```

Feed `error` back as a correction to the assumed noise level or target strength, bounded, so
the next prediction is better. Show all three numbers on the Echo screen. Log every one.

Keep the correction bounded and damped — an unbounded feedback term will oscillate visibly,
and it will do it while someone is watching.

---

## Tests worth writing

These take an afternoon and every one of them becomes a line in the report:

- [ ] Mackenzie matches published values at three known (T, S, Z) points
- [ ] Thorp gives ~34 / ~51 / ~87 dB/km at 100 / 200 / 400 kHz
- [ ] Chirp resolution: c/2B at B = 100 kHz gives 7.5 mm
- [ ] Barker-13 autocorrelation peak-to-sidelobe = 22.3 dB (±0.2)
- [ ] Each window's measured first-sidelobe level matches `WINDOW_PSL_DB` (±1 dB)
- [ ] Matched filter recovers a known delay from a synthetic echo buried in noise
- [ ] Adaptation lowers centre frequency monotonically as turbidity rises
- [ ] Energy model scales linearly with pulse duration
