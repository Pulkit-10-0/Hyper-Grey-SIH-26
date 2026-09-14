/**
 * Turns a WaveDecision into prose a person can read out loud.
 *
 * The text is assembled from the same numbers the decision was made with, so it
 * can never drift from what the payload is actually doing. Where a candidate was
 * rejected, the sentence says which one and why -- that comparison is what makes
 * this read as reasoning rather than as a status line.
 */

import { Environment, MediumConfig, WaveDecision } from './adaptation';
import { MODE_LABEL, WINDOW_LABEL } from './dsp';

export type Explanation = {
  headline: string;
  body: string;
  bullets: { label: string; value: string }[];
};

const kHz = (hz: number) => `${(hz / 1000).toFixed(1)} kHz`;
const ms = (s: number) => `${(s * 1000).toFixed(2)} ms`;

function metres(m: number): string {
  if (m >= 1) return `${m.toFixed(m >= 10 ? 0 : 2)} m`;
  if (m >= 0.01) return `${(m * 100).toFixed(1)} cm`;
  return `${(m * 1000).toFixed(1)} mm`;
}

function turbidityBand(ntu: number): 'clear' | 'moderate' | 'murky' | 'heavy' {
  if (ntu < 60) return 'clear';
  if (ntu < 260) return 'moderate';
  if (ntu < 600) return 'murky';
  return 'heavy';
}

export function explain(
  env: Environment,
  cfg: MediumConfig,
  d: WaveDecision,
): Explanation {
  const band = turbidityBand(env.turbidityNtu);
  const medium = cfg.medium === 'air' ? 'air' : 'water';

  /* ---- headline ------------------------------------------------------ */

  let headline: string;
  if (!d.feasible) {
    headline = 'Conditions exceed what this transducer can reach';
  } else if (band === 'heavy') {
    headline = 'Heavy sediment — trading resolution for penetration';
  } else if (band === 'murky') {
    headline = 'Scattering is rising — pulling the sweep downband';
  } else if (band === 'clear') {
    headline = 'Clear water — taking the widest sweep available';
  } else {
    headline = 'Moderate scattering — balanced sweep';
  }

  /* ---- body ---------------------------------------------------------- */

  const parts: string[] = [];

  // 1. What the environment is doing.
  parts.push(
    `Sound speed in this ${medium} is ${d.soundSpeed.toFixed(1)} m/s at ` +
      `${env.tempC.toFixed(1)} °C` +
      (cfg.medium === 'water'
        ? `, ${env.salinityPpt.toFixed(1)} ppt, ${env.depthM.toFixed(0)} m depth.`
        : '.'),
  );

  // 2. Why the frequency landed where it did.
  const absTotal = d.absorptionDbPerM + d.excessLossDbPerM;
  if (band === 'clear') {
    parts.push(
      `Absorption at ${kHz(d.fCentre)} is only ${absTotal.toFixed(3)} dB/m, so there ` +
        `is loss budget to spare. I spent it on bandwidth: a ${kHz(d.bandwidth)} sweep ` +
        `resolves ${metres(d.resolutionM)}.`,
    );
  } else {
    parts.push(
      `Suspended particles add ${d.excessLossDbPerM.toFixed(3)} dB/m of scattering on ` +
        `top of ${d.absorptionDbPerM.toFixed(3)} dB/m of absorption, and scattering ` +
        `climbs steeply with frequency. Centring at ${kHz(d.fCentre)} keeps total loss ` +
        `to ${absTotal.toFixed(3)} dB/m.`,
    );
  }

  // 3. The comparison — why not something wider.
  if (d.runnerUp) {
    const r = d.runnerUp;
    const why =
      r.reasonRejected === 'snr'
        ? `its echo would come back at ${r.predictedSnrDb.toFixed(1)} dB, under the ` +
          `${cfg.detectionThresholdDb} dB detection threshold`
        : `it would cost more than the ${cfg.energyBudgetMj.toFixed(0)} mJ per-ping budget`;
    parts.push(
      `A ${kHz(r.bandwidth)} sweep at ${kHz(r.fCentre)} would have resolved ` +
        `${metres(r.resolutionM)}, but ${why}. So it lost.`,
    );
  }

  // 4. Pulse length and compression.
  parts.push(
    `A ${ms(d.tau)} pulse gives a time-bandwidth product of ${d.tbp.toFixed(0)}, ` +
      `worth ${d.compressionGainDb.toFixed(1)} dB of compression gain. Uncompressed, ` +
      `that same pulse would only resolve ${metres(d.cwResolutionM)} — compression ` +
      `sharpens it to ${metres(d.resolutionM)}.`,
  );

  // 5. Window choice.
  const wl = WINDOW_LABEL[d.window];
  if (d.window === 'hann') {
    parts.push(
      `SNR margin is thin, so the envelope uses a ${wl} window — it costs less signal ` +
        `than heavier windows while still taming the pulse edges.`,
    );
  } else if (d.window === 'blackman') {
    parts.push(
      `Clutter is high, so the envelope uses a ${wl} window to push sidelobes down ` +
        `to about −58 dB and stop a strong nearby return masking a weak one.`,
    );
  } else {
    parts.push(
      `The envelope uses a ${wl} window, holding sidelobes near −43 dB so the pulse ` +
        `edges cannot stress the output stage or throw up false targets.`,
    );
  }

  // 6. Outcome.
  if (d.feasible) {
    parts.push(
      `Predicted echo SNR at ${metres(cfg.requiredRangeM)} is ` +
        `${d.predictedSnrDb.toFixed(1)} dB, ` +
        `${(d.predictedSnrDb - cfg.detectionThresholdDb).toFixed(1)} dB of margin. ` +
        `Usable out to ${metres(d.maxRangeM)}.`,
    );
  } else {
    parts.push(
      `Even at the most favourable settings the predicted echo is ` +
        `${d.predictedSnrDb.toFixed(1)} dB, short of the ` +
        `${cfg.detectionThresholdDb} dB threshold. Running at best effort — close the ` +
        `range or fit a transducer with more source level.`,
    );
  }

  /* ---- bullets ------------------------------------------------------- */

  const bullets = [
    { label: 'Mode', value: MODE_LABEL[d.mode] },
    { label: 'Centre', value: kHz(d.fCentre) },
    { label: 'Bandwidth', value: kHz(d.bandwidth) },
    { label: 'Pulse', value: ms(d.tau) },
    { label: 'Resolution', value: metres(d.resolutionM) },
    { label: 'Predicted SNR', value: `${d.predictedSnrDb.toFixed(1)} dB` },
  ];

  return { headline, body: parts.join(' '), bullets };
}

/** Short one-line version for the log rows. */
export function explainShort(d: WaveDecision): string {
  return (
    `${kHz(d.fCentre)} · ${kHz(d.bandwidth)} BW · ${ms(d.tau)} · ` +
    `${d.predictedSnrDb.toFixed(1)} dB`
  );
}

export { metres as formatMetres, kHz as formatKHz, ms as formatMs };
