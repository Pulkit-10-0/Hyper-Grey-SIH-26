# Firmware releases

A release bundle is produced only after a clean ESP-IDF build and contains:

- `seanergy_payload.bin`
- `bootloader.bin`
- `partition-table.bin`
- `flash_args`
- `manifest.json` with version, commit, board revision, ESP-IDF version and SHA-256 hashes

Use the [archived build guide](../docs/build-and-flash.md) to generate the bundle,
copy its build outputs here, and record their hashes when tagging the release.
