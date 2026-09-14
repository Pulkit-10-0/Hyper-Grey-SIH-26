# dataset

## Purpose
The published dataset. Original, transmit-side, and the reason this is a
contribution rather than another tutorial.

## Files that must exist
- `adaptive_sonar_waveform_selection.csv`
- `data-dictionary.md` — every column: name, unit, range, meaning, derived or measured
- `generation.md` — how it was made, with the seed
- `licence.md` — CC BY 4.0 and the attribution line

## Composition that must be documented
| Stratum | Share | Purpose |
|---|---|---|
| Turbidity sweep | 40 percent | Isolates the scattering effect |
| Space filling | 25 percent | Fills the envelope without clustering |
| Scenario drift | 20 percent | Reproduces a realistic mission |
| Adversarial | 15 percent | Contains the failure region |

## Facts and figures this must carry
- Row count and column count
- Feasible fraction overall and per stratum
- The range of chosen centre frequency across the dataset
- The seed, so it regenerates identically

## Acceptance
A stranger can interpret every column from the data dictionary alone. The
adversarial stratum genuinely contains infeasible cases; a dataset where
everything is solvable teaches that everything is solvable.
