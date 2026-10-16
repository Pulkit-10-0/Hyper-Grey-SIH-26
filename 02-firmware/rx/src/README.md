# ESP32 receiver source

[main.cpp](main.cpp) contains the classic ESP32 GPIO34/ADC1 capture setup, legacy I2S DMA reads and ASCII serial frame output. Build through [platformio.ini](../platformio.ini), starting from the [RX guide](../README.md).

The source requests 200 ksample/s and collects 4,096 samples per frame. The host [waveform/FFT viewer](../seanergy_rx_live.py) consumes those serial frames for standalone receive analysis. The RX guide documents ADC word decoding and elapsed-read timing alongside the configured sample rate.
