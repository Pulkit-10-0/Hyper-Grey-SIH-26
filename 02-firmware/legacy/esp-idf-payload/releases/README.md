# Firmware releases

A release bundle is produced only after a clean ESP-IDF build and contains:

- `seanergy_payload.bin`
- `bootloader.bin`
- `partition-table.bin`
- `flash_args`
- `manifest.json` with version, commit, board revision, ESP-IDF version and SHA-256 hashes

The repository does not include a fabricated placeholder binary. Run the build
steps in `../docs/build-and-flash.md`, copy the actual build outputs here, and
record their hashes before tagging the release.
