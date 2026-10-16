# SeaNergy native link module

[expo-module.config.json](expo-module.config.json) registers the Android `SeanergyLinkModule`. The [Android implementation](android/README.md) supplies USB device discovery/open/write operations, BLE scanning/connection and link-data/status events consumed by [nativeLink.ts](../../src/core/nativeLink.ts).

The native module moves bytes. NDJSON framing, validation and the transport-facing state live in [protocol.ts](../../src/core/protocol.ts) and [link.ts](../../src/core/link.ts). Compatible endpoints supply the app-side NDJSON contract; the [firmware guide](../../../../02-firmware/README.md) describes the separate TX/RX serial formats.

This module targets Android USB/BLE. The shared JavaScript client handles Wi-Fi telemetry for Android and iOS.
