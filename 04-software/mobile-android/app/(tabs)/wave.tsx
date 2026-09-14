import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Axis, Plot } from '../../src/charts/Plot';
import {
  decimate,
  MODE_LABEL,
  synthesise,
  WaveMode,
  WINDOW_LABEL,
  WINDOW_PSL_DB,
  WindowKind,
} from '../../src/core/dsp';
import { rangeResolutionChirp, rangeResolutionCw } from '../../src/core/physics';
import { playChirp } from '../../src/core/sonify';
import { engine, shallowEqual, useEngine } from '../../src/core/useEngine';
import { Action, Panel, Rows, Segmented, Slider } from '../../src/ui/kit';
import { Screen } from '../../src/ui/Screen';
import { fmtHz, fmtMetres, fmtSeconds } from '../../src/ui/format';
import { sp } from '../../src/ui/tokens';

const PREVIEW_N = 900;
const DASH = '—';

const MODES: { value: WaveMode; label: string }[] = [
  { value: 'lfm', label: 'LFM' },
  { value: 'geometric', label: 'Geo' },
  { value: 'barker13', label: 'Brk' },
  { value: 'cw', label: 'CW' },
];

const WINDOWS: { value: WindowKind; label: string }[] = [
  { value: 'rect', label: 'Rect' },
  { value: 'hann', label: 'Hann' },
  { value: 'hamming', label: 'Hamm' },
  { value: 'blackman', label: 'Blk' },
];

export default function WaveScreen() {
  const [audio, setAudio] = useState(false);

  const source = useEngine((s) => s.source);
  const live = source === 'live';
  const tone = live ? 'sim' : 'live';
  const v = (s: string) => (live ? DASH : s);

  const auto = useEngine((s) => s.auto);
  const manual = useEngine((s) => s.manual, shallowEqual);
  const cfg = useEngine((s) => s.config, shallowEqual);
  const win = useEngine((s) => s.decision.window);

  const d = useEngine(
    (s) => ({
      mode: s.decision.mode,
      fStart: s.decision.fStart,
      fStop: s.decision.fStop,
      bandwidth: s.decision.bandwidth,
      tau: s.decision.tau,
      amplitude: s.decision.amplitude,
      tbp: s.decision.tbp,
      gain: s.decision.compressionGainDb,
      c: s.decision.soundSpeed,
    }),
    shallowEqual,
  );

  const swept = d.mode === 'lfm' || d.mode === 'geometric';

  const pulse = useMemo(() => {
    const fs = PREVIEW_N / d.tau;
    const carrier = fs / 9;
    const half = swept ? Math.min(carrier * 0.7, (PREVIEW_N / 26) / d.tau) : 0;
    return decimate(
      synthesise(
        {
          mode: d.mode,
          window: win,
          fStart: carrier - half,
          fStop: carrier + half,
          tau: d.tau,
          amplitude: 1,
        },
        fs,
      ),
      300,
    );
  }, [d.mode, d.tau, win, swept]);

  const cw = rangeResolutionCw(d.c, d.tau);
  const chirp = rangeResolutionChirp(d.c, d.bandwidth);
  const gainX = chirp > 0 ? cw / chirp : 1;

  return (
    <Screen title="Wave" subtitle="Transmit pulse">
      <Panel label="Transmit pulse" subtitle={`${WINDOW_LABEL[win]} envelope`}>
        <Plot data={pulse} height={104} yMin={-1.1} yMax={1.1} grid={[0]} />
        <Axis left="0" right={fmtSeconds(d.tau)} />
      </Panel>

      <Panel label="Derived" subtitle={MODE_LABEL[d.mode].toLowerCase()}>
        <Rows
          data={[
            ['sweep', v(swept ? `${fmtHz(d.fStart)} → ${fmtHz(d.fStop)}` : fmtHz(d.fStart)), tone],
            ['bandwidth', v(fmtHz(d.bandwidth)), tone],
            ['tbp', v(d.tbp.toFixed(1)), tone],
            ['compression', v(`${d.gain.toFixed(2)} dB`), tone],
            ['res', v(fmtMetres(chirp)), tone],
            ['amplitude', v(`${(d.amplitude * 100).toFixed(0)} %`), 'plain'],
          ]}
        />
      </Panel>

      <Panel label="Compression" subtitle="unmodulated against swept">
        <Rows
          data={[
            ['cw resolution', v(fmtMetres(cw)), 'plain'],
            ['compressed', v(fmtMetres(chirp)), tone],
            ['improvement', v(`${gainX >= 10 ? gainX.toFixed(0) : gainX.toFixed(1)}×`), tone],
          ]}
        />
      </Panel>

      <Panel label="Envelope window" subtitle="sets the sidelobe floor">
        <Segmented
          options={WINDOWS}
          value={win}
          onChange={(w) => engine.setWindow(w)}
          tone={live ? 'sim' : 'live'}
        />
        <Rows
          data={[
            ['theoretical psl', `${WINDOW_PSL_DB[win].toFixed(1)} dB`, win === 'rect' ? 'fault' : 'live'],
          ]}
        />
      </Panel>

      {live ? null : (
        <>
          <Panel label="Waveform family" subtitle="each with a stated reason">
            <Segmented options={MODES} value={d.mode} onChange={(m) => engine.setMode(m)} />
          </Panel>

          <Panel
            label="Manual override"
            subtitle={auto ? 'solver is driving' : 'you are driving'}
          >
            <Segmented
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'man', label: 'Manual' },
              ]}
              value={auto ? 'auto' : 'man'}
              onChange={(x) => engine.setAuto(x === 'auto')}
            />
            <Slider
              label="centre"
              value={manual.fCentre}
              min={cfg.bandLow}
              max={cfg.bandHigh}
              disabled={auto}
              onChange={(x) => engine.setManual({ fCentre: x })}
              format={fmtHz}
            />
            <Slider
              label="bandwidth"
              value={manual.bandwidth}
              min={(cfg.bandHigh - cfg.bandLow) * 0.02}
              max={(cfg.bandHigh - cfg.bandLow) * 0.9}
              disabled={auto}
              onChange={(x) => engine.setManual({ bandwidth: x })}
              format={fmtHz}
            />
            <Slider
              label="pulse"
              value={manual.tau}
              min={cfg.tauMin}
              max={cfg.tauMax}
              disabled={auto}
              onChange={(x) => engine.setManual({ tau: x })}
              format={fmtSeconds}
            />
            <Slider
              label="amplitude"
              value={manual.amplitude}
              min={0.1}
              max={1}
              disabled={auto}
              onChange={(x) => engine.setManual({ amplitude: x })}
              format={(x) => `${(x * 100).toFixed(0)} %`}
            />
          </Panel>

          <View style={{ marginTop: sp.xs }}>
            <Action
              label="play sweep · audible"
              tone="sim"
              busy={audio}
              onPress={async () => {
                setAudio(true);
                try {
                  await playChirp(d.mode, win, d.tau);
                } catch {
                  /* audio is optional */
                } finally {
                  setAudio(false);
                }
              }}
            />
          </View>
        </>
      )}
    </Screen>
  );
}
