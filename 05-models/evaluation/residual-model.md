# residual-model

**The model that ships.** It learns what the sonar equation gets wrong, which the
sonar equation cannot do for itself, and the result replaces a hand-picked safety
margin with a measured one.

Every number here is produced by [`evaluate.py`](evaluate.py) and written to
[`metrics.json`](metrics.json). Reproduce with `python evaluate.py`.

---

## The problem it solves

The payload will not transmit a waveform whose predicted echo SNR sits at the
bare detection threshold. It demands headroom, because the propagation model is
a model and is known to be optimistic in sediment. Today that headroom is:

```
required_margin = 3 + min(12, turbidity / 70)      dB
```

**Nothing fitted that.** It was picked to be conservative, and it is. Being
conservative in the sonar equation is not free: every decibel of margin the
solver is asked to find, it finds by moving downband, and every step downband is
coarser range resolution. The margin is paid for in millimetres, on every ping,
for the entire mission.

The question is whether the headroom can be **measured** instead of guessed.

## What it predicts

| | |
|---|---|
| Target | `error_db` — the gap between predicted and measured echo SNR |
| Features | the same 8 columns as the surrogate, all known **before** transmitting |
| Model | `HistGradientBoostingRegressor`, 200 iterations, learning rate 0.08 |
| Train / test | 12,750 / 4,250, routine strata, random split, seed 20260829 |
| Fit time | 0.4 s |
| Size | **3,965 tree nodes** — one fifth of the rejected surrogate's 19,337 |

The feature contract is identical to the surrogate's. Nothing downstream of the
chosen frequency is used, so the correction can be computed *before* the solver
runs and handed to it as its margin.

---

## Accuracy against what a person would actually do

Two baselines, both things a competent engineer reaches for before reaching for
a model.

| Method | MAE | Residual sd |
|---|---:|---:|
| Constant — the training mean shortfall | 1.963 dB | 2.376 dB |
| **Linear in turbidity** — a line through the scatter plot | 1.005 dB | 1.306 dB |
| **Gradient boosting** — all eight environment columns | **0.729 dB** | **0.916 dB** |
| *Irreducible noise floor* | *0.718 dB* | *0.900 dB* |

The learned model lands **0.011 dB above the theoretical floor**. There is
essentially nothing left in the shortfall that the environment can explain and
the model has not found.

The line an engineer would read off the plot is `−0.022 + 0.00624 × NTU`. It is
not a bad rule. It is simply 40 % worse than it needs to be, because the
shortfall is not a function of turbidity alone — it also depends on path length
and on salinity, and those two are invisible in a turbidity scatter until you
colour by them.

That is the whole case for using a model here: **not that a person could not find
this, but that a person looking at one variable at a time will not.**

See `figures/eval-5-residual-model.png`, left panel — the same points coloured by
required range, where the spread resolves into structure.

---

## What the correction buys

A margin has one job: cover the shortfall often enough that the payload is not
transmitting into water it cannot hear back from. Anything beyond that is
resolution given away for nothing.

```
margin_learned = predicted_shortfall + 3 × residual_sd
```

| | Hand-picked rule | Learned rule |
|---|---:|---:|
| Mean margin demanded | 9.13 dB | **5.47 dB** |
| Coverage of the realised shortfall | 100.00 % | 99.88 % |

**3.66 dB returned to the solver**, at coverage that is lower by 0.12 % — five
rows in 4,250.

That trade is the right way round, and it is worth being explicit about why. The
rows the learned rule misses are ones where it under-estimates the shortfall by a
fraction of a decibel. The detection threshold in the sonar equation is still
underneath it — the margin is headroom *above* the threshold, not a replacement
for it, so a missed row is a ping with less headroom than intended, not a ping
into silence. What the hand-picked rule buys with its perfect coverage is several
decibels of permanently coarser resolution on every ping it ever transmits.

### Decibels become millimetres

At a 220 m required range, driving the same solver with each margin rule:

| Turbidity | Margin now | Margin learned | Frequency | Resolution | Gain |
|---:|---:|---:|---|---|---:|
| 5 | 3.07 | 2.81 | 350.7 → 350.7 kHz | 2.51 → 2.51 mm | — |
| 100 | 4.43 | 3.52 | 350.7 → 350.7 kHz | 2.51 → 2.51 mm | — |
| 250 | 6.57 | 4.19 | 350.7 → 350.7 kHz | 2.51 → 2.51 mm | — |
| 400 | 8.71 | 4.85 | 325.3 → 350.7 kHz | 2.56 → 2.51 mm | 2.0 % |
| 550 | 10.86 | 5.61 | 274.7 → 274.7 kHz | 3.03 → 3.03 mm | — |
| 700 | 13.00 | 6.82 | 224.0 → 249.3 kHz | 3.72 → 3.34 mm | **10.2 %** |
| 850 | 15.00 | 7.77 | 173.3 → 198.7 kHz | 5.11 → 4.19 mm | **18.0 %** |
| **1000** | 15.00 | 8.37 | **148.0 → 173.3 kHz** | **7.81 → 5.11 mm** | **34.5 %** |

In clear water the two rules pick the same waveform: the margin is not the
binding constraint there, and no amount of recovered headroom changes an answer
that was already at the top of the band. The correction earns its place at the
dirty end — which is precisely where a survey payload is otherwise worst served,
and precisely what the problem statement is about.

**The 550 NTU row is worth not hiding.** The margin falls by 5.25 dB and the
resolution does not move at all. The candidate grid is discrete: 13 centre
frequencies, and at that point the recovered headroom is not enough to reach the
next one. Roughly half the recovered decibels buy nothing in any given condition.
The gains are real where they appear and they are not uniform, and a finer
candidate grid would collect more of them — at the cost of a larger table and a
longer search.

---

## Why this model ships and the surrogate does not

The two look superficially alike — same features, same library, same split — and
they are not alike at all.

| | Surrogate (§8) | Correction (§11) |
|---|---|---|
| Learns | the solver's **answer** | the solver's **error** |
| Ground truth | our own equations | measurement |
| Could the physics do this itself? | yes, and faster | **no, by construction** |
| Outputs | 3, one per transmit parameter | 1 scalar |
| Size | 19,337 tree nodes | **3,965** |
| If it is wrong | a pulse that hears nothing | a margin slightly off, threshold still guards |
| Verdict | **does not ship** | **ships** |

The first model competes with the physics and loses on every axis that matters —
speed, size, and the ability to say "this mission is impossible". The second does
something the physics structurally cannot do, and hands the answer back to the
physics to act on.

A model that knew its own error would not have one. That is why this is the place
where learning has something to contribute and the transmit decision is not.

**The sonar equation still makes the decision.** It just stops being told a
made-up number about how wrong it is likely to be.

---

## Limits, stated plainly

**The law being recovered is one the notebook put there.** The simulated
correlator applies a shortfall that depends on turbidity, path length and
salinity. The model is not told that law and recovers it to within the noise
floor — but this bounds what the exercise proves. It establishes the *mechanism*
and the *size of the prize*. It does not establish that `turbidity / 190` is the
right coefficient, and nothing here should be quoted as if it did.

**The real law is unknown and must be measured.** Tank, target at a known range,
sediment stirred in, correlator output logged against predicted SNR. The model is
refit against that data and the margin rule follows. Nothing in the structure
changes — the feature contract, the `+3σ` rule and the solver integration all
survive the substitution. That measurement belongs in
[`../../06-validation/tank-results/`](../../06-validation/tank-results/) and is
listed there as outstanding.

**Until it is measured, the hand-picked margin stays in the firmware.** This
folder demonstrates what the correction is worth; it does not authorise shipping
a coefficient fitted to simulated data into a payload. The order is: measure,
refit, then replace.

**Three standard deviations is a choice, not a derivation.** It gives 99.88 %
coverage here. If a mission profile needs more, raise it — each additional σ
costs roughly 0.9 dB of the 3.66 dB recovered. Conformal prediction would give a
distribution-free coverage guarantee instead of a Gaussian assumption, and is the
obvious next refinement.

## Reproducing

```powershell
python evaluate.py
```

Roughly 30 s. Accuracy and margin figures are deterministic and will not move
between runs.
