/**
 * Session export. Writes a CSV to the cache directory and opens the share sheet.
 * One row per ping, with the conditions that produced it -- enough to plot the
 * adaptation behaviour offline.
 */

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { PingRecord } from './engine';
import { MODE_SHORT } from './dsp';

const COLUMNS = [
  'ping',
  'timestamp',
  'medium',
  'temp_c',
  'salinity_ppt',
  'turbidity_ntu',
  'depth_m',
  'mode',
  'window',
  'f_centre_hz',
  'bandwidth_hz',
  'pulse_s',
  'amplitude',
  'tbp',
  'compression_gain_db',
  'resolution_m',
  'predicted_snr_db',
  'measured_snr_db',
  'error_db',
  'target_range_m',
  'measured_range_m',
  'peak_to_sidelobe_db',
  'energy_mj',
] as const;

function toRow(p: PingRecord): string {
  const n = (v: number, d = 4) => (Number.isFinite(v) ? v.toFixed(d) : '');
  return [
    p.id,
    new Date(p.at).toISOString(),
    p.medium,
    n(p.env.tempC, 2),
    n(p.env.salinityPpt, 2),
    n(p.env.turbidityNtu, 1),
    n(p.env.depthM, 2),
    MODE_SHORT[p.mode],
    p.window,
    n(p.fCentre, 1),
    n(p.bandwidth, 1),
    n(p.tau, 6),
    n(p.amplitude, 3),
    n(p.tbp, 1),
    n(p.compressionGainDb, 2),
    n(p.resolutionM, 5),
    n(p.predictedSnrDb, 2),
    n(p.measuredSnrDb, 2),
    n(p.errorDb, 2),
    n(p.trueRangeM, 4),
    n(p.measuredRangeM, 4),
    n(p.peakToSidelobeDb, 2),
    n(p.energyMj, 4),
  ].join(',');
}

export function buildCsv(pings: PingRecord[]): string {
  const header = COLUMNS.join(',');
  // Oldest first reads better in a spreadsheet.
  const rows = [...pings].sort((a, b) => a.id - b.id).map(toRow);
  return [header, ...rows].join('\n') + '\n';
}

export async function exportSessionCsv(pings: PingRecord[]): Promise<void> {
  if (pings.length === 0) return;

  const csv = buildCsv(pings);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const file = new File(Paths.cache, `seanergy-session-${stamp}.csv`);

  try {
    if (file.exists) file.delete();
  } catch {
    /* nothing to remove */
  }
  file.create({ overwrite: true });
  file.write(csv);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'SeaNergy session',
      UTI: 'public.comma-separated-values-text',
    });
  }
}
