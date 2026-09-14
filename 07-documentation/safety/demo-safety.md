# Demonstration safety

## Roles and boundary

One operator controls payload power and the phone. A second person controls the
tank boundary and spill response. Visitors remain outside the marked wet area.
The emergency action is always the same: disarm, switch off the isolated DC
supply or disconnect the battery, then deal with water or hardware.

**Numerical basis:** Engineering projection for the final product configuration.

Enclosure validation after 120 min at 1.5 m records 0 mL visible ingress,
239 Mohm insulation resistance and 0.1 g mass change (T-16). This is the
tank-configuration immersion result and does not replace a separate depth
rating.

## Before filling or powering

1. Place the tank on a stable, level surface inside a bund or spill tray.
2. Route all mains-powered instruments outside the splash boundary and protect
   the supply with an RCD.
3. Bond a metallic tank frame to protective earth. Keep signal ground isolated
   from the water.
4. Inspect the enclosure, two AS568-246 O-rings, seal lands and both M10
   penetrators. Clean, lubricate and fit O-rings without twist.
5. Close the twelve M3 fasteners squarely in two cross-pattern passes to
   0.50 N m.
6. Secure the transducers and target. Route receive/sensor cables separately
   from bridge and transformer leads.
7. Confirm the phone shows the intended Simulation or Telemetry mode and the
   intended Air bench or Underwater medium.
8. Confirm the ping interval and verify that no person can reach the tank while
   the transmitter is armed.

## Water near mains

Use battery power for the payload wherever practical. Mains instruments remain
outside the splash boundary, above the tank rim and connected through RCD
protection. Never energise an exposed bridge in water. Never reach into the
tank while the payload is powered, armed or transmitting. Stop and isolate
power before moving a cable, transducer or target.

Use only differential probing at TP12. A grounded oscilloscope clip must not be
connected across the floating bridge or transformer node. All probe connections
are made before the driver is enabled.

## Battery handling

| Check | Safe condition | Action on failure |
|---|---|---|
| Chemistry and configuration | 3S LiPo, 11.1 V nominal, 2.6 Ah | Do not connect another pack type |
| Physical state | Flat, cool, intact wrap and leads | Isolate damaged or swollen pack |
| Connector polarity | Matches BAT_RAW input | Do not rely on Q1 as an operating procedure |
| Charging | 3S balance charger, dry area, pack outside pod | Stop charging and isolate on heat or swelling |
| Telemetry | No low-battery fault; voltage stable under ping | Disarm, power down and service pack |

Do not charge the pack inside the sealed enclosure or beside the filled tank.
F1, Q1 and D1 remain installed during all tests.

## Running the demonstration

1. Power the payload with transmit disabled and wait for `READY`.
2. Open the app. In Simulation mode, select a scenario and inspect the solve.
3. For a wet hardware ping, select Telemetry, scan for `SeaNergy-26058`, connect
   and confirm a valid protocol version `1` record.
4. Announce the ping and check that the tank boundary is clear.
5. Send one `PING_NOW`. Observe the `ARMED`, `TRANSMITTING` and `READY` sequence,
   then verify the new telemetry sequence, current, energy and fault bitmap.
6. Review the Echo screen and log entry before another ping.
7. Use mission mode only after single-ping operation passes. Remember that BLE
   intentionally switches off in mission mode; use the physical trigger to exit.

The app workflow is detailed in
[`../user-guide/quick-start.md`](../user-guide/quick-start.md).

## Spill containment

Keep absorbent material, a wet-floor marker and a container for recovered water
beside the test area. On a spill, do not step into the wet area to reach a mains
switch. Use the dry-side isolator or RCD, keep people clear, then contain and
recover the water. Inspect all connectors and instruments before re-energising.

Kaolin suspension is allowed to settle and the sludge is collected. Concentrated
solids are not discharged directly to a drain. Clean the tank and floor before
removing the boundary.

## Stop and recovery

Stop immediately for a link-independent fault state, abnormal current, smoke,
odour, heating, cell swelling, leak indication, loose transducer, cavitation,
unexpected sound, RCD trip or boundary breach. Do not reset repeatedly. Isolate
power, record the state and test ID, and inspect the hardware using the staged
bring-up procedure.

See [the FMEA](fmea.md), [Electrical safety](electrical-safety.md) and
[Acoustic exposure](acoustic-exposure.md).
