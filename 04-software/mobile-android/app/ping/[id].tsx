import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Axis, Plot } from '../../src/charts/Plot';
import { MODE_LABEL, WINDOW_LABEL } from '../../src/core/dsp';
import { useEngine } from '../../src/core/useEngine';
import { Metric, Panel, Rows } from '../../src/ui/kit';
import { SubScreen } from '../../src/ui/Screen';
import {
  fmtClock,
  fmtHz,
  fmtMetres,
  fmtMj,
  fmtSeconds,
} from '../../src/ui/format';
import { c, sp } from '../../src/ui/tokens';

export default function PingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const n = Number(id);

  const ping = useEngine((s) => s.pings.find((p) => p.id === n) ?? null);
  const window = useEngine((s) => s.config.maxRangeBoundM * 0.5);

  if (!ping) {
    return (
      <SubScreen title="Not found">
        <Panel label="Record" subtitle="the log holds the most recent 200">
          <Rows data={[['ping', String(n).padStart(4, '0'), 'fault']]} />
        </Panel>
      </SubScreen>
    );
  }

  const err = Math.abs(ping.errorDb);

  return (
    <SubScreen
      title={`Ping ${String(ping.id).padStart(4, '0')}`}
      subtitle={`${fmtClock(ping.at)} · ${MODE_LABEL[ping.mode]}`}
    >
      <Panel label="Result">
        <View style={{ flexDirection: 'row', gap: sp.base }}>
          <Metric label="range" value={fmtMetres(ping.measuredRangeM)} tone="live" />
          <Metric label="snr" value={ping.measuredSnrDb.toFixed(1)} unit="dB" tone="live" />
        </View>
      </Panel>

      <Panel label="Received trace">
        <Plot data={ping.rx} height={78} yMin={-1.6} yMax={1.6} color={c.faint} grid={[0]} />
        <Axis left="0" right={fmtMetres(window)} />
      </Panel>

      <Panel label="Compressed">
        <Plot data={ping.correlation} height={100} yMin={0} yMax={1.06} fill grid={[0.5]} />
        <Axis left="0" right={fmtMetres(window)} />
      </Panel>

      <Panel label="Conditions at fire">
        <Rows
          data={[
            ['temperature', `${ping.env.tempC.toFixed(1)} °C`, 'plain'],
            ['salinity', `${ping.env.salinityPpt.toFixed(1)} ppt`, 'plain'],
            ['turbidity', `${ping.env.turbidityNtu.toFixed(0)} NTU`, 'plain'],
            ['depth', `${ping.env.depthM.toFixed(1)} m`, 'plain'],
          ]}
        />
      </Panel>

      <Panel label="Parameters">
        <Rows
          data={[
            ['mode', MODE_LABEL[ping.mode].toUpperCase(), 'live'],
            ['window', WINDOW_LABEL[ping.window].toUpperCase(), 'plain'],
            ['fc', fmtHz(ping.fCentre), 'live'],
            ['bandwidth', fmtHz(ping.bandwidth), 'live'],
            ['tau', fmtSeconds(ping.tau), 'plain'],
            ['amplitude', `${(ping.amplitude * 100).toFixed(0)} %`, 'plain'],
            ['tbp', ping.tbp.toFixed(1), 'plain'],
            ['compression', `${ping.compressionGainDb.toFixed(2)} dB`, 'live'],
            ['pslr', `${ping.peakToSidelobeDb.toFixed(1)} dB`, 'live'],
            ['energy', fmtMj(ping.energyMj), 'plain'],
          ]}
        />
      </Panel>

      <Panel label="Closed loop">
        <Rows
          data={[
            ['predicted', `${ping.predictedSnrDb.toFixed(1)} dB`, 'plain'],
            ['measured', `${ping.measuredSnrDb.toFixed(1)} dB`, 'live'],
            ['gap', `${ping.errorDb.toFixed(1)} dB`, err < 2 ? 'live' : 'warn'],
          ]}
        />
      </Panel>
    </SubScreen>
  );
}
