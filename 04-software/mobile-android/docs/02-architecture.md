# 02 — Architecture

## The one decision everything else follows from

**The app talks to a `Transport` interface, never to Bluetooth.**

```ts
// src/transport/Transport.ts
export interface Transport {
  readonly kind: 'replay' | 'ble' | 'sim';
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onTelemetry(cb: (t: Telemetry) => void): () => void;   // returns unsubscribe
  onEcho(cb: (e: EchoFrame) => void): () => void;
  send(cmd: Command): Promise<void>;
  status(): ConnectionStatus;
}
```

Three implementations, all interchangeable:

| Implementation | Purpose |
|---|---|
| `ReplayTransport` | Plays a canned recorded session from a fixture file. **The demo safety net.** |
| `SimTransport` | Runs the physics model live against synthetic inputs. Responds to commands like real hardware would. Lets you develop adaptation logic with no device. |
| `BleTransport` | The real thing. Written last, swapped in without touching a single screen. |

Why this matters:

1. **The entire app is buildable and demoable before the hardware exists.** You are not blocked on firmware.
2. **If the payload dies at the judging table, you switch transport and keep going.**
3. Screens have zero knowledge of Bluetooth, so they stay simple and testable.

The transport is selected in one place and exposed through a provider. Switching it at
runtime is a two-tap action in Settings, and the header badge changes to match.

---

## Folder layout

```
SeaNergy/
├── app/                          # expo-router — routes only, thin
│   ├── _layout.tsx               # providers: SafeArea, Keyboard, Gesture, Transport
│   ├── (tabs)/
│   │   ├── _layout.tsx           # tab bar
│   │   ├── index.tsx             # Console
│   │   ├── waveform.tsx
│   │   ├── echo.tsx
│   │   ├── power.tsx
│   │   └── log.tsx
│   ├── connect.tsx               # modal — device picker
│   ├── scenario.tsx              # modal — scenario presets
│   ├── settings.tsx              # modal
│   └── ping/[id].tsx             # ping detail
│
├── src/
│   ├── core/                     # PURE TypeScript. No React, no RN imports.
│   │   ├── physics/
│   │   │   ├── soundSpeed.ts     # Mackenzie
│   │   │   ├── absorption.ts     # Thorp, Francois-Garrison
│   │   │   ├── sonarEquation.ts
│   │   │   └── resolution.ts     # c/2B, c*tau/2, TBP
│   │   ├── dsp/
│   │   │   ├── waveform.ts       # LFM / geometric / Barker sample generation
│   │   │   ├── windows.ts        # rect / hann / hamming / blackman + PSL table
│   │   │   ├── fft.ts            # radix-2, for the spectrogram
│   │   │   └── matchedFilter.ts  # correlation + peak find
│   │   ├── adaptation/
│   │   │   ├── select.ts         # environment -> waveform parameters
│   │   │   └── explain.ts        # parameters + environment -> English paragraph
│   │   └── power/
│   │       └── model.ts          # energy per ping, endurance
│   │
│   ├── transport/
│   │   ├── Transport.ts          # the interface
│   │   ├── ReplayTransport.ts
│   │   ├── SimTransport.ts
│   │   ├── BleTransport.ts
│   │   └── codec.ts              # binary pack/unpack, shared with firmware spec
│   │
│   ├── data/                     # HARDCODED fixtures
│   │   ├── scenarios.ts
│   │   ├── replaySession.ts
│   │   ├── deviceProfile.ts
│   │   └── explainTemplates.ts
│   │
│   ├── store/                    # zustand slices
│   │   ├── useConnection.ts
│   │   ├── useTelemetry.ts
│   │   ├── useWaveform.ts
│   │   ├── usePower.ts
│   │   └── useLog.ts
│   │
│   ├── ui/                       # design system
│   │   ├── tokens.ts             # colour, spacing, type, radius — single source
│   │   ├── Screen.tsx            # THE layout primitive. See doc 04.
│   │   ├── Text.tsx  Card.tsx  Button.tsx  Badge.tsx
│   │   ├── Gauge.tsx  Segmented.tsx  Slider.tsx  StatRow.tsx
│   │   └── EmptyState.tsx
│   │
│   └── charts/                   # Skia
│       ├── WaveformPlot.tsx
│       ├── Spectrogram.tsx
│       ├── AScan.tsx
│       ├── CorrelationPlot.tsx
│       └── Sparkline.tsx
│
├── assets/
├── docs/
└── eas.json
```

**Rule: `src/core` never imports from React or React Native.** It is plain TypeScript, it
runs under `node`, and it is unit-tested with `jest`. This is what makes the physics
trustworthy and what lets you print real numbers in the report.

---

## State model

Five zustand slices, each with a narrow job.

```ts
useConnection   // transport kind, status, device id, fw version, rssi, mode (deck|mission)
useTelemetry    // latest environment sample + a ring buffer of the last N
useWaveform     // active parameters, mode, window, auto|manual, last decision + explanation
usePower        // instantaneous, per-ping energy, endurance estimate, MODELLED flag
useLog          // ping records, selected id, export state
```

Two rules that keep it fast:

1. **Always select narrowly.** `useTelemetry(s => s.latest.turbidity)`, never
   `useTelemetry()`. A telemetry tick should re-render one gauge, not the screen.
2. **High-rate values do not go through the store.** Anything updating faster than about
   10 Hz (a live trace, a needle) is written to a Reanimated `SharedValue` and read on the
   UI thread. The store holds the 5 Hz summary that React needs.

---

## Data flow, one ping

```
  Transport.onTelemetry ──> useTelemetry.push()
                                    │
                                    ▼
                       adaptation/select.ts  (pure)
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
          useWaveform.setParams()        adaptation/explain.ts  (pure)
                    │                               │
                    ▼                               ▼
       dsp/waveform.ts generates samples     "Why this waveform" text
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
   WaveformPlot (Skia)   Transport.send({fire})
                                    │
                                    ▼
                          Transport.onEcho ──> matchedFilter ──> range, gain
                                    │
                                    ▼
                            useLog.append(record)
```

Every box on the left of `Transport.send` runs with or without hardware. That is the point.

---

## Testing

- `src/core/**` — jest unit tests. Assert Mackenzie against published values, assert
  Barker-13 autocorrelation gives a 22.3 dB peak-to-sidelobe ratio, assert window PSLs.
  These tests double as evidence in the report.
- Screens — no test framework needed for a hackathon. The QA checklist in doc 10 is the
  substitute, and it is a manual list you actually run.
