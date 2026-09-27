/**
 * Acoustic physics. Pure functions, no React, no React Native.
 *
 * Internal units are fixed and never vary:
 *   frequency  Hz
 *   distance   metres
 *   time       seconds
 *   temp       degrees Celsius
 *   salinity   ppt (parts per thousand)
 *   absorption dB per METRE
 *
 * Convert only at the UI boundary.
 */

export type Medium = 'air' | 'water';

/* ------------------------------------------------------------------ */
/* Sound speed                                                         */
/* ------------------------------------------------------------------ */

/** Dry air, 0-40 C. Standard linear approximation. */
export function soundSpeedAir(tempC: number): number {
  return 331.3 + 0.606 * tempC;
}

/**
 * Mackenzie (1981) nine-term equation for sea water.
 * Valid 2-30 C, 25-40 ppt, 0-8000 m. Inputs are clamped to that envelope.
 */
export function soundSpeedWater(tempC: number, salinityPpt: number, depthM: number): number {
  const T = clamp(tempC, -2, 35);
  const S = clamp(salinityPpt, 0, 45);
  const Z = clamp(depthM, 0, 8000);
  return (
    1448.96 +
    4.591 * T -
    5.304e-2 * T * T +
    2.374e-4 * T * T * T +
    (S - 35) * (1.34 - 1.025e-2 * T) +
    1.63e-2 * Z +
    1.675e-7 * Z * Z -
    7.139e-13 * T * Z * Z * Z
  );
}

export function soundSpeed(
  medium: Medium,
  tempC: number,
  salinityPpt: number,
  depthM: number,
): number {
  return medium === 'air'
    ? soundSpeedAir(tempC)
    : soundSpeedWater(tempC, salinityPpt, depthM);
}

/* ------------------------------------------------------------------ */
/* Absorption                                                          */
/* ------------------------------------------------------------------ */

/**
 * Thorp's expression for sea water absorption, dB/km, f in kHz.
 * Reference values: ~34 dB/km at 100 kHz, ~51 at 200 kHz, ~87 at 400 kHz.
 */
export function thorpDbPerKm(freqKHz: number): number {
  const f = Math.max(freqKHz, 0.1);
  const f2 = f * f;
  return (
    (0.11 * f2) / (1 + f2) + (44 * f2) / (4100 + f2) + 2.75e-4 * f2 + 0.003
  );
}

/**
 * Air absorption, dB/m. Empirical power-law fit to ISO 9613-1 at 20 C / 50% RH,
 * anchored on 0.35 dB/m at 20 kHz and 1.2 dB/m at 40 kHz.
 * Intended for the 10-100 kHz band this payload operates in.
 */
export function airAbsorptionDbPerM(freqKHz: number): number {
  const f = Math.max(freqKHz, 0.1);
  return 0.00169 * Math.pow(f, 1.78);
}

/** Unified absorption in dB per metre for either medium. */
export function absorptionDbPerM(medium: Medium, freqHz: number): number {
  const kHz = freqHz / 1000;
  return medium === 'air' ? airAbsorptionDbPerM(kHz) : thorpDbPerKm(kHz) / 1000;
}

/* ------------------------------------------------------------------ */
/* Francois-Garrison: the sensed-water absorption model                */
/* ------------------------------------------------------------------ */

/**
 * Francois and Garrison (1982) absorption, dB/km, f in kHz.
 *
 * Thorp's expression above is a one-variable fit: frequency in, decibels out,
 * with temperature, salinity, depth and pH baked in at nominal values. It is
 * still used as a cross-check, and it is what the published reference figures
 * in the verification suite are quoted against.
 *
 * This form takes the sensed quantities directly, which is what makes the pH
 * and depth channels worth carrying:
 *
 *   boric acid relaxation   scales with pH and salinity, relaxes near 1 kHz
 *   magnesium sulphate      the dominant term across this payload's band,
 *                           suppressed by pressure through P2
 *   pure water viscosity    rises as f^2, suppressed by pressure through P3
 *
 * Depth enters as pressure and is the larger of the two new effects: at 220 m
 * the magnesium sulphate term is reduced by roughly 3 per cent. pH moves the
 * boric term, which is small above about 10 kHz. Both are reported separately
 * by `absorptionTermsDbPerKm` so the contribution of each sensor is visible
 * rather than asserted.
 */
export function francoisGarrisonDbPerKm(
  freqKHz: number,
  tempC: number,
  salinityPpt: number,
  depthM: number,
  ph: number,
): number {
  const t = absorptionTermsDbPerKm(freqKHz, tempC, salinityPpt, depthM, ph);
  return t.boric + t.magnesium + t.water;
}

export type AbsorptionTerms = {
  /** Boric acid relaxation, dB/km. The pH-sensitive term. */
  boric: number;
  /** Magnesium sulphate relaxation, dB/km. Dominant in this band. */
  magnesium: number;
  /** Pure water viscosity, dB/km. */
  water: number;
};

/** The three Francois-Garrison terms, kept separate. */
export function absorptionTermsDbPerKm(
  freqKHz: number,
  tempC: number,
  salinityPpt: number,
  depthM: number,
  ph: number,
): AbsorptionTerms {
  const f = Math.max(freqKHz, 0.01);
  const f2 = f * f;
  const T = clamp(tempC, -2, 40);
  const S = clamp(salinityPpt, 0, 45);
  const D = clamp(depthM, 0, 8000);
  const pH = clamp(ph, 5, 10);

  // Sound speed used inside the fit; the paper's own simplified expression.
  const c = 1412 + 3.21 * T + 1.19 * S + 0.0167 * D;

  // Boric acid: the only term that sees pH.
  const A1 = (8.86 / c) * Math.pow(10, 0.78 * pH - 5);
  const f1 = 2.8 * Math.sqrt(S / 35) * Math.pow(10, 4 - 1245 / (273 + T));
  const boric = (A1 * f1 * f2) / (f1 * f1 + f2);

  // Magnesium sulphate: pressure-suppressed through P2.
  const A2 = ((21.44 * S) / c) * (1 + 0.025 * T);
  const P2 = 1 - 1.37e-4 * D + 6.2e-9 * D * D;
  const f2r =
    (8.17 * Math.pow(10, 8 - 1990 / (273 + T))) / (1 + 0.0018 * (S - 35));
  const magnesium = (A2 * P2 * f2r * f2) / (f2r * f2r + f2);

  // Pure water viscosity: two temperature branches in the original paper.
  const A3 =
    T <= 20
      ? 4.937e-4 - 2.59e-5 * T + 9.11e-7 * T * T - 1.5e-8 * T * T * T
      : 3.964e-4 - 1.146e-5 * T + 1.45e-7 * T * T - 6.5e-10 * T * T * T;
  const P3 = 1 - 3.83e-5 * D + 4.9e-10 * D * D;
  const water = A3 * P3 * f2;

  return { boric, magnesium, water };
}

/**
 * Absorption in dB per metre from the sensed environment.
 *
 * Water uses Francois-Garrison with the live temperature, salinity, depth and
 * pH. Air keeps the fitted power law, which has no equivalent sensed form here.
 */
export function sensedAbsorptionDbPerM(
  medium: Medium,
  freqHz: number,
  tempC: number,
  salinityPpt: number,
  depthM: number,
  ph: number,
): number {
  const kHz = freqHz / 1000;
  if (medium === 'air') return airAbsorptionDbPerM(kHz);
  return francoisGarrisonDbPerKm(kHz, tempC, salinityPpt, depthM, ph) / 1000;
}

/* ------------------------------------------------------------------ */
/* Sonar equation                                                      */
/* ------------------------------------------------------------------ */

export type SonarInputs = {
  sourceLevelDb: number;
  rangeM: number;
  absorptionDbPerM: number;
  targetStrengthDb: number;
  noiseLevelDb: number;
  directivityIndexDb: number;
  /** Coherent processing gain from pulse compression, dB. */
  processingGainDb: number;
};

/** One-way transmission loss: spherical spreading plus absorption. */
export function transmissionLossDb(rangeM: number, alphaDbPerM: number): number {
  const r = Math.max(rangeM, 0.05);
  return 20 * Math.log10(r) + alphaDbPerM * r;
}

/** Echo signal-to-noise ratio in dB. */
export function echoSnrDb(i: SonarInputs): number {
  const tl = transmissionLossDb(i.rangeM, i.absorptionDbPerM);
  return (
    i.sourceLevelDb -
    2 * tl +
    i.targetStrengthDb -
    i.noiseLevelDb +
    i.directivityIndexDb +
    i.processingGainDb
  );
}

/**
 * Largest range at which echoSnrDb still clears `thresholdDb`.
 * Monotonic in range, so a bisection is exact enough and cheap.
 */
export function maxDetectionRange(
  i: Omit<SonarInputs, 'rangeM'>,
  thresholdDb: number,
  hiBound: number,
): number {
  let lo = 0.05;
  let hi = hiBound;
  if (echoSnrDb({ ...i, rangeM: lo }) < thresholdDb) return 0;
  if (echoSnrDb({ ...i, rangeM: hi }) >= thresholdDb) return hi;
  for (let n = 0; n < 60; n++) {
    const mid = (lo + hi) / 2;
    if (echoSnrDb({ ...i, rangeM: mid }) >= thresholdDb) lo = mid;
    else hi = mid;
  }
  return lo;
}

/* ------------------------------------------------------------------ */
/* Resolution and pulse compression                                    */
/* ------------------------------------------------------------------ */

/** An unmodulated pulse resolves no finer than half its own length. */
export const rangeResolutionCw = (c: number, tauS: number): number => (c * tauS) / 2;

/** A swept pulse resolves to c / 2B, independent of its duration. */
export const rangeResolutionChirp = (c: number, bandwidthHz: number): number =>
  bandwidthHz > 0 ? c / (2 * bandwidthHz) : Number.POSITIVE_INFINITY;

/** Time-bandwidth product; equals the pulse compression ratio. */
export const timeBandwidthProduct = (tauS: number, bandwidthHz: number): number =>
  tauS * bandwidthHz;

/** Coherent gain from compressing a pulse of time-bandwidth product `tbp`. */
export const compressionGainDb = (tbp: number): number =>
  tbp > 1 ? 10 * Math.log10(tbp) : 0;

/* ------------------------------------------------------------------ */

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

export function invLerp(a: number, b: number, v: number): number {
  return b === a ? 0 : clamp((v - a) / (b - a), 0, 1);
}
