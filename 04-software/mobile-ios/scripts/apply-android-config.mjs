/**
 * Re-applies the Android settings that `expo prebuild` cannot express.
 *
 * `expo prebuild --clean` regenerates android/ from scratch, which wipes the
 * release signing config and the splash colours. Run this straight afterwards —
 * `npm run prebuild` already chains it.
 *
 * Idempotent: safe to run repeatedly.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const CREAM = '#F8F5EF';
const ABYSS = '#07191E';

let changed = 0;
const note = (m) => {
  console.log(`  ${m}`);
  changed++;
};

/* ---------------------------------------------------------------- */
/* 1. Release signing                                                */
/* ---------------------------------------------------------------- */

const buildGradle = path.join(root, 'android', 'app', 'build.gradle');
if (!fs.existsSync(buildGradle)) {
  console.error('android/app/build.gradle not found — run expo prebuild first.');
  process.exit(1);
}

let gradle = fs.readFileSync(buildGradle, 'utf8');

if (!gradle.includes('seanergy-release.keystore')) {
  const debugBlock = `        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }`;
  if (!gradle.includes(debugBlock)) {
    console.error('Could not find the debug signingConfig block to anchor to.');
    process.exit(1);
  }
  gradle = gradle.replace(
    debugBlock,
    `${debugBlock}
        release {
            storeFile file('seanergy-release.keystore')
            storePassword 'seanergy2026'
            keyAlias 'seanergy'
            keyPassword 'seanergy2026'
        }`,
  );
  note('added release signingConfig');
}

if (gradle.includes('signingConfig signingConfigs.debug\n            def enableShrinkResources')) {
  gradle = gradle.replace(
    'signingConfig signingConfigs.debug\n            def enableShrinkResources',
    'signingConfig signingConfigs.release\n            def enableShrinkResources',
  );
  note('pointed the release buildType at the release key');
} else if (
  gradle.includes(
    '            // Caution! In production, you need to generate your own keystore file.\n            // see https://reactnative.dev/docs/signed-apk-android.\n            signingConfig signingConfigs.debug',
  )
) {
  gradle = gradle.replace(
    '            // Caution! In production, you need to generate your own keystore file.\n            // see https://reactnative.dev/docs/signed-apk-android.\n            signingConfig signingConfigs.debug',
    '            signingConfig signingConfigs.release',
  );
  note('pointed the release buildType at the release key');
}

/* ---------------------------------------------------------------- */
/* 1b. Build-time and size settings                                  */
/* ---------------------------------------------------------------- */

if (!gradle.includes('checkReleaseBuilds false')) {
  const resBlock = `    androidResources {
        ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:!CVS:!thumbs.db:!picasa.ini:!*~'
    }`;
  if (gradle.includes(resBlock)) {
    gradle = gradle.replace(
      resBlock,
      `${resBlock}
    // Library lint adds many minutes to a release build and reports only on
    // third-party code we do not control.
    lint {
        checkReleaseBuilds false
        abortOnError false
    }
    // One APK per ABI plus a universal fallback: an arm64 phone installs ~40 MB
    // instead of the ~109 MB fat binary.
    splits {
        abi {
            enable true
            reset()
            include 'arm64-v8a', 'armeabi-v7a', 'x86_64'
            universalApk true
        }
    }`,
    );
    note('added lint skip and per-ABI splits');
  }
}

/* ---------------------------------------------------------------- */
/* 1c. Version — single source of truth is app.json                  */
/* ---------------------------------------------------------------- */
/* `expo prebuild` stamps the version into build.gradle once. Bumping
   app.json afterwards does not reach the APK unless we re-stamp it. */

const appJson = JSON.parse(
  fs.readFileSync(path.join(root, 'app.json'), 'utf8'),
);
const wantName = appJson.expo.version;
const wantCode = appJson.expo.android.versionCode;

const gotCode = /versionCode\s+(\d+)/.exec(gradle)?.[1];
const gotName = /versionName\s+"([^"]+)"/.exec(gradle)?.[1];

if (gotCode !== String(wantCode) || gotName !== wantName) {
  gradle = gradle
    .replace(/versionCode\s+\d+/, `versionCode ${wantCode}`)
    .replace(/versionName\s+"[^"]+"/, `versionName "${wantName}"`);
  note(`version -> ${wantName} (code ${wantCode})`);
}

fs.writeFileSync(buildGradle, gradle);

/* ---------------------------------------------------------------- */
/* 2. Splash and system-bar colours                                  */
/* ---------------------------------------------------------------- */

const valuesDir = path.join(root, 'android', 'app', 'src', 'main', 'res', 'values');
const nightDir = path.join(root, 'android', 'app', 'src', 'main', 'res', 'values-night');

const colorsFile = path.join(valuesDir, 'colors.xml');
if (fs.existsSync(colorsFile)) {
  let colors = fs.readFileSync(colorsFile, 'utf8');
  const before = colors;
  colors = colors.replace(
    /<color name="splashscreen_background">#?[0-9A-Fa-f]{6,8}<\/color>/,
    `<color name="splashscreen_background">${CREAM}</color>`,
  );
  colors = colors.replace(
    /<color name="colorPrimary">#?[0-9A-Fa-f]{6,8}<\/color>/,
    '<color name="colorPrimary">#136578</color>',
  );
  if (colors !== before) {
    fs.writeFileSync(colorsFile, colors);
    note(`splash background -> ${CREAM}, colorPrimary -> #136578`);
  }
}

// Dark-mode splash, so the launch does not flash cream on a dark device.
fs.mkdirSync(nightDir, { recursive: true });
const nightColors = path.join(nightDir, 'colors.xml');
const nightXml = `<resources>
  <color name="splashscreen_background">${ABYSS}</color>
  <color name="iconBackground">${ABYSS}</color>
</resources>
`;
if (!fs.existsSync(nightColors) || fs.readFileSync(nightColors, 'utf8') !== nightXml) {
  fs.writeFileSync(nightColors, nightXml);
  note(`dark splash background -> ${ABYSS}`);
}

console.log(
  changed === 0
    ? 'Android config already correct.'
    : `Android config applied (${changed} change${changed === 1 ? '' : 's'}).`,
);
