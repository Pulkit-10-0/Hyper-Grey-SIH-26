# Application helper scripts

Run scripts from the app root because they resolve project files relative to that working directory.

| Script | Purpose |
|---|---|
| [apply-android-config.mjs](apply-android-config.mjs) | Reapplies Android release signing, ABI splits, version and splash configuration after a clean Expo prebuild; it modifies native files |
| [site-data.mjs](site-data.mjs) | Imports the compiled numerical core from `.verify-out/` and writes website chart data to standard output |

Run `npm run verify` before generating site data. The [website guide](../../website/README.md) gives the output-redirection command. Generated curves and energy values are model predictions rather than bench measurements.

The Android helper expects an Android native tree and signing material provisioned separately. Its presence in the iOS mirror does not make it an iOS build step. Review native changes before using clean prebuild commands.
