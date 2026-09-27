/**
 * The telemetry link.
 *
 * Three transports, one interface. The screens ask the link for status and the
 * latest packet and never learn which of the three delivered it.
 *
 *   USB    Type-C to Type-C, the payload's native USB port. First choice: it
 *          needs no pairing, no network and no batteries in the middle, and it
 *          powers the payload while it runs.
 *   Wi-Fi  the payload raises its own access point. The console opens a
 *          WebSocket to it, and falls back to polling a plain HTTP endpoint if
 *          there is no socket to open -- a firmware only needs one of the two.
 *          Second choice, and the one that works across a room.
 *   BLE    lowest power, smallest MTU, slowest. Kept for the flight build.
 *
 * Every member is an arrow property. `useSyncExternalStore(link.onChange, ...)`
 * calls the subscriber with no receiver, and a plain method would lose `this`
 * and throw on the first render.
 */

import {
  onLinkData,
  onLinkDevice,
  onLinkStatus,
  SeanergyLink,
  type BleDeviceInfo,
  type UsbDeviceInfo,
} from './nativeLink';
import {
  decodeLine,
  encodeCommand,
  LineAssembler,
  PROTOCOL_VERSION,
  type Command,
  type PayloadIdentity,
  type TelemetryPacket,
} from './protocol';

export type { TelemetryPacket } from './protocol';

export type LinkStatus = 'down' | 'scanning' | 'connecting' | 'up';
export type TransportKind = 'usb' | 'wifi' | 'ble';

export const TRANSPORTS: { kind: TransportKind; label: string; note: string }[] = [
  { kind: 'usb', label: 'USB-C', note: 'Type-C to Type-C, native port' },
  { kind: 'wifi', label: 'Wi-Fi', note: 'Payload access point, socket or poll' },
  { kind: 'ble', label: 'Bluetooth', note: 'Low energy, small MTU' },
];

/** Defaults for the Wi-Fi transport. Documented in the API folder. */
export const WIFI_DEFAULT_HOST = '192.168.4.1';
export const WIFI_DEFAULT_PORT = 81;
export const WIFI_PATH = '/telemetry';
/** The polling fallback: ordinary HTTP on port 80, same path, one line back. */
export const WIFI_HTTP_PORT = 80;
export const WIFI_POLL_MS = 500;
/** How long to wait for the WebSocket before giving up and polling instead. */
const WIFI_SOCKET_TIMEOUT_MS = 2500;
export const BLE_NAME_PREFIX = 'SEANERGY-';
export const USB_DEFAULT_BAUD = 921600;

/** Shown on the diagnostics screen. */
export const PROTOCOL_LABEL = `NDJSON v${PROTOCOL_VERSION}`;

export type LinkStats = {
  packets: number;
  bad: number;
  /** Packets per second, averaged over the last few seconds. */
  rate: number;
  /** Milliseconds since the last packet, or null if none yet. */
  ageMs: number | null;
  identity: PayloadIdentity | null;
};

export interface Link {
  readonly name: string;
  kind(): TransportKind;
  setKind(k: TransportKind): void;
  status(): LinkStatus;
  detail(): string;
  scan(): void;
  disconnect(): void;
  latest(): TelemetryPacket | null;
  stats(): LinkStats;
  /** USB devices seen on the last scan. */
  usbDevices(): UsbDeviceInfo[];
  /** BLE devices seen on the last scan. */
  bleDevices(): BleDeviceInfo[];
  /** Open a specific device found by `scan`. */
  open(id: string): void;
  /** Wi-Fi host, editable from Settings. */
  host(): string;
  setHost(h: string): void;
  send(cmd: Command): void;
  onChange(cb: () => void): () => void;
}

class LinkManager implements Link {
  readonly name = 'SeaNergy link';

  private transport: TransportKind = 'usb';
  private s: LinkStatus = 'down';
  private note = 'Not connected';
  private packet: TelemetryPacket | null = null;
  private identity: PayloadIdentity | null = null;
  private listeners = new Set<() => void>();

  private assembler = new LineAssembler();
  private usbList: UsbDeviceInfo[] = [];
  private bleList: BleDeviceInfo[] = [];
  private socket: WebSocket | null = null;
  private wifiHost = WIFI_DEFAULT_HOST;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private socketDeadline: ReturnType<typeof setTimeout> | null = null;
  /** True once a socket has opened, so a later close is not a failure to open. */
  private socketOpened = false;
  private polling = false;

  private counts = { packets: 0, bad: 0 };
  private recent: number[] = [];
  private unsubs: (() => void)[] = [];
  private scanTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (SeanergyLink.available) {
      this.unsubs.push(onLinkData(this.ingest));
      this.unsubs.push(
        onLinkStatus((st) => {
          if (st.state === 'permission') {
            this.set('connecting', st.detail);
            return;
          }
          this.set(st.state as LinkStatus, st.detail);
        }),
      );
      this.unsubs.push(
        onLinkDevice((d) => {
          if (!this.bleList.some((x) => x.address === d.address)) {
            this.bleList = [...this.bleList, d].sort((a, b) => b.rssi - a.rssi);
            this.emit();
          }
        }),
      );
    }
  }

  // ---------------------------------------------------------------- state
  kind = () => this.transport;
  status = () => this.s;
  detail = () => this.note;
  latest = () => this.packet;
  usbDevices = () => this.usbList;
  bleDevices = () => this.bleList;
  host = () => this.wifiHost;

  setHost = (h: string) => {
    this.wifiHost = h.trim() || WIFI_DEFAULT_HOST;
    this.emit();
  };

  stats = (): LinkStats => {
    const now = Date.now();
    const window = this.recent.filter((t) => now - t < 5000);
    return {
      packets: this.counts.packets,
      bad: this.counts.bad,
      rate: window.length / 5,
      ageMs: this.packet ? now - this.packet.at : null,
      identity: this.identity,
    };
  };

  setKind = (k: TransportKind) => {
    if (k === this.transport) return;
    this.disconnect();
    this.transport = k;
    this.note = 'Not connected';
    this.emit();
  };

  onChange = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  private emit = () => {
    this.listeners.forEach((f) => f());
  };

  private set = (s: LinkStatus, note: string) => {
    this.s = s;
    this.note = note;
    this.emit();
  };

  // ---------------------------------------------------------------- scan
  scan = () => {
    this.clearScanTimer();
    if (!SeanergyLink.available && this.transport !== 'wifi') {
      this.set('down', 'Native link not present in this build');
      return;
    }

    if (this.transport === 'usb') {
      this.set('scanning', 'Looking for a USB device');
      SeanergyLink.listUsbDevices()
        .then((devices) => {
          this.usbList = devices;
          if (devices.length === 0) {
            this.set(
              'down',
              'No USB device. Use a Type-C data cable and the board’s native port.',
            );
            return;
          }
          // One device is the ordinary case: open it rather than making the
          // operator choose from a list of one.
          if (devices.length === 1) {
            this.open(String(devices[0].id));
          } else {
            this.set('down', `${devices.length} devices found, pick one`);
          }
        })
        .catch((e) => this.set('down', String(e?.message ?? e)));
      return;
    }

    if (this.transport === 'ble') {
      this.bleList = [];
      SeanergyLink.bluetoothReady()
        .then((ready) => {
          if (!ready) {
            this.set('down', 'Switch Bluetooth on');
            return;
          }
          return SeanergyLink.bleScan(BLE_NAME_PREFIX).then(() => {
            this.set('scanning', `Scanning for ${BLE_NAME_PREFIX}…`);
            this.scanTimer = setTimeout(() => {
              SeanergyLink.bleStopScan().catch(() => {});
              if (this.bleList.length === 0) this.set('down', 'No payload in range');
              else this.set('down', `${this.bleList.length} found, pick one`);
            }, 8000);
          });
        })
        .catch((e) => this.set('down', String(e?.message ?? e)));
      return;
    }

    // Wi-Fi has nothing to enumerate; the access point is at a known address.
    this.open(this.wifiHost);
  };

  private clearScanTimer = () => {
    if (this.scanTimer) clearTimeout(this.scanTimer);
    this.scanTimer = null;
  };

  // ---------------------------------------------------------------- open
  open = (id: string) => {
    this.assembler.reset();
    this.identity = null;

    if (this.transport === 'usb') {
      this.set('connecting', 'Opening USB');
      SeanergyLink.openUsb(Number(id), USB_DEFAULT_BAUD)
        .then((st) => {
          if (st.state === 'permission') this.set('connecting', st.detail);
          else this.set('up', st.detail);
          this.send({ c: 'hello' });
        })
        .catch((e) => this.set('down', String(e?.message ?? e)));
      return;
    }

    if (this.transport === 'ble') {
      this.clearScanTimer();
      SeanergyLink.bleStopScan().catch(() => {});
      this.set('connecting', 'Connecting over Bluetooth');
      SeanergyLink.bleConnect(id).catch((e) =>
        this.set('down', String(e?.message ?? e)),
      );
      return;
    }

    // Wi-Fi. Try the WebSocket, and if the payload does not have one, poll.
    this.stopWifi();
    this.wifiHost = id;
    const url = `ws://${id}:${WIFI_DEFAULT_PORT}${WIFI_PATH}`;
    this.set('connecting', url);
    try {
      const ws = new WebSocket(url);
      this.socket = ws;
      this.socketOpened = false;
      // A refused TCP connection can take a while to be reported, and on some
      // Android builds is never reported at all. Do not wait on it.
      this.socketDeadline = setTimeout(() => {
        if (!this.socketOpened) this.fallBackToPolling(id, 'no WebSocket');
      }, WIFI_SOCKET_TIMEOUT_MS);
      ws.onopen = () => {
        this.socketOpened = true;
        this.clearSocketDeadline();
        this.set('up', `Wi-Fi ${id}, socket`);
        this.send({ c: 'hello' });
      };
      ws.onmessage = (ev: any) => this.ingest(String(ev?.data ?? ''));
      ws.onerror = () => {
        if (!this.socketOpened) this.fallBackToPolling(id, 'no WebSocket');
      };
      ws.onclose = () => {
        if (this.socket === ws) this.socket = null;
        if (!this.socketOpened) {
          this.fallBackToPolling(id, 'no WebSocket');
          return;
        }
        if (this.s !== 'down') this.set('down', 'Wi-Fi link closed');
      };
    } catch {
      // No WebSocket implementation at all. Polling is the whole transport.
      this.fallBackToPolling(id, 'no WebSocket');
    }
  };

  /**
   * The socket did not come up. Poll the HTTP endpoint instead.
   *
   * This is the path a firmware built on the core's own WebServer.h takes, and
   * it is deliberately the fallback rather than a setting: the operator does
   * not have to know which of the two the payload speaks.
   */
  private fallBackToPolling = (host: string, why: string) => {
    if (this.polling || this.transport !== 'wifi') return;
    this.clearSocketDeadline();
    this.closeSocket();
    this.polling = true;
    this.set('connecting', `${why}, polling http://${host}${WIFI_PATH}`);
    const url = `http://${host}:${WIFI_HTTP_PORT}${WIFI_PATH}`;
    let inFlight = false;
    let misses = 0;
    const tick = () => {
      // One request at a time. A slow answer must not queue more behind it.
      if (inFlight) return;
      inFlight = true;
      fetch(url, { headers: { Accept: 'application/x-ndjson' } })
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((text) => {
          misses = 0;
          // Each response is a whole record. Terminate it so the assembler
          // releases it even if the firmware omitted the newline.
          this.ingest(text.endsWith('\n') ? text : `${text}\n`);
        })
        .catch((e) => {
          misses += 1;
          if (misses === 4) {
            this.set('down', `No answer from ${host}: ${String(e?.message ?? e)}`);
          }
        })
        .finally(() => {
          inFlight = false;
        });
    };
    this.pollTimer = setInterval(tick, WIFI_POLL_MS);
    tick();
  };

  disconnect = () => {
    this.clearScanTimer();
    this.stopWifi();
    if (SeanergyLink.available) {
      SeanergyLink.closeUsb().catch(() => {});
      SeanergyLink.bleStopScan().catch(() => {});
      SeanergyLink.bleDisconnect().catch(() => {});
    }
    this.packet = null;
    this.identity = null;
    this.assembler.reset();
    this.set('down', 'Not connected');
  };

  /** Stop both halves of the Wi-Fi transport, whichever one is running. */
  private stopWifi = () => {
    this.clearSocketDeadline();
    this.closeSocket();
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
    this.polling = false;
  };

  private clearSocketDeadline = () => {
    if (this.socketDeadline) clearTimeout(this.socketDeadline);
    this.socketDeadline = null;
  };

  private closeSocket = () => {
    const ws = this.socket;
    this.socket = null;
    if (ws) {
      ws.onopen = null as any;
      ws.onmessage = null as any;
      ws.onerror = null as any;
      ws.onclose = null as any;
      try {
        ws.close();
      } catch {
        /* already gone */
      }
    }
  };

  // ---------------------------------------------------------------- data
  private ingest = (chunk: string) => {
    const lines = this.assembler.push(chunk);
    let changed = false;

    for (const line of lines) {
      const d = decodeLine(line);
      if (!d) continue;

      if (d.kind === 'telemetry') {
        this.packet = d.packet;
        this.counts.packets += 1;
        const now = Date.now();
        this.recent.push(now);
        if (this.recent.length > 64) this.recent = this.recent.slice(-64);
        if (this.s !== 'up') {
          this.s = 'up';
          this.note = this.identity?.name ?? 'Receiving telemetry';
        }
        changed = true;
      } else if (d.kind === 'identity') {
        this.identity = d.identity;
        this.note = `${d.identity.name} fw ${d.identity.firmware}`;
        changed = true;
      } else if (d.kind === 'error') {
        this.counts.bad += 1;
        // A version mismatch is refused outright rather than guessed at.
        if (d.reason.startsWith('protocol')) {
          this.disconnect();
          this.set('down', `Refused: ${d.reason}. Console speaks v${PROTOCOL_VERSION}.`);
          return;
        }
        changed = true;
      }
    }
    if (changed) this.emit();
  };

  send = (cmd: Command) => {
    const text = encodeCommand(cmd);
    if (this.transport === 'usb') {
      SeanergyLink.writeUsb(text).catch(() => {});
    } else if (this.transport === 'ble') {
      SeanergyLink.writeBle(text).catch(() => {});
    } else if (this.socket && this.socket.readyState === 1) {
      try {
        this.socket.send(text);
      } catch {
        /* the close handler reports it */
      }
    } else if (this.polling) {
      // Optional on the firmware side. The link is useful one-way, so a 404
      // here is not an error worth showing.
      fetch(`http://${this.wifiHost}:${WIFI_HTTP_PORT}/cmd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      }).catch(() => {});
    }
  };
}

export const link: Link = new LinkManager();

/** The packet fields, in wire order — shown by the packet inspector. */
export const PACKET_FIELDS: {
  name: string;
  key: string;
  unit: string;
  measured: boolean;
}[] = [
  { name: 'type', key: 't', unit: '"tlm"', measured: true },
  { name: 'sequence', key: 'seq', unit: 'counter', measured: true },
  { name: 'uptime', key: 'ms', unit: 'ms', measured: true },
  { name: 'state', key: 'st', unit: 'enum', measured: true },
  { name: 'temperature', key: 'temp', unit: '°C', measured: true },
  { name: 'salinity', key: 'sal', unit: 'ppt', measured: true },
  { name: 'turbidity', key: 'ntu', unit: 'NTU', measured: true },
  { name: 'depth', key: 'dep', unit: 'm', measured: true },
  { name: 'pH', key: 'ph', unit: 'pH', measured: true },
  { name: 'centre', key: 'fc', unit: 'Hz', measured: true },
  { name: 'bandwidth', key: 'bw', unit: 'Hz', measured: true },
  { name: 'pulse', key: 'tau', unit: 'µs', measured: true },
  { name: 'amplitude', key: 'amp', unit: '0–1', measured: true },
  { name: 'predicted SNR', key: 'snr', unit: 'dB', measured: true },
  { name: 'current', key: 'ma', unit: 'mA', measured: true },
  { name: 'bus', key: 'mv', unit: 'mV', measured: true },
  { name: 'faults', key: 'flt', unit: 'array', measured: true },
];
