/**
 * Verification of the physics and DSP layer.
 *
 * Run:  npm run verify
 *
 * These assertions double as evidence for the written report: every number the
 * app displays comes from a function checked here against a published value or
 * an analytically known result.
 */

import {
  absorptionDbPerM,
  maxDetectionRange,
  sensedAbsorptionDbPerM,
  airAbsorptionDbPerM,
  compressionGainDb,
  echoSnrDb,
  rangeResolutionChirp,
  rangeResolutionCw,
  soundSpeedAir,
  soundSpeedWater,
  thorpDbPerKm,
  timeBandwidthProduct,
  transmissionLossDb,
} from './physics';
import {
  BARKER_13,
  magnitudeSpectrumDb,
  matchedFilter,
  synthesise,
  windowFunction,
  WINDOW_PSL_DB,
  type WindowKind,
} from './dsp';
import {
  AIR_CONFIG,
  decide,
  excessScatteringDbPerM,
  WATER_CONFIG,
  type Environment,
} from './adaptation';
import { endurance, pingEnergy } from './power';
import {
  decodeLine,
  encodeCommand,
  environmentOf,
  LineAssembler,
  PROTOCOL_VERSION,
} from './protocol';

let pass = 0;
let fail = 0;

function check(name: string, actual: number, expected: number, tol: number) {
  const ok = Math.abs(actual - expected) <= tol;
  if (ok) pass++;
  else fail++;
  const status = ok ? 'PASS' : 'FAIL';
  console.log(
    `  [${status}] ${name.padEnd(52)} ${actual.toFixed(4).padStart(12)}  ` +
      `(expected ${expected.toFixed(4)} +/- ${tol})`,
  );
}

function assert(name: string, cond: boolean, detail = '') {
  if (cond) pass++;
  else fail++;
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  ' + detail : ''}`);
}

/* ------------------------------------------------------------------ */
console.log('\nSound speed');
/* ------------------------------------------------------------------ */

// Dry air at 0 C and 20 C, standard values.
check('air, 0 C', soundSpeedAir(0), 331.3, 0.1);
check('air, 20 C', soundSpeedAir(20), 343.4, 0.2);

// Mackenzie reference point: 25 C, 35 ppt, surface -> ~1534 m/s.
check('water, 25 C / 35 ppt / 0 m', soundSpeedWater(25, 35, 0), 1534.0, 1.5);
// Cold deep water is slower at the surface but pressure pushes it back up.
assert(
  'depth raises sound speed',
  soundSpeedWater(10, 35, 1000) > soundSpeedWater(10, 35, 0),
);
assert(
  'temperature raises sound speed',
  soundSpeedWater(25, 35, 0) > soundSpeedWater(5, 35, 0),
);

/* ------------------------------------------------------------------ */
console.log('\nAbsorption (Thorp, dB/km)');
/* ------------------------------------------------------------------ */

check('100 kHz', thorpDbPerKm(100), 34.0, 2.0);
check('200 kHz', thorpDbPerKm(200), 51.0, 3.0);
check('400 kHz', thorpDbPerKm(400), 87.0, 5.0);
assert(
  'absorption rises monotonically with frequency',
  thorpDbPerKm(50) < thorpDbPerKm(100) &&
    thorpDbPerKm(100) < thorpDbPerKm(200) &&
    thorpDbPerKm(200) < thorpDbPerKm(400),
);

console.log('\nAbsorption (air, dB/m)');
check('20 kHz', airAbsorptionDbPerM(20), 0.35, 0.05);
check('40 kHz', airAbsorptionDbPerM(40), 1.2, 0.1);
check(
  'unified helper agrees, water 200 kHz',
  absorptionDbPerM('water', 200_000) * 1000,
  thorpDbPerKm(200),
  0.001,
);

/* ------------------------------------------------------------------ */
console.log('\nResolution and pulse compression');
/* ------------------------------------------------------------------ */

// 5 ms unmodulated pulse in water resolves half its own length.
check('CW 5 ms at 1500 m/s', rangeResolutionCw(1500, 0.005), 3.75, 0.001);
// 100 kHz of sweep resolves c/2B regardless of pulse length.
check('chirp 100 kHz at 1500 m/s', rangeResolutionChirp(1500, 100_000), 0.0075, 1e-6);
check('time-bandwidth product', timeBandwidthProduct(0.005, 100_000), 500, 0.001);
check('compression gain of TBP 500', compressionGainDb(500), 26.99, 0.02);

assert(
  'compression improves resolution 500x here',
  Math.abs(rangeResolutionCw(1500, 0.005) / rangeResolutionChirp(1500, 100_000) - 500) <
    1,
);

/* ------------------------------------------------------------------ */
console.log('\nTransmission loss and the sonar equation');
/* ------------------------------------------------------------------ */

// Spherical spreading alone: 20 log10(r).
check('TL at 100 m, no absorption', transmissionLossDb(100, 0), 40.0, 0.001);
check('TL at 10 m, no absorption', transmissionLossDb(10, 0), 20.0, 0.001);
assert(
  'SNR falls as range grows',
  echoSnrDb({
    sourceLevelDb: 190,
    rangeM: 20,
    absorptionDbPerM: 0.05,
    targetStrengthDb: -15,
    noiseLevelDb: 50,
    directivityIndexDb: 20,
    processingGainDb: 25,
  }) >
    echoSnrDb({
      sourceLevelDb: 190,
      rangeM: 200,
      absorptionDbPerM: 0.05,
      targetStrengthDb: -15,
      noiseLevelDb: 50,
      directivityIndexDb: 20,
      processingGainDb: 25,
    }),
);

/* ------------------------------------------------------------------ */
console.log('\nWindows');
/* ------------------------------------------------------------------ */

for (const kind of ['hann', 'hamming', 'blackman'] as WindowKind[]) {
  const w = windowFunction(kind, 512);
  assert(`${kind}: tapers to near zero at both ends`, w[0] < 0.1 && w[511] < 0.1);
  assert(`${kind}: peaks near unity at centre`, w[256] > 0.95);
}
const rect = windowFunction('rect', 64);
assert('rect: flat', rect[0] === 1 && rect[63] === 1);

// Measure each window's first sidelobe from its own spectrum.
console.log('\nMeasured peak sidelobe level (dB)');
for (const kind of ['rect', 'hann', 'hamming', 'blackman'] as WindowKind[]) {
  const n = 2048;
  const w = windowFunction(kind, 256);
  const padded = new Float32Array(n);
  padded.set(w);
  const spec = magnitudeSpectrumDb(padded, n);

  // Walk past the main lobe to the first local maximum.
  let i = 1;
  while (i < spec.length - 1 && spec[i + 1] < spec[i]) i++;
  let peak = -200;
  for (let j = i; j < Math.min(spec.length, 400); j++) {
    if (spec[j] > spec[j - 1] && spec[j] >= spec[j + 1]) {
      peak = spec[j];
      break;
    }
  }
  check(`${kind}`, peak, WINDOW_PSL_DB[kind], 4.5);
}

/* ------------------------------------------------------------------ */
console.log('\nBarker-13');
/* ------------------------------------------------------------------ */

assert('code length is 13', BARKER_13.length === 13);
assert(
  'code is bipolar',
  BARKER_13.every((v) => v === 1 || v === -1),
);

// Autocorrelation of the bare code: peak 13, every sidelobe magnitude 1.
{
  const n = BARKER_13.length;
  let worstSidelobe = 0;
  for (let lag = 1; lag < n; lag++) {
    let acc = 0;
    for (let i = 0; i + lag < n; i++) acc += BARKER_13[i] * BARKER_13[i + lag];
    worstSidelobe = Math.max(worstSidelobe, Math.abs(acc));
  }
  check('peak-to-sidelobe ratio', 20 * Math.log10(n / worstSidelobe), 22.28, 0.05);
  assert('every sidelobe magnitude is 1', worstSidelobe === 1);
}

/* ------------------------------------------------------------------ */
console.log('\nMatched filter');
/* ------------------------------------------------------------------ */

{
  const fs = 200_000;
  const replica = synthesise(
    { mode: 'lfm', window: 'hamming', fStart: 20_000, fStop: 60_000, tau: 0.002, amplitude: 1 },
    fs,
  );
  const rx = new Float32Array(2400);
  const trueDelay = 900;
  // Bury the echo in noise well below the input signal level.
  let seed = 12345;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff - 0.5;
  };
  for (let i = 0; i < rx.length; i++) rx[i] = rnd() * 3.0;
  for (let i = 0; i < replica.length && trueDelay + i < rx.length; i++) {
    rx[trueDelay + i] += replica[i];
  }

  const mf = matchedFilter(rx, replica);
  check('recovered delay (samples)', mf.peakIndex, trueDelay, 3);
  assert(
    'compression lifts the echo clear of noise',
    mf.peakToSidelobeDb > 6,
    `PSL ${mf.peakToSidelobeDb.toFixed(1)} dB`,
  );
}

/* ------------------------------------------------------------------ */
console.log('\nWaveform synthesis');
/* ------------------------------------------------------------------ */

{
  const p = { mode: 'lfm' as const, window: 'hamming' as const, fStart: 30_000, fStop: 50_000, tau: 0.002, amplitude: 0.8 };
  const s = synthesise(p, 400_000);
  check('sample count = tau * fs', s.length, 800, 1);
  let max = 0;
  for (const v of s) max = Math.max(max, Math.abs(v));
  assert('never exceeds the requested amplitude', max <= 0.801, `peak ${max.toFixed(3)}`);
  assert('windowed ends start near zero', Math.abs(s[0]) < 0.2);
  assert('no NaN in the buffer', s.every((v) => Number.isFinite(v)));
}

/* ------------------------------------------------------------------ */
console.log('\nAdaptation behaviour');
/* ------------------------------------------------------------------ */

{
  const base: Environment = {
    tempC: 26,
    salinityPpt: 34,
    turbidityNtu: 10,
    depthM: 20,
    ph: 8.1,
  };
  const clear = decide(base, WATER_CONFIG);
  const murky = decide({ ...base, turbidityNtu: 800 }, WATER_CONFIG);

  assert(
    'rising turbidity lowers the centre frequency',
    murky.fCentre < clear.fCentre,
    `${(clear.fCentre / 1000).toFixed(0)} -> ${(murky.fCentre / 1000).toFixed(0)} kHz`,
  );
  assert(
    'rising turbidity adds scattering loss',
    murky.excessLossDbPerM > clear.excessLossDbPerM,
  );
  // Compare like with like. `maxRangeM` belongs to whichever waveform each
  // condition chose, and those are different waveforms: in murky water the
  // solver moves downband, where absorption is far lower, so its chosen pulse
  // legitimately reaches further than the wideband one picked in clear water.
  // The physical invariant is about one waveform in two waters.
  const probeF = clear.fCentre;
  const alphaProbe = sensedAbsorptionDbPerM(
    'water', probeF, base.tempC, base.salinityPpt, base.depthM, base.ph,
  );
  const reach = (ntu: number) =>
    maxDetectionRange(
      {
        sourceLevelDb: WATER_CONFIG.sourceLevelDb,
        absorptionDbPerM:
          alphaProbe + excessScatteringDbPerM(WATER_CONFIG, ntu, probeF),
        targetStrengthDb: WATER_CONFIG.targetStrengthDb,
        noiseLevelDb: 52,
        directivityIndexDb: WATER_CONFIG.directivityIndexDb,
        processingGainDb: clear.compressionGainDb,
      },
      WATER_CONFIG.detectionThresholdDb,
      WATER_CONFIG.maxRangeBoundM,
    );
  const reachClear = reach(10);
  const reachMurky = reach(800);
  assert(
    'the same waveform reaches further in clear water',
    reachClear > reachMurky,
    `${reachClear.toFixed(0)} m vs ${reachMurky.toFixed(0)} m at ${(probeF / 1000).toFixed(0)} kHz`,
  );
  assert(
    'every decision produces finite numbers',
    [clear, murky].every(
      (d) =>
        Number.isFinite(d.fCentre) &&
        Number.isFinite(d.bandwidth) &&
        Number.isFinite(d.tau) &&
        Number.isFinite(d.predictedSnrDb) &&
        Number.isFinite(d.resolutionM) &&
        d.bandwidth > 0 &&
        d.tau > 0,
    ),
  );

  const air = decide(base, AIR_CONFIG);
  assert(
    'air decision stays inside the transducer band',
    air.fStart >= AIR_CONFIG.bandLow - 1 && air.fStop <= AIR_CONFIG.bandHigh + 1,
    `${(air.fStart / 1000).toFixed(1)}-${(air.fStop / 1000).toFixed(1)} kHz`,
  );

  // The closed-loop correction must make the system more conservative.
  // Note it does NOT simply lower the reported SNR: raising the assumed noise
  // makes the optimiser abandon aggressive candidates and choose a safer one,
  // which can carry more margin.
  //
  // The invariant is stated on bandwidth, because bandwidth is what the solver
  // maximises and what range resolution is made of. Centre frequency is chosen
  // for propagation and may move either way: under a large correction the
  // optimiser can prefer a narrow band slightly higher up, which is a coarser
  // and therefore less aggressive answer even though the carrier rose.
  const corrected = decide({ ...base, turbidityNtu: 800 }, WATER_CONFIG, 8);
  assert(
    'a noise correction never makes the choice more aggressive',
    corrected.bandwidth <= murky.bandwidth + 1 &&
      corrected.resolutionM >= murky.resolutionM - 1e-9,
    `fc ${(murky.fCentre / 1000).toFixed(0)}->${(corrected.fCentre / 1000).toFixed(0)} kHz, ` +
      `bw ${(murky.bandwidth / 1000).toFixed(0)}->${(corrected.bandwidth / 1000).toFixed(0)} kHz`,
  );
  // Holding the parameters fixed, more assumed noise must lower the SNR.
  assert(
    'more assumed noise lowers SNR for identical parameters',
    echoSnrDb({
      sourceLevelDb: 190,
      rangeM: 100,
      absorptionDbPerM: 0.05,
      targetStrengthDb: -15,
      noiseLevelDb: 58,
      directivityIndexDb: 20,
      processingGainDb: 25,
    }) <
      echoSnrDb({
        sourceLevelDb: 190,
        rangeM: 100,
        absorptionDbPerM: 0.05,
        targetStrengthDb: -15,
        noiseLevelDb: 50,
        directivityIndexDb: 20,
        processingGainDb: 25,
      }),
  );
}

/* ------------------------------------------------------------------ */
console.log('\nPower model');
/* ------------------------------------------------------------------ */

{
  const short = pingEnergy(0.001, 0.8);
  const long = pingEnergy(0.008, 0.8);
  assert('longer pulses cost more', long.totalMj > short.totalMj);
  assert(
    'the DDS engine costs less than live trigonometry',
    short.totalMj < short.naiveTotalMj && short.savingPercent > 0,
    `${short.savingPercent.toFixed(1)}% saved`,
  );

  const quiet = endurance(short, 30);
  const busy = endurance(short, 2);
  assert('slower ping rate lasts longer', quiet.missionHours > busy.missionHours);
  assert(
    'endurance figures are finite and positive',
    Number.isFinite(quiet.missionHours) && quiet.missionHours > 0 && quiet.pingsRemaining > 0,
  );
}


/* ------------------------------------------------------------------ */
console.log('\nEngine (headless smoke test)');
/* ------------------------------------------------------------------ */

{
  // Exercise the whole runtime the way the app does, with no React involved.
  // This catches runtime errors that a typecheck cannot see.
  const { engine } = require('./engine') as typeof import('./engine');

  let notified = 0;
  const unsub = engine.subscribe(() => {
    notified++;
  });

  const s0 = engine.getSnapshot();
  assert('starts in the underwater configuration', s0.medium === 'water');
  assert('has a decision before anything happens', !!s0.decision);
  assert(
    'has an explanation with real prose',
    s0.explanation.body.length > 120,
    `${s0.explanation.body.length} chars`,
  );

  // Scenario changes must reach the environment target.
  engine.setScenario('estuary');
  assert('scenario change is applied', engine.getSnapshot().scenario === 'estuary');
  assert('subscribers are notified', notified > 0);

  // Drive the environment hard toward the estuary and re-decide.
  engine.setEnvTarget({ turbidityNtu: 900 });
  for (let i = 0; i < 80; i++) (engine as unknown as { step(): void }).step();
  const murky = engine.getSnapshot();
  assert(
    'environment converges on the target',
    Math.abs(murky.env.turbidityNtu - 900) < 60,
    `${murky.env.turbidityNtu.toFixed(0)} NTU`,
  );

  engine.setEnvTarget({ turbidityNtu: 10 });
  for (let i = 0; i < 80; i++) (engine as unknown as { step(): void }).step();
  const clear = engine.getSnapshot();
  assert(
    'clear water uses a higher centre frequency than murky',
    clear.decision.fCentre > murky.decision.fCentre,
    `${(murky.decision.fCentre / 1000).toFixed(0)} -> ${(clear.decision.fCentre / 1000).toFixed(0)} kHz`,
  );

  // Fire a ping and check the whole signal chain produced sane output.
  const p = engine.fire();
  assert('ping is recorded', engine.getSnapshot().pings.length === 1);
  assert('ping has a display trace', p.rx.length > 100 && p.correlation.length > 100);
  assert(
    'no NaN anywhere in the traces',
    p.rx.every(Number.isFinite) && p.correlation.every(Number.isFinite),
  );
  assert(
    'correlation is normalised to a unit peak',
    Math.max(...p.correlation) > 0.98 && Math.max(...p.correlation) <= 1.0001,
  );
  assert(
    'measured range is inside the display window',
    p.measuredRangeM > 0 && p.measuredRangeM < clear.config.maxRangeBoundM,
    `${p.measuredRangeM.toFixed(1)} m`,
  );
  assert(
    'measured SNR is a real number',
    Number.isFinite(p.measuredSnrDb) && p.measuredSnrDb > -20 && p.measuredSnrDb < 80,
    `${p.measuredSnrDb.toFixed(1)} dB`,
  );
  assert('energy is positive', p.energyMj > 0);

  // Fire several and confirm the closed loop stays bounded.
  for (let i = 0; i < 12; i++) engine.fire();
  const after = engine.getSnapshot();
  assert('ping log accumulates', after.pings.length === 13);
  assert(
    'closed-loop correction stays bounded',
    after.noiseCorrectionDb >= -4 && after.noiseCorrectionDb <= 16,
    `${after.noiseCorrectionDb.toFixed(2)} dB`,
  );

  // Every mode and window must synthesise without exploding.
  for (const m of ['cw', 'lfm', 'geometric', 'barker13'] as const) {
    engine.setMode(m);
    const r = engine.fire();
    assert(
      `mode ${m} produces a finite result`,
      Number.isFinite(r.resolutionM) &&
        Number.isFinite(r.bandwidth) &&
        r.bandwidth > 0 &&
        r.rx.every(Number.isFinite),
    );
  }
  engine.setMode(null);

  for (const w of ['rect', 'hann', 'hamming', 'blackman'] as const) {
    engine.setWindow(w);
    assert(`window ${w} applies`, engine.getSnapshot().decision.window === w);
  }
  engine.setWindow(null);

  // Manual override path.
  engine.setAuto(false);
  engine.setManual({ fCentre: 200_000, bandwidth: 60_000, tau: 0.004, amplitude: 0.6 });
  const man = engine.getSnapshot().decision;
  assert(
    'manual parameters are honoured',
    Math.abs(man.fCentre - 200_000) < 1 && Math.abs(man.tau - 0.004) < 1e-9,
  );
  assert('manual resolution is finite', Number.isFinite(man.resolutionM));
  engine.setAuto(true);

  // Medium switch must not break anything.
  engine.setMedium('air');
  const air = engine.getSnapshot();
  assert('air switch applies', air.medium === 'air' && air.config.medium === 'air');
  assert(
    'air decision sits inside the air band',
    air.decision.fCentre >= air.config.bandLow &&
      air.decision.fCentre <= air.config.bandHigh,
  );
  const airPing = engine.fire();
  assert('air ping works', Number.isFinite(airPing.measuredRangeM));
  engine.setMedium('water');

  engine.clearLog();
  assert('log clears', engine.getSnapshot().pings.length === 0);

  // The closed loop must SETTLE, not run to its clamp. A correction pinned at
  // the limit means the gap never closes -- which is what happens if the
  // simulated truth moves with the correction instead of staying independent.
  engine.setEnvTarget({ turbidityNtu: 900 });
  for (let i = 0; i < 60; i++) (engine as unknown as { step(): void }).step();
  const trace: number[] = [];
  for (let i = 0; i < 40; i++) {
    engine.fire();
    trace.push(engine.getSnapshot().noiseCorrectionDb);
  }
  const tail = trace.slice(-10);
  const spread = Math.max(...tail) - Math.min(...tail);
  assert(
    'closed loop settles rather than drifting',
    spread < 5,
    `last-10 spread ${spread.toFixed(2)} dB`,
  );
  assert(
    'closed loop does not pin at its clamp',
    !tail.every((v) => v >= 19.9),
    `settled near ${(tail.reduce((a, b) => a + b, 0) / tail.length).toFixed(1)} dB`,
  );
  engine.clearLog();

  unsub();
  const before = notified;
  engine.setScenario('reef');
  assert('unsubscribe stops notifications', notified === before);
}

console.log('\nTelemetry wire format');

{
  // The exact line from the firmware spec, docs/11-link-protocol.md. If this
  // assertion ever has to be edited, the firmware has to be reflashed too.
  const LINE =
    '{"t":"tlm","seq":1841,"ms":582103,"st":"tx","temp":26.4,"sal":34.8,' +
    '"ntu":180,"dep":25.3,"ph":8.05,"fc":350667,"bw":298667,"tau":500,' +
    '"amp":0.92,"snr":28.4,"ma":68.0,"mv":3712,"flt":[]}';

  const d = decodeLine(LINE);
  assert('a telemetry line decodes', d?.kind === 'telemetry');

  if (d?.kind === 'telemetry') {
    const p = d.packet;
    check('sequence survives', p.seq, 1841, 0);
    check('temperature survives', p.tempC, 26.4, 1e-9);
    check('depth survives', p.depthM, 25.3, 1e-9);
    check('pH survives', p.ph, 8.05, 1e-9);
    // The wire carries microseconds and the app works in seconds. Getting this
    // conversion wrong scales the time-bandwidth product by a million.
    check('pulse converts us to s', p.tau, 500e-6, 1e-12);
    assert('faults decode as an array', Array.isArray(p.faults) && p.faults.length === 0);

    // The sensed environment the solver then runs on.
    const env = environmentOf(p);
    check('environment carries depth', env.depthM, 25.3, 1e-9);
    check('environment carries pH', env.ph, 8.05, 1e-9);
    const alpha = sensedAbsorptionDbPerM(
      'water',
      p.fCentre,
      env.tempC,
      env.salinityPpt,
      env.depthM,
      env.ph,
    );
    assert(
      'a received packet yields a usable absorption',
      Number.isFinite(alpha) && alpha > 0,
      `${(alpha * 1000).toFixed(1)} dB/km at ${(p.fCentre / 1000).toFixed(0)} kHz`,
    );
  }

  // Missing keys default rather than throw: a firmware that has not wired up
  // every sensor yet still streams, and the screens still draw.
  const sparse = decodeLine('{"t":"tlm","seq":2,"temp":21}');
  assert('a sparse line still decodes', sparse?.kind === 'telemetry');
  if (sparse?.kind === 'telemetry') {
    check('absent pH falls back to the default', sparse.packet.ph, 8.1, 1e-9);
  }

  // Malformed input is counted, never thrown.
  const broken = decodeLine('{"t":"tlm","seq":');
  assert('a truncated line is reported, not thrown', broken?.kind === 'error');

  // A protocol mismatch is refused outright rather than guessed at.
  const idOk = decodeLine(`{"t":"id","name":"SEANERGY-4F2A","fw":"1.0.0","proto":${PROTOCOL_VERSION}}`);
  assert('a matching identity is accepted', idOk?.kind === 'identity');
  const idBad = decodeLine('{"t":"id","name":"X","fw":"9","proto":99}');
  assert(
    'a protocol mismatch is refused',
    idBad?.kind === 'error' && idBad.reason.startsWith('protocol'),
  );

  // Commands end in a newline, because that is the frame boundary.
  const cmd = encodeCommand({ c: 'rate', v: 2 });
  assert('a command is newline terminated', cmd.endsWith('\n'));
  assert('a command round-trips as JSON', JSON.parse(cmd).c === 'rate');

  // Reassembly. No transport delivers whole lines: a USB bulk read returns
  // whatever was in the buffer and a BLE notification is cut at the MTU.
  const a = new LineAssembler();
  assert('a partial line is held back', a.push('{"t":"tlm",').length === 0);
  const joined = a.push('"seq":7}\n{"t":"tlm","seq":8}\n');
  assert('the split line is rejoined and the next one follows', joined.length === 2);
  const first = decodeLine(joined[0]);
  assert(
    'the rejoined line decodes correctly',
    first?.kind === 'telemetry' && first.packet.seq === 7,
  );
  // CRLF from a serial terminal must not corrupt the JSON.
  const b = new LineAssembler();
  const crlf = b.push('{"t":"tlm","seq":9}\r\n');
  assert(
    'carriage returns are stripped',
    crlf.length === 1 && decodeLine(crlf[0])?.kind === 'telemetry',
  );
}

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);

