# Console charts

[Plot.tsx](Plot.tsx) renders reusable Skia plots and axes; [Ppi.tsx](Ppi.tsx) draws the plan-position display; [Spectrogram.tsx](Spectrogram.tsx) maps waveform energy into a time/frequency image.

These components render data supplied by the [engine and DSP layer](../core/README.md). Keep numerical calculations, telemetry decoding and units in that layer; chart appearance alone cannot establish that a trace is a live measurement. Preserve simulation/telemetry labels in the containing screen.

Use the [screen render tests](../../__tests__/README.md) for UI regressions and inspect plots on a device for sizing and drawing performance.
