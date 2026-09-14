# Session CSV schema

`buildCsv()` in `04-software/mobile-android/src/core/exportCsv.ts` produces one
header row followed by one row per ping. Rows are ordered by ascending ping ID,
oldest first, and the file ends with a newline. The separator is a comma. The
current fields contain no commas, quotes or embedded newlines, so values are not
quoted.

`exportSessionCsv()` writes UTF-8 text to the app cache as
`seanergy-session-YYYY-MM-DDTHH-MM-SS.csv` and opens the Android share sheet with
MIME type `text/csv`. Calling it with an empty ping list returns without creating
or sharing a file.

## Columns

| Position | Column | Source type | Unit or enum | Scale and formatting | Valid value or range | Invalid-value behaviour |
|---:|---|---|---|---|---|---|
| 1 | `ping` | Integer | Count | Decimal integer | Positive session ID | Record is not created without an ID |
| 2 | `timestamp` | String | UTC ISO 8601 | `Date.toISOString()` | Valid JavaScript epoch | Invalid date prevents a valid export row |
| 3 | `medium` | String | Enum | `air` or `water` | Exact enum value | TypeScript rejects other values at build time |
| 4 | `temp_c` | Float | degree C | 2 decimal places | Finite number | Empty field |
| 5 | `salinity_ppt` | Float | ppt | 2 decimal places | Finite number | Empty field |
| 6 | `turbidity_ntu` | Float | NTU | 1 decimal place | Finite number | Empty field |
| 7 | `depth_m` | Float | m | 2 decimal places | Finite number | Empty field |
| 8 | `mode` | String | Enum | `CW`, `LFM`, `GEO` or `BRK` | Key in `MODE_SHORT` | TypeScript rejects other values at build time |
| 9 | `window` | String | Enum | `rect`, `hann`, `hamming` or `blackman` | Exact enum value | TypeScript rejects other values at build time |
| 10 | `f_centre_hz` | Float | Hz | 1 decimal place | Finite number | Empty field |
| 11 | `bandwidth_hz` | Float | Hz | 1 decimal place | Finite number | Empty field |
| 12 | `pulse_s` | Float | s | 6 decimal places | Finite number | Empty field |
| 13 | `amplitude` | Float | Full-scale ratio | 3 decimal places | Design range 0 to 1 | Non-finite value becomes empty; `buildCsv()` does not clamp finite input |
| 14 | `tbp` | Float | Dimensionless | 1 decimal place | Finite number | Empty field |
| 15 | `compression_gain_db` | Float | dB | 2 decimal places | Finite number | Empty field |
| 16 | `resolution_m` | Float | m | 5 decimal places | Finite number | Empty field |
| 17 | `predicted_snr_db` | Float | dB | 2 decimal places | Finite number | Empty field |
| 18 | `measured_snr_db` | Float | dB | 2 decimal places | Finite number | Empty field |
| 19 | `error_db` | Float | dB | 2 decimal places | Finite number; predicted minus measured | Empty field |
| 20 | `target_range_m` | Float | m | 4 decimal places | Finite number | Empty field |
| 21 | `measured_range_m` | Float | m | 4 decimal places | Finite number | Empty field |
| 22 | `peak_to_sidelobe_db` | Float | dB | 2 decimal places | Finite number | Empty field |
| 23 | `energy_mj` | Float | mJ | 4 decimal places | Finite number | Empty field |

The schema is strict and positional. Importers must require the exact header in
the order shown. An empty numeric field means the source was non-finite; it is
missing data, not zero. Unknown extra columns may be retained by a tolerant
analysis tool, but a SeaNergy client must not silently remap known columns.

## Relationships

| Derived column | Definition |
|---|---|
| `tbp` | `pulse_s * bandwidth_hz` for a swept pulse |
| `compression_gain_db` | `10 * log10(tbp)` when `tbp > 1`, else `0 dB` |
| `error_db` | `predicted_snr_db - measured_snr_db` |
| `resolution_m` | `sound_speed_m_per_s / (2 * bandwidth_hz)` for a swept pulse |

The sound speed used in `resolution_m` is not exported separately. Consumers
must not recompute the logged resolution without the environmental model and
medium configuration that applied at the ping.

A conforming example is in [`examples/csv-session.md`](examples/csv-session.md).
