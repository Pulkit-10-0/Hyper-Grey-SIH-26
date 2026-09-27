import React from 'react';
import { Medium } from '../../src/core/physics';
import { Source } from '../../src/core/engine';
import {
  BLE_NAME_PREFIX,
  link,
  PROTOCOL_LABEL,
  TRANSPORTS,
  USB_DEFAULT_BAUD,
  WIFI_DEFAULT_PORT,
  type TransportKind,
} from '../../src/core/link';
import { engine, shallowEqual, useEngine } from '../../src/core/useEngine';
import { useLink } from '../../src/core/useLink';
import { Action, Panel, Rows, Segmented, Slider, Tx } from '../../src/ui/kit';
import { Screen } from '../../src/ui/Screen';
import { fmtHz, fmtMetres, fmtSeconds } from '../../src/ui/format';
import { c, type } from '../../src/ui/tokens';

export default function SettingsScreen() {
  const source = useEngine((s) => s.source);
  const live = source === 'live';
  const medium = useEngine((s) => s.medium);
  const cfg = useEngine((s) => s.config, shallowEqual);
  const interval = useEngine((s) => s.pingIntervalS);
  const correction = useEngine((s) => s.noiseCorrectionDb);
  const st = useLink();
  const transport = link.kind();
  const stats = link.stats();

  // Each transport answers a different question, so the rows differ.
  const transportRows: [string, string, 'plain'][] =
    transport === 'usb'
      ? [
          ['port', 'native USB, CDC-ACM', 'plain'],
          ['baud', `${(USB_DEFAULT_BAUD / 1000).toFixed(0)}k`, 'plain'],
          ['cable', 'Type-C to Type-C, data', 'plain'],
          ['format', PROTOCOL_LABEL, 'plain'],
        ]
      : transport === 'wifi'
        ? [
            ['access point', `${BLE_NAME_PREFIX}xxxx`, 'plain'],
            ['address', `ws://${link.host()}:${WIFI_DEFAULT_PORT}`, 'plain'],
            ['format', PROTOCOL_LABEL, 'plain'],
          ]
        : [
            ['name prefix', `${BLE_NAME_PREFIX}xxxx`, 'plain'],
            ['profile', 'Nordic UART Service', 'plain'],
            ['format', PROTOCOL_LABEL, 'plain'],
          ];

  const found: { id: string; label: string }[] =
    transport === 'usb'
      ? link.usbDevices().map((d) => ({ id: String(d.id), label: d.kind }))
      : transport === 'ble'
        ? link.bleDevices().map((d) => ({
            id: d.address,
            label: `${d.name}  ${d.rssi} dBm`,
          }))
        : [];

  return (
    <Screen title="Settings" subtitle="Configuration">
      <Panel label="Data source">
        <Segmented<Source>
          options={[
            { value: 'sim', label: 'Simulation' },
            { value: 'live', label: 'Telemetry' },
          ]}
          value={source}
          onChange={(v) => engine.setSource(v)}
          tone={live ? 'live' : 'sim'}
        />
        <Rows
          data={[
            ['current', live ? 'TELEMETRY' : 'SIMULATION', live ? 'live' : 'sim'],
            ['status', st.status.toUpperCase(), st.status === 'up' ? 'live' : 'fault'],
            ['detail', st.detail, 'plain'],
          ]}
        />
      </Panel>

      <Panel label="Transport" subtitle="how the console reaches the payload">
        <Segmented<TransportKind>
          options={TRANSPORTS.map((t) => ({ value: t.kind, label: t.label }))}
          value={transport}
          onChange={(k) => link.setKind(k)}
          tone={st.status === 'up' ? 'live' : 'sim'}
        />
        <Rows data={transportRows} />
        <Action
          label={
            st.status === 'up'
              ? 'disconnect'
              : st.status === 'scanning'
                ? 'scanning'
                : transport === 'wifi'
                  ? 'connect'
                  : 'scan'
          }
          busy={st.status === 'scanning' || st.status === 'connecting'}
          tone={st.status === 'up' ? 'fault' : 'live'}
          onPress={() => (st.status === 'up' ? link.disconnect() : link.scan())}
        />
        {found.length > 0 && st.status !== 'up' ? (
          <>
            <Tx style={type.tab} color={c.dim}>
              FOUND
            </Tx>
            {found.map((d) => (
              <Action
                key={d.id}
                label={d.label}
                tone="sim"
                onPress={() => link.open(d.id)}
              />
            ))}
          </>
        ) : null}
      </Panel>

      <Panel label="Medium" subtitle="same engine, different constants">
        <Segmented<Medium>
          options={[
            { value: 'water', label: 'Underwater' },
            { value: 'air', label: 'Air bench' },
          ]}
          value={medium}
          onChange={(m) => engine.setMedium(m)}
        />
        <Rows
          data={[
            ['band', `${fmtHz(cfg.bandLow)} – ${fmtHz(cfg.bandHigh)}`, 'live'],
            ['required range', fmtMetres(cfg.requiredRangeM), 'plain'],
            ['detection threshold', `${cfg.detectionThresholdDb} dB`, 'plain'],
            ['pulse range', `${fmtSeconds(cfg.tauMin)} – ${fmtSeconds(cfg.tauMax)}`, 'plain'],
            ['energy budget', `${cfg.energyBudgetMj.toFixed(0)} mJ`, 'plain'],
          ]}
        />
      </Panel>

      {live ? null : (
        <Panel label="Ping rate">
          <Slider
            label="interval"
            value={interval}
            min={0.5}
            max={60}
            step={0.5}
            onChange={(x) => engine.setPingInterval(x)}
            format={fmtSeconds}
          />
        </Panel>
      )}

      <Panel label="Adaptation loop">
        <Rows
          data={[
            [
              'noise correction',
              `${correction >= 0 ? '+' : ''}${correction.toFixed(2)} dB`,
              Math.abs(correction) > 0.4 ? 'warn' : 'plain',
            ],
          ]}
        />
        <Action label="reset loop" tone="sim" onPress={() => engine.resetLoop()} />
      </Panel>

      <Panel label="Session">
        <Action label="clear ping log" tone="fault" onPress={() => engine.clearLog()} />
      </Panel>

      <Panel label="About">
        <Rows
          data={[
            ['build', 'SEANERGY 2.2.0', 'plain'],
            ['ps', 'SIH26058 · MoES / NIOT', 'plain'],
            ['protocol', PROTOCOL_LABEL, 'plain'],
            ['packets seen', `${stats.packets}`, 'plain'],
            ['units', 'METRIC', 'plain'],
          ]}
        />
        <Tx style={type.body} color={c.dim}>
          Sound speed, absorption, synthesis, compression and the adaptation solver
          all run on the device.
        </Tx>
      </Panel>
    </Screen>
  );
}
