# 05 — Data and hardcoding

The brief was: hardcode as much as possible, provided it stays functional and honest.
Here is exactly where the line sits.

## The principle

> **Hardcode the world, compute the physics.**

Anything that would come from a sensor, a lab, or a long recording gets baked in as a
fixture. Anything that is *maths* gets computed live from those fixtures, because computing
it is cheap, it is impressive when a judge drags a slider, and it is what makes the app a
model rather than a slideshow.

The corollary: **the app must run its entire demo with nothing connected.** If BLE is dead,
you switch to `ReplayTransport` and the six-minute demo still runs end to end.

## The honesty rule

Every screen carries a transport badge — `LIVE` / `REPLAY` / `SIM` — and it is never
hidden, never subtle, never collapsible. Modelled figures carry a `MODELLED` chip.

This is not a compliance box. Volunteering "this number is computed, not measured" in front
of a judging panel reads as engineering maturity, and it pre-empts the question that
otherwise derails your demo.

---

## What is hardcoded

### 1. Device profile — `src/data/deviceProfile.ts`

```ts
export const DEVICE = {
  name: 'SeaNergy Payload v1 (air)',
  firmware: '0.4.2',
  transducer: {
    part: 'INGHAI GU1008C-40R',
    medium: 'air',
    fCentre: 40_000,
    usableBand: [36_000, 44_000] as const,
  },
  dac: { part: 'MCP4921', bits: 12, maxSps: 200_000 },
  battery: { cells: '3S 18650', capacityMah: 2600, nominalV: 11.1 },
  // the underwater target configuration, shown as "planned"
  target: { medium: 'water', band: [100_000, 500_000] as const },
} as const;
```

Note the honest structure: v1 is the 40 kHz air build you actually have parts for, and the
100–500 kHz water band is present but explicitly labelled as the target configuration.

### 2. Scenario presets — `src/data/scenarios.ts`

Four, using the problem statement's own vocabulary.

```ts
export const SCENARIOS = [
  { id: 'reef',    name: 'Clear Shallow Reef', temp: 28.5, tds: 34.8, turbidity:   12, depth:  8 },
  { id: 'coastal', name: 'Coastal',            temp: 26.0, tds: 33.1, turbidity:  180, depth: 25 },
  { id: 'estuary', name: 'Muddy Estuary',      temp: 24.2, tds: 12.4, turbidity:  740, depth:  6 },
  { id: 'deep',    name: 'Deep Water',         temp:  6.8, tds: 34.9, turbidity:    5, depth: 220 },
] as const;
```

One tap loads a scenario into the environment state; the adaptation engine then runs for
real against it. The *inputs* are canned, the *decision* is genuine.

### 3. Explanation templates — `src/data/explainTemplates.ts`

The "Why this waveform" paragraph is templated with slots, then filled from live values.

```ts
export const TEMPLATES = {
  highTurbidity: (v: Slots) =>
    `Turbidity is high (${v.turbidity} NTU). High frequencies scatter in suspended ` +
    `sediment, so I lowered the centre frequency from ${v.fPrev} to ${v.fNow} and ` +
    `stretched the pulse to ${v.tau} ms to put the same energy in the water. ` +
    `Predicted range improves from ${v.rPrev} to ${v.rNow} m; resolution drops from ` +
    `${v.resPrev} to ${v.resNow} mm. In an estuary that is the right trade.`,

  clearWater: (v: Slots) => `...`,
  coldDeep:   (v: Slots) => `...`,
  lowSnr:     (v: Slots) => `...`,
  thermal:    (v: Slots) => `...`,
} as const;
```

Selection is a small rule ladder in `core/adaptation/explain.ts`. Five to eight templates
covers every state the demo will reach.

**This screen carries more weight per line of code than anything else in the app.** It is
what turns "the number changed" into "the system reasoned". Write the prose carefully.

### 4. The replay session — `src/data/replaySession.ts`

One recorded session, ~40 pings, scripted to tell the demo story in order:

| Pings | What happens |
|---|---|
| 1–5 | Clear conditions. 40 kHz, short pulse, tight correlation peak. |
| 6–12 | Turbidity ramps — someone is stirring clay in. Measured SNR falls below prediction. |
| 13–20 | System adapts: lower centre frequency, longer pulse. SNR recovers. |
| 21–30 | Salinity shifts; sound speed moves; range estimate corrects. |
| 31–40 | Cold and deep. Mode switches to phase-coded. |

Each record holds: timestamp offset, environment sample, chosen parameters, explanation key,
echo trace (downsampled), correlation result, power figures.

`ReplayTransport` walks this at real-time pace and emits the same events `BleTransport`
would. Nothing downstream can tell the difference — which is the whole point.

### 5. Reference constants

- Window peak-sidelobe levels: rect −13.3 dB, Hann −31.5 dB, Hamming −42.7 dB, Blackman −58 dB
- Barker-13 peak-to-sidelobe ratio 22.3 dB, compression ratio 13
- Sound speed in air 343 m/s, in water ~1500 m/s
- Absorption coefficient tables per band
- Pre-rendered "golden" spectrogram images per mode, as a fallback if Skia misbehaves

### 6. Power model — `src/core/power/model.ts`

No current sensor was ordered, so this is a model with stated assumptions:

```ts
export const POWER = {
  sleepMa: 0.9, idleMa: 12, samplingMa: 28, transmitMa: 340,
  computeMaDds: 4, computeMaNaive: 41,   // the DDS vs sinf() comparison
  assumptionsNote: 'Modelled from datasheet figures. Replace with INA226 measurements.',
} as const;
```

Every figure it produces renders with a `MODELLED` chip. When an INA226 arrives, the same
screen switches to `MEASURED` and nothing else changes.

---

## What is computed live

These run for real, on-device, from `src/core`:

| Computed | Why not hardcode it |
|---|---|
| Sound speed (Mackenzie) | Judges will move a slider and expect it to respond |
| Absorption (Thorp / Francois-Garrison) | The range-vs-resolution argument only lands if it is live |
| Waveform sample generation | The plot must match the parameters exactly |
| Windowing and its spectral effect | The A/B toggle is a demo beat |
| FFT / spectrogram | Same |
| Matched filter correlation | The compression result must follow from the actual pulse |
| Range resolution, TBP, predicted range | The calculator screen is pure maths and people love touching it |
| The adaptation decision itself | This is the project. Never fake it. |

**Never hardcode the adaptation decision.** If a judge sets turbidity high and the frequency
drops because a lookup table said so rather than because the model computed it, the entire
claim collapses under one follow-up question. The inputs may be canned; the reasoning must
be real.

---

## Fixture discipline

- All fixtures live in `src/data/` and nowhere else.
- Every fixture file starts with a comment saying what it stands in for and what would
  replace it.
- Fixtures are typed with the same types the transport emits, so swapping in real data is a
  compile-time-checked change, not a rewrite.
