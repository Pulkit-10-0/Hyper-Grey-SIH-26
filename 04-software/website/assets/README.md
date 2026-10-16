# Website rendering assets

| File | Purpose |
|---|---|
| [style.css](style.css) | Dossier layout, instrument colours, responsive rules and print styling |
| [app.js](app.js) | Local SVG chart and table rendering |
| [data.js](data.js) | Generated `window.SEANERGY` numerical snapshot consumed by the page |

Regenerate `data.js` with [the app helper](../../mobile-android/scripts/site-data.mjs) after compiling the numerical core; the [website README](../README.md) gives the command sequence. Do not substitute manual chart values for generated series. Absorption, sweep, compression and energy series are model outputs, not measurements of the current payload.

Run the site's `verify.js` after data or rendering changes and inspect narrow-screen and print layouts. Local assets keep the page usable without a network connection.
