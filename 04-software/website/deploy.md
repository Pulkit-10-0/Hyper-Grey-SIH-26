# deploy

The site is four static files. Any host that serves a directory will serve it.

---

## The only rule

**It must work from a local file with the network off.** Judging table wifi
fails. The site is built so that `index.html` opened directly from a USB stick is
fully functional — no fonts fetched, no CDN, no analytics, no framework. Deploy
it anywhere you like, but never introduce a dependency that breaks that.

Test it the way it will actually be used:

```
1. Copy the website/ folder to a USB stick
2. Disconnect from wifi and turn off mobile data
3. Double-click index.html
4. Every chart, every table and every link must still render
```

If a chart is blank, `assets/data.js` did not load. That file is generated but
**tracked deliberately** for exactly this reason.

---

## Status

| | |
|---|---|
| Host | **Not yet deployed** |
| Domain | Not registered |
| Primary distribution | The folder itself, and the PDF export |

The site's job in this submission is to be read locally and printed. A public URL
is a convenience, not a requirement, and nothing in the submission depends on one
existing.

---

## If you do want a URL

Options in order of how little there is to go wrong.

### GitHub Pages

Free, no account beyond GitHub, and it survives a hackathon.

```bash
# from the repository root
git subtree push --prefix 04-software/website origin gh-pages
```

Then in the repository settings: Pages → Source → `gh-pages` branch, root.
URL: `https://<user>.github.io/<repo>/`

Because the site uses only relative paths, it works under a subpath without
configuration.

### Netlify or Cloudflare Pages, drag and drop

Both accept a folder dropped into the dashboard. No build command, no output
directory, no configuration. Roughly thirty seconds.

Build settings, if asked:

```
Build command:      (leave empty)
Publish directory:  .
```

### Vercel

```bash
npx vercel --prod
```

Answer *no* to every framework question. It is a static directory.

---

## Redeploying after a change

The site has no build step, so redeploying is just re-uploading. The one thing
that is easy to forget:

**If anything in `src/core` changed, regenerate the chart data first.**

```powershell
cd ..\mobile-android
. .\.toolchain\env.ps1
npm run verify                 # compiles src/core into .verify-out
npm run site-data > ..\website\assets\data.js
```

Then check the generated date in the page footer has moved, and redeploy.

Skipping this leaves the site quoting physics the app no longer computes. That is
the one failure mode that would actually damage the submission, because a judge
comparing the site against the app would find them disagreeing.

---

## Outbound links to check before every deploy

The page links out to sibling folders in the submission tree using relative
paths. These work locally and inside a repository browser; they do **not** work
on a bare static host unless the whole tree is deployed.

| Link | Target |
|---|---|
| Download the Android build | `../releases/` |
| App source | `../mobile-android/` |
| iOS source and status | `../mobile-ios/` |
| Dataset | `../../05-models/dataset/` |
| Research base | `../../03-research/` |
| Tank results | `../../06-validation/tank-results/` |
| Bench setup | `../../01-hardware/bench-setup/` |

If deploying the website folder alone, replace these with absolute URLs to the
public repository first, or they become dead links in front of a judge.

---

## Checklist

- [ ] `node verify.js` passes
- [ ] `assets/data.js` regenerated if `src/core` changed
- [ ] Opened from `file://` with the network off — everything renders
- [ ] Printed to PDF — no section cut mid-table
- [ ] Opened at 380 px wide — no horizontal scroll on the body
- [ ] Every outbound link resolves for the deployment target
- [ ] Nothing on the page contradicts `00-submission/compliance-matrix`
