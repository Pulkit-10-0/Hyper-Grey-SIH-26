# Console link protocol

This document defines SeaNergy console link protocol version `1`. It is the
contract between the **operator console** in
[`../../04-software/mobile-android/`](../../04-software/mobile-android/) and the
**bench payload**, an ESP32-S3 carrying the sensor stack.

It is not the same interface as [`ble-gatt.md`](ble-gatt.md). The two exist for
different reasons and the difference is deliberate; see
[Which link is which](#which-link-is-which) at the end of this document.

All records are **UTF-8 text**. A client must treat a record as text, not as a
binary structure. The parser is `src/core/protocol.ts` and every rule below is
asserted in `src/core/__verify__.ts`.

## Framing

| Rule | Value | Invalid-value behaviour |
|---|---|---|
| Encoding | UTF-8 | A byte sequence that is not valid UTF-8 fails JSON parsing and is counted as malformed |
| Record | One JSON object | A record that is not an object is discarded |
| Terminator | `\n` (LF, `0x0A`) | A record without one is held in the reassembly buffer until a terminator arrives |
| `\r` | Stripped before parsing | CRLF from a serial terminal is accepted and does not corrupt the record |
| Length prefix | None | Not applicable |
| Checksum | None | The transports below are already error-checked; a CRC here would be a second copy of a guarantee the link already gives |
| Maximum record | 512 B recommended | A record above that still parses over USB and Wi-Fi; over BLE it spans more than one notification and is reassembled |
| Buffer cap | 64 KiB | A stream with no terminator inside 64 KiB is treated as desynchronised and the buffer is dropped |

No transport delivers whole records. A USB bulk read returns whatever was in the
buffer; a BLE notification is cut at the MTU; an HTTP response is one record but
may omit the terminator. Reassembly happens in exactly one place, `LineAssembler`,
so a record split across two reads is handled once rather than three times.

## Record types

The `t` field selects the type. An unrecognised `t` is ignored without error, so
a payload may emit records this version does not define.

| `t` | Name | Direction |
|---|---|---|
| `tlm` | Telemetry | Payload to console |
| `id` | Identity | Payload to console, once on connect |
| `cmd` | Command | Console to payload |

## Telemetry record

Sent once per ping, or at a fixed rate between 1 and 10 Hz.

```json
{"t":"tlm","seq":1841,"ms":582103,"st":"tx","temp":26.4,"sal":34.8,"ntu":180,"dep":25.3,"ph":8.05,"fc":350667,"bw":298667,"tau":500,"amp":0.92,"snr":28.4,"ma":68.0,"mv":3712,"flt":[]}
```

| Key | Field | Type | Unit | Scale | Valid range | Absent or invalid |
|---|---|---|---|---|---|---|
| `t` | Record type | string | — | — | `"tlm"` | Record is not telemetry |
| `seq` | Sequence | integer | count | 1 | `0` upward, monotonic | Defaults `0`; the console uses gaps to count drops, so a non-monotonic value costs that diagnostic and nothing else |
| `ms` | Uptime | integer | ms | 1 | `0` to `2^32-1`, wrapping | Defaults `0` |
| `st` | State | string | enum | — | `boot` `idle` `armed` `sampling` `tx` `fault` | Unknown value is preserved and displayed raw, never inferred. Aliases `ready`, `arm`, `sample`, `transmitting` are accepted |
| `temp` | Temperature | number | °C | 1 | `-5` to `40` | Defaults `20`; the solver runs on the default rather than stalling |
| `sal` | Salinity | number | ppt | 1 | `0` to `45` | Defaults `35` |
| `ntu` | Turbidity | number | NTU | 1 | `0` to `3000` | Defaults `0` |
| `dep` | Depth | number | m | 1 | `0` to `6000` | Defaults `0`, which is the surface and the weakest pressure correction |
| `ph` | pH | number | pH | 1 | `0` to `14`; sea water is `7.4` to `8.6` | Defaults `8.1`. The console warns outside the sea-water band rather than rejecting |
| `fc` | Centre frequency | integer | Hz | 1 | `1000` upward | `0` means not transmitting; the console then shows its own solve |
| `bw` | Bandwidth | integer | Hz | 1 | `0` upward | `0` means an unswept (CW) pulse, and resolution is computed as `c·tau/2` instead of `c/2B` |
| `tau` | Pulse duration | integer | **µs** | 1 | `50` to `50000` | `0` suppresses the parameter override entirely. **This field is microseconds and the console works in seconds**; a millisecond value here scales the time-bandwidth product by 10^3 and the reported compression gain by 30 dB |
| `amp` | Drive amplitude | number | — | 1 | `0.0` to `1.0` | `0` leaves the console's own amplitude in place. A percentage here is out of range and will be treated as full scale |
| `snr` | Predicted echo SNR | number | dB | 1 | any | `0` means the payload has no estimate and the console computes one from the sonar equation |
| `ma` | Supply current | number | mA | 1 | `0` upward | Defaults `0`, displayed as unavailable |
| `mv` | Bus voltage | integer | mV | 1 | `0` upward | Defaults `0`, displayed as unavailable |
| `flt` | Active faults | array of strings | — | — | `[]` when healthy | A non-array is treated as no faults. Strings are free-form and displayed verbatim |

Unknown keys are ignored. A payload that has not wired up every sensor still
streams and the console still draws, using the defaults above — which is why
each default is a plausible value and not a sentinel.

## Identity record

Sent once when a transport opens, in answer to the `hello` command.

```json
{"t":"id","name":"SEANERGY-4F2A","fw":"1.0.0","proto":1}
```

| Key | Field | Type | Valid value | Invalid-value behaviour |
|---|---|---|---|---|
| `name` | Payload name | string | Convention `SEANERGY-XXXX` | Displayed verbatim; no rule is enforced |
| `fw` | Firmware version | string | any | Displayed verbatim |
| `proto` | Protocol version | integer | **must be `1`** | **The link is closed** and the reason is shown on screen. A version mismatch is never guessed at or downgraded |

## Command record

Console to payload. **Optional on the payload side**: the link is useful one-way,
so a payload that ignores commands is still fully supported and the console stays
usable.

```json
{"t":"cmd","c":"hello"}
{"t":"cmd","c":"ping"}
{"t":"cmd","c":"rate","v":2.0}
{"t":"cmd","c":"mode","v":"lfm"}
{"t":"cmd","c":"stop"}
```

| `c` | Argument `v` | Meaning |
|---|---|---|
| `hello` | none | Sent automatically as soon as a transport opens. Answer with the identity record |
| `ping` | none | Transmit one pulse now |
| `rate` | number, Hz | Set the telemetry rate, 1 to 10 |
| `mode` | string | `cw` `lfm` `geometric` `barker13` |
| `stop` | none | Stop transmitting |

Every command ends with `\n`, because that is the frame boundary in both
directions.

## Transports

The wire format is identical on all three. The console's screens never learn
which one delivered a reading.

### 1. USB-C to USB-C

| Item | Value |
|---|---|
| Port | The board's **native** USB port, not the UART bridge port |
| ESP32-S3 pins | GPIO19, GPIO20 |
| Class | CDC-ACM |
| Vendor ID | `0x303A` (Espressif) |
| Bridge fallback | CP210x is also opened; its baud is set to 921600 |
| Baud on native USB | Ignored — the port runs at USB speed |

The phone supplies VBUS, so the payload runs off the phone. If the payload draws
more than about 500 mA while transmitting, power it separately and use a cable
that does not carry VBUS from the phone, or the phone will drop the port
mid-ping.

### 2. Wi-Fi

| Item | Value |
|---|---|
| Mode | The payload raises its own SoftAP, channel 6 |
| SSID | `SEANERGY-XXXX`, where `XXXX` is the last two bytes of the station MAC in uppercase hex |
| Password | `seanergy2026`, WPA2 |
| Address | `192.168.4.1` |
| Primary | WebSocket, `ws://<host>:81/telemetry`, text frames |
| Fallback | `GET http://<host>/telemetry`, polled at 500 ms, one record per response |
| Fallback trigger | The WebSocket did not open within 2500 ms |
| Commands on fallback | `POST http://<host>/cmd`, body is the command record. Optional |

**A WebSocket library is not required.** The fallback is automatic and needs only
`WebServer.h` from the ESP32 Arduino core. The operator does not choose between
them; the status line reports which one the link settled on.

The SSID rule is shared with Bluetooth on purpose: one naming convention covers
both radios, and deriving `XXXX` from the MAC rather than a build constant makes
two payloads on one bench distinguishable with no configuration step.

### 3. Bluetooth LE

| Item | Value |
|---|---|
| Advertised name | `SEANERGY-XXXX`, same rule as the SSID |
| Scan filter | Name prefix `SEANERGY-`, **case-insensitive** |
| Service | Nordic UART Service, `6e400001-b5a3-f393-e0a9-e50e24dcca9e` |
| Payload to console | `6e400003-…`, notify |
| Console to payload | `6e400002-…`, write |
| MTU | Request 185 so one record fits one notification |
| Fallback | If the payload advertises its own UUIDs, the console subscribes to the first notifying characteristic it finds |

Because the prefix match ignores case, a payload advertising `SeaNergy-26058`
is found by this scanner too.

## Which link is which

Two link layers exist in this project and they are not competing designs.

| | [`ble-gatt.md`](ble-gatt.md) | This document |
|---|---|---|
| Speaks to | The flight firmware, `02-firmware/src/components/link/link.cpp` | The bench payload, an ESP32-S3 |
| Encoding | Binary, little-endian, fixed 20 B and 48 B packets | UTF-8 text, newline-delimited JSON |
| Integrity | CRC-16/CCITT-FALSE on every packet | None; the transports supply it |
| Transports | BLE only, custom GATT service | USB-C, Wi-Fi, BLE over Nordic UART |
| Optimised for | Airtime and power on a battery the mission depends on | Being implementable in an afternoon by whoever is holding the firmware |
| Field extension | Requires a version bump; offsets are frozen | Add a key; old consoles ignore it |

The binary protocol is what a power-constrained flight payload should speak: 48
bytes with a CRC costs a fraction of the airtime and battery that 250 bytes of
JSON does, and on a vehicle that has to come back, that is the right trade.

The text protocol is what a bench payload should speak, for the opposite reason.
The sensor stack is on mains power beside a laptop, the constraint is how fast a
person can make the firmware emit something correct, and a line of JSON can be
read by eye in a serial monitor when it is wrong. A CRC would add a second copy
of a guarantee USB, TCP and BLE each already provide.

Both refuse a version mismatch outright rather than guessing, which is the one
rule they share and the one that matters most.

A worked example of building and parsing these records is in
[`examples/console-link.md`](examples/console-link.md). The firmware-facing
version of this specification, with the ESP32 code to emit it, is
[`../../04-software/mobile-android/docs/11-link-protocol.md`](../../04-software/mobile-android/docs/11-link-protocol.md).
