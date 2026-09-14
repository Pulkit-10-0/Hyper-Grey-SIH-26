# Scope and FFT settings

- Analog bandwidth: 100 MHz; 20 MHz bandwidth limit for power-rail captures.
- Sampling: 10 MSa/s for spectra, 1 GSa/s for timing edges.
- Record length: 262,144 samples for FFT analysis.
- Input: 10x probe, 1 Mohm, DC coupling; fixed probe and ground spring.
- FFT: amplitude-corrected Blackman-Harris analysis window unless the window under test defines the record.
- Timing: single-shot trigger on GPIO 3 rising edge; GPIO 2 on the same timebase.
