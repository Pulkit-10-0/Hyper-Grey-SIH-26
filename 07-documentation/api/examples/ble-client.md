# BLE client example

## Construct `PING_NOW`

This TypeScript example creates protocol version `1` command sequence `1`. The
result must equal the firmware vector
`4e530101010000000000000000000000cd8d0000`.

```ts
const SERVICE = '47524e53-1241-659e-584b-90b18f052601';
const COMMAND = '47524e53-1241-659e-584b-90b18f052602';
const TELEMETRY = '47524e53-1241-659e-584b-90b18f052603';

function crc16CcittFalse(data: Uint8Array): number {
  let crc = 0xffff;
  for (const byte of data) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff
                         : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

function command(opcode: number, sequence: number,
                 arg0 = 0, arg1 = 0): Uint8Array {
  const p = new Uint8Array(20);
  const v = new DataView(p.buffer);
  v.setUint16(0, 0x534e, true);
  v.setUint8(2, 1);
  v.setUint8(3, opcode);
  v.setUint32(4, sequence, true);
  v.setUint32(8, arg0, true);
  v.setUint32(12, arg1, true);
  v.setUint16(16, crc16CcittFalse(p.subarray(0, 16)), true);
  v.setUint16(18, 0, true);
  return p;
}

const pingNow = command(1, 1);
```

Write `pingNow` to `COMMAND` with write or write-without-response. Subscribe to
`TELEMETRY` before writing so a fast completion is not missed.

## Decode telemetry

```ts
function decodeTelemetry(p: Uint8Array) {
  if (p.byteLength !== 48) throw new Error('SeaNergy telemetry length');
  const v = new DataView(p.buffer, p.byteOffset, p.byteLength);
  if (v.getUint16(0, true) !== 0x534e) throw new Error('magic');
  if (v.getUint8(2) !== 1) throw new Error('unsupported version');
  if (v.getUint8(3) !== 0x81) throw new Error('message type');
  if (v.getUint16(46, true) !== crc16CcittFalse(p.subarray(0, 46))) {
    throw new Error('CRC');
  }

  const cpu = v.getUint16(38, true);
  return {
    sequence: v.getUint32(4, true),
    uptimeMs: v.getUint32(8, true),
    state: v.getUint8(12),
    mode: v.getUint8(13),
    window: v.getUint8(14),
    mission: (v.getUint8(15) & 1) !== 0,
    frequencyHz: v.getUint32(16, true),
    sampleRatePerS: v.getUint32(20, true),
    temperatureC: v.getInt16(24, true) / 100,
    tdsMgPerL: v.getUint16(26, true),
    turbidityNtu: v.getUint16(28, true) / 10,
    batteryMv: v.getUint16(30, true),
    currentMa: v.getUint16(32, true) / 10,
    pingEnergyMicroj: v.getUint32(34, true),
    cpuIdlePercent: cpu === 0xffff ? null : cpu / 10,
    adaptationMs: v.getUint16(40, true),
    faults: v.getUint32(42, true),
  };
}
```

Do not retry with a different packet interpretation after a version mismatch.
Report the mismatch and require a compatible client.
