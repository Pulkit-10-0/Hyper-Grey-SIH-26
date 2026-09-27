# AUV V3 — assembly and wiring guide

Revision B · 100 × 100 mm · two copper layers · ESP32-S3 main/TX + ESP32 DevKit RX · external modules wired to labeled solder pads

Revision B brings the same 91 PCB references and electrical connections into 100 × 100 mm, compared with revision A's 200 × 150 mm. Its board area is 66.7% smaller. It uses the same two copper layers and firmware; tighter component placement and new trace routing produce the size reduction. This board brings your existing controllers, ADC modules, displays, sensors, audio amplifier, TX and RX wiring onto one PCB. The modules stay external. Solder a wire from each labeled PCB pad to the matching electrical terminal on the real module. The printed pad sequence is not a guessed module socket layout.

**Use this guide with the final KiCad schematic and the supplied verification reports.** Passing schematic and board checks establishes agreement with the design rules; it does not demonstrate that a physical prototype has been assembled, measured, or calibrated. Check the final package's verification report for the actual check results.

## Read these five connections first

1. Main ESP32-S3 **3V3 output** goes to **J1 pad 1**. It creates the board's **MAIN3V3** supply.
2. RX ESP32 DevKit **3V3 output** goes to **J3 pad 1**. It creates the separate **RX3V3** supply.
3. Both controllers' GND terminals go to their listed GND pads. All PCB GND pads share a common electrical reference.
4. An external regulated **5.0 V** supply goes to **J4 pad 1**, with its negative/return lead to **J4 pad 2**. This powers the transmitter, audio amplifier and any sensor selected for 5 V.
5. Power each controller from its own USB connection. **Do not join their 3V3 outputs. Do not connect either board's VIN/VBUS/5V terminal to J4 or to MAIN3V3/RX3V3.**

## What to prepare

Use `BOM_purchase.csv` for components to fit and `BOM_by_reference.csv` for the explanation of every reference. The main soldering is through-hole, but F1, Q2 and the sensor-isolation IC footprint are surface-mount. Match each exact package before buying; the name of a chip alone does not determine its footprint.

`Existing_Modules.csv` lists the external boards and modules separately, including the details to verify on each one. They are not included in the new-parts purchase quantities because this design reuses your existing hardware.

Use insulated hookup wire, a multimeter, magnification, flux and a temperature-controlled soldering iron. A current-limited 5 V bench supply and an oscilloscope make the first checks much easier. For the four PCB mounting holes, use M3 screw heads and washers no larger than 7 mm outside diameter, matching the reserved mounting area. Oversized washers could approach the J5 pads. Mount external modules securely with standoffs or a separate support; the PCB does not provide their unknown mounting-hole or antenna positions. Keep antenna areas of the ESP32 boards clear of metal and wiring according to the actual board's instructions.

Wire lengths should be as short as practical. Keep the bare RX pair away from TX, speaker and I2S wires. Twist the RX signal with its ground return, the TX pair together, and the speaker pair together. Add strain relief so a pulled wire does not tear off a PCB pad. Confirm the chosen wire conductor fits the plated-hole drill shown in the PCB; do not force thick wire into a pad.

## Power and assembly choices

The external supply is nominally 5.0 V. The gate-driver supply at the IC must remain at least 4.5 V during operation. The design's external-load budget is at most 1 A continuous; budget the transmitter, audio amplifier and 5 V sensors together. F1 is not a regulator. There is no reverse-polarity protection at J4, so verify polarity before connecting it.

The fitted TC4426AEPA is the DIP-8, **inverting** driver variant. Its inversion is intentional because Q2 inverts the command first. Match the exact suffix and pinout in the BOM; substituting a noninverting driver changes the default state. [Microchip TC4426A data sheet](https://ww1.microchip.com/downloads/aemDocuments/documents/APID/ProductDocuments/DataSheets/TC4426A-TC4427A-TC4428A-1.5A-Dual-High-Speed-Power-MOSFET-Drivers-20001423.pdf)

MAIN3V3 feeds four displays, both ADS modules, DS18B20, potentiometers and sensor-isolation control, plus any sensor selected for 3.3 V. The available current depends on the regulator fitted to your actual ESP32-S3 board. Add the worst-case module currents and the ESP32 board's own demand, then check against that regulator and USB supply capability. If the budget does not fit, revise the power design; do not solve it by tying an extra regulator to the existing 3V3 output. RX3V3 powers the MCP6002 receive section.

**J14 and J15 ship with no shunt fitted.** They select TDS and turbidity sensor power respectively:

| Shunt position | Result |
| --- | --- |
| No shunt | Sensor VCC is disconnected |
| Pads 1–2 | Sensor VCC gets MAIN3V3 |
| Pads 2–3 | Sensor VCC gets external 5 V |

Find the sensor module's supply specification before fitting a shunt. Turn all power off before moving one. Fit only one shunt on each selector; shorting all three pads joins 5 V to 3.3 V.

R1–R8 are optional I2C pull-ups. Leave them unpopulated initially when modules already contain appropriate 3.3 V pull-ups. If a bus lacks pull-ups, fit its pair of 4.7 kΩ resistors. OLED1 and both ADC modules share one bus, so several modules may already contribute parallel pull-ups there. Check that no module pulls SDA or SCL to 5 V. R9 is the DS18B20 data pull-up and is normally fitted; account for any duplicate pull-up on a temperature adapter.

Electrolytic capacitors C1, C4, C9 and C16 are polarized. Their **positive leads are PCB pad 1 on the positive supply net**, and negative leads go to GND. The capacitor body's stripe normally marks its negative lead. Nonpolar 100 nF capacitors can go either way. Resistors can go either way. Match every IC's pin 1 to the footprint's pin-1 mark; never use the orientation of printed lettering as the only guide.

## Solder and connect in this order

1. Inspect the bare PCB against the front/back fabrication preview. Verify the outline, drilled holes, revision text and clear pad numbering.
2. Fit the surface-mount parts first, then resistors, small capacitors and IC sockets if used. Inspect adjacent IC pins for solder bridges under magnification. Leave the optional pull-ups and sensor-selector shunts as described above.
3. Fit the remaining capacitors, MOSFET and headers. On Q1, pin 1 is gate, pin 2 is drain and pin 3 is source. Its metal tab is also drain; it must not touch grounded mounting metal.
4. With every power source disconnected, check for unintended shorts from EXT5V, MAIN3V3 and RX3V3 to GND and between the positive rails. Capacitors may make a meter reading change while charging; investigate a persistent very-low resistance. Check F1 continuity and polarized-part orientation.
5. Add controller GND and 3V3 wires, leaving external modules and TX/speaker loads disconnected for the first rail checks. Follow the staged measurements below.
6. With all power off again, add module wires one connector group at a time. Check every wire against the connector table before powering that group. Add sensor supply shunts only after confirming the module's voltage requirement.
7. Fit the TX and RX transducers and speaker after the unloaded electrical checks. Use the revised main firmware copy for measurements through the sensor dividers.

**Compact layout:** Check component body dimensions against the purchase BOM and keep axial resistor bodies within their specified size. Leave room above the board for wire bends and the MOSFET body. Use flux and a suitable iron tip that heats each lead and pad together; confirm the solder wets both. Do not infer component positions from the larger revision A drawing.

**J17 pad 3 soldering:** This GND pad connects directly to the copper plane. Nearby tracks allowed only one thermal spoke in the compact layout, so the finished board uses a direct connection. The copper carries heat away; allow a little extra heating time and use flux with a suitable iron tip that heats both pad and wire. Confirm solder wets both surfaces, and let the board cool between repeated attempts. Do not cut the ground connection.

## Exact connector wiring

**Pad numbers below are this PCB's pad numbers.** Find the physical terminal by its electrical function on your actual module. Pin 1 uses the marked first pad in the footprint. Do not mirror a connector table when looking at the PCB underside; use the board's pad numbers.


### J1 — ESP32-S3 MAIN / A

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | 3V3 OUT | MAIN3V3 |
| 2 | GND | GND |
| 3 | GPIO4 | TEMP_DATA |
| 4 | GPIO5 | I2S_BCLK |
| 5 | GPIO6 | I2S_LRC |
| 6 | GPIO7 | I2S_DIN |
| 7 | GPIO8 | I2C1_SDA |
| 8 | GPIO9 | I2C1_SCL |


### J2 — ESP32-S3 MAIN / B

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | GPIO10 | I2C2_SDA |
| 2 | GPIO11 | I2C2_SCL |
| 3 | GPIO12 | I2C3_SDA |
| 4 | GPIO13 | I2C3_SCL |
| 5 | GPIO14 | I2C4_SDA |
| 6 | GPIO15 | I2C4_SCL |
| 7 | GPIO16 | TX_PWM |
| 8 | GND | GND |


### J3 — ESP32 DEVKIT RX

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | 3V3 OUT | RX3V3 |
| 2 | GND | GND |
| 3 | GPIO34 | RX_ADC |


### J4 — REGULATED 5 V INPUT

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | 5V IN | EXT5V_IN |
| 2 | GND | GND |


### J5 — OLED1 0x3C

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | 3V3 | MAIN3V3 |
| 2 | GND | GND |
| 3 | SCL | I2C1_SCL |
| 4 | SDA | I2C1_SDA |


### J6 — OLED2 0x3C

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | 3V3 | MAIN3V3 |
| 2 | GND | GND |
| 3 | SCL | I2C2_SCL |
| 4 | SDA | I2C2_SDA |


### J7 — OLED3 0x3C

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | 3V3 | MAIN3V3 |
| 2 | GND | GND |
| 3 | SCL | I2C3_SCL |
| 4 | SDA | I2C3_SDA |


### J8 — OLED4 0x3C

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | 3V3 | MAIN3V3 |
| 2 | GND | GND |
| 3 | SCL | I2C4_SCL |
| 4 | SDA | I2C4_SDA |


### J9 — DS18B20

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | 3V3 | MAIN3V3 |
| 2 | DATA | TEMP_DATA |
| 3 | GND | GND |


Use three-wire DS18B20 power, data and ground. Verify the probe wire colors from its supplier; colors are not a pin specification. This connection does not use parasite power.


### J10 — ADS1115 #1 0x48

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | VDD/AVDD | MAIN3V3 |
| 2 | GND/AGND | GND |
| 3 | SDA | I2C1_SDA |
| 4 | SCL | I2C1_SCL |
| 5 | A0 TDS | TDS_ADC |
| 6 | A1 TURB | TURB_ADC |
| 7 | ADDR GND | GND |


Connect to the module's actual ADS1115 supply and ground terminals. Some boards label these VDD/AVDD and GND/AGND, while also exposing a separate VIN terminal. Follow that module's circuit; do not assume VIN is interchangeable with AVDD. Remove or change a conflicting onboard ADDR strap before wiring the listed address selection. ALERT/RDY and unused analog channels have no PCB connection.


### J11 — ADS1115 #2 0x49

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | VDD/AVDD | MAIN3V3 |
| 2 | GND/AGND | GND |
| 3 | SDA | I2C1_SDA |
| 4 | SCL | I2C1_SCL |
| 5 | A0 TDS POT | POT_TDS |
| 6 | A1 TURB POT | POT_TURB |
| 7 | A2 TEMP POT | POT_TEMP |
| 8 | ADDR 3V3 | MAIN3V3 |


Connect to the module's actual ADS1115 supply and ground terminals. Some boards label these VDD/AVDD and GND/AGND, while also exposing a separate VIN terminal. Follow that module's circuit; do not assume VIN is interchangeable with AVDD. Remove or change a conflicting onboard ADDR strap before wiring the listed address selection. ALERT/RDY and unused analog channels have no PCB connection.


### J12 — TDS SENSOR

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | VCC SELECT | TDS_VCC |
| 2 | GND | GND |
| 3 | OUT 0-5V | TDS_RAW |


### J13 — TURBIDITY SENSOR

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | VCC SELECT | TURB_VCC |
| 2 | GND | GND |
| 3 | OUT 0-5V | TURB_RAW |


### J14 — TDS_VCC SELECT

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | 3V3 | MAIN3V3 |
| 2 | SENSOR VCC | TDS_VCC |
| 3 | 5V | EXT5V |


### J15 — TURB_VCC SELECT

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | 3V3 | MAIN3V3 |
| 2 | SENSOR VCC | TURB_VCC |
| 3 | 5V | EXT5V |


### J16 — TDS POT

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | 3V3 | MAIN3V3 |
| 2 | WIPER/OUT | POT_TDS |
| 3 | GND | GND |


### J17 — TURBIDITY POT

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | 3V3 | MAIN3V3 |
| 2 | WIPER/OUT | POT_TURB |
| 3 | GND | GND |


Pad 3 connects directly to the GND plane and may need a little extra heating time during soldering; see the J17 soldering note above.


### J18 — TEMPERATURE POT

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | 3V3 | MAIN3V3 |
| 2 | WIPER/OUT | POT_TEMP |
| 3 | GND | GND |


### J19 — MAX98357A MODULE

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | VIN 5V | EXT5V |
| 2 | GND | GND |
| 3 | BCLK | I2S_BCLK |
| 4 | LRC/WS | I2S_LRC |
| 5 | DIN | I2S_DIN |
| 6 | SD/MODE | AMP_SD |
| 7 | SPK+ | SPK_P |
| 8 | SPK- | SPK_N |


SPK+ and SPK− are the amplifier module's two speaker output terminals, routed onward to J20. Leave GAIN unconnected on the module as in the supplied wiring. Neither speaker terminal is GND. Module SD/MODE straps or resistors must be compatible with this connection.


### J20 — SPEAKER

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | SPK+ | SPK_P |
| 2 | SPK- | SPK_N |


### J21 — GU1008C-40T TX

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | TX +5V | EXT5V |
| 2 | TX DRAIN | TX_DRAIN |


### J22 — BARE RX ELEMENT

| PCB pad | Connect to this terminal/function | PCB net |
| --- | --- | --- |
| 1 | RX SIGNAL | RX_RAW |
| 2 | RX GND | GND |


Connect the two leads of the bare receive piezo element. This is not an HC-SR04 module VCC/TRIG/ECHO header; there is no 5 V supply or digital ECHO signal at J22. If an element lead is internally connected to its metal case, use the case-connected lead for RX GND after checking it.


## What the PCB changes in your prototype

The GPIO numbers, two ADC addresses, four display buses and two-controller arrangement follow your firmware. The board adds a few parts to make the wiring suitable for a repeatable PCB assembly.

**TX:** GPIO16 now drives Q2, a small AO3400A MOSFET, through R15. Q2 pulls a separate 5 V logic node low when GPIO16 is high. U2, the inverting TC4426A driver, reverses that change again and drives the IRLZ44N gate high. Thus the firmware keeps the same active-high 40 kHz command. Q2's gate is electrically insulated from its drain, avoiding a direct GPIO feed into the unpowered 5 V driver's input. [AOS AO3400A data sheet](https://www.aosmd.com/sites/default/files/res/datasheets/AO3400A.pdf)

With GPIO16 low or floating, R16 holds Q2 off, R27 pulls U2's input high, and U2 commands the main gate low. The main MOSFET gate retains its separate 100 Ω series resistor R17 and 10 kΩ pull-down R18. R19, 1 kΩ across the TX element, gives its capacitance a reset path. This TX input stage has two inversions overall, so no firmware polarity change is needed.

**Sensor inputs:** Each 0–5 V sensor output passes through a 10 kΩ/10 kΩ divider, then a supply-controlled analog switch before ADS1115 #1. At a 5.0 V sensor output the ideal ADC-side voltage is 2.5 V. The source sees approximately a 20 kΩ load; verify the module can drive that. Negative outputs, outputs above the stated 5 V range and raw electrode/probe connections are outside this interface. The switch is used to isolate the ADC during absent/invalid main power.

U3 is TMUX1511PWR in TSSOP-14. Its first two channels carry the two divided sensor voltages. U4 supervises MAIN3V3 and drives both channel-select inputs; R26 holds that command low when it is not driven. The other two channels are disabled. This preserves the 5 V sensor supply option while separating an unpowered ADC from the still-powered sensor output. The switch's powered-off protection is the relevant feature; an ordinary generic analog switch is not automatically an equivalent substitute. [TI TMUX1511 data sheet](https://www.ti.com/lit/ds/symlink/tmux1511.pdf)

R28 and R29 each add 1 kΩ between a switch output and its ADC input. They limit brief discharge current from C7/C8 if the main supply falls rapidly before the switch has fully disconnected. They do not make arbitrary overvoltage or negative sensor signals acceptable.

U4 must be **MCP100-315DI/TO**, with the specified D bondout. The −315 trip threshold is 3.00–3.15 V (3.075 V typical). Its active-low reset output is used here as the switch-enable signal: low disables the sensor paths; high enables them after the main rail recovers and a 150–700 ms delay expires. “Reset” is the chip's pin name; this board does not wire it to an ESP32 reset terminal. Looking at U4's flat face with its leads pointing down, its pins are left 1 = nRESET, center 2 = VDD and right 3 = GND. The −300 threshold and H-bondout variants are different parts. [Microchip MCP100 data sheet](https://ww1.microchip.com/downloads/en/DeviceDoc/11187f.pdf)

**RX:** The MCP6002 reference follower and noninverting amplifier preserve the circuit you learned. A 100 Ω resistor connects its output to GPIO34. There is no 100 nF capacitor to ground on the 40 kHz ADC output, because that would materially reduce the wanted signal with common series resistances.

**Audio and power:** Local supply capacitors, a fused 5 V input, separate controller 3.3 V nets and an SD/MODE series resistor are included. The external 5 V supply does not feed either controller's USB/VIN line.

## RX circuit, one signal path at a time

U1 pin 8 receives RX3V3 and pin 4 receives GND. R20 and R21 divide that supply approximately in half, giving RX_VREF about 1.65 V when RX3V3 is 3.30 V. C13 smooths this midpoint. U1 amplifier A takes it at pin 3; connecting output pin 1 directly to inverting input pin 2 makes a voltage follower. Its output, RX_VBIAS, copies the midpoint and supplies the small bias-network currents more effectively than the resistor divider alone.

The RX element connects between J22 signal and GND. C14 carries its changing voltage to pin 5. R22 gives pin 5 a resting voltage of RX_VBIAS. Thus a small positive or negative received signal becomes a small movement above or below 1.65 V, within a circuit that has only 0 V and 3.3 V supplies.

Pin 7 is the output. R24 connects pin 7 back to pin 6; R23 connects pin 6 to RX_VBIAS. The amplifier adjusts its output so the pin-6 voltage tracks the pin-5 voltage through this feedback. The ideal relationship is:

`Vout = VBIAS + 23 × (Vin − VBIAS)`

R23 returns to VBIAS because that is the signal's resting reference. Returning it to ground would also amplify the 1.65 V DC offset, driving the output toward a supply limit. R22 on pin 5 is a bias-return resistor; R23 and R24 form the gain-setting pair. R25 then takes the output to the RX controller's GPIO34.

The gain of 23 is the ideal low-frequency resistor-ratio result. The MCP6002's finite bandwidth means the actual 40 kHz gain and phase must be measured. Its nominal 1 MHz gain-bandwidth gives an approximate single-pole estimate around 17 at 40 kHz for this gain, not a guaranteed result. Keep received amplitudes small enough to avoid clipping at either supply rail. [Microchip MCP6002 data sheet](https://ww1.microchip.com/downloads/aemDocuments/documents/MSLD/ProductDocuments/DataSheets/MCP6001-1R-1U-2-4-1-MHz-Low-Power-Op-Amp-DS20001733L.pdf)

## ADC, display and audio details

ADS1115 #1 has ADDR tied to GND, so its address is 0x48. ADS1115 #2 has ADDR tied to MAIN3V3, so its address is 0x49. Both share GPIO8/9 with OLED1. The firmware's ±4.096 V gain setting controls conversion scaling; it does not permit an analog input above the ADC supply. The ADC-side inputs must stay between GND and the ADC's own supply. These slow ADC modules read sensors and potentiometers, while the 40 kHz RX waveform goes to the ESP32's internal ADC. [TI ADS1115 data sheet](https://www.ti.com/lit/ds/symlink/ads1115.pdf)

The four OLEDs use address 0x3C on four separate SDA/SCL pairs. The OLED library's 0x78 argument is a shifted address representation, not a fifth or different device address. The main source already assigns the pins in the connector tables. Swapping SDA and SCL or joining the four buses together will break that arrangement.

The MAX98357A receives BCLK, LRC/WS and DIN from GPIO5/6/7. Its speaker output is differential: connect the speaker between SPK+ and SPK− only. Its GAIN terminal is left floating for the device's nominal 9 dB setting, subject to any gain components already fitted on the external module. R14 limits SD/MODE input current when its drive can exceed the amplifier's supply. [Analog Devices MAX98357A data sheet](https://www.analog.com/media/en/technical-documentation/data-sheets/max98357a-max98357b.pdf)

## Firmware supplied with this PCB

`../firmware/ESP32-S3/` is a separate copy of the main project. Only the TDS and turbidity voltage calculations are multiplied by 2 to undo the PCB dividers. Example: a real sensor output of 4.00 V becomes approximately 2.00 V at the ADC; the modified display/serial value becomes approximately 4.00 V again. Divider tolerance, sensor output resistance and ADC errors still require calibration. The three potentiometer calculations are unchanged.

Review `../firmware/main_cpp_sensor_dividers.patch` for the exact two changed lines. The source-diff record is in `../firmware/source_change_record.json`. Your original firmware directories remain untouched. This copy operation does not claim a compiler build or hardware test. Use your existing RX GPIO34 firmware; this PCB does not add a synchronization wire between the controllers.

## First-power measurements

Make every wiring change with all three supplies disconnected. Start with TX element, speaker and sensor modules disconnected. Refer voltage measurements to a PCB GND point. On a grounded bench oscilloscope, put the ground clip on GND, never on TX_DRAIN or either speaker output; use a differential probe or two properly referenced channels with subtraction for a voltage across the speaker or TX element.

| Stage | Apply/connect | Check before continuing |
| --- | --- | --- |
| A | RX USB only, its GND and 3V3 wires to J3 | TP10 about 3.3 V. TP7 and TP8 about half of measured RX3V3. TP9 about the same midpoint with no received signal. MAIN3V3 and EXT5V must not become powered through an unintended connection. |
| B | Main USB only, J1/J2 wiring; no external modules | TP2 about 3.3 V. RX3V3 must not be driven from MAIN3V3. Check the analog-switch enable output at the supervisor against its healthy-supply behavior. |
| C | External regulated 5.0 V only; initially current-limited to 100 mA with loads disconnected | TP1 near 5.0 V and at least 4.5 V at U2 supply. Q2 gate near GND, U2 pin 2 near 5 V, and Q1 gate near GND. No unexpected heating or persistent current-limit operation. The USB-derived 3.3 V rails should remain off. |
| D | Main USB and external 5 V with the TX firmware running, piezo still disconnected | TP4 approximately 0–3.3 V at 40 kHz; TP5 approximately 0–5 V at 40 kHz. TX_DRAIN switches low when gate is high and returns toward 5 V when gate is low. |
| E | Connect the TX element, then RX USB and RX element | Check TX amplitude and RX_OUT with the scope. RX_OUT should move around the half-supply bias without flat clipping. Check both controllers' ground wiring before interpreting noise. |
| F | Add ADCs and OLEDs one at a time | Confirm addresses 0x48/0x49 and the proper display bus. Measure pull-up voltage as 3.3 V. If the main rail sags, stop and resolve its current budget. |
| G | Confirm sensor model, select its power, then connect it | At the maximum actual sensor output, check divided ADC voltage and revised displayed voltage. Verify no voltage outside the ADC supply range reaches its input during startup/shutdown. |
| H | Add audio amplifier and speaker | Start at the existing low test amplitude. Recheck 5 V rail and supply current with sound, TX and sensors operating together. Verify RX noise with audio on and off. |

For a controlled sensor scaling check, disconnect the sensor output and apply a measured DC test voltage within 0–5 V to its OUT pad, with the test source ground connected to PCB GND. With the main ADC supply valid, 1.00 V should give about 0.50 V at the corresponding ADC input and about 1.00 V in the modified firmware. Test zero and at least one higher point before calibration.

Record measured rail voltages, current, TX frequency, gate swing, RX bias, RX amplitude, sensor scaling and the actual fitted modules. A clean PCB rules report cannot replace these measurements. Physical module compatibility, current demand, long-wire noise, mechanical fit, sensor calibration and acoustic performance remain prototype checks.

## Every fitted part and why it is present

References below use this PCB's numbering. A part called C3 in an earlier breadboard explanation may have a different reference number here; use the function and net names to identify it.


### Controllers and power interfaces

| Reference | Value | Purpose |
| --- | --- | --- |
| C3 | 100nF | Local high-frequency bypass on the main controller's 3.3 V distribution. |
| C4 | 10uF 10V | Local bulk storage on MAIN3V3. Positive to MAIN3V3; negative to GND. |


### External 5 V distribution

| Reference | Value | Purpose |
| --- | --- | --- |
| C1 | 470uF 10V | Bulk charge reservoir for the external 5 V rail when TX/audio loads change. Positive lead goes to EXT5V; negative stripe goes to GND. |
| C2 | 100nF | High-frequency bypass for the external 5 V distribution, complementing C1. |
| F1 | 1A FUSE | Series protection in the external 5 V feed. The 1 A rating is the selected fuse rating, not an instant 1 A current clamp or a reverse-polarity protector. |


### Four OLED buses and temperature sensor

| Reference | Value | Purpose |
| --- | --- | --- |
| R1 | 4.7k DNP | Optional I2C pull-up to MAIN3V3. Leave unpopulated initially if connected modules already provide suitable pull-ups; parallel pull-ups reduce the effective resistance. |
| R2 | 4.7k DNP | Optional I2C pull-up to MAIN3V3. Leave unpopulated initially if connected modules already provide suitable pull-ups; parallel pull-ups reduce the effective resistance. |
| R3 | 4.7k DNP | Optional I2C pull-up to MAIN3V3. Leave unpopulated initially if connected modules already provide suitable pull-ups; parallel pull-ups reduce the effective resistance. |
| R4 | 4.7k DNP | Optional I2C pull-up to MAIN3V3. Leave unpopulated initially if connected modules already provide suitable pull-ups; parallel pull-ups reduce the effective resistance. |
| R5 | 4.7k DNP | Optional I2C pull-up to MAIN3V3. Leave unpopulated initially if connected modules already provide suitable pull-ups; parallel pull-ups reduce the effective resistance. |
| R6 | 4.7k DNP | Optional I2C pull-up to MAIN3V3. Leave unpopulated initially if connected modules already provide suitable pull-ups; parallel pull-ups reduce the effective resistance. |
| R7 | 4.7k DNP | Optional I2C pull-up to MAIN3V3. Leave unpopulated initially if connected modules already provide suitable pull-ups; parallel pull-ups reduce the effective resistance. |
| R8 | 4.7k DNP | Optional I2C pull-up to MAIN3V3. Leave unpopulated initially if connected modules already provide suitable pull-ups; parallel pull-ups reduce the effective resistance. |
| R9 | 4.7k | Pulls the DS18B20 data wire high between data pulses. The sensor and controller can pull the shared wire low. |


### ADS1115 modules and sensor inputs

| Reference | Value | Purpose |
| --- | --- | --- |
| C5 | 100nF | Bypasses the 3.3 V supply at the ADS1115 #1 connection. Retain the module's own local bypass capacitor too. |
| C6 | 100nF | Bypasses the 3.3 V supply at the ADS1115 #2 connection. Retain the module's own local bypass capacitor too. |
| C7 | 100nF | Filters fast noise on the divided TDS signal. The divider's 5 kΩ equivalent resistance with 100 nF gives an approximate 318 Hz low-pass corner for a low-impedance sensor output. |
| C8 | 100nF | Filters fast noise on the divided turbidity signal; same approximate 318 Hz corner as C7. This is for slow water-quality measurements. |
| C17 | 100nF | Local 100 nF bypass for U3's MAIN3V3 supply, keeping its power pins close to a stable supply during switching and digital activity. |
| C18 | 100nF | Local 100 nF bypass for U4's MAIN3V3 supply, so the supervisor measures a stable local rail. |
| J14 | TDS_VCC SELECT | Selects this sensor's supply. Shunt 1-2 selects main 3.3 V; shunt 2-3 selects external 5 V. Fit one shunt only; leave it absent until the module requirement is known. |
| J15 | TURB_VCC SELECT | Selects this sensor's supply. Shunt 1-2 selects main 3.3 V; shunt 2-3 selects external 5 V. Fit one shunt only; leave it absent until the module requirement is known. |
| R10 | 10k 1% | Upper half of the TDS 2:1 divider: TDS_RAW to TDS_DIV. |
| R11 | 10k 1% | Lower half of the TDS divider: TDS_DIV to GND. Equal 10 kΩ values make the midpoint half the input voltage. |
| R12 | 10k 1% | Upper half of the turbidity 2:1 divider: TURB_RAW to TURB_DIV. |
| R13 | 10k 1% | Lower half of the turbidity divider: TURB_DIV to GND. The ADC sees approximately half the external sensor voltage. |
| R26 | 100k | Pulls ADC_INPUT_ENABLE low when the supervisor cannot actively drive it. This gives the sensor analog switches a defined disconnected command during absent/very-low main power. |
| R28 | 1k | 1 kΩ series resistor after the TDS analog switch and before ADS1115 A0. Limits brief current from the charged input-filter capacitor while the supply is falling and the switch is turning off; normal sensor scaling remains approximately 2:1. |
| R29 | 1k | 1 kΩ series resistor after the turbidity analog switch and before ADS1115 A1; same transient-current limiting purpose as R28. |
| U3 | TMUX1511PWR | Analog switch after the two sensor dividers. Connects sensor measurements to the ADC only while the main 3.3 V supply is valid; powered-off protection isolates the ADC when MAIN3V3 is absent. This is not general overvoltage protection for arbitrary sensor signals. |
| U4 | MCP100-315DI/TO | Monitors MAIN3V3. Its healthy-supply output enables the sensor analog switches; a low/invalid supply disables them. This does not connect to either ESP32 reset pin. |


### 40 kHz TX and I2S audio interfaces

| Reference | Value | Purpose |
| --- | --- | --- |
| C9 | 100uF 10V | Local bulk storage for the external MAX98357A module supply. Positive to EXT5V and negative to GND. |
| C10 | 100nF | Fast bypass for the audio module's 5 V wiring. Keep module power wires short and retain its onboard decoupling. |
| C11 | 100nF | Fast local 5 V bypass for the gate driver, which delivers brief charging pulses to the MOSFET gate. |
| C12 | 1uF | Additional 1 µF local gate-driver charge reservoir, working with C11. |
| Q1 | IRLZ44NPBF | IRLZ44N N-channel MOSFET, used as a low-side switch. Gate controls conduction, drain goes to the TX return, source goes to GND. Metal tab is electrically connected to drain. |
| Q2 | AO3400A | AO3400A small N-channel MOSFET. Its insulated gate receives the 3.3 V GPIO command; its drain switches the separate 5 V driver-input node. This separates the GPIO from an unpowered driver supply. The inversion here is reversed again by U2. |
| R14 | 2.2k | Feeds the audio module's SD/MODE input from MAIN3V3 through 2.2 kΩ; limits current when its logic drive exceeds the amplifier supply. Check any SD/MODE parts already fitted to your module. |
| R15 | 100 | 100 Ω resistor between GPIO16 and Q2's gate; limits fast gate-charging current and edge ringing. It does not set the 40 kHz frequency. |
| R16 | 100k | Pulls Q2's gate low while GPIO16 is not actively driven. Q2 then turns off, R27 pulls the inverting driver input high, and the main TX gate is commanded OFF. |
| R17 | 100 | Series MOSFET gate resistor. Slows very fast charging/discharging edges enough to limit peak gate current and ringing; the MOSFET still switches at the firmware's 40 kHz. |
| R18 | 10k | Gate-to-source pull-down. Removes stored gate charge if the driver is unpowered or disconnected and holds gate near the grounded source. |
| R19 | 1k 0.25W | Provides the piezo's reset path between switching pulses. It pulls TX_DRAIN back toward +5 V when Q1 switches off, returning the voltage across the piezo toward zero. |
| R27 | 4.7k | 4.7 kΩ pull-up from EXT5V to the inverting gate-driver input. With Q2 off it commands a low driver output. When Q2 turns on, this resistor limits the drain/pull-up current to about 1.1 mA at 5 V. |
| U2 | TC4426AEPA | TC4426A inverting MOSFET gate driver. A low at pin 2 makes output pin 7 high, and vice versa. Together with Q2's inversion, GPIO16 high still turns the TX switch on. The unused channel input is held low; its output is left unconnected. |


### 40 kHz receive amplifier

| Reference | Value | Purpose |
| --- | --- | --- |
| C13 | 100nF | Smooths noise on the unbuffered RX_VREF midpoint. U1 amplifier A then copies this reference into a lower-impedance bias node. |
| C14 | 100nF | AC coupling from the bare RX element to U1 pin 5. Transfers the changing signal while allowing the amplifier side to rest at RX_VBIAS instead of zero volts. |
| C15 | 100nF | Local MCP6002 supply bypass directly between its 3.3 V and ground nets. It supports the supply; it is not in series with the supply or signal. |
| C16 | 10uF 10V | Bulk storage on the RX 3.3 V feed; positive to RX3V3, negative to GND. |
| R20 | 10k 1% | Top resistor of the RX half-supply divider, from RX3V3 to RX_VREF. |
| R21 | 10k 1% | Bottom resistor of the RX divider, from RX_VREF to GND. Equal 10 kΩ values make about 1.65 V from a 3.3 V supply. |
| R22 | 10k | Gives U1 pin 5 a DC path to RX_VBIAS. Without this bias path the coupling capacitor would leave that input without a defined resting voltage. |
| R23 | 1k 1% | Bottom resistor of amplifier B's feedback divider, from pin 6 to RX_VBIAS. Referencing this resistor to bias keeps the amplified waveform centered at half-supply. |
| R24 | 22k 1% | Feedback resistor from output pin 7 to inverting input pin 6. Together with R23, sets ideal small-signal gain 1 + 22 kΩ / 1 kΩ = 23 relative to RX_VBIAS. |
| R25 | 100 | 100 Ω series connection from amplifier output to GPIO34. Provides a small isolation resistance for the ADC wiring; it is not a voltage divider or a 5 V level shifter. |
| U1 | MCP6002-I/P | MCP6002 dual op-amp. Amplifier A buffers the half-supply reference; amplifier B amplifies the received AC signal about that reference. DIP-8 orientation matters. |


## Exact IC and MOSFET pin maps

These are physical package pin numbers for the specified part in the BOM. The schematic and PCB pad numbers use the same map. Do not substitute another package or a similarly named device without checking its pinout.


### Q1 — IRLZ44NPBF

| Physical pin | Function | Connected net |
| --- | --- | --- |
| 1 | G | TX_GATE |
| 2 | D | TX_DRAIN |
| 3 | S | GND |

Footprint: `Package_TO_SOT_THT:TO-220-3_Vertical`.


### Q2 — AO3400A

| Physical pin | Function | Connected net |
| --- | --- | --- |
| 1 | G | TX_LEVEL_GATE |
| 2 | S | GND |
| 3 | D | TX_DRIVER_IN |

Footprint: `Package_TO_SOT_SMD:SOT-23`.


### U1 — MCP6002-I/P

| Physical pin | Function | Connected net |
| --- | --- | --- |
| 1 | OUT A | RX_VBIAS |
| 2 | IN A- | RX_VBIAS |
| 3 | IN A+ | RX_VREF |
| 4 | VSS | GND |
| 5 | IN B+ | RX_IN |
| 6 | IN B- | RX_FB |
| 7 | OUT B | RX_OUT |
| 8 | VDD | RX3V3 |

Footprint: `Package_DIP:DIP-8_W7.62mm_Socket_LongPads`.


### U2 — TC4426AEPA

| Physical pin | Function | Connected net |
| --- | --- | --- |
| 1 | NC | NC — leave unconnected |
| 2 | INA INVERT | TX_DRIVER_IN |
| 3 | GND | GND |
| 4 | INB INVERT | GND |
| 5 | OUTB | NC — leave unconnected |
| 6 | VDD | EXT5V |
| 7 | OUTA | TX_DRIVER_OUT |
| 8 | NC | NC — leave unconnected |

Footprint: `Package_DIP:DIP-8_W7.62mm_Socket_LongPads`.


### U3 — TMUX1511PWR

| Physical pin | Function | Connected net |
| --- | --- | --- |
| 1 | SEL1 | ADC_INPUT_ENABLE |
| 2 | S1 | TDS_DIV |
| 3 | D1 | TDS_SWITCH |
| 4 | SEL2 | ADC_INPUT_ENABLE |
| 5 | S2 | TURB_DIV |
| 6 | D2 | TURB_SWITCH |
| 7 | GND | GND |
| 8 | D3 | GND |
| 9 | S3 | GND |
| 10 | SEL3 | GND |
| 11 | D4 | GND |
| 12 | S4 | GND |
| 13 | SEL4 | GND |
| 14 | VDD | MAIN3V3 |

Footprint: `Package_SO:TSSOP-14_4.4x5mm_P0.65mm`.


### U4 — MCP100-315DI/TO

| Physical pin | Function | Connected net |
| --- | --- | --- |
| 1 | nRESET | ADC_INPUT_ENABLE |
| 2 | VDD | MAIN3V3 |
| 3 | VSS | GND |

Footprint: `Package_TO_SOT_THT:TO-92_Inline_Wide`.


## Test points

| Reference | Signal | Meaning |
| --- | --- | --- |
| TP1 | EXT5V | Accessible measurement point for EXT5V; use a GND test point as the voltage reference. |
| TP2 | MAIN3V3 | Accessible measurement point for MAIN3V3; use a GND test point as the voltage reference. |
| TP3 | GND | Accessible measurement point for GND; use a GND test point as the voltage reference. |
| TP4 | TX_PWM | Accessible measurement point for TX_PWM; use a GND test point as the voltage reference. |
| TP5 | TX_GATE | Accessible measurement point for TX_GATE; use a GND test point as the voltage reference. |
| TP6 | TX_DRAIN | Accessible measurement point for TX_DRAIN; use a GND test point as the voltage reference. |
| TP7 | RX_VREF | Accessible measurement point for RX_VREF; use a GND test point as the voltage reference. |
| TP8 | RX_VBIAS | Accessible measurement point for RX_VBIAS; use a GND test point as the voltage reference. |
| TP9 | RX_OUT | Accessible measurement point for RX_OUT; use a GND test point as the voltage reference. |
| TP10 | RX3V3 | Accessible measurement point for RX3V3; use a GND test point as the voltage reference. |
| TP11 | GND | Accessible measurement point for GND; use a GND test point as the voltage reference. |


## Files to use

| File | Use |
| --- | --- |
| Assembly_and_Wiring.md / .html | This guide; HTML can be opened in a browser and printed |
| BOM_purchase.csv | Grouped purchase list; includes optional/DNP status and package requirements |
| BOM_by_reference.csv | Every board reference, exact value/footprint and purpose |
| Connector_Wiring.csv | Every external wire and sensor-supply selector pad |
| Every_Component_Pin.csv | Full component-pin to net map for checking and troubleshooting |
| Existing_Modules.csv | Quantities and compatibility checks for the external hardware being reused |
| ../firmware/ESP32-S3/ | Separate main firmware copy with sensor-divider scaling |
| ../firmware/main_cpp_sensor_dividers.patch | Exact source diff |

The complete package's KiCad project, schematic, board and fabrication exports are the manufacturing design records. Use the exported final revision together; do not mix a Gerber from one revision with a drill file or BOM from another.
