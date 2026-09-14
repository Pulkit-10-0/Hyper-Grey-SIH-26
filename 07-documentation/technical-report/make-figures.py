"""Regenerates the report figures that are drawn from raw validation data.

    python make-figures.py

Reads the CSVs under 06-validation/bench-results/raw/ and writes into figures/.
The remaining figures in that folder are copied from 05-models and 02-firmware
and are produced by those subsystems' own scripts.

Each figure here plots one physical quantity per axis. Several of the originals
put a rate in MSps and a percentage on the same axis, which makes one of the two
bars invisible; that is the specific defect this script removes.
"""
from __future__ import annotations

import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "..", "..", "06-validation", "bench-results", "raw")
FIG = os.path.join(HERE, "figures")
os.makedirs(FIG, exist_ok=True)

TEAL, OCEAN, AMBER, SLATE = "#1E8C9E", "#136578", "#E08A2B", "#6D7E8C"

plt.rcParams.update({
    "font.size": 9,
    "axes.grid": True,
    "grid.alpha": 0.28,
    "grid.linewidth": 0.6,
    "axes.edgecolor": "#5A6A74",
    "axes.linewidth": 0.8,
    "savefig.facecolor": "white",
    "figure.facecolor": "white",
    "axes.titlesize": 10,
    "axes.titleweight": "bold",
    "legend.frameon": False,
})


def save(fig, name):
    path = os.path.join(FIG, name)
    fig.savefig(path, dpi=200, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print(f"  wrote {name}")


# ---------------------------------------------------------------- T-01
def t01_impedance():
    d = pd.read_csv(os.path.join(RAW, "T-01_impedance-sweep.csv"))
    f = d["frequency_hz"] / 1e3
    z = d["magnitude_ohm"]
    ph = d["phase_deg"]
    # The sweep steps in 500 Hz, so the true minimum falls between samples.
    # Parabolic interpolation through the three points at the dip recovers
    # 40.20 kHz and 412.7 ohm, which is the pair reported for T-01.
    i = int(z.idxmin())
    y0, y1, y2 = z[i - 1], z[i], z[i + 1]
    step = f[1] - f[0]
    delta = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2)
    f0 = f[i] + delta * step
    z0 = y1 - 0.25 * (y0 - y2) * delta

    fig, ax = plt.subplots(figsize=(7.4, 3.5))
    ax.plot(f, z, color=OCEAN, lw=1.8, label="Impedance magnitude")
    ax.plot([f0], [z0], "o", color=AMBER, ms=7, zorder=5)
    ax.annotate(f"resonance {f0:.1f} kHz\n{z0:.0f} $\\Omega$ minimum",
                xy=(f0, z0), xytext=(f0 + 9, z0 + 620),
                fontsize=8.5, color="#26333B",
                arrowprops=dict(arrowstyle="->", color=SLATE, lw=0.9))
    ax.set_xlabel("Frequency (kHz)")
    ax.set_ylabel("Impedance magnitude ($\\Omega$)")
    ax.set_xlim(f.min(), f.max())
    ax.set_ylim(0, z.max() * 1.10)

    ax2 = ax.twinx()
    ax2.plot(f, ph, color=SLATE, lw=1.1, ls="--", label="Phase")
    ax2.set_ylabel("Phase (degrees)")
    ax2.grid(False)
    ax2.set_ylim(-95, 95)

    h1, l1 = ax.get_legend_handles_labels()
    h2, l2 = ax2.get_legend_handles_labels()
    ax.legend(h1 + h2, l1 + l2, loc="upper right", fontsize=8)
    ax.set_title("T-01  Transducer impedance and resonance")
    save(fig, "f10-t01-impedance.png")


# ---------------------------------------------------------------- T-10
def t10_dma():
    d = pd.read_csv(os.path.join(RAW, "T-10_dma-cpu.csv"))
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(8.6, 3.0),
                                 gridspec_kw={"width_ratios": [2.0, 1.0]})

    # Left: the block timeline, which is what "sustained" actually means.
    for _, r in d.iterrows():
        a1.barh(0, r["end_us"] - r["start_us"], left=r["start_us"], height=0.42,
                color=TEAL, edgecolor="white", linewidth=1.4)
        a1.text((r["start_us"] + r["end_us"]) / 2, 0,
                f"block {int(r['block'])}\n{int(r['samples'])} samples",
                ha="center", va="center", fontsize=7.4, color="white")
    total_us = d["end_us"].max()
    total_samples = int(d["samples"].sum())
    a1.set_yticks([])
    a1.set_xlabel("Time ($\\mu$s)")
    a1.set_xlim(0, total_us)
    a1.set_title(f"Back-to-back DMA blocks: {total_samples:,} samples "
                 f"in {total_us:.0f} $\\mu$s")
    a1.grid(axis="x", alpha=0.25)

    # Right: occupancy, on its own axis and its own scale.
    idle = float(d["cpu_idle_percent"].iloc[0])
    a2.bar(["Core 0 idle", "Core 0 busy"], [idle, 100 - idle],
           color=[TEAL, AMBER], width=0.55)
    a2.set_ylim(0, 108)
    a2.set_ylabel("Transmit envelope (%)")
    for x, v in enumerate([idle, 100 - idle]):
        a2.text(x, v + 2.5, f"{v:.1f}%", ha="center", fontsize=9, weight="bold")
    a2.set_title(f"Sustained {d['sustained_msps'].iloc[0]:.3f} MSps")
    fig.suptitle("T-10  Parallel-bus throughput and processor occupancy",
                 fontsize=10, fontweight="bold", y=1.04)
    save(fig, "f13-t10-dma.png")


# ---------------------------------------------------------------- T-12
def t12_dds():
    d = pd.read_csv(os.path.join(RAW, "T-12_dds-vs-naive.csv")).set_index("build")
    label = {"fixed_dds": "Fixed-point DDS", "naive_sinf": "Live sinf()"}
    order = ["fixed_dds", "naive_sinf"]
    names = [label[b] for b in order]
    cols = [TEAL, AMBER]

    fig, axes = plt.subplots(1, 3, figsize=(9.4, 2.9))
    panels = [
        ("fill_time_us_per_1024", "Buffer fill time ($\\mu$s per 1,024)", "{:.1f}", 1.30),
        ("cpu_idle_percent", "Core 0 idle during transmit (%)", "{:.1f}", 1.14),
        ("energy_mj", "Energy per complete ping (mJ)", "{:.2f}", 1.18),
    ]
    for ax, (col, title, fmt, head) in zip(axes, panels):
        vals = [d.loc[b, col] for b in order]
        ax.bar(names, vals, color=cols, width=0.52)
        for x, v in enumerate(vals):
            ax.text(x, v + max(vals) * 0.03, fmt.format(v), ha="center",
                    fontsize=9, weight="bold")
        ax.set_ylim(0, max(vals) * head)
        ax.set_title(title, fontsize=9)
        ax.tick_params(axis="x", labelsize=8.5)

    fill = d.loc["naive_sinf", "fill_time_us_per_1024"] / d.loc["fixed_dds", "fill_time_us_per_1024"]
    drop = 100 * (1 - d.loc["fixed_dds", "energy_mj"] / d.loc["naive_sinf", "energy_mj"])
    fig.suptitle(f"T-12  Fixed-point synthesis against live trigonometry: "
                 f"{fill:.1f}x faster fill, {drop:.1f}% less ping energy",
                 fontsize=10, fontweight="bold", y=1.06)
    save(fig, "f14-t12-dds.png")


# ---------------------------------------------------------------- T-11
def t11_power():
    st = pd.read_csv(os.path.join(RAW, "T-11_power-states.csv"))
    en = pd.read_csv(os.path.join(RAW, "T-11_ping-energy.csv"))
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(9.0, 3.1))

    names = [s.replace("_", " ") for s in st["state"]]
    a1.barh(names, st["current_ma"], color=TEAL, height=0.55)
    a1.set_xscale("log")
    a1.set_xlabel("Current (mA), logarithmic")
    for y, v in enumerate(st["current_ma"]):
        a1.text(v * 1.18, y, f"{v:g} mA", va="center", fontsize=8.4)
    a1.set_xlim(0.1, st["current_ma"].max() * 4)
    a1.set_title("Current by power state")
    a1.grid(axis="x", alpha=0.25)

    ecol = next((c for c in en.columns if "mj" in c.lower()), en.columns[-1])
    vals = pd.to_numeric(en[ecol], errors="coerce").dropna()
    a2.hist(vals, bins=18, color=TEAL, alpha=0.9, edgecolor="white")
    a2.axvline(vals.mean(), color=AMBER, lw=1.8,
               label=f"mean {vals.mean():.2f} mJ")
    a2.set_xlabel("Energy per complete ping (mJ)")
    a2.set_ylabel("Pings")
    a2.legend(fontsize=8)
    a2.set_title("Complete-ping energy distribution")

    fig.suptitle("T-11  Power states and per-ping energy", fontsize=10,
                 fontweight="bold", y=1.04)
    save(fig, "f15-t11-power.png")


# ---------------------------------------------------------------- T-13
def t13_latency():
    d = pd.read_csv(os.path.join(RAW, "T-13_adaptation-latency.csv"))
    lat = d["latency_ms"]
    mean, p95, mx = lat.mean(), np.percentile(lat, 95), lat.max()

    fig, (a1, a2) = plt.subplots(1, 2, figsize=(9.0, 3.0),
                                 gridspec_kw={"width_ratios": [1.6, 1.0]})
    a1.plot(d["trial"], lat, "o-", color=OCEAN, ms=4, lw=1.2)
    a1.axhline(mean, color=TEAL, ls="--", lw=1.2, label=f"mean {mean:.1f} ms")
    a1.axhline(p95, color=AMBER, ls="--", lw=1.2, label=f"95th percentile {p95:.1f} ms")
    a1.set_xlabel("Trial")
    a1.set_ylabel("Decision latency (ms)")
    a1.set_title(f"{len(lat)} consecutive decisions")
    a1.legend(fontsize=8, loc="lower right")

    a2.hist(lat, bins=10, color=TEAL, alpha=0.9, edgecolor="white",
            orientation="horizontal")
    a2.axhline(mx, color="#C0504D", lw=1.4, label=f"maximum {mx:.1f} ms")
    a2.set_xlabel("Trials")
    a2.set_title("Distribution")
    a2.legend(fontsize=8, loc="lower right")
    a2.set_ylim(a1.get_ylim())

    fig.suptitle("T-13  Adaptation decision latency", fontsize=10,
                 fontweight="bold", y=1.04)
    save(fig, "f16-t13-latency.png")


if __name__ == "__main__":
    print("regenerating validation figures from raw data")
    t01_impedance()
    t10_dma()
    t12_dds()
    t11_power()
    t13_latency()
    print("done")
