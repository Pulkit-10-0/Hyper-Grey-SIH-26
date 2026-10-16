# Interfaces and API reference

[Project overview](../../README.md) · [Parent folder](../README.md)

Interface specifications and worked examples for the console and archived firmware design.

| Guide | Scope |
|---|---|
| [Console link](console-link.md) | App-side NDJSON framing over USB, Wi-Fi, or BLE |
| [BLE GATT](ble-gatt.md) | Historical binary protocol for archived ESP-IDF firmware |
| [Core API](core-api.md) | Earlier TypeScript API snapshot; inspect current source for exact signatures |
| [Session CSV](csv-schema.md) | Console export fields and units |
| [Examples](examples/README.md) | Example clients and calls |

Current source: [app core](../../04-software/mobile-android/src/core/), [app link guide](../../04-software/mobile-android/docs/11-link-protocol.md), and [TX/RX guide](../../02-firmware/README.md). The TX/RX guide covers the embedded projects’ serial output formats and bench connections.

## Files

- [ble-gatt.md](ble-gatt.md)
- [console-link.md](console-link.md)
- [core-api.md](core-api.md)
- [csv-schema.md](csv-schema.md)
