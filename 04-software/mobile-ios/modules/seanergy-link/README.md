# SeaNergy native link module

[expo-module.config.json](expo-module.config.json) registers the Android `SeanergyLinkModule`. The [Android implementation](android/README.md) supplies USB device discovery/open/write operations, BLE scanning/connection and link-data/status events consumed by [nativeLink.ts](../../src/core/nativeLink.ts).

The native module moves bytes. NDJSON framing, validation and the transport-facing state live in [protocol.ts](../../src/core/protocol.ts) and [link.ts](../../src/core/link.ts). The current TX/RX firmware uses other serial output formats and still requires a protocol bridge or endpoint implementation.

There is no Swift/CoreBluetooth or iOS USB implementation here. Wi-Fi is implemented in the shared JavaScript client and does not use this module.
