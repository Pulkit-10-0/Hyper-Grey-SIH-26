# Worked example — console link

Building a telemetry record on an ESP32-S3, and parsing one on the console side.
The specification is [`../console-link.md`](../console-link.md).

---

## 1. Emitting a record

### The values you start with

The bench firmware holds these after `readRealSensors()`:

| Variable | Holds | Unit |
|---|---|---|
| `temperatureC` | DS18B20 reading, or `DEVICE_DISCONNECTED_C` | °C |
| `tdsVoltage` | TDS module output, dividers already undone | V |
| `turbidityVoltage` | turbidity module output | V |
| `phVoltage` | pH probe output | V |
| `pressureMPa` | SEN0257, divider already undone and clamped | MPa |
| `adaptiveCenterHz` | chosen centre frequency | Hz |
| `adaptiveBandwidthHz` | chosen bandwidth | Hz |
| `adaptivePulseMs` | chosen pulse length | **ms** |
| `adaptiveDrivePercent` | chosen drive | **0–100** |

Two of those are in the wrong units for the wire and one may be a sentinel.

### The conversions

```cpp
// Temperature: substitute rather than emit the sentinel, because the console
// would otherwise run its physics on -127 degrees.
float tempC = (temperatureC == DEVICE_DISCONNECTED_C) ? 25.0f : temperatureC;

// Salinity: SEN0244 TDS curve with temperature compensation, ppm then ppt.
float v      = tdsVoltage;
float comp   = v / (1.0f + 0.02f * (tempC - 25.0f));
float ppm    = (133.42f*comp*comp*comp - 255.86f*comp*comp + 857.39f*comp) * 0.5f;
float salPpt = ppm / 1000.0f;

// Turbidity: SEN0189 curve, clamped to the sensor's honest range.
float tv  = turbidityVoltage;
float ntu = -1120.4f*tv*tv + 5742.3f*tv - 4353.8f;
if (ntu < 0.0f)    ntu = 0.0f;
if (ntu > 3000.0f) ntu = 3000.0f;

// Depth: gauge pressure over rho*g, seawater at 1025 kg/m3.
float depthM = pressureMPa * 1.0e6f / (1025.0f * 9.80665f);

// pH: nominal Gravity slope. Two-point calibrate this against buffer 7.00
// and 4.00; every other curve here is published, this one is per-probe.
float ph = -5.70f * phVoltage + 21.34f;
if (ph < 0.0f)  ph = 0.0f;
if (ph > 14.0f) ph = 14.0f;
```

### The record

```cpp
char buf[400];
snprintf(buf, sizeof(buf),
    "{\"t\":\"tlm\",\"seq\":%lu,\"ms\":%lu,\"st\":\"tx\","
    "\"temp\":%.2f,\"sal\":%.3f,\"ntu\":%.1f,\"dep\":%.2f,\"ph\":%.2f,"
    "\"fc\":%lu,\"bw\":%lu,\"tau\":%lu,\"amp\":%.3f,\"snr\":%.1f,"
    "\"ma\":%.1f,\"mv\":%d,\"flt\":[]}\n",
    ++telemetrySeq,
    millis(),
    tempC, salPpt, ntu, depthM, ph,
    (unsigned long) adaptiveCenterHz,
    (unsigned long) adaptiveBandwidthHz,
    (unsigned long) (adaptivePulseMs * 1000.0f),   // ms -> MICROSECONDS
    adaptiveDrivePercent / 100.0f,                 // percent -> 0..1
    0.0f,                                          // snr 0: console computes it
    0.0f, 0);                                      // ma, mv unmeasured
```

**The `\n` is not decoration.** It is the frame boundary, and without it the
console holds the record in its reassembly buffer waiting for the rest.

### The three errors worth naming

| Mistake | Symptom on screen |
|---|---|
| `tau` sent in milliseconds | time-bandwidth product 1000× too large, compression gain 30 dB too high |
| `amp` sent as 0–100 | amplitude clamps at full scale, energy figures wrong |
| newline omitted | packet counter stays at zero, malformed count stays at zero, nothing arrives |

The last one is the confusing failure, because the link reports itself up and no
error is counted. The record is simply still in the buffer.

---

## 2. Serving it over Wi-Fi

Four lines, using only `WebServer.h` from the ESP32 Arduino core. **No WebSocket
library is needed**; the console falls back to polling on its own.

```cpp
#include <WiFi.h>
#include <WebServer.h>
#include <esp_mac.h>

WebServer http(80);

// setup()
uint8_t mac[6];
esp_read_mac(mac, ESP_MAC_WIFI_STA);
char ssid[16];
snprintf(ssid, sizeof(ssid), "SEANERGY-%02X%02X", mac[4], mac[5]);
WiFi.mode(WIFI_AP);
WiFi.softAP(ssid, "seanergy2026", 6);

http.on("/telemetry", []() {
    http.send(200, "application/x-ndjson", buildTelemetryLine());
});
http.begin();

// loop()
http.handleClient();
```

Deriving the four hex digits from the MAC rather than a build constant means two
payloads on one bench are distinguishable with no configuration step, and the
same `SEANERGY-` prefix is what the Bluetooth scanner filters on.

### Check it without the app

```
curl http://192.168.4.1/telemetry
```

If that returns a JSON line, the firmware is correct and any remaining problem
is on the phone. If it does not, the app was never going to work either. This is
the first thing to try when the packet counter stays at zero.

---

## 3. Parsing a record

The console's parser is `src/core/protocol.ts`. The shape of it:

```ts
const d = decodeLine(line);

if (d?.kind === 'telemetry') {
  // d.packet.tau is already in SECONDS; decodeLine divided by 1e6
  // d.packet.ph defaulted to 8.1 if the key was absent
  applyEnvironment(environmentOf(d.packet));
} else if (d?.kind === 'identity') {
  // proto was already checked; a mismatch arrives as 'error'
  show(d.identity.name, d.identity.firmware);
} else if (d?.kind === 'error') {
  countMalformed(d.reason);
}
```

### Reassembly

No transport hands you a whole record. Accumulate and split in one place:

```ts
const asm = new LineAssembler();

// a USB bulk read returns whatever was in the buffer
asm.push('{"t":"tlm",');          // []           - held back
asm.push('"seq":7}\n{"t":"tlm"'); // ['{"t":"tlm","seq":7}'] - one complete
asm.push(',"seq":8}\r\n');        // ['{"t":"tlm","seq":8}'] - CR stripped
```

The assembler caps at 64 KiB. A stream with no newline inside that is treated as
desynchronised and dropped, rather than growing until the app runs out of memory.

### What a client must not do

- **Must not guess a protocol version.** `{"t":"id",...,"proto":2}` closes the
  link with the reason on screen. Downgrading silently is how two codebases
  drift apart without anybody noticing.
- **Must not crash on a bad line.** Count it and carry on. A serial port picks up
  boot messages, partial writes and noise, and none of that is exceptional.
- **Must not assume the key is present.** Every field has a documented default
  and each default is a plausible value, so a payload with three sensors wired
  still drives the screens.

---

## 4. A session, end to end

```
console                                   payload
   |                                         |
   |-- transport opens ---------------------->|
   |-- {"t":"cmd","c":"hello"}\n ------------>|
   |<------ {"t":"id","name":"SEANERGY-4F2A","fw":"1.0.0","proto":1}\n
   |                                         |
   |   (proto == 1, link stays up)           |
   |                                         |
   |<------ {"t":"tlm","seq":1,...}\n         |
   |<------ {"t":"tlm","seq":2,...}\n         |   every 500 ms
   |<------ {"t":"tlm","seq":4,...}\n         |   seq 3 lost: counted as a drop,
   |                                         |   not an error
```

A payload that never answers `hello` is still fully supported. The identity
record buys a name on screen and a version check; the link works without it, and
the console shows `Receiving telemetry` instead of the payload's name.
