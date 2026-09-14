# Build and flash

```powershell
cd 02-firmware/src
idf.py set-target esp32s3
idf.py build
idf.py -p COM5 flash monitor
```

Use `idf.py menuconfig`, enable `SeaNergy Firmware > Naive trigonometry A/B
build`, and rebuild only for the DDS comparison test. Normal releases keep it
disabled.
