"""Runs notebook.py headlessly and writes every artefact it produces.

    python run_local.py

Writes, next to this file:
    adaptive_sonar_waveform_selection.csv   the dataset
    figures/*.png, figures/*.svg            the seven figures
    run-metrics.json                        every number the docs quote
    run.log                                 the notebook's own printed output

Why this exists rather than "just open the notebook": the documentation in this
submission quotes numbers from the notebook, and a number in a document is only
trustworthy if the command that produced it is written down next to it. This is
that command.

It also verifies reproducibility. If a copy of the dataset is already present, the
regenerated file is hashed against it and the result is recorded. The seed is
fixed and NumPy's PCG64 generator is stable across versions, so the two hashes
should match exactly - not approximately.
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import runpy
import sys
import time

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "notebook.py")
FIG = os.path.join(HERE, "figures")
CSV = os.path.join(HERE, "adaptive_sonar_waveform_selection.csv")
PUBLISHED = os.path.join(HERE, "..", "dataset", "adaptive_sonar_waveform_selection.csv")

os.makedirs(FIG, exist_ok=True)
os.chdir(HERE)

# In notebook order. Two of the seven are unnumbered in the notebook text; they
# are named here by content so the report can reference them unambiguously.
FIG_NAMES = [
    "fig1-absorption-and-range",      # notebook "Figure 1"
    "fig2-waveform-families",         # notebook "Figure 2"
    "fig3-window-sidelobes",          # notebook "Figure 3"
    "fig4-pulse-compression",         # section 5, unnumbered in the notebook
    "fig5-feasible-region",           # notebook "Figure 4"
    "fig6-dataset-behaviour",         # notebook "Figure 5"
    "fig7-surrogate-parity",          # section 9, unnumbered in the notebook
    "fig8-residual-structure",        # notebook "Figure 8"
    "fig9-margin-and-resolution",     # notebook "Figure 9"
]

# A 20,000-point scatter is six megabytes as SVG and slow in every viewer, so
# vector output is kept only where it stays small. PNG is always written.
SVG_MAX_BYTES = 400_000

_count = {"i": 0}


def _show(*_a, **_k):
    i = _count["i"]
    name = FIG_NAMES[i] if i < len(FIG_NAMES) else f"fig{i + 1}-unnamed"
    plt.savefig(os.path.join(FIG, f"{name}.png"), dpi=160,
                bbox_inches="tight", facecolor="white")
    svg = os.path.join(FIG, f"{name}.svg")
    plt.savefig(svg, bbox_inches="tight", facecolor="white")
    if os.path.getsize(svg) > SVG_MAX_BYTES:
        os.remove(svg)
    print(f"[figure] {name}")
    _count["i"] += 1
    plt.close("all")


plt.show = _show


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


published_hash = sha256(PUBLISHED) if os.path.exists(PUBLISHED) else None

started = time.time()
g = runpy.run_path(SRC, run_name="__notebook__")
elapsed = time.time() - started
print(f"\n[runtime] {elapsed:.1f} s")

import numpy as np                                          # noqa: E402
import pandas as pd                                         # noqa: E402

df = g["df"]
summary = pd.DataFrame(g["summary"])

out = {
    "runtime_s": round(elapsed, 1),
    "seed": g["SEED"],
    "rows": int(len(df)),
    "cols": int(df.shape[1]),
    "columns": list(df.columns),
    "candidates_per_decision": int(g["CAND_FC"].size),
    "strata": {k: int(v) for k, v in df["stratum"].value_counts().items()},
    "feasible_overall_pct": round(100 * float(df["feasible"].mean()), 2),
    "feasible_by_stratum_pct": {
        k: round(100 * float(v), 2)
        for k, v in df.groupby("stratum")["feasible"].mean().items()},
    "f_centre_khz": {"min": round(float(df.f_centre_hz.min()) / 1e3, 1),
                     "max": round(float(df.f_centre_hz.max()) / 1e3, 1),
                     "distinct": int(df.f_centre_hz.nunique())},
    "pulse_ms": {"min": round(float(df.pulse_s.min()) * 1e3, 2),
                 "max": round(float(df.pulse_s.max()) * 1e3, 2),
                 "distinct": int(df.pulse_s.nunique())},
    "resolution_mm": {"min": round(float(df.resolution_m.min()) * 1e3, 2),
                      "max": round(float(df.resolution_m.max()) * 1e3, 2)},
    "error_db": {"mean": round(float(df.error_db.mean()), 3),
                 "sd": round(float(df.error_db.std()), 3)},
    "accuracy": [
        {k: (round(float(v), 6) if isinstance(v, (int, float, np.floating)) else v)
         for k, v in row.items()} for row in summary.to_dict("records")],
    "latency": {
        "solver_us": round(float(g["solver_us"]), 1),
        "surrogate_us": round(float(g["surrogate_us"]), 1),
        "ratio": round(float(g["surrogate_us"] / g["solver_us"]), 1),
        "tree_nodes": int(g["nodes"]),
    },
    "residual_model": {
        "mae_constant_db": round(float(g["mean_absolute_error"](
            g["yr_test"], g["const_pred"])), 3),
        "mae_linear_in_turbidity_db": round(float(g["mean_absolute_error"](
            g["yr_test"], g["linear_pred"])), 3),
        "mae_gradient_boosting_db": round(float(g["mean_absolute_error"](
            g["yr_test"], g["resid_pred"])), 3),
        "residual_sd_db": round(float(g["resid_sd"]), 3),
        "noise_floor_db": 0.9,
        "margin_current_mean_db": round(float(g["margin_current"].mean()), 2),
        "margin_learned_mean_db": round(float(g["margin_learned"].mean()), 2),
        "margin_returned_db": round(float(g["margin_current"].mean()
                                          - g["margin_learned"].mean()), 2),
        "coverage_current_pct": round(100 * float(
            (g["margin_current"] >= g["yr_test"]).mean()), 2),
        "coverage_learned_pct": round(100 * float(
            (g["margin_learned"] >= g["yr_test"]).mean()), 2),
        "comparison": g["comparison"].to_dict("records"),
        "best_improvement_pct": round(float(
            g["comparison"]["improvement_pct"].max()), 1),
    },
    "routine_violation_pct": round(100 * g["routine_rate"], 2),
    "stress_violation_pct": round(100 * g["stress_rate"], 2),
    "solver_infeasible_stress_pct": round(100 * float(g["solver_infeasible"]), 2),
    "physics_checks": {
        "thorp_db_per_km_at_100kHz": round(float(g["thorp_absorption_db_per_km"](100.0)), 2),
        "thorp_db_per_km_at_200kHz": round(float(g["thorp_absorption_db_per_km"](200.0)), 2),
        "thorp_db_per_km_at_400kHz": round(float(g["thorp_absorption_db_per_km"](400.0)), 2),
        "sound_speed_25C_35ppt_0m": round(float(g["sound_speed_water"](25.0, 35.0, 0.0)), 2),
    },
    "csv_bytes": os.path.getsize(CSV),
    "csv_sha256": sha256(CSV),
    "csv_sha256_published": published_hash,
    "csv_reproduces_published": (published_hash is not None
                                 and sha256(CSV) == published_hash),
    "figures": sorted(os.listdir(FIG)),
}

with io.open(os.path.join(HERE, "run-metrics.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, indent=1)

print(f"\ndataset      {out['rows']} x {out['cols']}, {out['csv_bytes']:,} bytes")
print(f"sha256       {out['csv_sha256']}")
if published_hash is None:
    print("published    ../dataset copy not found, nothing to compare against")
elif out["csv_reproduces_published"]:
    print("published    IDENTICAL - byte-for-byte reproduction confirmed")
else:
    print("published    DIFFERS - the seed, the row count or the physics changed.")
    print("             Update ../dataset/generation.md with the new hash, then")
    print("             rerun ../evaluation/evaluate.py; every number there is")
    print("             derived from this file.")
print(f"\nwrote run-metrics.json and {len(out['figures'])} files in figures/")
