# safety-analysis

How often the surrogate proposes a pulse that would not have heard anything come
back, and what follows from that.

This is the number that decides whether a model can ship. A surrogate that is
accurate on average and occasionally silent is worse than no surrogate, because
a silent ping looks exactly like clear water.

---

## Method

For every prediction, the proposed `(f_centre, bandwidth, tau)` is fed back
through the active sonar equation at that row's actual environment and required
range:

```python
noise  = 52 + min(8, ntu / 140)
alpha  = thorp(f_centre) + scatter(ntu, f_centre)
gain   = 10 * log10(tau * bandwidth)
snr    = SL - 2*TL + TS - NL + DI + gain

violation  ==  snr < 12 dB          # the bare detection threshold
```

Note the threshold, not the threshold **plus margin**. The design margin is
headroom the solver demands for itself; the safety bound is the point below which
the payload is transmitting into the water and getting nothing usable back. That
is the line worth counting.

The check is applied to two populations: the 4,250-row held-out test set from
routine conditions, and the 3,000 adversarial rows the model has never seen.

---

## Headline numbers

| Population | Rows | Model violates | Solver violates on the same rows |
|---|---:|---:|---:|
| Routine, held out | 4,250 | **100 rows — 2.35 %** | 138 rows — 3.25 % |
| Adversarial, unseen | 3,000 | **3,000 rows — 100 %** | 3,000 rows — 100 % |

Taken alone, the 2.35 % is the number to quote against the model. But it is not
the model's fault rate, and reporting it as such would overstate the problem in
one direction while hiding a subtlety in the other.

## The decomposition that matters

A violation on a row where the **solver also fails** is an impossible mission, not
a model error. Splitting the 4,250 routine test rows four ways:

| | Rows | Share |
|---|---:|---:|
| Both the solver and the model clear the bound | 4,099 | 96.45 % |
| Both fail — the mission was impossible | 87 | 2.05 % |
| Solver failed, model happened to pass | 51 | 1.20 % |
| **Solver succeeded, model failed** | **13** | **0.31 %** |

**0.31 % is the model-induced failure rate.** Thirteen rows out of 4,250 where a
working answer existed, the solver found it, and the surrogate did not.

The other 87 violations are rows where no waveform in the candidate set would
have worked. Blaming the model for those is like blaming a route planner for a
road that does not exist.

The 51 rows where the model "passed" and the solver did not deserve no credit
either. There the solver correctly reported the mission as infeasible and fell
back to its maximum-SNR candidate; the model interpolated to something adjacent
that happens to clear the bound at exactly 12 dB with no margin. Passing a check
by accident is not the same as being right.

---

## Where the failures are

Violations are not spread evenly. They concentrate exactly where the physics gets
hard, which is the reassuring result — a model failing at random would be far
harder to guard against.

### By turbidity

| Turbidity (NTU) | Rows | Violations |
|---|---:|---:|
| 0 – 100 | 862 | 0.00 % |
| 100 – 250 | 726 | 0.00 % |
| 250 – 400 | 438 | 0.00 % |
| 400 – 600 | 639 | 0.16 % |
| 600 – 800 | 903 | 3.88 % |
| **800 – 1000** | 682 | **9.38 %** |

### By required mission range

| Required range (m) | Rows | Violations |
|---|---:|---:|
| ≤ 150 | 597 | 0.00 % |
| 150 – 200 | 1,099 | 0.00 % |
| 200 – 250 | 1,068 | 0.00 % |
| 250 – 300 | 989 | 0.00 % |
| **300 – 400** | 497 | **20.12 %** |

Below 300 m of required range the model does not violate the bound once, in 3,753
consecutive rows. Every failure lives above 300 m or above 600 NTU.

That is a usable operating envelope, and it is the basis of the deployment rule
below.

---

## The adversarial regime

Every one of the 3,000 unseen adversarial rows violates the bound. So does every
solver answer on the same rows: the stratum is feasible in **0.00 %** of cases.

That is not a failure of either. Cold, near-fresh water at 600–1000 NTU with
380–560 m of required range cannot be surveyed by this payload, and no choice of
waveform changes that. Both the solver and the model are being asked for
something that does not exist.

What separates them is that **the solver knows.** It sets `feasible = False` and
the payload can act on it — shorten the survey line, come shallower, accept a
coarser product, or abort. The surrogate emits three numbers and no flag. Nothing
in its output distinguishes "here is the right waveform" from "there is no right
waveform and this is my closest guess".

That, more than the 0.31 %, is the argument against deploying it alone.

---

## The deployment rule

> **The model proposes, the physics disposes.**

The active sonar equation stays resident on the payload — it is a few dozen lines
and it is already there — and it vetoes any proposal that does not clear the
detection threshold at the required range. A rejected proposal falls back to the
full 468-candidate search.

The guard is not optional and it is not a fallback for edge cases. It is the
component that turns a 0.31 % silent-failure rate into a 0 % silent-failure rate,
at the cost of running the solver on those rows anyway.

Which raises the obvious question, answered in [`latency.md`](latency.md): if the
solver has to be resident to check the model's work, and the solver costs
**41.5 µs** while the surrogate costs **9.0 ms**, what is the surrogate for?

On the measured evidence, nothing. **It does not ship.**

What does ship is a model pointed at a different target — see
[`residual-model.md`](residual-model.md). It supplies the *margin* the threshold
sits above, so this guard remains untouched underneath it.

---

## What this folder is not claiming

- Not that the model is bad. Reproducing a 468-candidate search to within a few
  kilohertz from two effective inputs is a real result.
- Not that machine learning has no place here. It has a clear one, measured in
  [`residual-model.md`](residual-model.md): predicting what the propagation model
  gets wrong, which the propagation model cannot do for itself. That is a
  different job from choosing the waveform, and it is the one that ships.
- Not that 0.31 % would be acceptable elsewhere. On a survey payload a silent
  ping costs a line that has to be re-flown. On something with a person attached
  to it, the acceptable rate is zero and the argument would not start.

## Verification status

| | |
|---|---|
| Computed by | `evaluate.py`, from `../dataset/adaptive_sonar_waveform_selection.csv` |
| Reproducible | Yes — fixed seed, deterministic split, identical numbers on rerun |
| Validated against hardware | **No.** The safety bound is the sonar equation, not a measurement. |

The violation rate is a statement about the model relative to our own physics
model. If the physics is wrong, the safety bound is wrong with it, and both
become right or wrong together at the tank trial recorded in
[`../../06-validation/tank-results/`](../../06-validation/tank-results/).
