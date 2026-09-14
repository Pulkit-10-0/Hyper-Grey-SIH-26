# BLE GATT protocol, version 1

## Service and characteristics

UUID bytes are written in standard UUID display order.

| Item | UUID | Properties | Direction |
|---|---|---|---|
| SeaNergy service | `47524e53-1241-659e-584b-90b18f052601` | Primary | Device service |
| Command | `47524e53-1241-659e-584b-90b18f052602` | Write, Write Without Response | App to payload |
| Telemetry | `47524e53-1241-659e-584b-90b18f052603` | Read, Notify | Payload to app |

All multi-byte fields are little-endian. CRC is CRC-16/CCITT-FALSE with
polynomial `0x1021`, initial value `0xFFFF`, no reflection and no final XOR.

## Command packet, exactly 20 bytes

| Offset | Width | Field | Type | Unit/scaling |
|---:|---:|---|---|---|
| 0 | 2 | Magic | `uint16` | `0x534E` |
| 2 | 1 | Version | `uint8` | `1` |
| 3 | 1 | Opcode | `uint8` | Table below |
| 4 | 4 | Sequence | `uint32` | Monotonic |
| 8 | 4 | Argument 0 | `uint32` | Opcode-specific |
| 12 | 4 | Argument 1 | `uint32` | Opcode-specific |
| 16 | 2 | CRC | `uint16` | Bytes 0-15 |
| 18 | 2 | Reserved | `uint16` | Send zero |

| Opcode | Name | Argument 0 | Argument 1 |
|---:|---|---|---|
| 1 | `PING_NOW` | Zero | Zero |
| 2 | `SET_MODE` | 0 auto, 1 range, 2 balanced, 3 detail | Zero |
| 3 | `MISSION_ARM` | Guard word `0x534E5247` (`SNRG`) | Ping period in ms |
| 4 | `MISSION_DISARM` | Zero | Zero |
| 5 | `GET_STATUS` | Zero | Zero |
| 6 | `SET_INTERVAL` | Ping period in ms | Zero |

Mission mode is entered only when opcode 3 has a valid packet CRC and Argument
0 equals `0x534E5247`. BLE advertising is then stopped. A physical trigger press
exits mission mode and restores the radio.

## Telemetry packet, exactly 48 bytes

| Offset | Width | Field | Type | Unit/scaling |
|---:|---:|---|---|---|
| 0 | 2 | Magic | `uint16` | `0x534E` |
| 2 | 1 | Version | `uint8` | `1` |
| 3 | 1 | Message type | `uint8` | `0x81` |
| 4 | 4 | Sequence | `uint32` | Monotonic |
| 8 | 4 | Uptime | `uint32` | ms |
| 12 | 1 | State | `uint8` | 0 boot, 1 ready, 2 armed, 3 TX, 4 mission, 5 fault |
| 13 | 1 | Mode | `uint8` | 0 auto, 1 range, 2 balanced, 3 detail |
| 14 | 1 | Window | `uint8` | 0 rectangular, 1 Hann, 2 Tukey, 3 Blackman |
| 15 | 1 | Flags | `uint8` | bit 0 mission, bits 1-7 reserved |
| 16 | 4 | Frequency | `uint32` | Hz |
| 20 | 4 | Sample rate | `uint32` | samples/s |
| 24 | 2 | Temperature | `int16` | 0.01 deg C |
| 26 | 2 | TDS | `uint16` | mg/L |
| 28 | 2 | Turbidity | `uint16` | 0.1 NTU |
| 30 | 2 | Battery | `uint16` | mV |
| 32 | 2 | Current | `uint16` | 0.1 mA |
| 34 | 4 | Ping energy | `uint32` | microjoules |
| 38 | 2 | CPU idle | `uint16` | permille; `65535` means scope value unavailable |
| 40 | 2 | Adaptation latency | `uint16` | ms |
| 42 | 4 | Fault bitmap | `uint32` | See below |
| 46 | 2 | CRC | `uint16` | Bytes 0-45 |

Fault bits: bit 0 DMA timeout, bit 1 sensor ADC, bit 2 temperature, bit 3
INA226, bit 4 OLED, bit 5 low battery, bit 6 solver margin, bits 7-31 reserved.
