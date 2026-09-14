# Core API examples

## Physics and adaptation

```ts
import { decide, WATER_CONFIG } from '../../../04-software/mobile-android/src/core/adaptation';
import { thorpDbPerKm } from '../../../04-software/mobile-android/src/core/physics';

const absorptionAt200KHz = thorpDbPerKm(200); // about 51.02 dB/km

const decision = decide({
  tempC: 26.0,
  salinityPpt: 33.1,
  turbidityNtu: 180,
  depthM: 25,
}, WATER_CONFIG);

if (!decision.feasible) {
  throw new Error('No waveform clears the configured underwater margin');
}
```

`decision` reports all frequencies in Hz, duration in s, range and resolution
in m, loss in dB/m, SNR in dB and energy in mJ.

## Synthesis and matched filtering

```ts
import { matchedFilter, synthesise } from '../../../04-software/mobile-android/src/core/dsp';

const replica = synthesise({
  mode: 'lfm',
  window: 'hann',
  fStart: 100_000,
  fStop: 200_000,
  tau: 0.002,
  amplitude: 0.8,
}, 2_000_000);

const received = new Float32Array(replica.length + 512);
received.set(replica, 256);
const result = matchedFilter(received, replica);
// result.peakIndex is 256 samples.
```

## Power and CSV

```ts
import { endurance, pingEnergy } from '../../../04-software/mobile-android/src/core/power';
import { buildCsv } from '../../../04-software/mobile-android/src/core/exportCsv';

const energy = pingEnergy(0.0005, 0.92); // millijoules
const life = endurance(energy, 10);      // hours at a 10 s interval
const csv = buildCsv(pingRecords);       // oldest record first
```

The endurance result is a design-budget calculation. Bench measurements must be
reported separately with their validation test ID.
