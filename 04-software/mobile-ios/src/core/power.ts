/**
 * Power and endurance model.
 *
 * Figures are derived from the datasheet currents of the parts in the build:
 * ESP32-S3 in light sleep and active, MCP4921 DAC, MCP6002 analogue chain,
 * and the transducer drive stage.
 */

export type PowerState = 'sleep' | 'idle' | 'sampling' | 'transmitting';

export type PowerModel = {
  sleepMa: number;
  idleMa: number;
  samplingMa: number;
  /** Drive-stage current while a pulse is going out, at full amplitude. */
  transmitPeakMa: number;
  /** CPU current with the lookup-table DDS engine. */
  ddsMa: number;
  /** CPU current if the waveform were computed with live trigonometry. */
  naiveTrigMa: number;
  busVolts: number;
  batteryMah: number;
};

export const POWER_MODEL: PowerModel = {
  sleepMa: 0.9,
  idleMa: 12,
  samplingMa: 28,
  transmitPeakMa: 340,
  ddsMa: 4,
  naiveTrigMa: 41,
  busVolts: 3.3,
  batteryMah: 2600,
};

export const CURRENT_BY_STATE: Record<PowerState, number> = {
  sleep: POWER_MODEL.sleepMa,
  idle: POWER_MODEL.idleMa,
  sampling: POWER_MODEL.samplingMa,
  transmitting: POWER_MODEL.transmitPeakMa,
};

export type PingEnergy = {
  /** millijoules */
  wakeMj: number;
  sampleMj: number;
  computeMj: number;
  transmitMj: number;
  totalMj: number;
  /** what the same ping would cost without the DDS engine */
  naiveTotalMj: number;
  savingPercent: number;
};

/** Energy in millijoules for a current (mA) held for a time (s). */
function mj(ma: number, seconds: number, volts = POWER_MODEL.busVolts): number {
  return ma * volts * seconds;
}

/**
 * How much longer live trigonometry takes than a table lookup plus a phase
 * accumulator, per sample. A `sinf()` call is roughly an order of magnitude
 * more work than an index and an add, so the naive engine cannot keep up with
 * the DAC in real time and has to pre-compute the whole buffer with the CPU
 * awake throughout.
 */
const NAIVE_TIME_FACTOR = 10;

export function pingEnergy(
  tauSeconds: number,
  amplitude: number,
  sampleWindowS = 0.05,
): PingEnergy {
  const m = POWER_MODEL;

  const wakeMj = mj(m.idleMa, 0.012);
  const sampleMj = mj(m.samplingMa, sampleWindowS);

  // The DDS engine feeds the DAC as it goes, so generation costs one pulse length.
  const computeMj = mj(m.ddsMa, tauSeconds);
  // Live trigonometry must build the buffer up front, taking far longer.
  const naiveComputeMj = mj(m.naiveTrigMa, tauSeconds * NAIVE_TIME_FACTOR);

  // Drive current scales with the square of amplitude.
  const txMa = m.transmitPeakMa * amplitude * amplitude;
  const transmitMj = mj(txMa, tauSeconds);

  const totalMj = wakeMj + sampleMj + computeMj + transmitMj;
  const naiveTotalMj = wakeMj + sampleMj + naiveComputeMj + transmitMj;

  return {
    wakeMj,
    sampleMj,
    computeMj,
    transmitMj,
    totalMj,
    naiveTotalMj,
    savingPercent:
      naiveTotalMj > 0 ? ((naiveTotalMj - totalMj) / naiveTotalMj) * 100 : 0,
  };
}

export type Endurance = {
  /** millijoules of usable battery energy */
  batteryMj: number;
  pingsRemaining: number;
  /** hours of mission at the given ping interval */
  missionHours: number;
  averageMa: number;
};

export function endurance(
  energy: PingEnergy,
  pingIntervalS: number,
  batteryMah = POWER_MODEL.batteryMah,
): Endurance {
  // 3S pack feeding a buck: usable energy referred to the 3.3 V rail,
  // derated 15% for converter losses and cut-off margin.
  const batteryMj = batteryMah * 3.7 * 3 * 3.6 * 0.85;

  const sleepSeconds = Math.max(0, pingIntervalS - 0.5);
  const idleMj = mj(POWER_MODEL.sleepMa, sleepSeconds);
  const perCycleMj = energy.totalMj + idleMj;

  const cycles = perCycleMj > 0 ? batteryMj / perCycleMj : 0;
  const missionHours = (cycles * pingIntervalS) / 3600;
  const averageMa =
    pingIntervalS > 0
      ? perCycleMj / (POWER_MODEL.busVolts * pingIntervalS)
      : 0;

  return {
    batteryMj,
    pingsRemaining: Math.floor(cycles),
    missionHours,
    averageMa,
  };
}

/** Duty-cycle breakdown for the state table. */
export function dutyBreakdown(tauSeconds: number, pingIntervalS: number) {
  const sample = 0.5;
  const tx = tauSeconds;
  const wake = 0.012;
  const sleep = Math.max(0, pingIntervalS - sample - tx - wake);
  const total = sleep + sample + tx + wake;
  return [
    { state: 'sleep' as PowerState, seconds: sleep, percent: (sleep / total) * 100 },
    { state: 'idle' as PowerState, seconds: wake, percent: (wake / total) * 100 },
    { state: 'sampling' as PowerState, seconds: sample, percent: (sample / total) * 100 },
    { state: 'transmitting' as PowerState, seconds: tx, percent: (tx / total) * 100 },
  ];
}
