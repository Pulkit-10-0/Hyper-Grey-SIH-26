# ESP32-S3 firmware for PCB revisions A and B

> **Historical board companion.** This source and divider patch are retained with the PCB snapshot for traceability. The current firmware is [ESP32-S3 TX](../../../02-firmware/tx/) and [ESP32 RX](../../../02-firmware/rx/). Review the [current wiring and protocol differences](../../../02-firmware/docs/architecture.md) before using the imported projects with this board. The following notes describe the original companion sketch.

[ESP32-S3/](ESP32-S3/README.md) retains the AUV V3 board companion sketch and its PlatformIO configuration. Its Rev A references concern the preceding AUV V3 layout. The TDS and turbidity voltage calculations multiply the ADC node voltage by 2 because the PCB divides those sensor voltages by 2 before ADS1115 #1. The three potentiometer calculations are unchanged.

[main_cpp_sensor_dividers.patch](main_cpp_sensor_dividers.patch) and [source_change_record.json](source_change_record.json) record the original packaging change. Their hashes identify the recorded packaging snapshot.

Open `ESP32-S3/` as a separate PlatformIO project, or review `main_cpp_sensor_dividers.patch` and apply its two changes to a separate copy of your own source. Do not also multiply the voltage elsewhere: that would compensate twice. Use known reference measurements to calibrate any conversion from the reported sensor-output voltage to ppm or NTU.

The retained configuration targets `esp32-s3-devkitc-1` and preserves the original dependency URLs and versions. Confirm that target matches the physical board before uploading. The divider patch was checked by exact diff and arithmetic.

The RX ESP32 retains GPIO34 capture with a nominal 200 ksample/s target. The current host script reports a read-interval rate estimate for diagnostics. The historical companion generates continuous 40 kHz TX and a 1 kHz audible test tone; the two controllers operate independently.
