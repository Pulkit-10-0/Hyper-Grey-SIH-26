# releases

## Purpose
Shippable binaries, versioned, with a record of what each one contains.

## Files that must exist
- `SeaNergy-<version>-arm64.apk`
- `SeaNergy-<version>-universal.apk`
- `firmware-<version>.bin`
- `BUILDS.md` — one line per build: version, code, date, commit, what changed
- `keystore-note.md` — where the signing key lives, never the key itself

## Rules
- Version and versionCode increment on every published build
- An APK is only published after the gated check passes
- The keystore is backed up off the build machine; losing it means no updates
  can ever install over an existing one

## Facts this must carry
Per build: version, versionCode, size per ABI, minSdk, targetSdk, signature
scheme, and the commit hash.

## Acceptance
Every APK in this folder installs on a real phone and opens. That is verified
by a person, not inferred from a successful build.
