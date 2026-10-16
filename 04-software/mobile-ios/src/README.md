# Shared application source

| Folder | Responsibility |
|---|---|
| [core](core/README.md) | Acoustic models, candidate search, waveform/echo DSP, engine, telemetry and platform adapters |
| [charts](charts/README.md) | Skia plot, PPI and spectrogram rendering |
| [ui](ui/README.md) | Screen containers, controls, formatting and design tokens |
| [data](data/README.md) | Named simulation environments |

[Routes](../app/README.md) compose this layer into screens. The app source is mirrored between Android and iOS; keep shared behaviour aligned when making changes.

Use `npm run check` from the app root. The software gate covers numerical reference values, DSP, protocol handling, engine behaviour and screen rendering.
