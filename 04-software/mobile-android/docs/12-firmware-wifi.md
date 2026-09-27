# 12 — Wi-Fi only: the firmware changes

This is the complete list of edits to `main.cpp` to make the console work over
Wi-Fi alone. **Nothing here touches the serial output**, so the Python live-plot
script keeps running unchanged while the phone is connected.

---

## Why Wi-Fi is safe on this board

The one thing that can break when Wi-Fi comes up on an ESP32-S3 is ADC2. The
radio takes ADC2 for itself, and `analogRead()` on any ADC2 pin then returns
garbage or blocks. ADC2 on the S3 is **GPIO11–GPIO20**.

Checked against the pin map in your sketch:

| Pin | Used for | Bank | Wi-Fi safe |
|---|---|---|---|
| 1 | `DEPTH_POT_PIN`, the only `analogRead()` in the file | **ADC1_CH0** | yes |
| 4 | DS18B20 one-wire | digital | yes |
| 5, 6, 7 | I2S BCLK / LRC / DIN | digital | yes |
| 8, 9 | hardware I²C, both ADS1115 | digital | yes |
| 10, 11 | OLED2 software I²C | digital | yes |
| 12, 13 | OLED3 software I²C | digital | yes |
| 14, 15 | OLED4 software I²C | digital | yes |
| 16 | `TX_PIN`, LEDC 40 kHz | digital | yes |

GPIO11–15 are in the ADC2 range but are driven as **digital** pins, which the
radio does not touch. The only analogue read in the sketch is on GPIO1, which is
ADC1. Every other sensor arrives over I²C through the two ADS1115s, which are
external converters and are not affected at all.

GPIO19 and GPIO20, the native USB pair, are not used by the sketch, so the USB
transport stays available later with no conflict.

**Conclusion: Wi-Fi costs you no pin changes. Nothing has to be rewired.**

---

## Change 1 — includes and globals

At the top, next to the other includes:

```cpp
#include <WiFi.h>
#include <WebServer.h>
#include <esp_mac.h>

WebServer http(80);
char apSsid[16] = "SEANERGY-0000";
unsigned long telemetrySeq = 0;
```

`WebServer.h` ships with the ESP32 Arduino core. **No library to install, no
WebSocket dependency.** The console tries a WebSocket first, waits 2.5 seconds,
and then falls back to polling this HTTP endpoint on its own. The operator does
not choose; the screen just reports which one it settled on.

---

## Change 2 — the telemetry line builder

Add this function. It is the only place the app's wire format appears, and it
converts your raw voltages into the engineering units the solver runs on.

```cpp
// The app's wire format: one JSON object, one line, terminated with \n.
// Documented in docs/11-link-protocol.md.
String buildTelemetryLine()
{
    // --- temperature: already in degrees C from the DS18B20 ---
    float tempC = (temperatureC == DEVICE_DISCONNECTED_C) ? 25.0f : temperatureC;

    // --- salinity: SEN0244 TDS curve, then ppm to ppt ---
    // On the Rev B PCB the board divides the TDS and turbidity voltages by two
    // before ADS1115 #1, and the firmware patch that comes with the board
    // multiplies them back by two at read time. So tdsVoltage and
    // turbidityVoltage already hold the sensor output here and these curves are
    // unchanged. Do not compensate a second time.
    float v    = tdsVoltage;
    float comp = v / (1.0f + 0.02f * (tempC - 25.0f));   // temperature compensation
    float ppm  = (133.42f * comp * comp * comp
                - 255.86f * comp * comp
                + 857.39f * comp) * 0.5f;
    float salPpt = ppm / 1000.0f;

    // --- turbidity: SEN0189 curve, clamped to the sensor's honest range ---
    float tv  = turbidityVoltage;
    float ntu = -1120.4f * tv * tv + 5742.3f * tv - 4353.8f;
    if (ntu < 0.0f)    ntu = 0.0f;
    if (ntu > 3000.0f) ntu = 3000.0f;

    // --- depth: gauge pressure over rho*g, seawater at 1025 kg/m3 ---
    float depthM = pressureMPa * 1.0e6f / (1025.0f * 9.80665f);

    // --- pH: nominal slope for the Gravity probe. CALIBRATE THIS (see below) ---
    float ph = -5.70f * phVoltage + 21.34f;
    if (ph < 0.0f)  ph = 0.0f;
    if (ph > 14.0f) ph = 14.0f;

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
        (unsigned long) (adaptivePulseMs * 1000.0f),   // ms to MICROSECONDS
        adaptiveDrivePercent / 100.0f,                 // percent to 0-1
        0.0f,                                          // snr: 0 = app computes it
        0.0f, 0);                                      // ma, mv: 0 if not measured

    return String(buf);
}
```

Three conversions are easy to get wrong, so they are worth stating plainly.

- **`tau` is in microseconds.** Your `adaptivePulseMs` is in milliseconds, hence
  the `* 1000`. Get this wrong and the time-bandwidth product is off by 10^3,
  which moves the reported compression gain by 30 dB.
- **`amp` is 0 to 1.** Your `adaptiveDrivePercent` is 0 to 100, hence the `/ 100`.
- **`snr` may be 0.** Send 0 and the app computes the predicted SNR itself from
  the sonar equation. Only send a number here if the payload has its own
  estimate you would rather trust.

**The pH slope must be calibrated.** `-5.70 * V + 21.34` is the nominal Gravity
figure and will be a few tenths out on any individual probe. Put the probe in
buffer 7.00, record the voltage, put it in buffer 4.00, record that, and fit the
straight line through the two points. Everything else in the packet is a
published sensor curve; this one is per-probe.

---

## Change 3 — bring the access point up in `setup()`

Put this at the end of `setup()`, after the displays and I2S are going:

```cpp
uint8_t mac[6];
esp_read_mac(mac, ESP_MAC_WIFI_STA);
snprintf(apSsid, sizeof(apSsid), "SEANERGY-%02X%02X", mac[4], mac[5]);

WiFi.mode(WIFI_AP);
WiFi.softAP(apSsid, "seanergy2026", 6);

http.on("/telemetry", []() {
    http.send(200, "application/x-ndjson", buildTelemetryLine());
});
http.on("/id", []() {
    char id[96];
    snprintf(id, sizeof(id),
        "{\"t\":\"id\",\"name\":\"%s\",\"fw\":\"1.0.0\",\"proto\":1}\n", apSsid);
    http.send(200, "application/x-ndjson", id);
});
http.begin();

Serial.print("SoftAP  : ");
Serial.println(apSsid);
Serial.print("Password: seanergy2026");
Serial.println();
Serial.print("Console : http://");
Serial.println(WiFi.softAPIP());    // 192.168.4.1
```

The SSID is derived from the MAC rather than hard-coded so two boards on the
same bench are distinguishable with no reflashing and no configuration step.
`SEANERGY-` is also the prefix the Bluetooth scanner filters on, so one naming
rule covers both radios.

---

## Change 4 — service the server in `loop()`

One line, anywhere in `loop()`:

```cpp
http.handleClient();
```

Your `loop()` has no blocking `delay()` in it, so this gets called thousands of
times a second and the endpoint answers immediately.

---

## Change 5 — stop the 750 ms temperature stall

This is the only blocking call left in the run loop, and it is the one thing
that will make the phone's readings visibly stutter.

`temperatureSensor.requestTemperatures()` at line 445 waits for the DS18B20 to
finish converting. At 12-bit resolution that is **750 ms**, every second, during
which nothing else in `loop()` runs — not the HTTP handler, not the displays.

In `setup()`, right after `temperatureSensor.begin()`:

```cpp
temperatureSensor.setWaitForConversion(false);
```

The call then returns immediately and `getTempCByIndex(0)` reads whatever the
previous conversion produced. Since `readRealSensors()` runs once a second and
the conversion takes 750 ms, the reading you get is always the one requested on
the previous pass: one second stale, which for water temperature is nothing.

This is worth doing whether or not you use Wi-Fi. It gives you back three
quarters of every second.

---

## If you are on the Rev B PCB

The compact board adds 2:1 dividers on the TDS and turbidity inputs, so those
two readings arrive at half scale. The fix is the two-line patch that ships with
the board, `01-hardware/kicad/firmware/main_cpp_sensor_dividers.patch`:

```cpp
tdsVoltage       = 2.0f * ads1.computeVolts(tdsRaw);
turbidityVoltage = 2.0f * ads1.computeVolts(turbidityRaw);
```

Apply it and the conversions above are correct as written, because
`tdsVoltage` then holds the sensor's own output again. **Do not also scale
inside `buildTelemetryLine()`** — that compensates twice and halves every
salinity and turbidity reading the app shows.

Nothing else on the board changes the firmware. The potentiometer readings, the
GPIO map and the transmit polarity are identical to Rev A.

## What you do not have to change

- **Serial stays exactly as it is.** `Serial.begin(115200)`, every `Serial.print`
  label, the 1 Hz `SERIAL_UPDATE_MS` cadence. The Python plotter does not know
  any of this happened.
- **No pin moves.** See the table at the top.
- **No WebSocket library.** The console falls back to polling by itself.
- **No change to the adaptive logic, the I2S chirp, the LEDC carrier or the
  OLEDs.** The telemetry builder only reads variables that already exist.

---

## Bringing it up

1. Flash the modified sketch. The serial monitor prints the SSID on boot.
2. On the phone, join the Wi-Fi network `SEANERGY-XXXX`, password `seanergy2026`.
   Android will warn that the network has no internet — stay connected.
3. Open the app, go to **Settings**, choose the **Wi-Fi** transport, leave the
   host at `192.168.4.1`, tap **Connect**.
4. The status line reads `no WebSocket, polling http://192.168.4.1/telemetry`.
   That is the expected and correct result for this firmware.
5. Set the source to **Telemetry** on the Console screen. The environment
   readings and the transmitted waveform are now the payload's, not simulated.
6. **Diagnostics** shows the packet counter climbing, the rate at about 2 per
   second, and the raw decoded fields.

If the counter stays at zero, check the phone is actually on the payload's
network and not silently switched back to mobile data, then open
`http://192.168.4.1/telemetry` in the phone's browser. If that shows a JSON
line, the firmware is right and the problem is in the app; if it does not, the
firmware is not serving.
