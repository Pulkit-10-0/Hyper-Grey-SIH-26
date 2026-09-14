import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { MODE_SHORT } from '../../src/core/dsp';
import { PingRecord } from '../../src/core/engine';
import { exportSessionCsv } from '../../src/core/exportCsv';
import { arrayEqual, engine, useEngine } from '../../src/core/useEngine';
import { Action, Panel, Rows, Tx } from '../../src/ui/kit';
import { Screen } from '../../src/ui/Screen';
import { fmtClock, fmtHz, fmtMetres, fmtMj } from '../../src/ui/format';
import { c, r, sp, toneColor, type } from '../../src/ui/tokens';

const ROW_H = 46;

export default function LogScreen() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);

  const source = useEngine((s) => s.source);
  const live = source === 'live';
  const pings = useEngine((s) => s.pings, arrayEqual);

  const summary = useMemo(() => {
    if (pings.length === 0) return null;
    const energy = pings.reduce((a, p) => a + p.energyMj, 0);
    const snr = pings.reduce((a, p) => a + p.measuredSnrDb, 0) / pings.length;
    const err = pings.reduce((a, p) => a + Math.abs(p.errorDb), 0) / pings.length;
    const bands = new Set(pings.map((p) => Math.round(p.fCentre / 1000)));
    return { energy, snr, err, bands: bands.size };
  }, [pings]);

  const onExport = useCallback(async () => {
    setExporting(true);
    try {
      await exportSessionCsv(pings);
    } catch {
      /* cancelled or unavailable */
    } finally {
      setExporting(false);
    }
  }, [pings]);

  const renderItem = useCallback(
    ({ item }: { item: PingRecord }) => (
      <LogRow item={item} onPress={() => router.push(`/ping/${item.id}`)} />
    ),
    [router],
  );

  if (pings.length === 0) {
    return (
      <Screen title="Log" subtitle="Ping history">
        <Panel label="Empty" subtitle={live ? 'awaiting link' : 'fire a ping to populate'}>
          <Rows data={[['records', '0', 'sim']]} />
        </Panel>
      </Screen>
    );
  }

  return (
    <Screen title="Log" subtitle={`${pings.length} record${pings.length === 1 ? '' : 's'}`} scroll={false}>
      {summary ? (
        <Panel label="Session" style={{ marginBottom: sp.md }}>
          <Rows
            data={[
              ['total energy', fmtMj(summary.energy), 'live'],
              ['mean snr', `${summary.snr.toFixed(1)} dB`, 'live'],
              ['mean Δ pred/meas', `${summary.err.toFixed(1)} dB`, summary.err < 3 ? 'live' : 'warn'],
              ['distinct fc', String(summary.bands), 'plain'],
            ]}
          />
        </Panel>
      ) : null}

      <FlatList
        data={pings}
        keyExtractor={(p) => String(p.id)}
        renderItem={renderItem}
        getItemLayout={(_, i) => ({ length: ROW_H + 3, offset: (ROW_H + 3) * i, index: i })}
        ItemSeparatorComponent={() => <View style={{ height: 3 }} />}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        initialNumToRender={12}
        windowSize={7}
        removeClippedSubviews
      />

      <View style={{ flexDirection: 'row', gap: sp.md, paddingTop: sp.md }}>
        <View style={{ flex: 1 }}>
          <Action label="export csv" tone="sim" busy={exporting} onPress={onExport} />
        </View>
        <View style={{ flex: 1 }}>
          <Action label="clear" tone="fault" onPress={() => engine.clearLog()} />
        </View>
      </View>
    </Screen>
  );
}

const LogRow = React.memo(function LogRow({
  item,
  onPress,
}: {
  item: PingRecord;
  onPress: () => void;
}) {
  const err = Math.abs(item.errorDb);
  const col = err < 2 ? toneColor.live : err < 5 ? toneColor.warn : toneColor.fault;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ping ${item.id}`}
      onPress={onPress}
      style={({ pressed }) => ({
        height: ROW_H,
        flexDirection: 'row',
        alignItems: 'center',
        gap: sp.md,
        paddingHorizontal: sp.md,
        backgroundColor: c.rowFill,
        borderRadius: r.row,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Tx style={[type.rowLabel, { width: 36 }]} color={c.faint}>
        {String(item.id).padStart(4, '0')}
      </Tx>

      <View
        style={{
          paddingHorizontal: 5,
          paddingVertical: 2,
          borderRadius: 2,
          backgroundColor: c.cyDim,
        }}
      >
        <Tx style={[type.tab, { fontSize: 9 }]} color={c.cy}>
          {MODE_SHORT[item.mode]}
        </Tx>
      </View>

      <View style={{ flex: 1 }}>
        <Tx style={type.rowValue} numberOfLines={1}>
          {fmtMetres(item.measuredRangeM)}
        </Tx>
        <Tx style={[type.tab, { fontSize: 9.5 }]} color={c.faint} numberOfLines={1}>
          {fmtHz(item.fCentre)} · {item.env.turbidityNtu.toFixed(0)} NTU · {fmtClock(item.at)}
        </Tx>
      </View>

      <Tx style={type.rowValue} color={col}>
        {item.measuredSnrDb.toFixed(1)}
      </Tx>
    </Pressable>
  );
});
