# 00 — What the build actually did differently

The other files in `docs/` are the **original plan**, written before any code existed.
They are kept because the reasoning in them is still useful. This file records where
the finished app deliberately diverges, so the two never contradict each other silently.

Read `../README.md` for what the app actually is.

---

## Dropped entirely

**Bluetooth, and the whole transport abstraction.**
The requirement became "it must run without connecting to anything". So there is no
`react-native-ble-plx`, no GATT layer, no scan/pair flow, no permission handling. The
app runs a live physics engine on the device instead. `docs/06-ble-protocol.md` is
therefore a **firmware-side specification only** — it is a perfectly good GATT contract
to hand to whoever writes the ESP32 firmware, and the app can grow a `BleTransport`
later without touching a screen, but nothing in the shipped app uses it.

**Every LIVE / REPLAY / SIM / MODELLED badge.**
The plan proposed labelling data provenance everywhere. That was dropped: the app is
one coherent product, not a demo wrapper around canned data, and the badges implied a
distinction that no longer exists now that everything is computed live.

**Zustand.**
It would not install — Expo SDK 57 ships a devtools tree whose `react-dom` peer range
conflicts with the app's pinned React. Rather than fight it, state uses React 19's own
`useSyncExternalStore` with a ~40-line selector helper (`src/core/useEngine.ts`). Fewer
dependencies, no version conflict, and it is the correct primitive for subscribing to
an external engine.

**FlashList, react-native-keyboard-controller.**
FlashList: a plain `FlatList` with `getItemLayout` handles the log's few hundred rows
without another native dependency. Keyboard controller: unnecessary, because —

**Every TextInput.**
There is no text entry anywhere in the app. Sliders, chips, segmented controls and
toggles only. This removes the entire class of keyboard-overlap, IME-inset and
input-clipping bugs rather than managing them.

---

## Changed

**Default medium is water, not air.**
The plan framed v1 around the 40 kHz air transducer pair actually in hand. The app
defaults to the underwater 100–500 kHz configuration instead, because that is the band
the problem statement specifies and where the adaptation is most visible. Air remains
selectable in Settings and uses the same engine with different constants.

**The air band is narrow, and that is the honest answer.**
The GU1008C-40R pair is narrowband, so the air configuration is 28–52 kHz and shows
limited frequency agility. That is a real property of the hardware, not a modelling
shortcut, and it is worth saying out loud: broadband frequency agility needs a
broadband transducer.

**Skia is used for plots, but gauges are plain views.**
A gauge updating five times a second does not need a GPU canvas. Skia is reserved for
the signal plots and the spectrogram, where it earns its place.

**Traces are rendered at bounded scale.**
Reported figures — bandwidth, time-bandwidth product, compression gain, resolution —
are computed analytically from the real parameters and are exact. The A-scan and
correlation *traces* are synthesised at a bounded sample count so plot cost stays
constant at any bandwidth. The shape and relative sidelobe structure are correct;
the sample count is not tied to the real sample rate. This is noted in the header
comment of `src/core/engine.ts`.

---

## Added, not in the plan

**`src/core/__verify__.ts`** — 85 assertions run by `npm run verify`, covering the
physics against published values, the DSP against analytic results, and a full
headless smoke test of the engine (every waveform mode, every window, both media,
manual override, and closed-loop convergence).

Two real bugs were caught by writing it:

1. **Rising turbidity did not lower the centre frequency** — the optimiser maximised
   bandwidth without any margin requirement, so the widest mid-band candidate always
   won regardless of conditions. Fixed by demanding a design margin that grows with
   environmental uncertainty.
2. **The closed loop ran to its clamp instead of converging** — the simulated
   measurement moved with the correction, so the gap could never close. Fixed by
   deriving the true echo strength from the *uncorrected* prediction, which is what
   makes the loop actually settle.

**A self-contained toolchain in `.toolchain/`** — Node 22, JDK 17 and the Android SDK
all live inside the project folder. Nothing was installed on the system drive, and
deleting `SeaNergy/` removes every trace.
