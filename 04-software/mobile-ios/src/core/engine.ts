/**
 * The payload engine.
 *
 * Holds environment state, runs the adaptation decision, synthesises pulses,
 * simulates the returning echo and closes the loop on the difference between
 * predicted and measured SNR.
 *
 * Everything is computed. Nothing is a recording.
 *
 * A note on the simulated traces: the reported figures (bandwidth, time-bandwidth
 * product, compression gain, range resolution) are computed analytically from the
 * real parameters and are exact. The A-scan and correlation traces are rendered at
 * a reduced, bounded scale so the plots stay responsive at any bandwidth -- they
 * show the correct shape and the correct relative sidelobe structure, which is what
 * a trace is for.
 */

import {
  AIR_CONFIG,
  decide,
  Environment,
  MediumConfig,
  WATER_CONFIG,
  WaveDecision,
} from './adaptation';
import {
  decimate,
  gaussian,
  makeRandom,
  matchedFilter,
  synthesise,
  WaveMode,
  WindowKind,
  WaveParams,
} from './dsp';
import { explain, Explanation } from './explain';
import { clamp, Medium } from './physics';
import { endurance, Endurance, pingEnergy, PingEnergy } from './power';
import { SCENARIOS, ScenarioId } from '../data/scenarios';
import { link } from './link';
import { environmentOf, type TelemetryPacket } from './protocol';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type PingRecord = {
  id: number;
  at: number;
  medium: Medium;
  env: Environment;
  mode: WaveMode;
  window: WindowKind;
  fCentre: number;
  bandwidth: number;
  tau: number;
  amplitude: number;
  resolutionM: number;
  tbp: number;
  compressionGainDb: number;
  predictedSnrDb: number;
  measuredSnrDb: number;
  errorDb: number;
  trueRangeM: number;
  measuredRangeM: number;
  peakToSidelobeDb: number;
  energyMj: number;
  headline: string;
  /** decimated for display */
  rx: number[];
  correlation: number[];
};

export type ManualParams = {
  fCentre: number;
  bandwidth: number;
  tau: number;
  amplitude: number;
};

/**
 * SIMULATION drives every value from the on-device physics engine.
 * TELEMETRY reads them off the payload link and is read-only.
 */
export type Source = 'sim' | 'live';

export type EngineSnapshot = {
  running: boolean;
  source: Source;
  medium: Medium;
  config: MediumConfig;
  env: Environment;
  envTarget: Environment;
  scenario: ScenarioId | 'custom';
  auto: boolean;
  modeOverride: WaveMode | null;
  windowOverride: WindowKind | null;
  manual: ManualParams;
  decision: WaveDecision;
  explanation: Explanation;
  waveParams: WaveParams;
  energy: PingEnergy;
  endurance: Endurance;
  pingIntervalS: number;
  noiseCorrectionDb: number;
  firing: boolean;
  pings: PingRecord[];
  lastPing: PingRecord | null;
  tick: number;
  bootedAt: number;
  /** Last packet decoded from the payload. Null in simulation. */
  telemetry: TelemetryPacket | null;
};

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const TICK_MS = 200;
const MAX_PINGS = 200;
const REPLICA_N = 448;
const RX_N = 1792;
const DISPLAY_POINTS = 320;
/** Bound on simulated time-bandwidth product, so traces stay cheap to compute. */
const SIM_TBP_CAP = 180;

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

class PayloadEngine {
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private rand = makeRandom(0x5ea0);
  private nextId = 1;
  private snap: EngineSnapshot;
  private unsubscribeLink: (() => void) | null = null;

  constructor() {
    // Default to the underwater configuration: that is the band the payload
    // is specified for. The air configuration matches the bench transducer pair.
    const cfg = WATER_CONFIG;
    const s = SCENARIOS.find((x) => x.id === 'coastal')!;
    const env: Environment = {
      tempC: s.tempC,
      salinityPpt: s.salinityPpt,
      turbidityNtu: s.turbidityNtu,
      depthM: s.depthM,
      ph: s.ph,
    };
    const decision = decide(env, cfg, 0);
    this.snap = {
      running: false,
      source: 'sim',
      telemetry: null,
      medium: 'water',
      config: cfg,
      env: { ...env },
      envTarget: { ...env },
      scenario: 'coastal',
      auto: true,
      modeOverride: null,
      windowOverride: null,
      manual: {
        fCentre: decision.fCentre,
        bandwidth: decision.bandwidth,
        tau: decision.tau,
        amplitude: decision.amplitude,
      },
      decision,
      explanation: explain(env, cfg, decision),
      waveParams: toWaveParams(decision),
      energy: pingEnergy(decision.tau, decision.amplitude),
      endurance: endurance(pingEnergy(decision.tau, decision.amplitude), 10),
      pingIntervalS: 10,
      noiseCorrectionDb: 0,
      firing: false,
      pings: [],
      lastPing: null,
      tick: 0,
      bootedAt: Date.now(),
    };
  }

  /* ---- subscription (React useSyncExternalStore) ---- */

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getSnapshot = (): EngineSnapshot => this.snap;

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  private set(patch: Partial<EngineSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.emit();
  }

  /* ---- lifecycle ---- */

  start() {
    if (this.timer) return;
    if (!this.unsubscribeLink) this.unsubscribeLink = link.onChange(this.onTelemetry);
    this.timer = setInterval(() => this.step(), TICK_MS);
    this.set({ running: true });
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.set({ running: false });
  }

  /**
   * One tick: nudge the environment toward its target with a little noise, so the
   * readings behave like real sensors rather than frozen constants.
   */
  private step() {
    const s = this.snap;
    // In telemetry mode the payload owns the environment. Drifting a simulated
    // one underneath real readings would overwrite them between packets.
    if (s.source === 'live') {
      this.snap = { ...this.snap, tick: this.snap.tick + 1 };
      this.emit();
      return;
    }
    const t = s.envTarget;
    const e = s.env;
    const pull = 0.14;
    const n = () => gaussian(this.rand);

    const env: Environment = {
      tempC: e.tempC + (t.tempC - e.tempC) * pull + n() * 0.035,
      salinityPpt: Math.max(
        0,
        e.salinityPpt + (t.salinityPpt - e.salinityPpt) * pull + n() * 0.03,
      ),
      turbidityNtu: Math.max(
        0,
        e.turbidityNtu + (t.turbidityNtu - e.turbidityNtu) * pull + n() * 1.6,
      ),
      depthM: Math.max(0, e.depthM + (t.depthM - e.depthM) * pull + n() * 0.06),
      ph: clamp(e.ph + (t.ph - e.ph) * pull + n() * 0.004, 6, 9.5),
    };

    this.snap = { ...this.snap, env, tick: this.snap.tick + 1 };

    // Re-decide only when the environment has actually moved. Sensor drift of a
    // hundredth of a degree must not churn the decision or make the explanation
    // text flicker five times a second.
    if (this.envMovedEnough(env)) {
      this.decidedAt = { ...env };
      this.recompute();
    } else {
      this.emit();
    }
  }

  private decidedAt: Environment | null = null;

  private envMovedEnough(env: Environment): boolean {
    const p = this.decidedAt;
    if (!p) return true;
    return (
      Math.abs(env.tempC - p.tempC) > 0.15 ||
      Math.abs(env.salinityPpt - p.salinityPpt) > 0.15 ||
      Math.abs(env.turbidityNtu - p.turbidityNtu) > 4 ||
      Math.abs(env.depthM - p.depthM) > 0.5 ||
      Math.abs(env.ph - p.ph) > 0.05
    );
  }

  /** Re-run the decision and everything downstream of it. */
  private recompute() {
    const s = this.snap;
    let decision = decide(s.env, s.config, s.noiseCorrectionDb);

    if (s.modeOverride) decision = { ...decision, mode: s.modeOverride };
    if (s.windowOverride) decision = { ...decision, window: s.windowOverride };

    if (!s.auto) {
      const m = s.manual;
      const swept = decision.mode === 'lfm' || decision.mode === 'geometric';
      decision = {
        ...decision,
        fCentre: m.fCentre,
        bandwidth: swept
          ? m.bandwidth
          : decision.mode === 'barker13'
            ? 13 / m.tau
            : 1 / m.tau,
        fStart: swept ? m.fCentre - m.bandwidth / 2 : m.fCentre,
        fStop: swept ? m.fCentre + m.bandwidth / 2 : m.fCentre,
        tau: m.tau,
        amplitude: m.amplitude,
        tbp: swept ? m.tau * m.bandwidth : 1,
        compressionGainDb: swept
          ? 10 * Math.log10(Math.max(1, m.tau * m.bandwidth))
          : 0,
        resolutionM: swept
          ? decision.soundSpeed / (2 * m.bandwidth)
          : (decision.soundSpeed * m.tau) / 2,
        cwResolutionM: (decision.soundSpeed * m.tau) / 2,
      };
    }

    // Telemetry mode: the payload already chose. Show what it actually
    // transmitted rather than what this handset would have picked, and derive
    // the dependent quantities from those reported parameters so resolution and
    // compression gain describe the real pulse.
    const p = s.source === 'live' ? s.telemetry : null;
    if (p && p.fCentre > 0 && p.tau > 0) {
      const swept = p.bandwidth > 0;
      const bandwidth = swept ? p.bandwidth : 1 / p.tau;
      decision = {
        ...decision,
        fCentre: p.fCentre,
        bandwidth,
        fStart: swept ? p.fCentre - bandwidth / 2 : p.fCentre,
        fStop: swept ? p.fCentre + bandwidth / 2 : p.fCentre,
        tau: p.tau,
        amplitude: p.amplitude > 0 ? p.amplitude : decision.amplitude,
        tbp: p.tau * bandwidth,
        compressionGainDb: 10 * Math.log10(Math.max(1, p.tau * bandwidth)),
        resolutionM: decision.soundSpeed / (2 * bandwidth),
        cwResolutionM: (decision.soundSpeed * p.tau) / 2,
        predictedSnrDb: p.predictedSnrDb !== 0 ? p.predictedSnrDb : decision.predictedSnrDb,
      };
    }

    const energy = pingEnergy(decision.tau, decision.amplitude);
    this.snap = {
      ...this.snap,
      decision,
      explanation: explain(this.snap.env, this.snap.config, decision),
      waveParams: toWaveParams(decision),
      energy,
      endurance: endurance(energy, this.snap.pingIntervalS),
    };
    this.decidedAt = { ...this.snap.env };
    this.emit();
  }

  /**
   * A packet arrived. The payload's sensors become the environment and its
   * chosen parameters become the decision.
   */
  private onTelemetry = () => {
    if (this.snap.source !== 'live') return;
    const p = link.latest();
    if (!p || p === this.snap.telemetry) return;
    this.snap = { ...this.snap, telemetry: p, env: environmentOf(p) };
    this.recompute();
  };

  /* ---- commands ---- */

  setSource(source: Source) {
    if (source === this.snap.source) return;
    if (source === 'sim') link.disconnect();
    this.snap = { ...this.snap, telemetry: null };
    this.set({ source });
    // Clear any telemetry override from the decision now rather than on the
    // next tick, which may never arrive if the engine is paused.
    this.recompute();
    if (source === 'live') this.onTelemetry();
  }

  setMedium(medium: Medium) {
    const config = medium === 'air' ? AIR_CONFIG : WATER_CONFIG;
    const d = decide(this.snap.env, config, 0);
    this.snap = {
      ...this.snap,
      medium,
      config,
      noiseCorrectionDb: 0,
      manual: {
        fCentre: d.fCentre,
        bandwidth: d.bandwidth,
        tau: d.tau,
        amplitude: d.amplitude,
      },
    };
    this.recompute();
  }

  setScenario(id: ScenarioId) {
    const s = SCENARIOS.find((x) => x.id === id);
    if (!s) return;
    this.snap = {
      ...this.snap,
      scenario: id,
      envTarget: {
        tempC: s.tempC,
        salinityPpt: s.salinityPpt,
        turbidityNtu: s.turbidityNtu,
        depthM: s.depthM,
        ph: s.ph,
      },
    };
    this.emit();
  }

  setEnvTarget(patch: Partial<Environment>) {
    this.snap = {
      ...this.snap,
      scenario: 'custom',
      envTarget: { ...this.snap.envTarget, ...patch },
    };
    this.emit();
  }

  setAuto(auto: boolean) {
    if (auto) {
      this.snap = { ...this.snap, auto };
    } else {
      const d = this.snap.decision;
      this.snap = {
        ...this.snap,
        auto,
        manual: {
          fCentre: d.fCentre,
          bandwidth: d.bandwidth,
          tau: d.tau,
          amplitude: d.amplitude,
        },
      };
    }
    this.recompute();
  }

  setManual(patch: Partial<ManualParams>) {
    this.snap = {
      ...this.snap,
      auto: false,
      manual: { ...this.snap.manual, ...patch },
    };
    this.recompute();
  }

  setMode(mode: WaveMode | null) {
    this.snap = { ...this.snap, modeOverride: mode };
    this.recompute();
  }

  setWindow(window: WindowKind | null) {
    this.snap = { ...this.snap, windowOverride: window };
    this.recompute();
  }

  setPingInterval(seconds: number) {
    this.snap = { ...this.snap, pingIntervalS: clamp(seconds, 0.5, 120) };
    this.recompute();
  }

  resetLoop() {
    this.snap = { ...this.snap, noiseCorrectionDb: 0 };
    this.recompute();
  }

  clearLog() {
    this.set({ pings: [], lastPing: null });
  }

  /* ---- the ping ---- */

  fire(): PingRecord {
    const s = this.snap;
    const d = s.decision;
    const cfg = s.config;

    const trueRangeM = clamp(
      cfg.requiredRangeM * (0.94 + this.rand() * 0.12),
      0.05,
      cfg.maxRangeBoundM,
    );

    /* --- build the simulated replica ------------------------------- */

    // Bound the simulated time-bandwidth product so trace cost is constant.
    const simTbp = clamp(d.tbp, 1, SIM_TBP_CAP);
    const simFs = REPLICA_N / d.tau;
    const simCarrier = simFs / 7;
    const simBw = (simTbp / d.tau) ;
    const swept = d.mode === 'lfm' || d.mode === 'geometric';
    const halfBw = swept ? Math.min(simBw / 2, simCarrier * 0.72) : 0;

    const replica = synthesise(
      {
        mode: d.mode,
        window: d.window,
        fStart: simCarrier - halfBw,
        fStop: simCarrier + halfBw,
        tau: d.tau,
        amplitude: 1,
      },
      simFs,
    );

    /* --- build the received trace ---------------------------------- */

    // The model has a systematic blind spot: it underestimates scattering loss,
    // and does so more in dirtier water.
    //
    // Crucially this bias is a property of the environment, NOT of the model's
    // current correction. The true echo strength is therefore computed from the
    // UNCORRECTED prediction minus the bias -- undoing the correction first.
    // That is what lets the loop actually converge: as the correction grows
    // toward the bias, the predicted value falls toward the true one and the
    // gap closes. If the truth moved with the correction the integrator could
    // never settle and would simply run to its limit.
    const modelBiasDb = s.env.turbidityNtu / 130;
    const uncorrectedSnrDb = d.predictedSnrDb + s.noiseCorrectionDb;
    const trueSnrDb =
      uncorrectedSnrDb - modelBiasDb + (this.rand() - 0.5) * 1.2;

    const inputSnrDb = trueSnrDb - d.compressionGainDb;
    const noiseSigma = Math.pow(10, -inputSnrDb / 20);

    const rx = new Float32Array(RX_N);
    for (let i = 0; i < RX_N; i++) rx[i] = gaussian(this.rand) * noiseSigma;

    // Place the echo proportionally inside the display window.
    const displayRangeM = cfg.maxRangeBoundM * 0.5;
    const frac = clamp(trueRangeM / displayRangeM, 0.05, 0.86);
    const delay = Math.floor(frac * (RX_N - replica.length - 4));
    for (let i = 0; i < replica.length; i++) {
      if (delay + i < RX_N) rx[delay + i] += replica[i];
    }

    /* --- compress --------------------------------------------------- */

    const mf = matchedFilter(rx, replica);

    // Output SNR: peak against the RMS of everything outside the main lobe.
    const guard = Math.max(6, Math.floor(replica.length / 8));
    let acc = 0;
    let count = 0;
    for (let i = 0; i < mf.correlation.length; i++) {
      if (Math.abs(i - mf.peakIndex) <= guard) continue;
      acc += mf.correlation[i] * mf.correlation[i];
      count++;
    }
    const rms = Math.sqrt(acc / Math.max(1, count));
    const measuredSnrDb = clamp(20 * Math.log10(1 / Math.max(rms, 1e-6)), -10, 60);

    const measuredRangeM =
      (mf.peakIndex / Math.max(1, RX_N - replica.length)) * displayRangeM;

    /* --- close the loop --------------------------------------------- */

    const errorDb = d.predictedSnrDb - measuredSnrDb;
    // Integrate the gap, damped so the loop settles rather than oscillating.
    const noiseCorrectionDb = clamp(
      s.noiseCorrectionDb + 0.35 * errorDb,
      -6,
      20,
    );

    const record: PingRecord = {
      id: this.nextId++,
      at: Date.now(),
      medium: s.medium,
      env: { ...s.env },
      mode: d.mode,
      window: d.window,
      fCentre: d.fCentre,
      bandwidth: d.bandwidth,
      tau: d.tau,
      amplitude: d.amplitude,
      resolutionM: d.resolutionM,
      tbp: d.tbp,
      compressionGainDb: d.compressionGainDb,
      predictedSnrDb: d.predictedSnrDb,
      measuredSnrDb,
      errorDb,
      trueRangeM,
      measuredRangeM,
      peakToSidelobeDb: mf.peakToSidelobeDb,
      energyMj: s.energy.totalMj,
      headline: s.explanation.headline,
      rx: Array.from(decimate(rx, DISPLAY_POINTS)),
      correlation: Array.from(decimate(mf.correlation, DISPLAY_POINTS)),
    };

    const pings = [record, ...this.snap.pings].slice(0, MAX_PINGS);
    this.snap = {
      ...this.snap,
      pings,
      lastPing: record,
      noiseCorrectionDb,
    };
    this.recompute();
    return record;
  }
}

function toWaveParams(d: WaveDecision): WaveParams {
  return {
    mode: d.mode,
    window: d.window,
    fStart: d.fStart,
    fStop: d.fStop,
    tau: d.tau,
    amplitude: d.amplitude,
  };
}

export const engine = new PayloadEngine();
