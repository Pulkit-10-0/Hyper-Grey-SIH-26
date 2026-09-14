# SeaNergy quick start

## Safe setup

1. Put the tank inside its spill tray. Keep all mains equipment outside the
   splash boundary and on RCD protection.
2. Secure the transducers and target. No person reaches into the tank while the
   payload is powered.
3. Inspect and close the pod, then connect the 3S, 11.1 V, 2.6 Ah LiPo pack.
4. Switch on and wait for payload `READY`.

## Simulation ping

1. Open SeaNergy. On Home select `SIMULATION`.
2. On Settings select `UNDERWATER` for 100 to 500 kHz and 220 m required range,
   or `AIR BENCH` for the demonstrator.
3. On Environment select a scenario. Leave Wave set to `AUTO`.
4. Return Home. Require solver `WITHIN MARGIN`.
5. Select `FIRE PING`. The Echo screen opens.
6. Read range in m and SNR in dB. Compare predicted and measured SNR.
7. Repeat, then open Log and select `EXPORT CSV`.

## Telemetry ping

1. On Home select `TELEMETRY`, then `SCAN FOR PAYLOAD`.
2. Connect to `SeaNergy-26058`. Require link `UP`, protocol version `1`, state
   `READY` and no fault bits.
3. Announce the ping and check the tank boundary.
4. Send one ping. Observe `ARMED`, `TRANSMITTING`, then `READY` and a new
   telemetry sequence.
5. Review Echo and Log before the next ping.

## Stop rules

Stop and isolate power on `FAULT`, low battery, solver margin fault, abnormal
current, heat, leak, loose transducer, spill, RCD trip or a person entering the
tank boundary. Mission mode deliberately turns BLE off; press the physical
trigger to leave mission mode.

Default app endurance at a 10.00 s interval is 7.3 h and 2,613 pings, derived by
`endurance()` for the default Underwater Coastal solve. The Power screen updates
this value for the active pulse and interval.

Full instructions: [Operator guide](user-guide.md). Fault actions:
[Troubleshooting](troubleshooting.md). Safety boundary:
[Demo safety](../safety/demo-safety.md).
