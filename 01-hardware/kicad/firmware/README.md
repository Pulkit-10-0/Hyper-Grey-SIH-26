# ESP32-S3 firmware for PCB revisions A and B

> **Historical board companion.** This source and divider patch are retained with the PCB snapshot for traceability. The current firmware is [ESP32-S3 TX](../../../02-firmware/tx/) and [ESP32 RX](../../../02-firmware/rx/). Review the [current wiring and protocol differences](../../../02-firmware/docs/architecture.md) before using the imported projects with this board. The following notes describe the original companion sketch.

[ESP32-S3/](ESP32-S3/README.md) retains the AUV V3 board companion sketch and its PlatformIO configuration. Its Rev A references concern the preceding AUV V3 layout. The TDS and turbidity voltage calculations multiply the ADC node voltage by 2 because the PCB divides those sensor voltages by 2 before ADS1115 #1. The three potentiometer calculations are unchanged.

[main_cpp_sensor_dividers.patch](main_cpp_sensor_dividers.patch) and [source_change_record.json](source_change_record.json) record the original packaging change. Their hashes describe that recorded snapshot; they are not a fresh hash check of the current checkout.

Open `ESP32-S3/` as a separate PlatformIO project, or review `main_cpp_sensor_dividers.patch` and apply its two changes to a separate copy of your own source. Do not also multiply the voltage elsewhere: that would compensate twice. Recalibrate sensor conversions against known reference measurements; this change reports the sensor's original output voltage, not ppm or NTU.

The retained configuration names `esp32-s3-devkitc-1`, as your supplied source does. That does not establish your physical board model. Confirm the build target matches your actual board before uploading. The original dependency URLs and versions were retained. The source change was checked by exact diff and arithmetic; it has not been compiled or tested on hardware as part of this copy operation.

The RX ESP32 firmware remains your existing GPIO34 capture firmware; this board does not require a changed RX GPIO. Its nominal sampling target is 200 ksample/s. The current RX host script reports a read-interval estimate of the rate; ADC word decoding and sample-clock verification remain unresolved, so do not treat that estimate as a calibrated clock measurement. The source still generates continuous 40 kHz TX and the 1 kHz audible test tone; the PCB does not introduce a trigger or synchronization link between the controllers.
