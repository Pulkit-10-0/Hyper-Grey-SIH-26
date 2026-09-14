# keystore-note

Where the Android signing key lives. **The key itself is not in this repository
and must never be committed.**

---

## The key

| | |
|---|---|
| File | `seanergy-release.keystore` |
| Location on the build machine | `D:\lab\daa\SeaNergy\android\app\seanergy-release.keystore` |
| Alias | `seanergy` |
| Algorithm | RSA, 2048 bits, SHA256withRSA |
| Certificate DN | `CN=SeaNergy, OU=SIH 2026, O=SeaNergy, L=India, ST=India, C=IN` |
| Created | 25 August 2026 |
| Valid until | 17 August 2056 |
| Certificate SHA-256 | `de484e574d8938a37b2760430c7163c08c5182222c7a78dcc151a540165fb6ca` |
| Certificate SHA-1 | `799f0c3320e81c758d1e626b2da52d8ed54e61eb` |

Those fingerprints are safe to publish. They are how you confirm a given APK
came from this key without having the key.

## Where the passwords are

In `android/app/build.gradle`, in the `signingConfigs.release` block, in plain
text. That is applied by `scripts/apply-android-config.mjs` after every
`expo prebuild --clean`.

This is acceptable **only** because this is a competition demonstration key that
was never used to publish to Google Play and never will be. If this app is ever
published, generate a fresh key, move the passwords into a
`keystore.properties` file that is gitignored, and treat the old key as
compromised.

## Why losing it matters

Android identifies an app by package name plus signing certificate. If the key is
lost:

- No future build can install **over** an existing install. Android rejects it
  with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, and the only fix is for the user to
  uninstall first, losing their data.
- Anyone with the demo APK on their phone would have to uninstall and reinstall
  to receive an update.

For a hackathon that is an inconvenience. On Google Play, without Play App
Signing enrolled, it is unrecoverable — the package name is permanently unusable.

## Backup

| Copy | Where | Status |
|---|---|---|
| Primary | `D:\lab\daa\SeaNergy\android\app\` on the build machine | Present |
| Off-machine backup | **Not yet made** | **Do this** |

Take a backup before the finals. Two copies on two different machines, or one
copy in an encrypted archive in the team's private storage. Not in this
repository, not in any repository that could become public, not in a group chat.

Recording the alias and both passwords alongside the file is part of the backup —
a keystore whose password nobody remembers is the same as a lost keystore.

## Regenerating, if it does get lost

```powershell
keytool -genkeypair -v `
  -keystore seanergy-release.keystore `
  -alias seanergy `
  -keyalg RSA -keysize 2048 -validity 10950 `
  -dname "CN=SeaNergy, OU=SIH 2026, O=SeaNergy, L=India, ST=India, C=IN"
```

Then update the certificate fingerprints in this file and in `BUILDS.md`, and
note in `BUILDS.md` which version was the first signed with the new key. Every
build before that point becomes uninstallable over every build after it, and that
boundary needs to be written down.

## What is gitignored

`../mobile-android/.gitignore` excludes `*.keystore`, `*.jks`, `*.p8`, `*.p12`,
`*.key`, `*.pem` and `keystore.properties`. Before pushing anywhere public,
confirm nothing slipped through:

```bash
git ls-files | grep -Ei '\.(keystore|jks|p8|p12|key|pem|mobileprovision)$'
```

That should print nothing. If it prints anything, the key is already in the git
history and rotating it is the only real fix — deleting the file in a later
commit does not remove it.
