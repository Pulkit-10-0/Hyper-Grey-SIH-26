# 06 — BLE protocol

Freeze this spec early. Once it exists, firmware and app can be built in parallel by
different people and meet in the middle without a rewrite.

## Roles

- **Peripheral** — ESP32-S3 payload. Advertises only in Deck mode.
- **Central** — SeaNergy on Android.

## Advertising

| Field | Value |
|---|---|
| Local name | `SEANERGY-<last 4 of MAC>` |
| Service UUID (advertised) | `5EA00001-...` (see below) |
| Interval | 100 ms while in Deck mode |
| Mission mode | **Advertising off, controller disabled.** Not just "not advertising" — the radio is powered down. This is the low-power claim. |

## Service and characteristics

Base UUID: `5EA0xxxx-4E45-5247-5900-53454153454E`
(the ASCII in there spells `NERGY` / `SEASEN` — cosmetic, but it makes packet captures
readable during debugging, which is worth something at 2am).

| Char | UUID short | Props | Size | Purpose |
|---|---|---|---|---|
| Device Info | `0002` | Read | 24 B | fw version, hw rev, transducer id, capability flags |
| Telemetry | `0003` | Notify | 20 B | environment + state, 5 Hz |
| Waveform | `0004` | Read, Notify | 20 B | active parameters; notifies on every change |
| Command | `0005` | Write | ≤20 B | fire, set mode, set params, enter mission |
| Echo | `0006` | Notify | ≤244 B | captured echo, chunked |
| Power | `0007` | Notify | 12 B | current, energy per ping, battery, 1 Hz |

Request an MTU of 247 on connect. Fall back to 23 gracefully — the Echo characteristic is
the only one that needs the larger MTU, and it can chunk smaller.

---

## Packet formats

All little-endian. Byte 0 of every packet is a **format version** so the app can refuse to
misparse an older firmware rather than showing wrong numbers.

### Telemetry (notify, 5 Hz)

```
off size type    field
 0    1   u8     version = 1
 1    1   u8     state      0=boot 1=idle 2=armed 3=sampling 4=transmitting 5=fault
 2    2   i16    tempC       x100      (-4000..12500)
 4    2   u16    tds         ppm
 6    2   u16    turbidity   NTU
 8    2   u16    depth       cm        (0 until a pressure sensor is fitted)
10    2   u16    pot0        raw 0..4095
12    2   u16    pot1        raw
14    2   u16    pot2        raw
16    1   u8     flags       bit0 auto/manual, bit1 fault, bit2 thermal, bit3 modelled
17    1   u8     seq         wraps, for drop detection
18    2   u16    crc16
```

### Waveform (read + notify on change)

```
 0    1   u8     version = 1
 1    1   u8     mode       0=CW 1=LFM 2=geometric 3=Barker13
 2    1   u8     window     0=rect 1=hann 2=hamming 3=blackman
 3    1   u8     amplitude  0..255 (percent of full scale x 2.55)
 4    4   u32    fStart     Hz
 8    4   u32    fStop      Hz
12    2   u16    tauUs      pulse duration, microseconds
14    2   u16    priMs      pulse repetition interval, ms
16    2   u16    sampleRate kSps
18    2   u16    crc16
```

### Command (write)

```
 0    1   u8     version = 1
 1    1   u8     opcode
 2..  n   payload
```

| Opcode | Name | Payload |
|---|---|---|
| `0x01` | FIRE | none |
| `0x02` | SET_MODE | u8 mode |
| `0x03` | SET_WINDOW | u8 window |
| `0x04` | SET_PARAMS | same layout as Waveform bytes 3..17 |
| `0x05` | SET_AUTO | u8 0=manual 1=auto |
| `0x06` | ENTER_MISSION | u32 magic `0x5EA0D1VE` — deliberately hard to send by accident |
| `0x07` | REQUEST_ECHO | u8 lastN |
| `0x08` | PING_SWEEP | u8 count — fire a burst, for the compare demo |

`ENTER_MISSION` needs a magic word because it kills the radio. Reconnecting means physically
power-cycling the payload, which you do not want to happen because someone brushed a button
during a demo.

### Echo (notify, chunked)

```
 0    1   u8     version = 1
 1    1   u8     chunkIndex
 2    1   u8     chunkTotal
 3    1   u8     format     0=int8 1=int12packed
 4    2   u16    sampleRateKsps
 6    2   u16    totalSamples
 8   ..   samples
```

Reassemble on `chunkIndex == chunkTotal - 1`. Time out and discard after 2 s.

### Power (notify, 1 Hz)

```
 0    1   u8     version = 1
 1    1   u8     flags      bit0 = MEASURED (INA226 present), else MODELLED
 2    2   u16    currentMa   x10
 4    2   u16    busMv
 6    2   u16    lastPingEnergyUj
 8    2   u16    batteryMv
10    2   u16    crc16
```

The `MEASURED` flag is what flips the Power screen's badge. Until an INA226 is fitted the
firmware sends `0`, and the app says `MODELLED`. No code change needed later.

---

## Connection lifecycle

```
scan ──> connect ──> requestMTU(247) ──> discover ──> read DeviceInfo
      ──> check version byte ──> subscribe Telemetry, Waveform, Power
      ──> read Waveform ──> UI ready
```

Handle these explicitly, because all of them will happen at least once during a demo:

| Event | Behaviour |
|---|---|
| Version mismatch | Refuse to parse. Banner: "Payload firmware 0.3 not supported, expected 0.4." Never guess. |
| Disconnect mid-session | Auto-reconnect three times with backoff, then offer to fall back to Replay in one tap. |
| Permission denied | Explain what is needed and why, with a button to app settings. Do not silently fail. |
| Bluetooth off | Detect and prompt, do not just show an empty scan list. |
| Notification gap (`seq` jump) | Count it, show it in the health panel. Do not interpolate silently. |

## Android permission notes

- Android 12+: `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT` at runtime.
- `ACCESS_FINE_LOCATION` is still needed for scanning on some OEM builds unless the scan
  permission declares `neverForLocation`.
- Ask **before** the first scan, with a rationale sheet. A permission dialog appearing
  unexplained mid-demo looks like a crash.

## Firmware-side note

Keep the whole GATT layer behind a compile-time flag. In Mission mode call
`esp_bt_controller_disable()` and `esp_wifi_stop()`, and prove the resulting drop on the
INA226 when you have one. That measurement is the payoff for the entire deck-console framing.
