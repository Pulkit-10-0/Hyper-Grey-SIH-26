# ESP32 receiver source

[main.cpp](main.cpp) contains the classic ESP32 GPIO34/ADC1 capture setup, legacy I2S DMA reads and ASCII serial frame output. Build it through [platformio.ini](../platformio.ini), starting from the [RX guide](../README.md); this directory is not a separate project.

The source requests 200 ksample/s and collects 4,096 samples. Requested rate, ADC word decoding and the elapsed-read rate estimate need physical verification. The program has no shared TX trigger, matched-filter ranging or mobile-app transport. The host [waveform/FFT viewer](../seanergy_rx_live.py) consumes its serial frames.
