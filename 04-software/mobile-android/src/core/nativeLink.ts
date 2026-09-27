/**
 * Typed surface for the native link module.
 *
 * Two constraints shape this file.
 *
 * `src/core` must keep running under plain Node, because that is what makes the
 * physics assertions possible without a device or a bundler. So nothing here
 * imports `expo-modules-core` at module scope: the require is lazy and wrapped,
 * and under Node it simply fails and leaves the link reporting "unavailable".
 *
 * The native half exists only on Android. Everywhere else, and under Jest, the
 * same path is taken, which is what keeps the render tests running on a machine
 * with no payload attached.
 */

export type UsbDeviceInfo = {
  id: number;
  name: string;
  vendorId: number;
  productId: number;
  serial: string;
  /** Human description of the bridge or port on the other end. */
  kind: string;
};

export type BleDeviceInfo = {
  name: string;
  address: string;
  rssi: number;
};

export type NativeStatus = {
  state: 'down' | 'scanning' | 'connecting' | 'up' | 'permission';
  detail: string;
};

type Native = {
  listUsbDevices(): Promise<UsbDeviceInfo[]>;
  openUsb(deviceId: number, baud: number): Promise<NativeStatus>;
  closeUsb(): Promise<boolean>;
  writeUsb(text: string): Promise<number>;
  bleScan(prefix: string): Promise<boolean>;
  bleStopScan(): Promise<boolean>;
  bleConnect(address: string): Promise<boolean>;
  bleDisconnect(): Promise<boolean>;
  writeBle(text: string): Promise<number>;
  bluetoothReady(): Promise<boolean>;
  addListener?: (event: string, cb: (payload: any) => void) => { remove(): void };
};

let resolved = false;
let native: Native | null = null;
let coreModule: any = null;

/** Load expo-modules-core once, tolerating every environment that lacks it. */
function core(): any {
  if (coreModule !== null) return coreModule;
  try {
    // Deliberately a runtime require: a static import would be evaluated by
    // the verifier running under plain Node, which cannot load this package.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    coreModule = require('expo-modules-core');
  } catch {
    coreModule = {};
  }
  return coreModule;
}

function resolveNative(): Native | null {
  if (resolved) return native;
  resolved = true;
  try {
    const fn = core().requireNativeModule;
    native = typeof fn === 'function' ? (fn('SeanergyLink') as Native) : null;
  } catch {
    native = null;
  }
  return native;
}

/** True when the native half is compiled into this build and reachable. */
export function isLinkNativeAvailable(): boolean {
  return resolveNative() !== null;
}

const unavailable = (): Promise<never> =>
  Promise.reject(new Error('The native link is not present in this build'));

export const SeanergyLink = {
  get available(): boolean {
    return resolveNative() !== null;
  },
  listUsbDevices: (): Promise<UsbDeviceInfo[]> => {
    const n = resolveNative();
    return n ? n.listUsbDevices() : Promise.resolve([]);
  },
  openUsb: (id: number, baud: number): Promise<NativeStatus> => {
    const n = resolveNative();
    return n ? n.openUsb(id, baud) : unavailable();
  },
  closeUsb: (): Promise<boolean> => {
    const n = resolveNative();
    return n ? n.closeUsb() : Promise.resolve(false);
  },
  writeUsb: (t: string): Promise<number> => {
    const n = resolveNative();
    return n ? n.writeUsb(t) : unavailable();
  },
  bleScan: (prefix: string): Promise<boolean> => {
    const n = resolveNative();
    return n ? n.bleScan(prefix) : unavailable();
  },
  bleStopScan: (): Promise<boolean> => {
    const n = resolveNative();
    return n ? n.bleStopScan() : Promise.resolve(false);
  },
  bleConnect: (address: string): Promise<boolean> => {
    const n = resolveNative();
    return n ? n.bleConnect(address) : unavailable();
  },
  bleDisconnect: (): Promise<boolean> => {
    const n = resolveNative();
    return n ? n.bleDisconnect() : Promise.resolve(false);
  },
  writeBle: (t: string): Promise<number> => {
    const n = resolveNative();
    return n ? n.writeBle(t) : unavailable();
  },
  bluetoothReady: (): Promise<boolean> => {
    const n = resolveNative();
    return n ? n.bluetoothReady() : Promise.resolve(false);
  },
};

type Unsub = () => void;

/** Subscribe to a native event, tolerating both emitter shapes across SDKs. */
function on(event: string, cb: (payload: any) => void): Unsub {
  const n = resolveNative();
  if (!n) return () => {};
  try {
    if (typeof n.addListener === 'function') {
      const sub = n.addListener(event, cb);
      return () => sub.remove();
    }
    const Emitter = core().EventEmitter;
    if (!Emitter) return () => {};
    const emitter = new Emitter(n as any);
    const sub = emitter.addListener(event, cb);
    return () => sub.remove();
  } catch {
    return () => {};
  }
}

export const onLinkData = (cb: (text: string) => void): Unsub =>
  on('onData', (p) => cb(String(p?.text ?? '')));

export const onLinkStatus = (cb: (s: NativeStatus) => void): Unsub =>
  on('onStatus', (p) =>
    cb({ state: p?.state ?? 'down', detail: String(p?.detail ?? '') }),
  );

export const onLinkDevice = (cb: (d: BleDeviceInfo) => void): Unsub =>
  on('onDevice', (p) =>
    cb({
      name: String(p?.name ?? ''),
      address: String(p?.address ?? ''),
      rssi: Number(p?.rssi ?? 0),
    }),
  );
