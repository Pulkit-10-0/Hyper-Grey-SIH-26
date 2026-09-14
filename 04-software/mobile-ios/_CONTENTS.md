# mobile-ios

## Purpose
The iOS target. The app is built on React Native, so iOS is a build
configuration rather than a rewrite — but the configuration has to actually
exist and be shown, not asserted.

**Status changed from *reserved* to *source complete, package not built* on
10 September 2026.**

## Files that must exist
- Full Expo React Native project, identical `app/`, `src/`, `assets/` and
  `__tests__/` to the Android target
- `ios/` — the real Xcode project produced by `expo prebuild --platform ios`
- `README.md` — the status table first, before anything else
- `ios-build-notes.md` — the exact prebuild command used, the three blockers,
  and the two routes to an `.ipa` with their cost and hardware requirements
- `.gitignore` that tracks `ios/` but excludes Pods, Xcode build output,
  per-user state and every kind of signing credential

## What must be true of this tree
- `npm run check` passes here as it does on the Android side — the gate is
  platform-independent
- `npm run bundle:ios` produces a Hermes bundle, which proves the application
  compiles for iOS even though the native link step cannot run on this host
- `app.json` is the single source of truth. The Xcode project is generated and
  must never be hand-edited, because the next prebuild overwrites it
- Bundle identifier, version and build number match the Android target

## Facts and figures the README must carry
- What is done and what is blocked, as a table, at the top
- The size of the iOS JS bundle actually produced
- The three separate blockers — Xcode, CocoaPods, an Apple signing identity —
  and which of them costs money
- The cost of an Apple Developer Program membership
- Why `Podfile.lock` is absent and when it must be committed

## Do not
Do not copy an Android project in here and label it iOS. That is what happened
last year and it reads as padding. Do not put a renamed APK in `../releases/`
with an iOS label.

## Acceptance
Either an `.ipa` exists in `../releases/` named `SeaNergy-<version>___ios.ipa`
and a person has installed and opened it on a physical iPhone, **or** the README
accurately states why there is not one.

Right now the second is true, and the folder holds a complete, buildable iOS
project rather than an apology. When the first becomes true, the status table in
`README.md` and the row in `../releases/BUILDS.md` change in the same commit that
adds the package.

## What went wrong last year
The `ios` folder held an Android project. Nothing in it was iOS. That is the
single easiest kind of padding for a reviewer to catch, and it casts doubt on
everything else in the submission.
