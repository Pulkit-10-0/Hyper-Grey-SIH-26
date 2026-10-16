# Measurements for the current TX and RX

The imported projects have no new electrical, acoustic, timing, or power measurements from this repository update. Successful builds and host/synthetic tests are software verification only. Record the board, source commit, build environment, instrument settings and raw captures with future measurements.

For TX, follow [HARDWARE.md](../tx/HARDWARE.md), including PCM versus PWM output, burst timing, driver limits and actual current measurements. For RX, verify raw ADC word packing with a known input, calibrate amplitude, and establish the actual sample clock and DMA continuity before relying on the displayed FFT frequency. Capture TX timing and RX acquisition together before making any time-of-flight claim.

Earlier ESP-IDF measurement plans, model graphics, and the original sensor-session capture remain under [legacy/esp-idf-payload/measurements/](../legacy/esp-idf-payload/measurements/). Their numbers and GPIO assignments are historical and do not verify the new firmware.
