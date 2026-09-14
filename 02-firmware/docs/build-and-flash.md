# Build, flash and release

## Connected build

```powershell
cd D:\sih-2026\Hyper-Grey-SIH-26\02-firmware\src
idf.py set-target esp32s3
idf.py build
idf.py -p COM5 flash
idf.py -p COM5 monitor
```

Expected serial banner: `SeaNergy payload ready`. Replace `COM5` with the
port shown by Windows Device Manager.

## Offline flash station

Copy these four files from a release bundle to the offline computer:

| Address | File |
|---:|---|
| `0x0000` | `bootloader/bootloader.bin` |
| `0x8000` | `partition_table/partition-table.bin` |
| `0x10000` | `seanergy_payload.bin` |
| n/a | `flash_args` |

```powershell
python -m esptool --chip esp32s3 --port COM5 --baud 460800 `
  write_flash 0x0000 bootloader.bin 0x8000 partition-table.bin `
  0x10000 seanergy_payload.bin
```

## Release gates

1. Normal build has naive trigonometry disabled.
2. `idf.py size-components` confirms both waveform buffers in internal SRAM.
3. GATT packet vectors pass against the mobile decoder.
4. Scope captures prove DMA envelope, CPU idle and adaptation latency.
5. INA226 CSV records sleep, idle, sampling and transmit states.
6. SHA-256 hashes, ESP-IDF version, board revision and source commit are added to the release manifest.
