/**
 * The adaptation engine: environment in, transmit parameters out, with a
 * human-readable justification.
 *
 * Nothing here is a lookup table. Every decision is produced by evaluating
 * candidate parameter sets against the sonar equation and picking the best
 * feasible one. The runner-up is kept so the explanation can say why the
 * winner beat it rather than merely stating the result.
 */

import {
  absorptionDbPerM,
  clamp,
  compressionGainDb,
  echoSnrDb,
  Medium,
  rangeResolutionChirp,
  rangeResolutionCw,
  soundSpeed,
  timeBandwidthProduct,
} from './physics';
import { WaveMode, WindowKind } from './dsp';

export type Environment = {
  tempC: number;
  /** parts per thousand */
  salinityPpt: number;
  turbidityNtu: number;
  depthM: number;
};

export type MediumConfig = {
  medium: Medium;
  /** Hz, lower edge of the transducer's usable band */
  bandLow: number;
  /** Hz, upper edge */
  bandHigh: number;
  /** metres, the range the mission requires */
  requiredRangeM: number;
  /** metres, furthest plausible range for the bisection bound */
  maxRangeBoundM: number;
  sourceLevelDb: number;
  targetStrengthDb: number;
  directivityIndexDb: number;
  /** dB, minimum acceptable echo SNR */
  detectionThresholdDb: number;
  /** seconds */
  tauMin: number;
  tauMax: number;
  /** millijoules available for one ping */
  energyBudgetMj: number;
  /**
   * Scattering model. Excess loss from suspended particles is referenced to
   * `scatterRefHz` so the coefficient means the same thing in either medium:
   * at the reference frequency and 800 NTU, scattering roughly matches the
   * medium's own absorption.
   */
  scatterRefHz: number;
  scatterCoeff: number;
};

export const AIR_CONFIG: MediumConfig = {
  medium: 'air',
  bandLow: 28_000,
  bandHigh: 52_000,
  requiredRangeM: 4.5,
  maxRangeBoundM: 12,
  sourceLevelDb: 98,
  targetStrengthDb: -8,
  directivityIndexDb: 12,
  detectionThresholdDb: 10,
  tauMin: 0.0008,
  tauMax: 0.008,
  energyBudgetMj: 9,
  scatterRefHz: 38_200,
  scatterCoeff: 1.51e-3,
};

export const WATER_CONFIG: MediumConfig = {
  medium: 'water',
  bandLow: 100_000,
  bandHigh: 500_000,
  requiredRangeM: 220,
  maxRangeBoundM: 600,
  sourceLevelDb: 196,
  targetStrengthDb: -14,
  directivityIndexDb: 20,
  detectionThresholdDb: 12,
  tauMin: 0.0005,
  tauMax: 0.012,
  energyBudgetMj: 46,
  scatterRefHz: 223_000,
  scatterCoeff: 9.2e-5,
};

export type WaveDecision = {
  mode: WaveMode;
  window: WindowKind;
  fStart: number;
  fStop: number;
  fCentre: number;
  bandwidth: number;
  tau: number;
  amplitude: number;

  soundSpeed: number;
  absorptionDbPerM: number;
  excessLossDbPerM: number;
  predictedSnrDb: number;
  maxRangeM: number;
  resolutionM: number;
  cwResolutionM: number;
  tbp: number;
  compressionGainDb: number;
  energyMj: number;
  feasible: boolean;

  runnerUp?: {
    fCentre: number;
    bandwidth: number;
    predictedSnrDb: number;
    resolutionM: number;
    reasonRejected: string;
  };
};

/**
 * Extra propagation loss from suspended sediment, dB per metre.
 *
 * Scattering rises steeply with frequency, which is the physical reason a murky
 * estuary forces you downband. Referenced to the medium's own band so the same
 * expression is meaningful in air and in water.
 */
export function excessScatteringDbPerM(
  cfg: MediumConfig,
  turbidityNtu: number,
  freqHz: number,
): number {
  return (
    cfg.scatterCoeff *
    Math.max(0, turbidityNtu) *
    Math.pow(freqHz / cfg.scatterRefHz, 1.5)
  );
}

/**
 * Ambient noise rises a little in disturbed, particle-laden water.
 * `correctionDb` is the closed-loop term: when measured echoes come back weaker
 * than predicted, this grows and the next decision is made more conservatively.
 */
function noiseLevelDb(
  cfg: MediumConfig,
  env: Environment,
  correctionDb: number,
): number {
  const base = cfg.medium === 'air' ? 34 : 52;
  return base + Math.min(8, env.turbidityNtu / 140) + correctionDb;
}

function energyForMj(cfg: MediumConfig, tau: number, amplitude: number): number {
  const peakMw = cfg.medium === 'air' ? 900 : 4200;
  return (peakMw * amplitude * amplitude * tau * 1000) / 1000;
}

/**
 * Design margin demanded above the bare detection threshold.
 *
 * Scattering media are exactly where a propagation model is least trustworthy,
 * so the dirtier the water, the more headroom a parameter set must show before
 * it is considered safe to use. This is what stops the optimiser chasing the
 * widest possible sweep straight into a murky estuary: high-frequency candidates
 * lose margin fastest, so the winner moves downband on its own.
 */
export function requiredMarginDb(env: Environment): number {
  return 3 + Math.min(12, env.turbidityNtu / 70);
}

/**
 * Waveform family, each chosen for a stated reason rather than as a menu item.
 *
 *  barker13   Constant envelope, so the output stage runs at full efficiency
 *             for the whole pulse. Worth the loss of bandwidth only when SNR
 *             margin is nearly gone and every dB of acoustic output counts.
 *  geometric  A geometric (hyperbolic) sweep degrades far less than a linear
 *             one under Doppler shift, so it suits a moving platform working
 *             at long stand-off range.
 *  lfm        Best resolution per unit of transmitted energy. The default.
 */
function pickMode(env: Environment, cfg: MediumConfig, snrMargin: number): WaveMode {
  const deep = env.depthM > 90;
  const longRange = cfg.requiredRangeM > 0.65 * cfg.maxRangeBoundM;
  if (snrMargin < 2) return 'barker13';
  if (deep || longRange) return 'geometric';
  return 'lfm';
}

function pickWindow(env: Environment, snrMargin: number): WindowKind {
  if (snrMargin < 3) return 'hann';
  if (env.turbidityNtu > 400) return 'blackman';
  return 'hamming';
}

/**
 * Evaluate a grid of candidate parameter sets and return the best feasible one.
 *
 * Objective: maximise bandwidth (and therefore range resolution), subject to
 * predicted echo SNR clearing the detection threshold at the required range,
 * and to the per-ping energy budget.
 */
export function decide(
  env: Environment,
  cfg: MediumConfig,
  noiseCorrectionDb = 0,
): WaveDecision {
  const c = soundSpeed(cfg.medium, env.tempC, env.salinityPpt, env.depthM);
  const nl = noiseLevelDb(cfg, env, noiseCorrectionDb);
  const margin = requiredMarginDb(env);

  const centreSteps = 13;
  const tauSteps = 6;
  const bwFractions = [0.9, 0.7, 0.5, 0.32, 0.18, 0.08];

  type Cand = {
    fCentre: number;
    bandwidth: number;
    tau: number;
    amplitude: number;
    snr: number;
    energy: number;
    resolution: number;
    alpha: number;
    excess: number;
    gain: number;
    tbp: number;
    feasible: boolean;
  };

  const cands: Cand[] = [];
  const bandSpan = cfg.bandHigh - cfg.bandLow;

  for (let ci = 0; ci < centreSteps; ci++) {
    const fCentre =
      cfg.bandLow + bandSpan * (0.12 + 0.76 * (ci / (centreSteps - 1)));
    const alpha = absorptionDbPerM(cfg.medium, fCentre);
    const excess = excessScatteringDbPerM(cfg, env.turbidityNtu, fCentre);

    for (const frac of bwFractions) {
      // bandwidth cannot run past the transducer's edges
      const maxBw = Math.min(
        bandSpan * 0.92,
        2 * Math.min(fCentre - cfg.bandLow, cfg.bandHigh - fCentre),
      );
      const bandwidth = Math.max(200, Math.min(maxBw, fCentre * frac));

      for (let ti = 0; ti < tauSteps; ti++) {
        const tau =
          cfg.tauMin +
          (cfg.tauMax - cfg.tauMin) * (ti / (tauSteps - 1));

        // Longer pulses need less peak amplitude for the same detection.
        const amplitude = clamp(0.42 + 0.5 * (1 - ti / (tauSteps - 1)), 0.3, 0.95);
        const energy = energyForMj(cfg, tau, amplitude);
        const tbp = timeBandwidthProduct(tau, bandwidth);
        const gain = compressionGainDb(tbp);

        const snr = echoSnrDb({
          sourceLevelDb: cfg.sourceLevelDb + 20 * Math.log10(amplitude),
          rangeM: cfg.requiredRangeM,
          absorptionDbPerM: alpha + excess,
          targetStrengthDb: cfg.targetStrengthDb,
          noiseLevelDb: nl,
          directivityIndexDb: cfg.directivityIndexDb,
          processingGainDb: gain,
        });

        cands.push({
          fCentre,
          bandwidth,
          tau,
          amplitude,
          snr,
          energy,
          resolution: rangeResolutionChirp(c, bandwidth),
          alpha,
          excess,
          gain,
          tbp,
          feasible: snr >= cfg.detectionThresholdDb + margin && energy <= cfg.energyBudgetMj,
        });
      }
    }
  }

  // Preferred: clears the threshold with the full design margin.
  // Fallback:  clears the bare threshold. Last resort: strongest echo available.
  let feasible = cands.filter((k) => k.feasible);
  if (feasible.length === 0) {
    feasible = cands.filter(
      (k) => k.snr >= cfg.detectionThresholdDb && k.energy <= cfg.energyBudgetMj,
    );
  }

  // Prefer the widest bandwidth; break ties on the cheaper ping.
  const rank = (a: Cand, b: Cand) =>
    b.bandwidth - a.bandwidth || a.energy - b.energy;

  let best: Cand;
  let runner: Cand | undefined;
  let isFeasible = true;

  if (feasible.length > 0) {
    const sorted = [...feasible].sort(rank);
    best = sorted[0];
    // runner-up = the widest candidate we had to reject, for the explanation
    const rejected = cands
      .filter((k) => !k.feasible && k.bandwidth > best.bandwidth)
      .sort((a, b) => b.bandwidth - a.bandwidth);
    runner = rejected[0];
  } else {
    // Nothing clears the threshold: fall back to the strongest echo we can get.
    best = [...cands].sort((a, b) => b.snr - a.snr)[0];
    isFeasible = false;
  }

  const snrMargin = best.snr - cfg.detectionThresholdDb;
  const mode = pickMode(env, cfg, snrMargin);
  const window = pickWindow(env, snrMargin);

  const isSwept = mode === 'lfm' || mode === 'geometric';
  // A phase-coded pulse's bandwidth is its chip rate: 13 chips across the pulse.
  // An unmodulated tone's is simply the reciprocal of its length.
  const codedBandwidth = mode === 'barker13' ? 13 / best.tau : 1 / best.tau;
  const bandwidth = isSwept ? best.bandwidth : codedBandwidth;
  const fStart = isSwept ? best.fCentre - best.bandwidth / 2 : best.fCentre;
  const fStop = isSwept ? best.fCentre + best.bandwidth / 2 : best.fCentre;

  const maxRangeM = solveMaxRange(cfg, best, nl);

  return {
    mode,
    window,
    fStart: Math.max(cfg.bandLow, fStart),
    fStop: Math.min(cfg.bandHigh, fStop),
    fCentre: best.fCentre,
    bandwidth,
    tau: best.tau,
    amplitude: best.amplitude,

    soundSpeed: c,
    absorptionDbPerM: best.alpha,
    excessLossDbPerM: best.excess,
    predictedSnrDb: best.snr,
    maxRangeM,
    resolutionM: isSwept
      ? rangeResolutionChirp(c, best.bandwidth)
      : rangeResolutionCw(c, best.tau),
    cwResolutionM: rangeResolutionCw(c, best.tau),
    tbp: best.tbp,
    compressionGainDb: best.gain,
    energyMj: best.energy,
    feasible: isFeasible,

    runnerUp: runner
      ? {
          fCentre: runner.fCentre,
          bandwidth: runner.bandwidth,
          predictedSnrDb: runner.snr,
          resolutionM: runner.resolution,
          reasonRejected:
            runner.snr < cfg.detectionThresholdDb ? 'snr' : 'energy',
        }
      : undefined,
  };
}

function solveMaxRange(cfg: MediumConfig, best: any, nl: number): number {
  let lo = 0.05;
  let hi = cfg.maxRangeBoundM;
  const snrAt = (r: number) =>
    echoSnrDb({
      sourceLevelDb: cfg.sourceLevelDb + 20 * Math.log10(best.amplitude),
      rangeM: r,
      absorptionDbPerM: best.alpha + best.excess,
      targetStrengthDb: cfg.targetStrengthDb,
      noiseLevelDb: nl,
      directivityIndexDb: cfg.directivityIndexDb,
      processingGainDb: best.gain,
    });
  if (snrAt(lo) < cfg.detectionThresholdDb) return 0;
  if (snrAt(hi) >= cfg.detectionThresholdDb) return hi;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (snrAt(mid) >= cfg.detectionThresholdDb) lo = mid;
    else hi = mid;
  }
  return lo;
}
