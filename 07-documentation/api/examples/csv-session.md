# CSV session example

This conforming row uses the exact header written by `buildCsv()`. It is derived
from the default Underwater Coastal constants and their current solver result:
26.00 degree C, 33.10 ppt, 180.0 NTU, 25.00 m, 350.6667 kHz centre,
298.6667 kHz bandwidth, 0.500 ms duration and 0.920 amplitude. For a schema-only
round trip, measured SNR is set equal to the derived 28.29 dB prediction and
measured range is set equal to the 220.0000 m design range, giving 0.00 dB error.
These assignments are not validation results.

```csv
ping,timestamp,medium,temp_c,salinity_ppt,turbidity_ntu,depth_m,mode,window,f_centre_hz,bandwidth_hz,pulse_s,amplitude,tbp,compression_gain_db,resolution_m,predicted_snr_db,measured_snr_db,error_db,target_range_m,measured_range_m,peak_to_sidelobe_db,energy_mj
1,2026-09-10T00:00:00.000Z,water,26.00,33.10,180.0,25.00,LFM,hamming,350666.7,298666.7,0.000500,0.920,149.3,21.74,0.00257,28.29,28.29,0.00,220.0000,220.0000,22.30,5.5767
```

An importer should compare the full header, parse numeric columns with a
locale-independent decimal point, treat an empty numeric field as missing, and
retain `timestamp` as UTC.
