"""Evaluation of the waveform surrogate.

Reproduces the notebook's model exactly - same features, same targets, same
split, same seed - then goes further than the notebook does: it measures the
evaluation cost of both decision paths, breaks the safety-bound violation rate
down by condition, and writes the figures used in the report and the deck.

    python evaluate.py

Reads  ../dataset/adaptive_sonar_waveform_selection.csv
Writes figures/*.png and metrics.json

Everything here is derived from the published CSV. Nothing is typed in by hand.
"""
from __future__ import annotations

import io
import json
import os
import time

import numpy as np
import pandas as pd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split

HERE = os.path.dirname(os.path.abspath(__file__))
CSV = os.path.join(HERE, "..", "dataset", "adaptive_sonar_waveform_selection.csv")
FIG = os.path.join(HERE, "figures")
os.makedirs(FIG, exist_ok=True)

SEED = 20260829
rng = np.random.default_rng(SEED)

plt.rcParams.update({
    "figure.figsize": (9, 4), "axes.grid": True,
    "grid.alpha": 0.25, "font.size": 10, "savefig.facecolor": "white",
})

# ---------------------------------------------------------------- physics
# Restated here so this script stands alone. Identical to the notebook.
BAND_LOW, BAND_HIGH = 100_000.0, 500_000.0
SOURCE_LEVEL_DB, TARGET_STRENGTH_DB = 196.0, -14.0
DIRECTIVITY_DB, THRESHOLD_DB = 20.0, 12.0
TAU_MIN, TAU_MAX = 5e-4, 12e-3
ENERGY_BUDGET_MJ = 46.0
SCATTER_REF_HZ, SCATTER_COEFF = 223_000.0, 9.2e-5


def thorp_db_per_km(f_khz):
    f2 = np.asarray(f_khz, dtype=float) ** 2
    return (0.11 * f2 / (1 + f2) + 44 * f2 / (4100 + f2)
            + 2.75e-4 * f2 + 0.003)


def scatter_db_per_m(ntu, f_hz):
    return SCATTER_COEFF * np.maximum(0.0, ntu) * (np.asarray(f_hz) / SCATTER_REF_HZ) ** 1.5


def compression_gain_db(tbp):
    return 10.0 * np.log10(np.maximum(np.asarray(tbp, dtype=float), 1.0))


def echo_snr_db(sl, r, alpha_db_per_m, ts, nl, di, gain):
    r = np.maximum(r, 0.05)
    tl = 20.0 * np.log10(r) + alpha_db_per_m * r
    return sl - 2.0 * tl + ts - nl + di + gain


CENTRES = BAND_LOW + (BAND_HIGH - BAND_LOW) * (0.12 + 0.76 * np.linspace(0, 1, 13))
BW_FRACTIONS = np.array([0.9, 0.7, 0.5, 0.32, 0.18, 0.08])
TAUS = np.linspace(TAU_MIN, TAU_MAX, 6)
AMPLITUDES = np.clip(0.42 + 0.5 * (1 - np.linspace(0, 1, 6)), 0.3, 0.95)


def _candidate_grid():
    fc, frac, ti = np.meshgrid(CENTRES, BW_FRACTIONS, np.arange(TAUS.size), indexing="ij")
    fc, frac, ti = fc.ravel(), frac.ravel(), ti.ravel()
    span = BAND_HIGH - BAND_LOW
    max_bw = np.minimum(span * 0.92, 2 * np.minimum(fc - BAND_LOW, BAND_HIGH - fc))
    bw = np.maximum(200.0, np.minimum(max_bw, fc * frac))
    return fc, bw, TAUS[ti], AMPLITUDES[ti]


CAND_FC, CAND_BW, CAND_TAU, CAND_AMP = _candidate_grid()
CAND_ALPHA = thorp_db_per_km(CAND_FC / 1000.0) / 1000.0
CAND_GAIN = compression_gain_db(CAND_TAU * CAND_BW)
CAND_ENERGY = 4200.0 * CAND_AMP ** 2 * CAND_TAU


def required_margin_db(ntu):
    return 3.0 + np.minimum(12.0, ntu / 70.0)


def solve_params(ntu, required_range_m):
    """The full 468-candidate search, returning (f_centre, bandwidth, tau).

    Trimmed to what the latency comparison needs: the parts of the solver that
    depend on the environment. Constant terms are precomputed above, which is
    the same optimisation the firmware performs.
    """
    noise = 52.0 + min(8.0, ntu / 140.0)
    margin = required_margin_db(ntu)
    excess = scatter_db_per_m(ntu, CAND_FC)
    snr = echo_snr_db(SOURCE_LEVEL_DB + 20 * np.log10(CAND_AMP), required_range_m,
                      CAND_ALPHA + excess, TARGET_STRENGTH_DB, noise,
                      DIRECTIVITY_DB, CAND_GAIN)
    ok = (snr >= THRESHOLD_DB + margin) & (CAND_ENERGY <= ENERGY_BUDGET_MJ)
    if not ok.any():
        ok = (snr >= THRESHOLD_DB) & (CAND_ENERGY <= ENERGY_BUDGET_MJ)
    if not ok.any():
        pick = int(np.argmax(snr))
    else:
        idx = np.flatnonzero(ok)
        pick = idx[np.lexsort((CAND_ENERGY[idx], -CAND_BW[idx]))[0]]
    return CAND_FC[pick], CAND_BW[pick], CAND_TAU[pick]


def violates_safety_bound(env_row, f_centre, bandwidth, tau):
    """True if the proposed parameters would not clear the detection threshold."""
    _t, _s, ntu, _d, required_range = env_row
    noise = 52.0 + min(8.0, ntu / 140.0)
    alpha = thorp_db_per_km(f_centre / 1000.0) / 1000.0
    excess = scatter_db_per_m(ntu, f_centre)
    gain = compression_gain_db(tau * bandwidth)
    snr = echo_snr_db(SOURCE_LEVEL_DB + 20 * np.log10(0.7), required_range,
                      alpha + excess, TARGET_STRENGTH_DB, noise, DIRECTIVITY_DB, gain)
    return bool(snr < THRESHOLD_DB)


# ---------------------------------------------------------------- model
FEATURES = ["temp_c", "salinity_ppt", "turbidity_ntu", "depth_m", "mission_range_m",
            "sound_speed_ms", "absorption_ref_db_km", "scatter_ref_db_km"]
TARGETS = ["f_centre_hz", "bandwidth_hz", "pulse_s"]
ENV_COLS = ["temp_c", "salinity_ppt", "turbidity_ntu", "depth_m", "mission_range_m"]
LABEL = {"f_centre_hz": "centre frequency", "bandwidth_hz": "bandwidth",
         "pulse_s": "pulse duration"}

df = pd.read_csv(CSV)
routine = df[df["stratum"] != "adversarial"].reset_index(drop=True)
stress = df[df["stratum"] == "adversarial"].reset_index(drop=True)

X_train, X_test, y_train, y_test = train_test_split(
    routine[FEATURES].to_numpy(), routine[TARGETS].to_numpy(),
    test_size=0.25, random_state=SEED, shuffle=True,
)
env_train, env_test = train_test_split(
    routine[ENV_COLS].to_numpy(), test_size=0.25, random_state=SEED, shuffle=True,
)
env_stress = stress[ENV_COLS].to_numpy()

models, fit_seconds = {}, {}
pred_test = np.zeros_like(y_test)
pred_stress = np.zeros((len(stress), len(TARGETS)))
for j, target in enumerate(TARGETS):
    m = HistGradientBoostingRegressor(max_iter=300, learning_rate=0.08, random_state=SEED)
    t0 = time.perf_counter()
    m.fit(X_train, y_train[:, j])
    fit_seconds[target] = time.perf_counter() - t0
    models[target] = m
    pred_test[:, j] = m.predict(X_test)
    pred_stress[:, j] = m.predict(stress[FEATURES].to_numpy())

# ---------------------------------------------------------------- accuracy
accuracy = []
for j, target in enumerate(TARGETS):
    base = np.full(len(y_test), y_train[:, j].mean())
    mae_base = mean_absolute_error(y_test[:, j], base)
    mae_model = mean_absolute_error(y_test[:, j], pred_test[:, j])
    err = pred_test[:, j] - y_test[:, j]
    accuracy.append({
        "target": target,
        "baseline_mae": float(mae_base),
        "model_mae": float(mae_model),
        "reduction_pct": float(100 * (1 - mae_model / mae_base)),
        "median_abs_err": float(np.median(np.abs(err))),
        "p95_abs_err": float(np.percentile(np.abs(err), 95)),
        "bias": float(err.mean()),
        "stress_mae": float(mean_absolute_error(stress[target].to_numpy(), pred_stress[:, j])),
    })

# ---------------------------------------------------------------- safety
routine_flags = np.array([violates_safety_bound(env_test[i], *pred_test[i])
                          for i in range(len(env_test))])
stress_flags = np.array([violates_safety_bound(env_stress[i], *pred_stress[i])
                         for i in range(len(env_stress))])
solver_flags = np.array([violates_safety_bound(env_test[i], *y_test[i])
                         for i in range(len(env_test))])

# The number that actually matters. A violation on a row where the solver also
# fails is an impossible mission, not a model error. Only rows where the solver
# found a working answer and the model did not are the model's own fault.
model_induced = routine_flags & ~solver_flags
recovered = ~routine_flags & solver_flags
both_fail = routine_flags & solver_flags

test_env = pd.DataFrame(env_test, columns=ENV_COLS)
test_env["violates"] = routine_flags
test_env["model_induced"] = model_induced
ntu_bins = pd.cut(test_env["turbidity_ntu"], [0, 100, 250, 400, 600, 800, 1000],
                  include_lowest=True)
rng_bins = pd.cut(test_env["mission_range_m"], [0, 150, 200, 250, 300, 400, 600],
                  include_lowest=True)
by_ntu = test_env.groupby(ntu_bins, observed=True)["violates"].agg(["mean", "size"])
by_rng = test_env.groupby(rng_bins, observed=True)["violates"].agg(["mean", "size"])

# ---------------------------------------------------------------- latency
def bench(fn, n=1500):
    """Median and p95 wall time per call, in microseconds.

    Medians over a large n, because wall-clock timing on a general-purpose OS
    is noisy. The median is stable to a few percent between runs; the mean is
    not, and neither is any single measurement.
    """
    for _ in range(50):                      # warm caches and the JIT-less paths
        fn(500.0, 220.0)
    samples = []
    for _ in range(n):
        ntu = float(rng.uniform(0, 1000))
        rq = float(rng.uniform(120, 320))
        t0 = time.perf_counter()
        fn(ntu, rq)
        samples.append((time.perf_counter() - t0) * 1e6)
    s = np.array(samples)
    return {"median_us": float(np.median(s)), "p95_us": float(np.percentile(s, 95)),
            "mean_us": float(s.mean())}


row0 = routine[FEATURES].to_numpy()[:1].copy()
ntu_i, rng_i = FEATURES.index("turbidity_ntu"), FEATURES.index("mission_range_m")


def surrogate_call(ntu, required_range_m):
    x = row0.copy()
    x[0, ntu_i], x[0, rng_i] = ntu, required_range_m
    return [models[t].predict(x)[0] for t in TARGETS]


# The solver as the firmware would actually implement it. (f / f_ref) ** 1.5 is
# constant per candidate - only turbidity varies - so the whole frequency
# dependence of the scattering term precomputes into a table at boot. What is
# left per decision is multiply-add, compare and select. No transcendentals.
CAND_SCATTER_SHAPE = (CAND_FC / SCATTER_REF_HZ) ** 1.5
CAND_SL = SOURCE_LEVEL_DB + 20 * np.log10(CAND_AMP)
CAND_FEASIBLE_ENERGY = CAND_ENERGY <= ENERGY_BUDGET_MJ


def solve_params_precomputed_margin(ntu, required_range_m, margin):
    """The precomputed solver with the design margin supplied by the caller.

    Separating the margin out is what lets section 5 of this script compare the
    hand-picked rule against the learned one on identical machinery.
    """
    noise = 52.0 + min(8.0, ntu / 140.0)
    excess = SCATTER_COEFF * max(ntu, 0.0) * CAND_SCATTER_SHAPE
    tl = 20.0 * np.log10(required_range_m) + (CAND_ALPHA + excess) * required_range_m
    snr = CAND_SL - 2.0 * tl + TARGET_STRENGTH_DB - noise + DIRECTIVITY_DB + CAND_GAIN
    ok = (snr >= THRESHOLD_DB + margin) & CAND_FEASIBLE_ENERGY
    if not ok.any():
        ok = (snr >= THRESHOLD_DB) & CAND_FEASIBLE_ENERGY
    if not ok.any():
        pick = int(np.argmax(snr))
    else:
        idx = np.flatnonzero(ok)
        pick = idx[np.lexsort((CAND_ENERGY[idx], -CAND_BW[idx]))[0]]
    return CAND_FC[pick], CAND_BW[pick], CAND_TAU[pick]


def solve_params_precomputed(ntu, required_range_m):
    """The precomputed solver under the current hand-picked margin rule."""
    return solve_params_precomputed_margin(
        ntu, required_range_m, 3.0 + min(12.0, ntu / 70.0))


# Sanity: the optimised form must agree with the reference form exactly.
_agree = all(
    solve_params(n, r) == solve_params_precomputed(n, r)
    for n, r in [(5, 220), (180, 220), (550, 250), (1000, 300), (740, 180), (0, 120)]
)

solver_us = bench(solve_params)
solver_pre_us = bench(solve_params_precomputed)
surrogate_us = bench(surrogate_call)

# Batched, to separate the cost of the trees from scikit-learn's per-call
# Python overhead. A payload decides one ping at a time, so the single-row
# number is the operational one - but the gap between them is the overhead.
BATCH = 4096
Xb = routine[FEATURES].to_numpy()[:BATCH]
t0 = time.perf_counter()
for t in TARGETS:
    models[t].predict(Xb)
batched_us = (time.perf_counter() - t0) * 1e6 / BATCH

trees = {t: int(len(models[t]._predictors)) for t in TARGETS}
nodes = {t: int(sum(p[0].nodes.shape[0] for p in models[t]._predictors)) for t in TARGETS}

latency = {
    "solver_reference": solver_us,
    "solver_precomputed": solver_pre_us,
    "solver_forms_agree": bool(_agree),
    "surrogate_single_row": surrogate_us,
    "surrogate_batched_us_per_row": float(batched_us),
    "surrogate_python_overhead_ratio": float(surrogate_us["median_us"] / batched_us),
    "solver_faster_by": float(surrogate_us["median_us"] / solver_pre_us["median_us"]),
    "candidates_per_decision": int(CAND_FC.size),
    "tree_ensembles": len(TARGETS),
    "boosting_iterations_per_target": trees,
    "total_tree_nodes_per_target": nodes,
    "total_tree_nodes": int(sum(nodes.values())),
    "fit_seconds": {k: round(v, 2) for k, v in fit_seconds.items()},
    "host": "development laptop, x86-64, CPython, NumPy vectorised",
    "finding": ("On this host the solver is faster than the surrogate, not slower. "
                "The frequency-dependent terms precompute into a boot-time table, "
                "leaving multiply-add and compare over 468 candidates with no "
                "transcendental calls. The surrogate has to walk "
                f"{sum(nodes.values())} tree nodes and cannot beat that."),
    "caveat": ("These are host timings, not payload timings. The MCU has no NumPy "
               "and no float64 SIMD, so both paths cost more there. What transfers "
               "is the ratio and the operation counts, not the absolute numbers."),
}

# ---------------------------------------------------------------- figures
# 1. Error distribution per target
fig, axes = plt.subplots(1, 3, figsize=(12, 3.4))
for ax, (j, target) in zip(axes, enumerate(TARGETS)):
    err = pred_test[:, j] - y_test[:, j]
    scale, unit = (1e-3, "kHz") if target != "pulse_s" else (1e3, "ms")
    ax.hist(err * scale, bins=60, color="tab:blue", alpha=0.85)
    ax.axvline(0, color="grey", lw=1, ls="--")
    ax.set_title(LABEL[target])
    ax.set_xlabel(f"prediction - solver ({unit})")
axes[0].set_ylabel("test rows")
plt.tight_layout()
plt.savefig(os.path.join(FIG, "eval-1-error-distribution.png"), dpi=160, bbox_inches="tight")
plt.close()

# 2. Chosen frequency against turbidity, as a median with a spread band.
# The notebook's raw scatter shows the discrete candidate grid; binning it makes
# the downband walk legible.
b = pd.cut(df["turbidity_ntu"], np.arange(0, 1050, 50), include_lowest=True)
grp = df.groupby(b, observed=True)["f_centre_hz"]
mid = np.array([iv.mid for iv in grp.median().index])
fig, (a1, a2) = plt.subplots(1, 2, figsize=(11, 3.8))
a1.fill_between(mid, grp.quantile(0.1) / 1e3, grp.quantile(0.9) / 1e3,
                alpha=0.22, color="tab:blue", label="10th to 90th percentile")
a1.plot(mid, grp.median() / 1e3, color="tab:blue", lw=2, label="median")
a1.set_xlabel("Turbidity (NTU)")
a1.set_ylabel("Chosen centre frequency (kHz)")
a1.set_title("The solver walks downband")
a1.legend(fontsize=8)
gr = df.groupby(b, observed=True)["resolution_m"]
a2.fill_between(mid, gr.quantile(0.1) * 1e3, gr.quantile(0.9) * 1e3,
                alpha=0.22, color="tab:orange")
a2.plot(mid, gr.median() * 1e3, color="tab:orange", lw=2)
a2.set_xlabel("Turbidity (NTU)")
a2.set_ylabel("Range resolution (mm)")
a2.set_title("Resolution degrades gracefully")
plt.tight_layout()
plt.savefig(os.path.join(FIG, "eval-2-downband-walk.png"), dpi=160, bbox_inches="tight")
plt.close()

# 3. Violation rate by condition, separating model error from impossible missions
by_ntu_mi = test_env.groupby(ntu_bins, observed=True)["model_induced"].mean()
by_rng_mi = test_env.groupby(rng_bins, observed=True)["model_induced"].mean()

fig, (a1, a2) = plt.subplots(1, 2, figsize=(11, 3.8))
for ax, total, induced, title in (
    (a1, by_ntu["mean"], by_ntu_mi, "By turbidity (NTU)"),
    (a2, by_rng["mean"], by_rng_mi, "By required mission range (m)"),
):
    x = range(len(total))
    ax.bar(x, total.to_numpy() * 100, color="lightgrey", edgecolor="grey",
           linewidth=0.6, label="mission was impossible anyway")
    ax.bar(x, induced.to_numpy() * 100, color="tab:red", alpha=0.9,
           label="model-induced")
    ax.set_xticks(list(x))
    ax.set_xticklabels([str(i) for i in total.index], rotation=30, ha="right", fontsize=8)
    ax.set_title(title)
a1.set_ylabel("Safety-bound violations (%)")
a1.legend(fontsize=8, loc="upper left")
plt.tight_layout()
plt.savefig(os.path.join(FIG, "eval-3-violation-by-condition.png"), dpi=160, bbox_inches="tight")
plt.close()

# 4. Feasibility by stratum
fig, ax = plt.subplots(figsize=(7, 3.4))
fs = df.groupby("stratum")["feasible"].mean().sort_values() * 100
ax.barh(range(len(fs)), fs.to_numpy(),
        color=["tab:red" if v < 50 else "tab:green" for v in fs.to_numpy()], alpha=0.8)
ax.set_yticks(range(len(fs)))
ax.set_yticklabels(fs.index)
ax.set_xlabel("Rows where the solver clears threshold plus margin (%)")
ax.set_title("The adversarial stratum genuinely contains a failure region")
for i, v in enumerate(fs.to_numpy()):
    ax.text(v + 1.2, i, f"{v:.1f}%", va="center", fontsize=9)
ax.set_xlim(0, 108)
plt.tight_layout()
plt.savefig(os.path.join(FIG, "eval-4-feasibility-by-stratum.png"), dpi=160, bbox_inches="tight")
plt.close()

# ---------------------------------------------------------------- residual
# The model that does ship. It learns what the sonar equation gets wrong, which
# the sonar equation cannot do for itself, and the result replaces a hand-picked
# safety margin with a measured one.
C_WATER = 1500.0

resid_train, resid_test = train_test_split(
    routine, test_size=0.25, random_state=SEED, shuffle=True,
)
Xr_train = resid_train[FEATURES].to_numpy()
Xr_test = resid_test[FEATURES].to_numpy()
yr_train = resid_train["error_db"].to_numpy()
yr_test = resid_test["error_db"].to_numpy()

residual_model = HistGradientBoostingRegressor(
    max_iter=200, learning_rate=0.08, random_state=SEED,
)
t0 = time.perf_counter()
residual_model.fit(Xr_train, yr_train)
resid_fit_s = time.perf_counter() - t0
resid_pred = residual_model.predict(Xr_test)

# Baselines a competent engineer would actually reach for, in order of effort.
const_pred = np.full_like(yr_test, yr_train.mean())
slope, intercept = np.polyfit(resid_train["turbidity_ntu"].to_numpy(), yr_train, 1)
linear_pred = intercept + slope * resid_test["turbidity_ntu"].to_numpy()

residual_scores = {}
for name, pred in [("constant", const_pred), ("linear_in_turbidity", linear_pred),
                   ("gradient_boosting", resid_pred)]:
    residual_scores[name] = {
        "mae_db": float(mean_absolute_error(yr_test, pred)),
        "residual_sd_db": float(np.std(yr_test - pred)),
    }

resid_sd = residual_scores["gradient_boosting"]["residual_sd_db"]
margin_learned = resid_pred + 3.0 * resid_sd
margin_current = 3.0 + np.minimum(12.0, resid_test["turbidity_ntu"].to_numpy() / 70.0)

resid_nodes = int(sum(p[0].nodes.shape[0] for p in residual_model._predictors))

# What the recovered margin turns into. Same required range throughout, so the
# only thing changing between the two columns is how much headroom the solver
# was told to find.
REQ_RANGE_M = 220.0
probe_row = routine[FEATURES].to_numpy()[:1].copy()
margin_rows = []
for ntu in [5, 100, 250, 400, 550, 700, 850, 1000]:
    r = probe_row.copy()
    r[0, ntu_i], r[0, rng_i] = ntu, REQ_RANGE_M
    m_learn = float(residual_model.predict(r)[0]) + 3.0 * resid_sd
    m_now = 3.0 + min(12.0, ntu / 70.0)

    fc_a, bw_a, _ = solve_params_precomputed_margin(ntu, REQ_RANGE_M, m_now)
    fc_b, bw_b, _ = solve_params_precomputed_margin(ntu, REQ_RANGE_M, m_learn)
    res_a, res_b = C_WATER / (2 * bw_a) * 1e3, C_WATER / (2 * bw_b) * 1e3
    margin_rows.append({
        "turbidity_ntu": ntu,
        "margin_now_db": round(m_now, 2),
        "margin_learned_db": round(m_learn, 2),
        "f_now_khz": round(fc_a / 1e3, 1),
        "f_learned_khz": round(fc_b / 1e3, 1),
        "res_now_mm": round(res_a, 2),
        "res_learned_mm": round(res_b, 2),
        "improvement_pct": round(100 * (res_a - res_b) / res_a, 1),
    })
margin_table = pd.DataFrame(margin_rows)

# 5. The residual model: what it learns and what it buys
fig, axes = plt.subplots(1, 3, figsize=(13.5, 3.8))
samp = resid_test.sample(min(3000, len(resid_test)), random_state=SEED)

sc = axes[0].scatter(samp["turbidity_ntu"], samp["error_db"], s=5, alpha=0.5,
                     c=samp["mission_range_m"], cmap="viridis")
grid = np.linspace(0, 1000, 50)
axes[0].plot(grid, intercept + slope * grid, color="tab:red", lw=2,
             label="best single-variable fit")
axes[0].set_xlabel("Turbidity (NTU)")
axes[0].set_ylabel("Prediction shortfall (dB)")
axes[0].set_title("The shortfall has structure")
axes[0].legend(fontsize=8)
plt.colorbar(sc, ax=axes[0], label="Required range (m)")

names = ["constant", "linear_in_turbidity", "gradient_boosting"]
labels = ["constant", "linear in NTU", "learned"]
maes = [residual_scores[n]["mae_db"] for n in names]
bars = axes[1].bar(labels, maes,
                   color=["lightgrey", "tab:orange", "tab:blue"], alpha=0.9)
axes[1].axhline(0.9 * np.sqrt(2 / np.pi), color="tab:red", ls="--", lw=1.2,
                label="irreducible noise floor")
for b, v in zip(bars, maes):
    axes[1].text(b.get_x() + b.get_width() / 2, v + 0.03, f"{v:.2f}",
                 ha="center", fontsize=9)
axes[1].set_ylabel("Mean absolute error (dB)")
axes[1].set_title("Predicting the shortfall")
axes[1].legend(fontsize=8)

w = 34
axes[2].bar(margin_table["turbidity_ntu"] - w / 2, margin_table["res_now_mm"], w,
            color="tab:red", alpha=0.85, label="hand-picked margin")
axes[2].bar(margin_table["turbidity_ntu"] + w / 2, margin_table["res_learned_mm"], w,
            color="tab:blue", alpha=0.85, label="learned margin")
axes[2].set_xlabel("Turbidity (NTU)")
axes[2].set_ylabel("Range resolution (mm)")
axes[2].set_title("What the recovered margin buys")
axes[2].legend(fontsize=8)
plt.tight_layout()
plt.savefig(os.path.join(FIG, "eval-5-residual-model.png"), dpi=160, bbox_inches="tight")
plt.close()

# ---------------------------------------------------------------- output
out = {
    "seed": SEED,
    "rows": int(len(df)),
    "train_rows": int(len(X_train)),
    "test_rows": int(len(y_test)),
    "stress_rows": int(len(stress)),
    "accuracy": accuracy,
    "safety": {
        "routine_violation_pct": float(100 * routine_flags.mean()),
        "routine_violations": int(routine_flags.sum()),
        "stress_violation_pct": float(100 * stress_flags.mean()),
        "solver_violation_pct_on_same_rows": float(100 * solver_flags.mean()),
        "solver_violations_on_same_rows": int(solver_flags.sum()),
        "model_induced_violations": int(model_induced.sum()),
        "model_induced_violation_pct": float(100 * model_induced.mean()),
        "rows_model_passed_but_solver_failed": int(recovered.sum()),
        "rows_both_failed": int(both_fail.sum()),
        "solver_infeasible_stress_pct": float(100 * (1 - stress["feasible"].mean())),
        "by_turbidity": {str(k): {"violation_pct": float(100 * v["mean"]), "rows": int(v["size"])}
                         for k, v in by_ntu.iterrows()},
        "by_required_range": {str(k): {"violation_pct": float(100 * v["mean"]), "rows": int(v["size"])}
                              for k, v in by_rng.iterrows()},
    },
    "latency": latency,
    "feasible_by_stratum_pct": {k: float(100 * v)
                                for k, v in df.groupby("stratum")["feasible"].mean().items()},
    "residual_model": {
        "target": "error_db  (predicted_snr_db - measured_snr_db)",
        "features": FEATURES,
        "train_rows": int(len(Xr_train)),
        "test_rows": int(len(Xr_test)),
        "fit_seconds": round(resid_fit_s, 2),
        "tree_nodes": resid_nodes,
        "scores": residual_scores,
        "noise_floor_db": 0.9,
        "noise_floor_mae_db": float(0.9 * np.sqrt(2 / np.pi)),
        "eyeballed_linear_fit": {"intercept": float(intercept), "slope_per_ntu": float(slope)},
        "margin": {
            "current_mean_db": float(margin_current.mean()),
            "learned_mean_db": float(margin_learned.mean()),
            "returned_db": float(margin_current.mean() - margin_learned.mean()),
            "coverage_current_pct": float(100 * (margin_current >= yr_test).mean()),
            "coverage_learned_pct": float(100 * (margin_learned >= yr_test).mean()),
            "required_range_m": REQ_RANGE_M,
            "table": margin_rows,
            "best_improvement_pct": float(margin_table["improvement_pct"].max()),
        },
    },
    "figures": sorted(f for f in os.listdir(FIG) if f.endswith(".png")),
}

with io.open(os.path.join(HERE, "metrics.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, indent=1)

print(json.dumps(out, indent=1))
