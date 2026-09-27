/**
 * The payload wire protocol.
 *
 * One format for all three transports. USB, Wi-Fi and Bluetooth carry exactly
 * the same bytes, so the parser, the screens and the log do not know or care
 * which cable or radio a reading arrived on.
 *
 * Newline-delimited JSON, UTF-8, one object per line, `\n` terminated.
 *
 * Why not the packed binary frame: a demo is debugged with a serial monitor and
 * a pair of eyes. Text costs about 180 bytes a line against 48 packed, which at
 * one line a second is nothing on any of these transports, and it means a
 * firmware engineer can see the fault immediately instead of decoding it. The
 * packed frame stays documented for the flight build.
 *
 * Keys are short because Bluetooth LE has a small MTU and a line that fits in
 * one notification arrives in one piece.
 */

import { Environment } from './adaptation';

/** Protocol version. A payload announcing anything else is refused. */
export const PROTOCOL_VERSION = 1;

export type PayloadState =
  | 'boot'
  | 'idle'
  | 'armed'
  | 'sampling'
  | 'transmitting'
  | 'fault';

const STATES: Record<string, PayloadState> = {
  boot: 'boot',
  idle: 'idle',
  ready: 'idle',
  armed: 'armed',
  arm: 'armed',
  sampling: 'sampling',
  sample: 'sampling',
  transmitting: 'transmitting',
  tx: 'transmitting',
  fault: 'fault',
};

/** One decoded telemetry record. */
export type TelemetryPacket = {
  seq: number;
  /** Milliseconds since the payload booted, as the payload reports it. */
  uptimeMs: number;
  /** Arrival time on the handset, for rate and staleness. */
  at: number;
  state: PayloadState;
  tempC: number;
  salinityPpt: number;
  turbidityNtu: number;
  depthM: number;
  ph: number;
  fCentre: number;
  bandwidth: number;
  tau: number;
  amplitude: number;
  predictedSnrDb: number;
  currentMa: number;
  busMv: number;
  faults: string[];
};

/** Identity line, sent once on connect. */
export type PayloadIdentity = {
  name: string;
  firmware: string;
  protocol: number;
};

export type Decoded =
  | { kind: 'telemetry'; packet: TelemetryPacket }
  | { kind: 'identity'; identity: PayloadIdentity }
  | { kind: 'text'; line: string }
  | { kind: 'error'; reason: string; line: string };

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
};

/**
 * Decode one line. Never throws: a malformed line is a reportable event, not a
 * crash, because the first thing a half-wired payload does is emit rubbish.
 */
export function decodeLine(line: string): Decoded | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (trimmed[0] !== '{') return { kind: 'text', line: trimmed };

  let raw: any;
  try {
    raw = JSON.parse(trimmed);
  } catch {
    return { kind: 'error', reason: 'not valid JSON', line: trimmed };
  }
  if (!raw || typeof raw !== 'object') {
    return { kind: 'error', reason: 'not an object', line: trimmed };
  }

  const t = String(raw.t ?? '');

  if (t === 'id') {
    const proto = num(raw.proto, 0);
    if (proto !== PROTOCOL_VERSION) {
      return {
        kind: 'error',
        reason: `protocol ${proto}, expected ${PROTOCOL_VERSION}`,
        line: trimmed,
      };
    }
    return {
      kind: 'identity',
      identity: {
        name: String(raw.name ?? 'payload'),
        firmware: String(raw.fw ?? '?'),
        protocol: proto,
      },
    };
  }

  if (t !== 'tlm') return { kind: 'text', line: trimmed };

  const faults = Array.isArray(raw.flt) ? raw.flt.map((f: unknown) => String(f)) : [];

  return {
    kind: 'telemetry',
    packet: {
      seq: num(raw.seq),
      uptimeMs: num(raw.ms),
      at: Date.now(),
      state: STATES[String(raw.st ?? 'idle').toLowerCase()] ?? 'idle',
      tempC: num(raw.temp),
      salinityPpt: num(raw.sal),
      turbidityNtu: num(raw.ntu),
      depthM: num(raw.dep),
      ph: num(raw.ph, 8.1),
      fCentre: num(raw.fc),
      bandwidth: num(raw.bw),
      // The payload reports microseconds; the console works in seconds.
      tau: num(raw.tau) / 1e6,
      amplitude: num(raw.amp, 1),
      predictedSnrDb: num(raw.snr),
      currentMa: num(raw.ma),
      busMv: num(raw.mv),
      faults,
    },
  };
}

/** Pull the environment out of a packet, for the solver. */
export function environmentOf(p: TelemetryPacket): Environment {
  return {
    tempC: p.tempC,
    salinityPpt: p.salinityPpt,
    turbidityNtu: p.turbidityNtu,
    depthM: p.depthM,
    ph: p.ph,
  };
}

/* ------------------------------------------------------------------ */
/* Commands, console to payload                                        */
/* ------------------------------------------------------------------ */

export type Command =
  | { c: 'hello' }
  | { c: 'ping' }
  | { c: 'rate'; v: number }
  | { c: 'mode'; v: string }
  | { c: 'stop' };

/** Encode a command, newline included. */
export function encodeCommand(cmd: Command): string {
  return JSON.stringify({ t: 'cmd', ...cmd }) + '\n';
}

/* ------------------------------------------------------------------ */
/* Line assembly                                                       */
/* ------------------------------------------------------------------ */

/**
 * Reassembles lines from arbitrary chunks.
 *
 * Every transport here delivers fragments that do not respect line boundaries:
 * a USB bulk read returns whatever was in the buffer, and a Bluetooth
 * notification is capped by the MTU. Splitting on the newline in one place
 * means no transport has to think about it.
 */
export class LineAssembler {
  private buffer = '';
  private readonly limit: number;

  constructor(limit = 64 * 1024) {
    this.limit = limit;
  }

  push(chunk: string): string[] {
    this.buffer += chunk;
    if (this.buffer.length > this.limit) {
      // A payload stuck mid-line must not grow the buffer without bound.
      this.buffer = this.buffer.slice(-this.limit);
    }
    const parts = this.buffer.split('\n');
    this.buffer = parts.pop() ?? '';
    return parts.map((p) => p.replace(/\r$/, '')).filter((p) => p.length > 0);
  }

  reset(): void {
    this.buffer = '';
  }
}
