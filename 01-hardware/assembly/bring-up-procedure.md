# SeaNergy staged bring-up procedure

Document ID: HW-ASM-003  
Rule: stop at the first failed limit. Do not connect the transducer to diagnose an earlier stage.

## 1. Bring-up matrix

| Stage | Fitted hardware | Supply and limit | Expected current | Required checks | Release |
|---:|---|---|---:|---|---|
| 1 | Bare PCB only | DMM only; no power | 0 mA | BAT+, +5V and +3V3 to GND >100 kOhm | No short or bridge |
| 2 | Protection, buck, LDO | 9.0 V, 100 mA | <35 mA | TP01-TP05; two-minute thermal check | Rails within +/-2% |
| 3 | MCU, USB, boot/reset | USB, 300 mA | 80-140 mA idle; <350 mA peak | USB enumeration, blink, bootloader | 10 consecutive resets pass |
| 4 | DAC/reference | 9.0 V, 400 mA | +10-30 mA | 1 kHz ramp then chirp at TP07-TP09 | No timing fault or missing ramp code |
| 5 | Analog front end | 9.0 V, 500 mA | +20-80 mA | 10-500 kHz swept response | Ripple <1 dB; no oscillation |
| 6 | Driver and current sense | 9.0 V, 250 mA initially | Idle <30 mA; burst estimated 0.3-1.2 A | Dummy load, dead time, shunt trace | No shoot-through; stable temperature |
| 7 | Transducer via limiter | 9.0 V, 250 mA, 1 Hz burst | Measured value required | Resonance, ring-down, limiter recovery | Engineering sign-off before higher energy |

## 2. Stage record

Record actual voltage, current, temperature, scope filename and pass/hold for every stage. Estimated current is a protection setting, not evidence of measured consumption.

## 3. Immediate shutdown conditions

1. Any rail exceeds +5.20 V or +3.43 V.
2. Current limit engages unexpectedly for more than 100 ms.
3. A semiconductor rises more than 20 degC above ambient while idle.
4. Both half-bridge devices conduct simultaneously.
5. DAC or ADC pins exceed their rail by more than 0.3 V.
6. Moisture is found after enclosure testing.

## 4. Recovery

Disconnect power, photograph the state, wait for capacitors to discharge, measure rail resistance, and isolate the most recently fitted subsystem. Never bypass F1, D1 or the T/R limiter during fault finding.
