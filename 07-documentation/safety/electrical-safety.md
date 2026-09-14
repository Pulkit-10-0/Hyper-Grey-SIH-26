# Electrical safety

## Configurations and limits

The electrical limits are kept separate for the two acoustic configurations.

**Numerical basis:** Engineering projection for the final product configuration.

| Quantity | Bench / air demonstrator | Underwater payload design |
|---|---:|---:|
| Acoustic band | 24 to 80 kHz; 40.2 kHz resonance (T-01) | 100 to 500 kHz |
| Transmit current | 68.0 mA (T-11) | 340 mA peak |
| Energy per ping | 0.93 mJ complete range ping (T-11) | 46 mJ budget |
| Supply | 9.0 V current-limited bench input | 3S, 11.1 V nominal, 2.6 Ah LiPo |
| Maximum pack voltage | 12.6 VDC | 12.6 VDC |
| Transducer connector drive ceiling | 12.6 V peak, 25.2 Vpp differential, derived from full-bridge reversal of 12.6 VDC | 12.6 V peak, 25.2 Vpp differential, derived on the same basis |

The 25.2 Vpp figure is the conservative connector-side electrical ceiling
before the characterised matching-transformer ratio. The PZT-side voltage is
set by T1's measured ratio and the test card. Current is limited to the
configuration value above and is observed through U9.

## Protection chain

| Order | Component or control | Rating or rule | Protection provided |
|---:|---|---|---|
| 1 | BAT1 | 3S LiPo, 11.1 V, 2.6 Ah | Pack energy source and cell protection |
| 2 | F1, `MF-MSMF200X-2` | 2.0 A resettable fuse | Sustained overcurrent and wiring fault |
| 3 | Q1, `DMP3010LK3-13` | -30 V P-channel MOSFET | Reverse-polarity blocking |
| 4 | D1, `SMBJ15A` | 15 V TVS | Battery-input transient clamp |
| 5 | U1 then U2 | 5.00 VDC buck, 3.30 VDC LDO | Rail regulation and domain separation |
| 6 | U9, `INA226` | 0.1 ohm shunt, 0.1 mA/count | Bus voltage, current and ping-energy supervision |
| 7 | Q2 to Q5 and U7 | Full bridge and dual gate driver | Symmetric AC drive with at least 100 ns dead time at TP11 |
| 8 | C12 and T1 | 10 uF/25 V X7R DC blocking capacitor; matching transformer | Series DC interruption, galvanic isolation and impedance transformation |
| 9 | D3 to D6, `BAT54S` | Back-to-back diode limiter | Receive-chain clamp during transmit |

The firmware computes ping energy as
`bus_mV * current_0.1mA * duration_us / 10,000,000`, giving microjoules.
Telemetry transmits bus voltage in mV, current in 0.1 mA/count and energy in
microjoules.

## Defined safe state

GPIO 18 is the transmit enable. `board_init()` configures outputs and immediately
calls `board_set_tx_enabled(false)`. The state-machine invariant keeps GPIO 18
low in `BOOT`, `READY` and `FAULT`. `tx_task()` asserts it only after a complete
immutable plan has been queued and always lowers it after `power_end_ping()`,
whether DMA succeeds or times out.

The final DMA block waits no more than 10 ms for completion. A timeout returns an
error, lowers GPIO 3 and GPIO 18, and enters `FAULT`. A watchdog or brown-out
reset returns through `app_main()` and `board_init()`, so the defined reset state
is transmit disabled.

## Battery handling and over-discharge

Use only the 3S 2.6 Ah pack and a 3S balance charger. Disconnect the pack before
opening the enclosure. Do not charge in the sealed pod, in the tank area or
unattended. Inspect the pack for swelling, puncture, heat, damaged insulation or
imbalanced cells before connection. Isolate a damaged pack in accordance with
the laboratory battery procedure.

U9 supplies battery telemetry. `solver_update()` selects range mode below
3,500 mV on its monitored rail and reduces the amplitude Q15 command below
3,400 mV. Fault bit 5 is the low-battery indication. On that indication the
operator disarms the mission, removes the payload from service and charges or
replaces the pack. Pack protection is the final over-discharge cut-off; firmware
policy is the first layer.

## Test and probing rules

| Point | Measurement | Acceptance |
|---|---|---|
| TP01 | Raw battery | 9.0 to 12.6 VDC |
| TP02 | Protected battery | Raw battery minus less than 0.20 V; no reverse conduction |
| TP03 | Digital rail | 5.00 VDC, plus or minus 2%; ripple below 50 mVpp |
| TP04 | MCU/sensor rail | 3.30 VDC, plus or minus 2%; ripple below 30 mVpp |
| TP11 | Gate drive A | 0 to 12 V; dead time at least 100 ns |
| TP12 | Bridge/transformer primary | Burst only; no DC |
| TP13 | Receive limiter | Within plus or minus 0.30 V during transmit transient |
| TP14 | ADC input | 0.10 to 3.20 V; never beyond a rail by more than 0.3 V |
| TP17/TP18 | Current shunt | 0 to 12 mV typical; Kelvin measurement |

Use a differential probe at TP12. Never attach a grounded oscilloscope clip
across a floating bridge or transformer node. Connect the probe before enabling
the driver. Bring-up stops at the first failed rail or current limit, and F1,
D1 and the T/R limiter are never bypassed during fault finding.

Related controls are summarised in [the FMEA](fmea.md) and the wet-test boundary
is defined in [Demo safety](demo-safety.md).
