# Operator tab screens

[_layout.tsx](_layout.tsx) defines the scrollable eleven-tab strip and safe-area handling.

| Route | Purpose |
|---|---|
| [index.tsx](index.tsx) | Console: current decision, mode and ping controls |
| [env.tsx](env.tsx) | Environment inputs and derived acoustic quantities |
| [wave.tsx](wave.tsx) | Waveform, envelope, window and sonification controls |
| [sonar.tsx](sonar.tsx) | PPI-style display and contacts |
| [spec.tsx](spec.tsx) | Spectrum, frequency track and spectrogram |
| [echo.tsx](echo.tsx) | Echo and matched-filter visualisation |
| [power.tsx](power.tsx) | Modelled ping energy and duty cycle |
| [mission.tsx](mission.tsx) | Modelled endurance and coverage |
| [diag.tsx](diag.tsx) | Software checks and link diagnostics |
| [log.tsx](log.tsx) | Ping history and CSV export |
| [settings.tsx](settings.tsx) | Mode, medium and telemetry configuration |

The separate [Scenario screen](../scenario.tsx) makes twelve primary screens; [ping detail](../ping/README.md) is an additional record view. Simulation plots display outputs computed by the handset model; telemetry screens display records supplied by a compatible endpoint.
