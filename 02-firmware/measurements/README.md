# TX and RX measurement procedures

This guide connects the firmware's software verification records with repeatable electrical capture procedures. The completed cross-build and host-test records are in the [TX](../tx/README.md#verification) and [RX](../rx/README.md#import-verification) guides.

For TX, follow [HARDWARE.md](../tx/HARDWARE.md) for PCM versus PWM output, burst timing, driver limits, and current measurements. For RX, use a known input to check ADC word packing, calibrate amplitude, and establish the sample clock and DMA continuity used by the FFT frequency axis. For timing comparisons, capture TX output and RX acquisition on the same time reference.

Each measurement record should include the board, source commit, build environment, instrument settings, calibration, and original captures. Keep software checks, synthetic analysis, and instrument measurements labelled by their source.

The [archived ESP-IDF measurement collection](../legacy/esp-idf-payload/measurements/) preserves its original analytical comparisons, model graphics, and sensor-session capture.
