# 11 — The telemetry link

One wire format, three transports. USB, Wi-Fi and Bluetooth carry exactly the
same bytes, so the parser, the screens and the log never learn which one a
reading arrived on. Adding a transport is a new class; nothing else changes.

| | Transport | When it is the right one |
|---|---|---|
| 1 | **USB-C to USB-C** | The demo. No pairing, no network, no battery in the middle, and the phone powers the payload. |
| 2 | **Wi-Fi** | The payload is in a tank and the phone is not. Works across a room. |
| 3 | **Bluetooth LE** | Lowest power, smallest MTU, slowest. For the flight build. |

---

## The wire format

**Newline-delimited JSON. UTF-8. One object per line, terminated with `\n`.**

Every line is a complete, independent object. No length prefix, no CRC, no
escape framing: a `\n` ends a record and the next byte starts the following one.
Keep a line under 512 bytes so it fits one Bluetooth notification.

### Telemetry, payload to console

Send one of these per ping, or at a fixed rate between 1 and 10 Hz.

```json
{"t":"tlm","seq":1841,"ms":582103,"st":"tx","temp":26.4,"sal":34.8,"ntu":180,"dep":25.3,"ph":8.05,"fc":350667,"bw":298667,"tau":500,"amp":0.92,"snr":28.4,"ma":68.0,"mv":3712,"flt":[]}
```

| Key | Meaning | Unit | Notes |
|---|---|---|---|
| `t` | record type | — | `"tlm"` for telemetry |
| `seq` | sequence counter | — | monotonic; the console uses gaps to count drops |
| `ms` | uptime | ms | since the payload booted |
| `st` | state | enum | `boot` `idle` `armed` `sampling` `tx` `fault` |
| `temp` | temperature | °C | |
| `sal` | salinity | ppt | |
| `ntu` | turbidity | NTU | |
| `dep` | depth | m | **new** — from the pressure sensor |
| `ph` | pH | pH | **new** — from the pH probe |
| `fc` | centre frequency | Hz | integer |
| `bw` | bandwidth | Hz | integer |
| `tau` | pulse duration | **µs** | integer; the console converts to seconds |
| `amp` | drive amplitude | 0–1 | |
| `snr` | predicted echo SNR | dB | what the payload's own solver expects |
| `ma` | supply current | mA | |
| `mv` | bus voltage | mV | |
| `flt` | active faults | array of strings | `[]` when healthy |

Missing keys default rather than fail. A line that is not valid JSON is counted
as malformed and shown on the Diagnostics screen; it never crashes the console.

### Identity, sent once on connect

```json
{"t":"id","name":"SEANERGY-4F2A","fw":"1.0.0","proto":1}
```

`proto` must be **1**. Any other value is refused and the link closes with the
reason on screen. A version mismatch is never guessed at.

### Commands, console to payload

```json
{"t":"cmd","c":"hello"}
{"t":"cmd","c":"ping"}
{"t":"cmd","c":"rate","v":2.0}
{"t":"cmd","c":"mode","v":"lfm"}
{"t":"cmd","c":"stop"}
```

The console sends `hello` as soon as a transport opens. Answer it with the
identity line. If commands are not implemented yet, ignore them: the link works
one-way and the console stays useful.

---

## 1. USB-C to USB-C

**Use the board's native USB port, not the UART bridge port.** An ESP32-S3
DevKit has two USB-C sockets. The one marked `USB` is wired to the chip's own
USB peripheral on GPIO19 and GPIO20 and enumerates as a standard CDC-ACM serial
device with Espressif's vendor ID `0x303A`. The one marked `UART` goes through a
CP2102 or CH340 bridge; the console can open a CP210x too, but native is the
supported path and the one to demonstrate.

Firmware side, this is all it takes:

```cpp
#include "USB.h"
#include "USBCDC.h"
USBCDC USBSerial;

void setup() {
  USBSerial.begin();
  USB.begin();
}

void loop() {
  USBSerial.printf(
    "{\"t\":\"tlm\",\"seq\":%lu,\"ms\":%lu,\"st\":\"%s\","
    "\"temp\":%.2f,\"sal\":%.2f,\"ntu\":%.1f,\"dep\":%.2f,\"ph\":%.2f,"
    "\"fc\":%lu,\"bw\":%lu,\"tau\":%lu,\"amp\":%.2f,\"snr\":%.1f,"
    "\"ma\":%.1f,\"mv\":%d,\"flt\":[]}\n",
    seq, millis(), stateName, tempC, salPpt, ntu, depthM, ph,
    fCentreHz, bandwidthHz, tauMicros, amplitude, snrDb, currentMa, busMv);
  delay(500);
}
```

`\n` at the end of every line is not optional. It is the frame boundary.

**Baud rate is a fiction on native USB** and the console asks for 921600 only so
that a CP210x bridge, if you use one, is set to something sensible. The native
port ignores it and runs at USB speed.

### What the phone needs

A **USB-C data cable**, not a charge-only one. A phone that supports USB host
mode, which is nearly all of them since about 2018. Android shows a permission
dialog the first time; accept it and the console opens the port. The phone
supplies VBUS, so the payload runs off the phone. **If the payload draws more
than about 500 mA while transmitting, power it separately** and use a cable or
hub that does not carry VBUS from the phone, or the phone will drop the port
mid-ping.

---

## 2. Wi-Fi

The payload raises **its own access point**. No router, no DHCP surprises, no
network the venue controls.

| Setting | Value |
|---|---|
| SSID | `SEANERGY-XXXX` |
| `XXXX` | last two bytes of the station MAC, uppercase hex, no separator |
| Password | `seanergy2026` (WPA2; the minimum is 8 characters) |
| Mode | SoftAP, channel 6 |
| Payload address | `192.168.4.1` (the ESP32 SoftAP default) |
| WebSocket port | `81` |
| WebSocket path | `/telemetry` |
| Frames | WebSocket **text** frames, same NDJSON lines |

So the console connects to `ws://192.168.4.1:81/telemetry`, and the phone joins
the Wi-Fi network named `SEANERGY-4F2A` beforehand.

### If you have no WebSocket library

**You do not need one.** A WebSocket on the ESP32 means a third-party library;
the console therefore treats the socket as an optimisation and falls back on its
own. It tries `ws://<host>:81/telemetry`, waits 2.5 seconds, and if nothing
opens it starts polling:

| Setting | Value |
|---|---|
| Method | `GET` |
| URL | `http://<host>/telemetry` (port 80) |
| Interval | 500 ms, one request in flight at a time |
| Response | **one NDJSON line**, the same object as above |
| Commands | `POST http://<host>/cmd`, body is the command line. Optional. |

That endpoint is four lines of `WebServer.h`, which ships with the ESP32 core:

```cpp
#include <WebServer.h>
WebServer http(80);

http.on("/telemetry", []() {
  http.send(200, "application/x-ndjson", buildTelemetryLine());
});
http.begin();
// and http.handleClient(); once per loop()
```

The operator sees which one is in use on the Settings screen: the status reads
`Wi-Fi 192.168.4.1, socket` or `no WebSocket, polling http://192.168.4.1/telemetry`.
Nothing else differs. The same parser, the same screens, the same log.

Polling costs one HTTP round trip per reading, so it caps out around 2 Hz on a
busy channel where the socket would carry 10. For an environmental payload whose
sensors update once a second, that is not a constraint.

**The naming convention matters for a reason.** `SEANERGY-` is the prefix the
Bluetooth scanner filters on as well, so one rule covers both radios, and the
four hex digits make two payloads on the same bench distinguishable without
reflashing either. Derive them from the MAC rather than a build constant, so
every board is unique with no configuration step:

```cpp
uint8_t mac[6];
esp_read_mac(mac, ESP_MAC_WIFI_STA);
char ssid[16];
snprintf(ssid, sizeof(ssid), "SEANERGY-%02X%02X", mac[4], mac[5]);
WiFi.softAP(ssid, "seanergy2026", 6);
```

If you would rather join an existing network, the Settings screen accepts a
host address, so station mode works too: set the payload's IP there instead of
`192.168.4.1`. Everything else is identical.

---

## 3. Bluetooth LE

| Setting | Value |
|---|---|
| Advertised name | `SEANERGY-XXXX`, same rule as the SSID |
| Service | Nordic UART Service, `6e400001-b5a3-f393-e0a9-e50e24dcca9e` |
| Payload → console | `6e400003-…` , **notify** |
| Console → payload | `6e400002-…` , **write** |
| MTU | request 185 so a whole line fits one notification |

The console scans for the name prefix, lists what it finds with signal strength,
and connects to the one you tap. If the payload uses its own UUIDs instead, the
console falls back to the first notifying characteristic it finds, so a
non-standard profile still streams.

---

## Reassembly

No transport delivers whole lines. A USB bulk read returns whatever was in the
buffer, and a Bluetooth notification is capped by the MTU. The console
accumulates bytes and splits on `\n` in one place, `LineAssembler` in
`src/core/protocol.ts`, so no transport has to think about it and a line split
across two reads is handled once rather than three times.

The firmware does not need to do anything about this beyond ending every record
with a newline.
