# BLE GATT protocol

This document defines SeaNergy BLE GATT protocol version `1`. It is the client
contract for the payload firmware in `02-firmware/src/components/link/link.cpp`.
All multi-byte integers are little-endian. A client must treat all packets as
binary data, not text.

## Discovery

| Item | UUID | Properties | Direction | Size | Update rate |
|---|---|---|---|---:|---|
| SeaNergy primary service | `47524e53-1241-659e-584b-90b18f052601` | Primary service | Device advertises | Not applicable | While radio is enabled |
| Command characteristic | `47524e53-1241-659e-584b-90b18f052602` | Write, Write Without Response | Client to payload | Exactly 20 B | On demand |
| Telemetry characteristic | `47524e53-1241-659e-584b-90b18f052603` | Read, Notify | Payload to client | Exactly 48 B | Once after each completed ping |

The GAP device name is `SeaNergy-26058`. Mission mode stops advertising. A
physical trigger press exits mission mode and restores advertising when there
is no connection.

Notifications are event-driven, not periodic. With the valid mission interval
range of 100 to 60,000 ms, the commanded rate is 10 to 0.0167 pings/s, derived
as `1000 / interval_ms`. The firmware default mission interval is 1,000 ms, or
1 ping/s. Reading the telemetry characteristic returns the last published
packet. Before the first completed ping, the backing buffer contains zeroes;
the client must reject it because its magic, version and CRC are invalid.

## Common framing rules

| Rule | Value | Invalid-value behaviour |
|---|---|---|
| Byte order | Little-endian | A differently decoded packet fails semantic checks |
| Magic | `0x534E`, bytes `4e 53` on the wire | Command is refused with `BLE_ATT_ERR_UNLIKELY`; telemetry is discarded by the client |
| Protocol version | `1` | Refused or discarded. A version mismatch is never guessed at or downgraded |
| Command CRC | CRC-16/CCITT-FALSE over bytes 0 to 15 | Command is refused with `BLE_ATT_ERR_UNLIKELY` |
| Telemetry CRC | CRC-16/CCITT-FALSE over bytes 0 to 45 | Client discards the packet and retains the previous valid record |
| CRC polynomial | `0x1021` | Not configurable |
| CRC initial value | `0xFFFF` | Not configurable |
| CRC reflection | None | Not configurable |
| CRC final XOR | None | Not configurable |

## Command packet

The command value is exactly 20 B.

| Offset | Width | Field | Type | Unit | Scale | Valid value or range | Invalid-value behaviour |
|---:|---:|---|---|---|---|---|---|
| 0 | 2 | Magic | `uint16` | None | 1 | `0x534E` | Write refused |
| 2 | 1 | Version | `uint8` | None | 1 | `1` | Write refused, never guessed |
| 3 | 1 | Opcode | `uint8` | None | 1 | `1` to `6` | Packet queues, then the command dispatcher performs no action |
| 4 | 4 | Sequence | `uint32` | Count | 1 | `0` to `4294967295`; sender should increment monotonically | Accepted as supplied; firmware does not deduplicate or order commands |
| 8 | 4 | Argument 0 | `uint32` | Opcode-specific | 1 | See opcode table | See opcode table |
| 12 | 4 | Argument 1 | `uint32` | Opcode-specific | 1 | See opcode table | See opcode table |
| 16 | 2 | CRC | `uint16` | None | 1 | Correct CRC of bytes 0 to 15 | Write refused |
| 18 | 2 | Reserved | `uint16` | None | 1 | Send `0` | Currently ignored; clients must send `0` for forward compatibility |

A value with any size other than 20 B is refused with
`BLE_ATT_ERR_INVALID_ATTR_VALUE_LEN`. A queue-full condition is refused with
`BLE_ATT_ERR_INSUFFICIENT_RES`. This applies to both write forms.

### Opcodes

| Value | Name | Argument 0 | Argument 1 | Result and invalid-value behaviour |
|---:|---|---|---|---|
| 1 | `PING_NOW` | Must be `0` | Must be `0` | Queues the current immutable solver plan. Non-zero arguments are ignored |
| 2 | `SET_MODE` | `0` auto, `1` range, `2` balanced, `3` detail | Must be `0` | Firmware uses `arg0 & 0x03`; values above `3` therefore select by their low two bits. `arg1` is ignored |
| 3 | `MISSION_ARM` | Guard word `0x534E5247` | Period, ms | A wrong guard causes no state change. A period from 100 to 60,000 ms replaces the stored period. Outside that range, mission mode still arms with the previously stored period |
| 4 | `MISSION_DISARM` | Must be `0` | Must be `0` | Leaves mission mode and enters ready. Arguments are ignored |
| 5 | `GET_STATUS` | Must be `0` | Must be `0` | No immediate packet is emitted; read the telemetry characteristic. Arguments are ignored |
| 6 | `SET_INTERVAL` | 100 to 60,000 ms | Must be `0` | In-range value replaces the stored period; an out-of-range value is ignored. `arg1` is ignored |

`MISSION_ARM` requires all three guards: valid framing and CRC, the exact
`SNRG` guard word, and opcode `3`. The radio is then disabled. This is an
intentional link loss, not a communications fault.

## Telemetry packet

The telemetry value is exactly 48 B.

| Offset | Width | Field | Type | Unit | Scale | Valid value or range | Invalid-value behaviour |
|---:|---:|---|---|---|---|---|---|
| 0 | 2 | Magic | `uint16` | None | 1 | `0x534E` | Discard packet |
| 2 | 1 | Version | `uint8` | None | 1 | `1` | Discard packet, never guess |
| 3 | 1 | Message type | `uint8` | None | 1 | `0x81` | Discard packet |
| 4 | 4 | Sequence | `uint32` | Ping count | 1 | `0` to `4294967295`, wrapping | Accept forward progress; flag duplicates or gaps to the operator |
| 8 | 4 | Uptime | `uint32` | ms | 1 | `0` to `4294967295`, wrapping | Display as unavailable if inconsistent with sequence order |
| 12 | 1 | State | `uint8` | Enum | 1 | `0` to `5` | Preserve raw value and show unknown state; do not infer |
| 13 | 1 | Mode | `uint8` | Enum | 1 | `0` to `3` | Preserve raw value and show unknown mode; do not infer |
| 14 | 1 | Window | `uint8` | Enum | 1 | `0` to `3` | Preserve raw value and show unknown window; do not infer |
| 15 | 1 | Flags | `uint8` | Bitmap | 1 | Bit 0 defined; bits 1 to 7 are `0` | Ignore reserved bits after retaining the raw byte |
| 16 | 4 | Frequency | `uint32` | Hz | 1 Hz/count | Bench solver: 24,000 to 80,000 Hz | Reject the field from control use if outside the active configuration band |
| 20 | 4 | Sample rate | `uint32` | sample/s | 1 sample/s/count | Firmware value 2,000,000 sample/s | Mark record invalid for waveform reconstruction if zero or unsupported |
| 24 | 2 | Temperature | `int16` | degree C | 0.01 degree C/count | Representable: -327.68 to 327.67 degree C | Sensor sentinel `-327.68 degree C` means unavailable; do not feed it to physics |
| 26 | 2 | TDS | `uint16` | mg/L | 1 mg/L/count | 0 to 65,535 mg/L | Retain for logging; reject from configured-range calculations |
| 28 | 2 | Turbidity | `uint16` | NTU | 0.1 NTU/count | 0 to 6,553.5 NTU | Retain for logging; reject from configured-range calculations |
| 30 | 2 | Battery | `uint16` | mV | 1 mV/count | 0 to 65,535 mV | Zero or implausible value sets the power-reading fault in the client |
| 32 | 2 | Current | `uint16` | mA | 0.1 mA/count | 0 to 6,553.5 mA | Retain packet and mark current unavailable if inconsistent with state |
| 34 | 4 | Ping energy | `uint32` | microjoule | 1 microjoule/count | 0 to 4,294,967,295 microjoules | Retain for audit; do not substitute a modelled value |
| 38 | 2 | CPU idle | `uint16` | permille | 0.1%/count | `0` to `1000`; `65535` unavailable | Display unavailable for `65535`; reject other values above `1000` |
| 40 | 2 | Adaptation latency | `uint16` | ms | 1 ms/count | 0 to 65,535 ms | Retain for diagnostics and flag a cycle-budget overrun |
| 42 | 4 | Fault bitmap | `uint32` | Bitmap | 1 | Bits 0 to 6 defined | Ignore reserved bits after retaining the raw value |
| 46 | 2 | CRC | `uint16` | None | 1 | Correct CRC of bytes 0 to 45 | Discard packet |

Representable ranges above follow the wire type. Configuration-specific ranges
come from the active solver. A client must validate framing and CRC before
interpreting any field.

### State values

| Value | Name | Meaning |
|---:|---|---|
| 0 | `BOOT` | Reset path; rails safe and transmit disabled |
| 1 | `READY` | Drivers initialised; transmit disabled and BLE available |
| 2 | `ARMED` | Ping queued; transmit enable asserted and timer armed |
| 3 | `TRANSMITTING` | DMA is streaming the pulse |
| 4 | `MISSION` | Autonomous periodic operation; BLE radio disabled |
| 5 | `FAULT` | Critical error; transmit disabled immediately |

### Mode values

| Value | Name | Meaning |
|---:|---|---|
| 0 | `AUTO` | Firmware selects range, balanced or detail |
| 1 | `RANGE` | Longest 4,096-sample pulse and Tukey window |
| 2 | `BALANCED` | 3,072-sample pulse and Hann window |
| 3 | `DETAIL` | Shortest 2,048-sample pulse and Blackman window |

### Window values

| Value | Name |
|---:|---|
| 0 | `RECTANGULAR` |
| 1 | `HANN` |
| 2 | `TUKEY` |
| 3 | `BLACKMAN` |

### Flags

| Bit | Mask | Meaning when set |
|---:|---:|---|
| 0 | `0x01` | Mission mode active |
| 1 to 7 | `0xFE` | Reserved; sender writes zero |

### Fault bitmap

| Bit | Mask | Meaning | Client action |
|---:|---:|---|---|
| 0 | `0x00000001` | DMA timeout | Show fault and inhibit further ping commands until reset |
| 1 | `0x00000002` | Sensor ADC fault | Show sensor unavailable; do not substitute a live value |
| 2 | `0x00000004` | Temperature fault | Show temperature unavailable; exclude it from live physics |
| 3 | `0x00000008` | INA226 fault | Show voltage, current and energy unavailable |
| 4 | `0x00000010` | OLED fault | Remote operation continues; show local-display fault |
| 5 | `0x00000020` | Low battery | Disarm mission and service the battery |
| 6 | `0x00000040` | Solver margin fault | Do not transmit the proposed plan |
| 7 to 31 | `0xFFFFFF80` | Reserved | Retain raw bitmap, label unknown bits, do not guess |

## Transaction sequence

1. Scan for GAP name `SeaNergy-26058` and connect.
2. Discover the primary service and both characteristics by UUID.
3. Subscribe to telemetry notifications.
4. Read telemetry once. Accept it only after size, magic, version, message type
   and CRC pass.
5. Write a command packet with an incremented sequence and valid CRC.
6. For a ping, await the next valid telemetry sequence. Do not use connection
   success as proof that transmission completed.
7. If mission mode is armed, expect the radio to disappear. Use the physical
   trigger to leave mission mode.

Worked command construction and telemetry decoding are in
[`examples/ble-client.md`](examples/ble-client.md).
