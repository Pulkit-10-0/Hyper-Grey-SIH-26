# Application helper scripts

Run scripts from the app root because they resolve project files relative to that working directory.

| Script | Purpose |
|---|---|
| [apply-android-config.mjs](apply-android-config.mjs) | Reapplies Android release signing, ABI splits, version and splash configuration after a clean Expo prebuild; it modifies native files |
| [site-data.mjs](site-data.mjs) | Imports the compiled numerical core from `.verify-out/` and writes website chart data to standard output |

Run `npm run verify` before generating site data. The [website guide](../../website/README.md) gives the output-redirection command. Generated curves and energy values are outputs of the shared numerical model.

The Android helper runs against an Android native tree with separately provisioned signing material. For iOS native commands, follow the app build guide. Review native changes before using clean prebuild commands.
