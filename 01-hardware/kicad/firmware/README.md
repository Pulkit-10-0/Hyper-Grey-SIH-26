# ESP32-S3 firmware for PCB revisions A and B

`ESP32-S3/` contains the same source copy supplied with revision A, also used by the compact revision B PCB, and its original PlatformIO configuration. The source comments still say Rev A because the electrical divider circuit is unchanged. Your source project is untouched. Only the TDS and turbidity voltage calculations are multiplied by 2, because the PCB divides those sensor voltages by 2 before ADS1115 #1. The three potentiometer calculations are unchanged.

Open `ESP32-S3/` as a separate PlatformIO project, or review `main_cpp_sensor_dividers.patch` and apply its two changes to a separate copy of your own source. Do not also multiply the voltage elsewhere: that would compensate twice. Recalibrate sensor conversions against known reference measurements; this change reports the sensor's original output voltage, not ppm or NTU.

The retained configuration names `esp32-s3-devkitc-1`, as your supplied source does. That does not establish your physical board model. Confirm the build target matches your actual board before uploading. The original dependency URLs and versions were retained. The source change was checked by exact diff and arithmetic; it has not been compiled or tested on hardware as part of this copy operation.

The RX ESP32 firmware remains your existing GPIO34 capture firmware; this board does not require a changed RX GPIO. Its nominal sampling target is 200 ksample/s, but use the actual sample-rate value reported by the capture when analyzing a waveform. The source still generates continuous 40 kHz TX and the 1 kHz audible test tone; the PCB does not introduce a trigger or synchronization link between the controllers.
