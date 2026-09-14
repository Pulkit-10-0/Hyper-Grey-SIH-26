# Scaling analysis

## 1. 100 W transmitter architecture

Use a 24 V nominal battery or isolated bench supply feeding a current-limited full-bridge Class-D stage. A transformer provides voltage transformation and galvanic separation appropriate to the measured transducer impedance. The control board supplies complementary gate timing with enforced dead time. A hardware enable chain combines overcurrent, temperature, undervoltage and watchdog signals so a firmware fault cannot sustain transmission.

At 100 W electrical output and 85% end-to-end amplifier efficiency, input power during a burst is about 118 W and loss is about 18 W. With a 10% transmit duty cycle, average amplifier loss is about 1.8 W before auxiliary loads. Thermal sizing must use burst junction rise, transformer copper/core loss and enclosure temperature, not only the average value.

## 2. T/R protection

The receiver must be isolated during transmit, clamped against residual energy and reconnected only after the transducer ring-down reaches a safe level. Required measurements are switch leakage, turn-off time, receiver recovery, clamp energy and the minimum usable echo delay. The blanking interval becomes a solver constraint because it sets the minimum measurable range.

## 3. Transducer migration

The Airmar P66 is a real, purchasable 50/200 kHz, 600 W reference part. Public US pricing is roughly USD 194-243, equal to about INR 18,600-23,300 at the stated FX rate before freight, duty and GST. It provides a practical route from a bench piezo pair to a marine housing, while measured impedance and connector mapping determine the final matching network.

## 4. Calibrated measurement

An HBK Type 8103 provides an individually characterized reference path over 0.1 Hz to 180 kHz. A planning allowance of INR 7.5 lakh covers the hydrophone, conditioning, calibration paperwork and accessories pending a formal Indian quotation. The calibrated path converts relative oscilloscope amplitude into traceable acoustic pressure and source-level evidence.

## 5. Stage budgets

| Upgrade | Planning amount |
|---|---:|
| Rev-B mixed-signal PCB and assembly | INR 55,000 |
| 24 V, 100 W bridge, transformer and protection | INR 48,000 |
| Airmar P66 procurement allowance | INR 32,000 |
| Sealed enclosure, connectors and cabling | INR 65,000 |
| Low-noise receive chain and synchronized ADC | INR 70,000 |
| Calibrated hydrophone measurement package | INR 7,50,000 |
| Pressure housing and vehicle interface | INR 2,50,000 |
| Integration and contingency | INR 1,65,000 |
| **Field-payload scaling reserve** | **INR 14,35,000** |

## 6. Scaling gates

1. Characterize transducer impedance and ring-down at low voltage.
2. Prove bridge timing and protection into a dummy load.
3. Increase burst energy in controlled steps with current and temperature capture.
4. Establish T/R recovery and minimum range.
5. Calibrate received pressure with a traceable hydrophone.
6. Freeze enclosure, connector and thermal design only after these measurements.

