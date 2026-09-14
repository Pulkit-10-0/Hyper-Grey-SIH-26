/**
 * Renders the dossier page in jsdom and asserts that it actually works:
 * the scripts run without error, the charts draw real geometry, the tables
 * fill, and the physics still points the right way.
 *
 *   node verify.js
 *
 * jsdom is not a dependency of this folder - the site has none. It is borrowed
 * from the app project next door, which already has it.
 *
 * Run this before every deploy. It is the difference between "the file exists"
 * and "the page works".
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SITE = __dirname;

// Look for jsdom in the sibling app project, in this folder, or wherever the
// caller points us with `node verify.js <path-to-node_modules>`.
const CANDIDATES = [
  process.argv[2] && path.resolve(process.argv[2], 'jsdom'),
  path.resolve(SITE, '..', 'mobile-android', 'node_modules', 'jsdom'),
  path.resolve(SITE, '..', 'mobile-ios', 'node_modules', 'jsdom'),
  path.resolve(SITE, 'node_modules', 'jsdom'),
  'jsdom',
].filter(Boolean);

let jsdom;
for (const c of CANDIDATES) {
  try { jsdom = require(c); break; } catch (e) { /* try the next one */ }
}
if (!jsdom) {
  console.error(
    'jsdom not found. Either run `npm install` in ../mobile-android, or pass a\n' +
    'node_modules directory that has it:\n' +
    '  node verify.js path/to/node_modules',
  );
  process.exit(2);
}
const { JSDOM, VirtualConsole } = jsdom;

let fail = 0;
const ok = (cond, msg, extra) => {
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${msg}${extra ? '  ' + extra : ''}`);
  if (!cond) fail++;
};

const errors = [];
const vc = new VirtualConsole()
  .on('jsdomError', (e) => errors.push(e.message))
  .on('error', (e) => errors.push(String(e)));

const dom = new JSDOM(fs.readFileSync(path.join(SITE, 'index.html'), 'utf8'), {
  runScripts: 'dangerously',
  virtualConsole: vc,
});
const w = dom.window;
const d = w.document;

// Inject the scripts by hand. jsdom is given no resource loader on purpose:
// if the page ever grows a network dependency, this file stops working, which
// is exactly the alarm we want.
for (const f of ['assets/data.js', 'assets/app.js']) {
  const s = d.createElement('script');
  s.textContent = fs.readFileSync(path.join(SITE, f), 'utf8');
  d.body.appendChild(s);
}

console.log('\nSCRIPTS');
ok(errors.length === 0, 'no script errors', errors.join(' | '));

console.log('\nDATA');
ok(!!w.SEANERGY, 'data.js defined window.SEANERGY');
if (!w.SEANERGY) { console.log('\nABORT'); process.exit(1); }
const S = w.SEANERGY;
ok(S.absorption.water.length > 90, 'absorption series populated',
   S.absorption.water.length + ' points');
ok(S.sweep.length === 10, 'turbidity sweep has 10 rows');
ok(S.sweep[0].fc > S.sweep[9].fc, 'frequency falls as turbidity rises',
   S.sweep[0].fc + ' kHz -> ' + S.sweep[9].fc + ' kHz');
ok(S.sweep[9].resMm > S.sweep[0].resMm, 'resolution coarsens as frequency falls',
   S.sweep[0].resMm + ' mm -> ' + S.sweep[9].resMm + ' mm');
ok(S.power.naive > S.power.total, 'live trigonometry costs more than the table',
   S.power.total + ' mJ vs ' + S.power.naive + ' mJ');
ok(S.windows.length === 4, 'four window functions listed');

console.log('\nCHARTS');
for (const id of ['fig-absorption', 'fig-soundspeed', 'fig-sweep',
                  'fig-sweep-res', 'fig-power']) {
  const host = d.getElementById(id);
  const svg = host && host.querySelector('svg');
  const shapes = svg ? svg.querySelectorAll('path,rect').length : 0;
  ok(!!svg && shapes > 0, `#${id} drew an svg with geometry`, shapes + ' shapes');
}

console.log('\nTABLES');
for (const [id, want] of [['tb-sweep', 10], ['tb-res', 5], ['tb-window', 4]]) {
  const rows = d.querySelectorAll('#' + id + ' tr').length;
  ok(rows === want, `#${id} filled ${want} rows`, 'got ' + rows);
}

console.log('\nSTRUCTURE');
ok(d.querySelectorAll('section').length === 10, 'ten sections present',
   String(d.querySelectorAll('section').length));
ok(d.querySelector('.gen-date').textContent === S.generated,
   'generation date stamped', d.querySelector('.gen-date').textContent);

const navs = [...d.querySelectorAll('.top nav a')].map((a) => a.getAttribute('href'));
const deadAnchors = navs.filter((h) => !d.querySelector(h));
ok(deadAnchors.length === 0, 'every nav anchor resolves', deadAnchors.join(', '));

const rel = [...d.querySelectorAll('a[href^=".."]')].map((a) => a.getAttribute('href'));
const deadLinks = [...new Set(rel)].filter((h) => !fs.existsSync(path.resolve(SITE, h)));
ok(deadLinks.length === 0, 'every relative link resolves on disk', deadLinks.join(', '));

console.log('\nOFFLINE SAFETY');
const sources = ['index.html', 'assets/style.css', 'assets/app.js']
  .map((f) => fs.readFileSync(path.join(SITE, f), 'utf8')).join('\n');
const urls = (sources.match(/https?:\/\/[^"' )]+/g) || [])
  .filter((u) => !u.includes('w3.org/2000/svg'));
ok(urls.length === 0, 'no external URLs in markup, styles or scripts', urls.join(', '));
ok(!/@import|url\(\s*https?:/.test(fs.readFileSync(path.join(SITE, 'assets/style.css'), 'utf8')),
   'stylesheet fetches nothing');

console.log('\n' + (fail === 0 ? 'ALL PASS' : fail + ' FAILED') + '\n');
process.exit(fail === 0 ? 0 : 1);
