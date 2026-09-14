# mobile-android

## Purpose
The SeaNergy operator console source. Working tree, not a zip.

## Files that must exist
- Full Expo React Native project
- `README.md` — install, verify, build, in that order
- `docs/` — the plan documents and the v2 rationale
- `__tests__/` — the render harness

## What must be true of this tree
- `npm run check` gates the build: typecheck, physics assertions, screen renders
- No TextInput anywhere; every control is a slider, chip, segment or toggle
- All physics in `src/core`, importable under plain node, no React
- Two modes present and switchable: simulation and telemetry
- Fonts bundled in the APK, never fetched at runtime

## Facts and figures the README must carry
- Test counts: physics assertions and screen render tests
- Screen count and their names
- The measured adaptation behaviour table, clear water to heavy sediment
- Node, JDK and SDK versions the toolchain pins

## Acceptance
A fresh clone builds an installable APK with one documented command. The test
suite catches a deliberately reintroduced render bug.

## What went wrong last year
The mobile folder held two half-projects, one of them an Android app sitting
inside a folder called `ios`. Nothing gated the build.
