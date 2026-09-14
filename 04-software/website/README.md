# website

The SeaNergy engineering dossier. One static page, no backend, no build step,
no network request of any kind.

## Run it

```
open index.html
```

That is the whole procedure. There is no bundler, no `npm install`, no dev
server. Double-clicking the file works, including from a USB stick at a judging
table with the wifi off.

To serve it over HTTP instead (only needed if you want a real origin):

```
python -m http.server 8000
```

## Files

```
index.html            the page
assets/style.css      the app's own instrument palette
assets/app.js         SVG chart renderer, no library
assets/data.js        generated - every number on the page
verify.js             renders the page and asserts it works
content-map.md        section list and what each one proves
deploy.md             host, domain, redeploy
```

## Where the numbers come from

`assets/data.js` is **generated, never edited by hand**. It is produced by
`scripts/site-data.mjs` in the app project, which imports the compiled physics
core and runs it:

```
cd ../mobile-android
npm run verify                       # compiles src/core into .verify-out
node scripts/site-data.mjs > ../website/assets/data.js
```

That means the absorption curve, the sound-speed curve, the turbidity sweep,
the resolution table, the window sidelobe figures and the energy split are all
computed by the same code that runs on the handset. If the physics changes, the
site changes with it. Nothing on the page is a number somebody typed in.

The one thing that is hand-written is prose, plus the hardware table in section
05, which records part selections and the reasons for them.

## Deliberate constraints

| Constraint | Why |
|---|---|
| No web fonts | The page must load with the network off. System font stack only. |
| No chart library | A 6 kB renderer beats a 300 kB dependency that has to be fetched. |
| No framework | Nothing to build, nothing to break, nothing to version. |
| Prints legibly | A print stylesheet flips it to black on white and avoids page breaks inside sections. |
| Works on a phone | Single column below 700 px; tables scroll inside their own container. |

## Accuracy rules

- Every claim about hardware limits names the part and the limit.
- Every figure marked measured is measured. Section 09, the reality ledger,
  states the status of every claim on the page in one table.
- Nothing on the page may contradict `00-submission/compliance-matrix`.
  If they disagree, the compliance matrix is right and this page is wrong.

## Verify it

```
node verify.js
```

Renders the whole page in jsdom and asserts that it works, rather than that the
files exist. It checks that both scripts run without error, that all five charts
drew real SVG geometry, that all three tables filled, that every nav anchor and
every relative link resolves, that the physics still points the right way
(frequency falls as turbidity rises, resolution coarsens, live trigonometry costs
more than the table), and that **nothing in the markup, styles or scripts
references an external URL**.

That last check is the one that matters most. It is what stops the page quietly
acquiring a network dependency and failing at the judging table.

`verify.js` borrows jsdom from `../mobile-android/node_modules`, so run
`npm install` there first, or point it somewhere else:

```
node verify.js path/to/node_modules
```

Current result: **22 checks, all passing.**

## Checks before shipping

- [ ] `node verify.js` passes
- [ ] Regenerate `assets/data.js` after any change to `src/core`
- [ ] Open with the network disconnected; confirm nothing is missing
- [ ] Print to PDF; confirm no section is cut mid-table
- [ ] Open at 380 px wide; confirm no horizontal scroll on the body
- [ ] Confirm every relative link resolves inside the submission tree
