/**
 * The telemetry link.
 *
 * TELEMETRY mode reads decoded packets from a payload. The link is an interface
 * so the operator console can be built, styled and shipped before any radio
 * exists; today the only implementation reports "down", which renders the real
 * operator interface with placeholders rather than pretending to have data.
 *
 * Adding a BLE implementation later means writing one class and changing one
 * line in `engine.ts`. Nothing in the screens changes.
 */

export type LinkStatus = 'down' | 'scanning' | 'connecting' | 'up';

/** One decoded telemetry record. Mirrors the fixed 20-byte packet layout. */
export type TelemetryPacket = {
  seq: number;
  at: number;
  state: 'boot' | 'idle' | 'armed' | 'sampling' | 'transmitting' | 'fault';
  tempC: number;
  salinityPpt: number;
  turbidityNtu: number;
  depthM: number;
  fCentre: number;
  bandwidth: number;
  tau: number;
  currentMa: number;
  busMv: number;
  faults: string[];
};

export interface Link {
  readonly name: string;
  status(): LinkStatus;
  /** Human-readable reason the link is not up. */
  detail(): string;
  scan(): void;
  disconnect(): void;
  latest(): TelemetryPacket | null;
  onChange(cb: () => void): () => void;
}

/**
 * No radio is compiled into this build. Scanning completes and finds nothing,
 * which is the truthful result and keeps TELEMETRY mode functional and honest.
 */
class NoLink implements Link {
  readonly name = 'BLE GATT';
  private s: LinkStatus = 'down';
  private note = 'No payload paired';
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  // Every public member is an arrow property so it stays bound when passed as a
  // bare function reference -- `useSyncExternalStore(link.onChange, ...)` calls
  // it with no receiver, and a plain method would lose `this` and throw.
  status = () => this.s;
  detail = () => this.note;
  latest = (): TelemetryPacket | null => null;

  onChange = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  private emit = () => {
    this.listeners.forEach((f) => f());
  };

  scan = () => {
    if (this.timer) clearTimeout(this.timer);
    this.s = 'scanning';
    this.note = 'Searching for SEANERGY-xxxx';
    this.emit();
    this.timer = setTimeout(() => {
      this.s = 'down';
      this.note = 'No payload found in range';
      this.timer = null;
      this.emit();
    }, 2600);
  };

  disconnect = () => {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.s = 'down';
    this.note = 'No payload paired';
    this.emit();
  };
}

export const link: Link = new NoLink();

/** The packet fields, in wire order — shown by the packet inspector. */
export const PACKET_FIELDS: {
  name: string;
  bytes: number;
  unit: string;
  measured: boolean;
}[] = [
  { name: 'ver', bytes: 1, unit: '—', measured: true },
  { name: 'state', bytes: 1, unit: 'enum', measured: true },
  { name: 'temp', bytes: 2, unit: '°C ×100', measured: true },
  { name: 'salinity', bytes: 2, unit: 'ppt ×10', measured: true },
  { name: 'turbidity', bytes: 2, unit: 'NTU', measured: true },
  { name: 'depth', bytes: 2, unit: 'cm', measured: false },
  { name: 'f_centre', bytes: 3, unit: 'Hz', measured: true },
  { name: 'bandwidth', bytes: 3, unit: 'Hz', measured: true },
  { name: 'tau', bytes: 2, unit: 'µs', measured: true },
  { name: 'current', bytes: 2, unit: 'mA ×10', measured: false },
  { name: 'crc16', bytes: 2, unit: '—', measured: true },
];

export const PACKET_BYTES = PACKET_FIELDS.reduce((a, f) => a + f.bytes, 0);
