# Instrument settings by test

Document ID: HW-BENCH-003

| Test ID | Test | Scope / analyser settings | Source / power settings | Acceptance |
|---|---|---|---|---|
| PWR-001 | Rail bring-up | DC coupling, 20 MHz limit, 1 MSa/s, 100 ms/div | 9.0 V, 100 mA limit | +5V and +3V3 within +/-2% |
| TX-001 | DAC ramp | 10x probe, 1 MSa/s, 2 ms/div, 1 V/div | 1 kHz, full code ramp | 0.10-4.90 V, no missing visible code |
| TX-002 | Design LFM | 10x probe, 10 MSa/s, 500 us/div, 1 V/div, rising trigger 2.5 V | 165.825-235.000 kHz, 3.476 ms, 1 Hz first | Frequency endpoints +/-2% |
| TX-003 | THD | 10 MSa/s, >=64k record, Hann, 16 averages | Single tone at 50%, 75% and 90% amplitude | Finished target THD <=1.0% |
| TX-004 | SFDR | 10 MSa/s, >=64k record, Blackman-Harris preferred | Tone at centre frequency | Finished target SFDR >=55 dBc |
| FIL-001 | LPF sweep | Ch1 input, Ch2 output, 20 MHz limit | 100 mVrms, 10-500 kHz, 100 log points | Ripple <1 dB; fc 400 kHz +/-10% target |
| PZT-001 | Impedance | 100 points/decade, 1 Vrms maximum | 10-80 kHz for GU1008; wider for finished PZT | Save R, X, magnitude and phase CSV |
| WTR-001 | Tank echo | 10 MSa/s, 2 ms/div for 40 kHz, 16 averages | 10-cycle burst, 1 Hz, lowest safe drive first | Echo delay repeatability <=2 samples |
| PWR-002 | Ping energy | INA226 >=2 kSa/s plus scope trigger | 10 s interval; 100 pings | Measured energy repeatability <=10% |

## Trigger and file naming

Trigger from DAC_CS or TX_GATE, never from a noisy received echo for the first capture. Use `TESTID_YYYYMMDD_unitNN_condition_runNN.csv` and save one uncropped screenshot containing scales, trigger, sample rate and channel names.

## Ambient noise floor

With the driver disabled and receiver connected, acquire 10 seconds at the test gain. Report integrated and spectral noise. Planning target: receiver output below -70 dBVrms over 10-400 kHz. Current result: NOT MEASURED.
