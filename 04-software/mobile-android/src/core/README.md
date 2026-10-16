# Numerical core and console runtime

The acoustic and DSP modules are implemented in TypeScript. This folder also contains the runtime, React hooks and platform adapters, so only the numerical subset is platform-independent.

| Files | Responsibility |
|---|---|
| [physics.ts](physics.ts) | Sound speed, absorption, scattering, sonar link budget and range/resolution calculations |
| [adaptation.ts](adaptation.ts) and [explain.ts](explain.ts) | Candidate search and an explanation of the selected waveform |
| [dsp.ts](dsp.ts) | CW/chirp/Barker synthesis, windows, FFT, spectrogram and correlation |
| [power.ts](power.ts) | Component-based power and endurance estimates |
| [engine.ts](engine.ts) | Simulation state, ping records, modelled echo feedback and telemetry ingestion |
| [protocol.ts](protocol.ts), [link.ts](link.ts), [nativeLink.ts](nativeLink.ts) | NDJSON decoding/framing, transports and the Android native bridge |
| [useEngine.ts](useEngine.ts) and [useLink.ts](useLink.ts) | React external-store subscriptions |
| [exportCsv.ts](exportCsv.ts) and [sonify.ts](sonify.ts) | Expo file sharing and audible waveform demonstration |
| [__verify__.ts](__verify__.ts) | Numerical, protocol and engine assertions run by `npm run verify` |

Internal calculations use Hz, metres, seconds, degrees Celsius, salinity in ppt and absorption in dB/metre; convert at the display boundary. Simulation feedback uses a generated echo, and power values use a model. Neither is a measured bench result.

The app's [NDJSON protocol](../../docs/11-link-protocol.md) is not implemented by the repository's current TX/RX firmware. Android USB/BLE clients also depend on the local native module; iOS has shared Wi-Fi client source only. Run `npm run check` at the app root after changing these modules.
