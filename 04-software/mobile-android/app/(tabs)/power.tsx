import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Axis, Plot } from '../../src/charts/Plot';
import {
  CURRENT_BY_STATE,
  dutyBreakdown,
  POWER_MODEL,
  PowerState,
} from '../../src/core/power';
import { engine, shallowEqual, useEngine } from '../../src/core/useEngine';
import { Metric, Panel, Rows, Slider } from '../../src/ui/kit';
import { Screen } from '../../src/ui/Screen';
import { fmtCount, fmtHours, fmtMa, fmtMj, fmtSeconds } from '../../src/ui/format';
import { sp } from '../../src/ui/tokens';

const DASH = '—';

const STATE_LABEL: Record<PowerState, string> = {
  sleep: 'sleep',
  idle: 'wake',
  sampling: 'sample',
  transmitting: 'transmit',
};

export default function PowerScreen() {
  const source = useEngine((s) => s.source);
  const live = source === 'live';
  const tone = live ? 'sim' : 'live';
  const v = (s: string) => (live ? DASH : s);

  const energy = useEngine((s) => s.energy, shallowEqual);
  const end = useEngine((s) => s.endurance, shallowEqual);
  const interval = useEngine((s) => s.pingIntervalS);
  const tau = useEngine((s) => s.decision.tau);

  const duty = useMemo(() => dutyBreakdown(tau, interval), [tau, interval]);

  /** Current-draw envelope over one cycle: sleep, wake, sample, burst, sleep. */
  const trace = useMemo(() => {
    const n = 200;
    const out = new Float32Array(n);
    const total = duty.reduce((a, d) => a + d.seconds, 0) || 1;
    let acc = 0;
    const marks: { end: number; ma: number }[] = [];
    for (const d of [duty[0], duty[1], duty[2], duty[3]]) {
      acc += d.seconds;
      marks.push({ end: acc / total, ma: CURRENT_BY_STATE[d.state] });
    }
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const m = marks.find((k) => u <= k.end) ?? marks[marks.length - 1];
      out[i] = m.ma;
    }
    return out;
  }, [duty]);

  const peak = POWER_MODEL.transmitPeakMa;
  const maxPart = Math.max(
    energy.transmitMj,
    energy.sampleMj,
    energy.computeMj,
    energy.wakeMj,
  );

  return (
    <Screen title="Power" subtitle="Per-burst budget">
      <Panel label="Per ping">
        <View style={{ flexDirection: 'row', gap: sp.base }}>
          <Metric label="energy" value={v(energy.totalMj.toFixed(2))} unit="mJ" tone={tone} />
          <Metric label="avg draw" value={v(end.averageMa.toFixed(2))} unit="mA" tone={tone} />
        </View>
        <View style={{ flexDirection: 'row', gap: sp.base }}>
          <Metric label="pings left" value={v(fmtCount(end.pingsRemaining))} />
          <Metric label="endurance" value={v(fmtHours(end.missionHours))} tone={tone} />
        </View>
      </Panel>

      <Panel label="Current draw" subtitle="one duty cycle">
        <Plot data={trace} height={78} yMin={0} yMax={peak * 1.12} fill grid={[peak / 2]} />
        <Axis left="0" right={fmtSeconds(interval)} />
      </Panel>

      <Panel label="Energy split" subtitle="where the joules go">
        <Rows
          data={[
            ['transmit', v(fmtMj(energy.transmitMj)), tone, energy.transmitMj / maxPart],
            ['sample', v(fmtMj(energy.sampleMj)), tone, energy.sampleMj / maxPart],
            ['synthesis', v(fmtMj(energy.computeMj)), tone, energy.computeMj / maxPart],
            ['wake', v(fmtMj(energy.wakeMj)), tone, energy.wakeMj / maxPart],
          ]}
        />
      </Panel>

      <Panel label="Synthesis engine" subtitle="table lookup against live trigonometry">
        <Rows
          data={[
            ['dds + dma', v(fmtMj(energy.totalMj)), 'live'],
            ['sin() per sample', v(fmtMj(energy.naiveTotalMj)), 'warn'],
            ['saving', v(`${energy.savingPercent.toFixed(1)} %`), 'live'],
            ['cpu, dds', fmtMa(POWER_MODEL.ddsMa), 'live'],
            ['cpu, naive', fmtMa(POWER_MODEL.naiveTrigMa), 'warn'],
          ]}
        />
      </Panel>

      <Panel label="Duty cycle" subtitle={`one ${fmtSeconds(interval)} cycle`}>
        <Rows
          data={duty.map(
            (d) =>
              [
                STATE_LABEL[d.state],
                `${fmtMa(CURRENT_BY_STATE[d.state])} · ${
                  d.percent < 0.1 ? '<0.1' : d.percent.toFixed(1)
                }%`,
                d.state === 'transmitting' ? 'warn' : 'plain',
                d.percent / 100,
              ] as const,
          )}
        />
      </Panel>

      <Panel label="Supply">
        <Rows
          data={[
            ['battery', `${POWER_MODEL.batteryMah} mAh · 3S`, 'plain'],
            ['usable', `${(end.batteryMj / 1000).toFixed(0)} J`, 'plain'],
            ['rail', `${POWER_MODEL.busVolts.toFixed(1)} V`, 'plain'],
            ['sensor', live ? 'INA226' : 'MODEL', live ? 'live' : 'sim'],
          ]}
        />
        {live ? null : (
          <Slider
            label="ping interval"
            value={interval}
            min={0.5}
            max={60}
            step={0.5}
            onChange={(x) => engine.setPingInterval(x)}
            format={fmtSeconds}
          />
        )}
      </Panel>
    </Screen>
  );
}
