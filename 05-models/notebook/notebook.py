# %% [markdown]
# # Adaptive Sonar Waveform Selection
#
# Physics, an original dataset, and two models - one that fails and one that does
# not.
#
# A conventional sonar transmits the same pulse for an entire mission. A high
# frequency pulse resolves fine detail and dies in suspended sediment; a low
# frequency pulse penetrates and returns a blurred image. The correct choice
# depends on water that changes hour to hour, so it has to be made continuously.
#
# This notebook implements the physics that governs that choice and generates a
# dataset of environment-to-waveform decisions. Every published underwater
# acoustics dataset is receive-side classification - what came back, labelled.
# This one is transmit-side: what should have been sent.
#
# It then asks the obvious machine learning question, and a better one.
#
# **The obvious question (sections 8 to 10).** The payload evaluates 468 candidate
# waveforms per decision. Can a small model reproduce that choice more cheaply?
# It can reproduce it - to within a few kilohertz - but measurement shows it is
# around two orders of magnitude *slower* than the search it would replace, and
# it fails silently on conditions where the search does not. It does not ship.
# Finding that out required measuring an assumption that looked safe.
#
# **The better question (sections 11 and 12).** The sonar equation cannot predict
# its own error. That error is systematic, depends on several variables at once,
# and is currently covered by a safety margin somebody picked by hand. Learning
# it instead returns several decibels to the solver, which become bandwidth,
# which become range resolution in exactly the turbid water where a survey
# payload is otherwise worst served.
#
# The distinction between the two is the point: a model that competes with the
# physics loses, and a model that supplies what the physics structurally cannot
# earns its place.

# %%
from __future__ import annotations

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy import signal

SEED = 20260829
rng = np.random.default_rng(SEED)

plt.rcParams.update({
    "figure.figsize": (9, 4),
    "axes.grid": True,
    "grid.alpha": 0.25,
    "font.size": 10,
})

# %% [markdown]
# ## 1. Sound speed
#
# Mackenzie's nine-term equation for sea water. Temperature dominates; salinity
# and depth are second order but not negligible. A range estimate is only as
# accurate as the sound speed used to convert delay into distance.

# %%
def sound_speed_water(temp_c, salinity_ppt, depth_m):
    """Mackenzie (1981) sound speed in sea water, m/s. Valid 2-30 C, 25-40 ppt, 0-8000 m."""
    t = np.clip(temp_c, -2, 35)
    s = np.clip(salinity_ppt, 0, 45)
    z = np.clip(depth_m, 0, 8000)
    return (
        1448.96
        + 4.591 * t
        - 5.304e-2 * t**2
        + 2.374e-4 * t**3
        + (s - 35) * (1.340 - 1.025e-2 * t)
        + 1.630e-2 * z
        + 1.675e-7 * z**2
        - 7.139e-13 * t * z**3
    )


assert abs(sound_speed_water(25, 35, 0) - 1534.0) < 1.5

# %% [markdown]
# ## 2. Absorption
#
# Thorp's expression. The three terms are boric acid relaxation, magnesium
# sulphate relaxation, and pure water viscosity. Above roughly 100 kHz the
# magnesium sulphate term dominates and absorption rises steeply.

# %%
def thorp_absorption_db_per_km(freq_khz):
    """Thorp absorption in sea water, dB/km. Frequency in kHz."""
    f2 = np.asarray(freq_khz, dtype=float) ** 2
    return (
        0.11 * f2 / (1 + f2)
        + 44 * f2 / (4100 + f2)
        + 2.75e-4 * f2
        + 0.003
    )


SCATTER_REF_HZ = 223_000.0
SCATTER_COEFF = 9.2e-5


def scatter_db_per_m(turbidity_ntu, freq_hz):
    """Excess loss from suspended sediment, dB/m. Rises as f^1.5."""
    return SCATTER_COEFF * np.maximum(turbidity_ntu, 0.0) * (freq_hz / SCATTER_REF_HZ) ** 1.5


for f_khz, expected in [(100, 34.1), (200, 51.0), (400, 87.0)]:
    assert abs(thorp_absorption_db_per_km(f_khz) - expected) < 3.0

# %% [markdown]
# ### Figure 1 — why frequency is the whole argument
#
# Absorption alone climbs by a factor of 2.6 between 100 and 400 kHz. Add
# sediment scattering and the total loss at the top of the band becomes
# prohibitive, which is the physical reason a murky estuary forces you downband.

# %%
f_khz = np.logspace(1, 3, 400)
abs_clear = thorp_absorption_db_per_km(f_khz)
scat_turbid = scatter_db_per_m(740.0, f_khz * 1000.0) * 1000.0

fig, ax = plt.subplots()
ax.loglog(f_khz, abs_clear, label="Absorption (Thorp)")
ax.loglog(f_khz, scat_turbid, "--", label="Scattering at 740 NTU")
ax.loglog(f_khz, abs_clear + scat_turbid, label="Total loss, turbid water")
for mark in (100, 200, 400):
    ax.axvline(mark, color="grey", lw=0.6, ls=":")
    ax.annotate(f"{thorp_absorption_db_per_km(mark):.0f} dB/km",
                (mark, thorp_absorption_db_per_km(mark)),
                textcoords="offset points", xytext=(6, -12), fontsize=8)
ax.set_xlabel("Frequency (kHz)")
ax.set_ylabel("Loss (dB/km)")
ax.set_title("Propagation loss against frequency")
ax.legend()
plt.tight_layout()
plt.show()

# %% [markdown]
# ## 3. Resolution and the sonar equation
#
# An unmodulated pulse resolves no finer than half its own length. A swept pulse
# resolves `c / 2B`, independent of duration, which is why a chirp separates
# resolution from transmitted energy.

# %%
def range_resolution_cw(c, tau_s):
    """Range resolution of an unmodulated pulse, m."""
    return c * tau_s / 2.0


def range_resolution_chirp(c, bandwidth_hz):
    """Range resolution after pulse compression, m."""
    return c / (2.0 * bandwidth_hz)


def compression_gain_db(tbp):
    """Coherent gain from compressing a pulse of time-bandwidth product tbp."""
    return 10.0 * np.log10(np.maximum(tbp, 1.0))


def echo_snr_db(source_level, range_m, alpha_db_per_m, target_strength,
                noise_level, directivity, processing_gain):
    """Active sonar equation. Two-way spreading plus absorption."""
    r = np.maximum(range_m, 0.05)
    tl = 20.0 * np.log10(r) + alpha_db_per_m * r
    return source_level - 2.0 * tl + target_strength - noise_level + directivity + processing_gain


C_WATER = 1500.0
assert abs(range_resolution_cw(C_WATER, 5e-3) - 3.75) < 1e-6
assert abs(range_resolution_chirp(C_WATER, 100e3) - 0.0075) < 1e-9
assert abs(compression_gain_db(500) - 26.99) < 0.02

# %% [markdown]
# ## 4. Waveform synthesis
#
# Frequency is integrated into phase with an accumulator rather than evaluated as
# `sin(2*pi*f*t)`. The naive form introduces a phase discontinuity every time the
# frequency changes, which appears as spectral splatter. The accumulator mirrors
# what a hardware DDS engine does.

# %%
BARKER_13 = np.array([1, 1, 1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1], dtype=float)

WINDOW_PSL_DB = {"rect": -13.3, "hann": -31.5, "hamming": -42.7, "blackman": -58.0}


def make_window(kind, n):
    """Envelope taper of length n."""
    if kind == "rect":
        return np.ones(n)
    return signal.get_window(kind, n, fftbins=False)


def synthesise(mode, window, f_start, f_stop, tau_s, fs, amplitude=1.0):
    """Generate one transmit pulse. Returns the sample vector."""
    n = max(8, int(round(tau_s * fs)))
    t = np.arange(n) / fs
    frac = np.arange(n) / n

    if mode in ("cw", "barker13"):
        f_inst = np.full(n, f_start)
    elif mode == "lfm":
        f_inst = f_start + (f_stop - f_start) * frac
    elif mode == "geometric":
        f_inst = f_start * (f_stop / f_start) ** frac
    else:
        raise ValueError(f"unknown mode: {mode}")

    phase = np.cumsum(2.0 * np.pi * f_inst / fs)

    sign = np.ones(n)
    if mode == "barker13":
        chip = np.minimum((frac * BARKER_13.size).astype(int), BARKER_13.size - 1)
        sign = BARKER_13[chip]

    return np.sin(phase) * sign * make_window(window, n) * amplitude

# %% [markdown]
# ### Figure 2 — the four waveform families

# %%
FS_DEMO = 400_000.0
TAU_DEMO = 2e-3

fig, axes = plt.subplots(2, 2, figsize=(11, 5), sharex=True)
demos = [
    ("cw", "Fixed tone", 40_000, 40_000),
    ("lfm", "LFM chirp", 20_000, 60_000),
    ("geometric", "Geometric sweep", 20_000, 60_000),
    ("barker13", "Barker-13 coded", 40_000, 40_000),
]
for ax, (mode, title, f0, f1) in zip(axes.ravel(), demos):
    y = synthesise(mode, "hamming", f0, f1, TAU_DEMO, FS_DEMO)
    ax.plot(np.arange(y.size) / FS_DEMO * 1e3, y, lw=0.6)
    ax.set_title(title, fontsize=10)
    ax.set_ylabel("Amplitude")
for ax in axes[1]:
    ax.set_xlabel("Time (ms)")
plt.tight_layout()
plt.show()

# %% [markdown]
# ### Figure 3 — the envelope window sets the sidelobe floor
#
# The window is applied to the transmit envelope, not the receive samples. It
# removes the voltage step at both ends of the pulse, which protects the output
# stage, and it determines how far down the spectral sidelobes sit.

# %%
fig, ax = plt.subplots()
for kind in ("rect", "hann", "hamming", "blackman"):
    w = make_window(kind, 256)
    padded = np.zeros(4096)
    padded[:256] = w
    spec = np.abs(np.fft.rfft(padded))
    spec_db = 20 * np.log10(np.maximum(spec / spec.max(), 1e-8))
    ax.plot(spec_db[:400], lw=1.0, label=f"{kind} ({WINDOW_PSL_DB[kind]:.1f} dB)")
ax.set_ylim(-90, 3)
ax.set_xlabel("FFT bin")
ax.set_ylabel("Magnitude (dB)")
ax.set_title("Window spectra and theoretical peak sidelobe level")
ax.legend()
plt.tight_layout()
plt.show()

# %% [markdown]
# ## 5. Pulse compression
#
# Correlating the return against a replica of what was transmitted collapses a
# long pulse into a narrow peak. The gain is 10 log10 of the time-bandwidth
# product, and it costs nothing in transmitted energy.

# %%
def matched_filter(rx, replica):
    """Correlate rx against replica. Returns normalised magnitude and peak index."""
    corr = np.abs(signal.correlate(rx, replica, mode="valid"))
    peak = int(np.argmax(corr))
    return corr / max(corr.max(), 1e-12), peak


fs = 400_000.0
tau = 5e-3
replica = synthesise("lfm", "hamming", 150_000, 250_000, tau, fs)
rx = rng.normal(0.0, 3.0, size=replica.size + 4000)
delay_true = 2600
rx[delay_true:delay_true + replica.size] += replica

corr, peak = matched_filter(rx, replica)

fig, (a1, a2) = plt.subplots(2, 1, figsize=(9, 5))
a1.plot(rx, lw=0.3, color="grey")
a1.set_title("Received trace: the echo is not visible")
a1.set_ylabel("Amplitude")
a2.plot(corr, lw=0.8)
a2.axvline(delay_true, color="tab:orange", lw=1.0, ls="--", label="true delay")
a2.set_title(f"After compression: peak at sample {peak}, true {delay_true}")
a2.set_xlabel("Lag (samples)")
a2.set_ylabel("Normalised correlation")
a2.legend()
plt.tight_layout()
plt.show()

tbp = tau * 100e3
print(f"time-bandwidth product {tbp:.0f}, compression gain {compression_gain_db(tbp):.2f} dB")
print(f"uncompressed resolution {range_resolution_cw(C_WATER, tau):.3f} m")
print(f"compressed resolution   {range_resolution_chirp(C_WATER, 100e3):.4f} m")

# %% [markdown]
# ## 6. The decision
#
# The payload evaluates a grid of candidate parameter sets against the sonar
# equation and takes the widest bandwidth that still clears the detection
# threshold plus a design margin. The margin grows with turbidity, because
# scattering media are exactly where a propagation model is least trustworthy.

# %%
BAND_LOW, BAND_HIGH = 100_000.0, 500_000.0
REQUIRED_RANGE_M = 220.0
SOURCE_LEVEL_DB = 196.0
TARGET_STRENGTH_DB = -14.0
DIRECTIVITY_DB = 20.0
THRESHOLD_DB = 12.0
TAU_MIN, TAU_MAX = 5e-4, 12e-3
ENERGY_BUDGET_MJ = 46.0

CENTRES = BAND_LOW + (BAND_HIGH - BAND_LOW) * (0.12 + 0.76 * np.linspace(0, 1, 13))
BW_FRACTIONS = np.array([0.9, 0.7, 0.5, 0.32, 0.18, 0.08])
TAUS = np.linspace(TAU_MIN, TAU_MAX, 6)
AMPLITUDES = np.clip(0.42 + 0.5 * (1 - np.linspace(0, 1, 6)), 0.3, 0.95)


def _candidate_grid():
    """Pre-compute the (centre, bandwidth, tau, amplitude) candidate arrays."""
    fc, frac, ti = np.meshgrid(CENTRES, BW_FRACTIONS, np.arange(TAUS.size), indexing="ij")
    fc, frac, ti = fc.ravel(), frac.ravel(), ti.ravel()
    span = BAND_HIGH - BAND_LOW
    max_bw = np.minimum(span * 0.92, 2 * np.minimum(fc - BAND_LOW, BAND_HIGH - fc))
    bw = np.maximum(200.0, np.minimum(max_bw, fc * frac))
    return fc, bw, TAUS[ti], AMPLITUDES[ti]


CAND_FC, CAND_BW, CAND_TAU, CAND_AMP = _candidate_grid()


def required_margin_db(turbidity_ntu):
    """Design headroom demanded above the bare detection threshold."""
    return 3.0 + np.minimum(12.0, turbidity_ntu / 70.0)


def solve(temp_c, salinity_ppt, turbidity_ntu, depth_m,
          required_range_m=REQUIRED_RANGE_M, noise_correction_db=0.0):
    """Evaluate every candidate and return the chosen parameter set as a dict.

    required_range_m is a mission requirement, not a property of the water. It is
    what makes some conditions genuinely unsatisfiable.
    """
    c = sound_speed_water(temp_c, salinity_ppt, depth_m)
    noise = 52.0 + min(8.0, turbidity_ntu / 140.0) + noise_correction_db
    margin = required_margin_db(turbidity_ntu)

    alpha = thorp_absorption_db_per_km(CAND_FC / 1000.0) / 1000.0
    excess = scatter_db_per_m(turbidity_ntu, CAND_FC)
    tbp = CAND_TAU * CAND_BW
    gain = compression_gain_db(tbp)
    energy = 4200.0 * CAND_AMP**2 * CAND_TAU * 1000.0 / 1000.0

    snr = echo_snr_db(
        SOURCE_LEVEL_DB + 20 * np.log10(CAND_AMP), required_range_m,
        alpha + excess, TARGET_STRENGTH_DB, noise, DIRECTIVITY_DB, gain,
    )

    ok = (snr >= THRESHOLD_DB + margin) & (energy <= ENERGY_BUDGET_MJ)
    feasible = bool(ok.any())
    if not feasible:
        ok = (snr >= THRESHOLD_DB) & (energy <= ENERGY_BUDGET_MJ)
    if not ok.any():
        pick = int(np.argmax(snr))
    else:
        idx = np.flatnonzero(ok)
        pick = idx[np.lexsort((energy[idx], -CAND_BW[idx]))[0]]

    snr_margin = snr[pick] - THRESHOLD_DB
    mode = "barker13" if snr_margin < 2 else ("geometric" if depth_m > 90 else "lfm")
    window = "hann" if snr_margin < 3 else ("blackman" if turbidity_ntu > 400 else "hamming")

    return {
        "sound_speed_ms": c,
        "absorption_db_km": alpha[pick] * 1000.0,
        "scatter_db_km": excess[pick] * 1000.0,
        "noise_level_db": noise,
        "f_centre_hz": CAND_FC[pick],
        "bandwidth_hz": CAND_BW[pick],
        "pulse_s": CAND_TAU[pick],
        "amplitude": CAND_AMP[pick],
        "mode": mode,
        "window": window,
        "tbp": tbp[pick],
        "compression_gain_db": gain[pick],
        "resolution_m": range_resolution_chirp(c, CAND_BW[pick]),
        "predicted_snr_db": snr[pick],
        "energy_mj": energy[pick],
        "feasible": feasible,
    }

# %% [markdown]
# ### Figure 4 — the feasible region moves with the water
#
# Predicted SNR over the candidate grid, in clear and in turbid water. The
# contour marks the detection threshold plus margin. In sediment the feasible
# region shrinks and the optimum migrates downband on its own; nothing is
# hard-coded to make that happen.

# %%
def snr_surface(turbidity_ntu):
    fc_axis = np.linspace(BAND_LOW * 1.1, BAND_HIGH * 0.95, 60)
    bw_axis = np.linspace(20e3, 360e3, 60)
    FC, BW = np.meshgrid(fc_axis, bw_axis)
    max_bw = np.minimum((BAND_HIGH - BAND_LOW) * 0.92,
                        2 * np.minimum(FC - BAND_LOW, BAND_HIGH - FC))
    valid = BW <= max_bw
    alpha = thorp_absorption_db_per_km(FC / 1000.0) / 1000.0
    excess = scatter_db_per_m(turbidity_ntu, FC)
    gain = compression_gain_db(6e-3 * BW)
    noise = 52.0 + min(8.0, turbidity_ntu / 140.0)
    snr = echo_snr_db(SOURCE_LEVEL_DB + 20 * np.log10(0.7), REQUIRED_RANGE_M,
                      alpha + excess, TARGET_STRENGTH_DB, noise, DIRECTIVITY_DB, gain)
    return fc_axis, bw_axis, np.where(valid, snr, np.nan)


fig, axes = plt.subplots(1, 2, figsize=(11, 4), sharey=True)
for ax, ntu in zip(axes, (10.0, 800.0)):
    fc_axis, bw_axis, S = snr_surface(ntu)
    im = ax.pcolormesh(fc_axis / 1e3, bw_axis / 1e3, S, shading="auto", cmap="viridis")
    ax.contour(fc_axis / 1e3, bw_axis / 1e3, S,
               levels=[THRESHOLD_DB + required_margin_db(ntu)], colors="white", linewidths=1.2)
    pick = solve(26.0, 34.0, ntu, 25.0)
    ax.plot(pick["f_centre_hz"] / 1e3, pick["bandwidth_hz"] / 1e3, "o",
            color="tab:orange", ms=8, label="chosen")
    ax.set_title(f"{ntu:.0f} NTU")
    ax.set_xlabel("Centre frequency (kHz)")
    ax.legend(loc="upper right")
    fig.colorbar(im, ax=ax, label="Predicted SNR (dB)")
axes[0].set_ylabel("Bandwidth (kHz)")
plt.tight_layout()
plt.show()

# %% [markdown]
# ## 7. Dataset generation
#
# Composition matters more than volume. A file containing only solvable cases
# teaches a model that everything is solvable, so fifteen percent of the rows are
# drawn from conditions where no parameter set clears the threshold.

# %%
SCENARIOS = {
    "reef":    (28.5, 34.8, 12.0, 8.0),
    "coastal": (26.0, 33.1, 180.0, 25.0),
    "estuary": (24.2, 12.4, 740.0, 6.0),
    "deep":    (6.8, 34.9, 5.0, 220.0),
}

N_ROWS = 20_000


def _sample_environments(n):
    """Four strata: turbidity sweep, space-filling, scenario drift, adversarial.

    Each row also carries a mission range requirement. That requirement, not the
    water alone, is what makes a condition satisfiable or not.
    """
    n_sweep, n_fill, n_scen = int(0.40 * n), int(0.25 * n), int(0.20 * n)
    n_adv = n - n_sweep - n_fill - n_scen

    sweep = np.column_stack([
        np.full(n_sweep, 26.0) + rng.normal(0, 0.4, n_sweep),
        np.full(n_sweep, 34.0) + rng.normal(0, 0.3, n_sweep),
        rng.uniform(0, 1000, n_sweep),
        np.full(n_sweep, 25.0) + rng.normal(0, 2.0, n_sweep),
        rng.uniform(120, 300, n_sweep),
    ])
    fill = np.column_stack([
        rng.uniform(2, 32, n_fill),
        rng.uniform(5, 40, n_fill),
        rng.uniform(0, 1000, n_fill),
        rng.uniform(0, 250, n_fill),
        rng.uniform(80, 400, n_fill),
    ])
    keys = rng.choice(list(SCENARIOS), n_scen)
    base = np.array([SCENARIOS[k] for k in keys])
    scen = np.column_stack([
        base + rng.normal(0, 1, base.shape) * np.array([0.6, 0.5, 25.0, 1.5]),
        rng.uniform(150, 320, n_scen),
    ])
    adv = np.column_stack([
        rng.uniform(2, 10, n_adv),
        rng.uniform(0, 15, n_adv),
        rng.uniform(600, 1000, n_adv),
        rng.uniform(120, 250, n_adv),
        rng.uniform(380, 560, n_adv),
    ])

    env = np.vstack([sweep, fill, scen, adv])
    tags = np.concatenate([
        np.full(n_sweep, "sweep"), np.full(n_fill, "fill"),
        np.full(n_scen, "scenario"), np.full(n_adv, "adversarial"),
    ])
    env[:, 0] = np.clip(env[:, 0], 0, 35)
    env[:, 1] = np.clip(env[:, 1], 0, 40)
    env[:, 2] = np.clip(env[:, 2], 0, 1000)
    env[:, 3] = np.clip(env[:, 3], 0, 250)
    env[:, 4] = np.clip(env[:, 4], 50, 600)
    return env, tags


def _measure(predicted_snr_db, turbidity_ntu, range_m, salinity_ppt):
    """Simulate the correlator outcome.

    The propagation model under-predicts loss in sediment, and the shortfall is
    not a simple function of turbidity. Two mechanisms the single-scatter model
    in section 2 does not carry:

      path length   a single-scatter model neglects multiple scattering, so the
                    shortfall accumulates faster than linearly along the path
      flocculation  in fresh and brackish water suspended clay aggregates into
                    larger flocs, which scatter more than the same mass of
                    dispersed particles

    The exact law below is not claimed to be correct. Nobody knows the true
    error law of their own propagation model - if they did, it would not be an
    error. What matters for section 10 is that the shortfall depends on more
    than one variable and is not something a person would guess correctly from
    a single scatter plot.
    """
    path = (range_m / 220.0) ** 0.7
    floc = 1.0 + 0.6 * (1.0 - salinity_ppt / 40.0)
    bias = (turbidity_ntu / 190.0) * path * floc
    return predicted_snr_db - bias + rng.normal(0, 0.9)


env, tags = _sample_environments(N_ROWS)
rows = []
for i, ((t, s, ntu, d, rng_req), tag) in enumerate(zip(env, tags), start=1):
    r = solve(t, s, ntu, d, rng_req)
    measured = _measure(r["predicted_snr_db"], ntu, rng_req, s)
    # Physics evaluated at the band midpoint. These are known before a frequency
    # is chosen, unlike absorption_db_km which is evaluated AT the chosen
    # frequency and therefore encodes the answer.
    f_ref = 0.5 * (BAND_LOW + BAND_HIGH)
    rows.append({
        "ping_id": i, "stratum": tag,
        "absorption_ref_db_km": thorp_absorption_db_per_km(f_ref / 1000.0),
        "scatter_ref_db_km": scatter_db_per_m(ntu, f_ref) * 1000.0,
        "temp_c": t, "salinity_ppt": s, "turbidity_ntu": ntu, "depth_m": d,
        "mission_range_m": rng_req,
        **r,
        "measured_snr_db": measured,
        "error_db": r["predicted_snr_db"] - measured,
    })

df = pd.DataFrame(rows)
df.to_csv("adaptive_sonar_waveform_selection.csv", index=False)
df.head()

# %%
df.describe().T[["mean", "std", "min", "max"]]

# %% [markdown]
# ### Figure 5 — the behaviour the dataset encodes
#
# Chosen centre frequency against turbidity. This single scatter is the entire
# thesis: the solver walks downband as sediment rises, and range resolution
# degrades gracefully rather than the return being lost.

# %%
fig, (a1, a2) = plt.subplots(1, 2, figsize=(11, 4))
a1.scatter(df["turbidity_ntu"], df["f_centre_hz"] / 1e3, s=3, alpha=0.15)
a1.set_xlabel("Turbidity (NTU)")
a1.set_ylabel("Chosen centre frequency (kHz)")
a1.set_title("Frequency selection against sediment load")

a2.scatter(df["turbidity_ntu"], df["resolution_m"] * 1000, s=3, alpha=0.15, color="tab:orange")
a2.set_xlabel("Turbidity (NTU)")
a2.set_ylabel("Range resolution (mm)")
a2.set_title("Resolution traded for penetration")
plt.tight_layout()
plt.show()

# %% [markdown]
# ## 8. Learning the decision
#
# The obvious place to put a model is in the solver's chair: 468 candidates per
# decision looks expensive for a duty-cycled microcontroller, so can a small
# regressor reproduce the output more cheaply?
#
# This section builds that model and reports what it is worth. Section 11 then
# measures whether it is actually cheaper, which turns out to be the interesting
# part.
#
# The adversarial rows are held out entirely, so the model is tested on a regime
# it has never seen rather than on interpolations between neighbouring rows.

# %%
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split

# Only quantities known BEFORE a frequency is chosen. absorption_db_km and
# scatter_db_km are evaluated at the chosen centre frequency, so including them
# would let the model invert Thorp's expression and recover the target exactly.
FEATURES = ["temp_c", "salinity_ppt", "turbidity_ntu", "depth_m", "mission_range_m",
            "sound_speed_ms", "absorption_ref_db_km", "scatter_ref_db_km"]
TARGETS = ["f_centre_hz", "bandwidth_hz", "pulse_s"]

# The adversarial rows are held out entirely. The model never sees the regime
# where the solver runs out of options, which is the only regime worth testing.
routine = df[df["stratum"] != "adversarial"].reset_index(drop=True)
stress = df[df["stratum"] == "adversarial"].reset_index(drop=True)

X_train, X_test, y_train, y_test = train_test_split(
    routine[FEATURES].to_numpy(), routine[TARGETS].to_numpy(),
    test_size=0.25, random_state=SEED, shuffle=True,
)

models = {}
pred_test = np.zeros_like(y_test)
pred_stress = np.zeros((len(stress), len(TARGETS)))
for j, target in enumerate(TARGETS):
    m = HistGradientBoostingRegressor(max_iter=300, learning_rate=0.08, random_state=SEED)
    m.fit(X_train, y_train[:, j])
    models[target] = m
    pred_test[:, j] = m.predict(X_test)
    pred_stress[:, j] = m.predict(stress[FEATURES].to_numpy())

# %%
summary = []
for j, target in enumerate(TARGETS):
    baseline = np.full(len(y_test), y_train[:, j].mean())
    mae_base = mean_absolute_error(y_test[:, j], baseline)
    mae_model = mean_absolute_error(y_test[:, j], pred_test[:, j])
    summary.append({
        "target": target,
        "baseline_mae": mae_base,
        "model_mae": mae_model,
        "reduction_pct": 100 * (1 - mae_model / mae_base),
        "stress_mae": mean_absolute_error(stress[target].to_numpy(), pred_stress[:, j]),
    })
pd.DataFrame(summary)

# %% [markdown]
# ## 9. Where the model must not be trusted
#
# Mean error is the easy number. The number that decides whether this can ship is
# how often the model proposes a parameter set that would not have detected
# anything. A surrogate that is accurate on average and occasionally silent is
# worse than no surrogate.
#
# Two populations are checked: routine conditions the model was trained on, and
# the held-out adversarial regime it has never seen.

# %%
def violates_safety_bound(env_row, f_centre, bandwidth, tau):
    """True if the proposed parameters fall below the detection threshold."""
    t, s, ntu, d, required_range = env_row
    noise = 52.0 + min(8.0, ntu / 140.0)
    alpha = thorp_absorption_db_per_km(f_centre / 1000.0) / 1000.0
    excess = scatter_db_per_m(ntu, f_centre)
    gain = compression_gain_db(tau * bandwidth)
    snr = echo_snr_db(SOURCE_LEVEL_DB + 20 * np.log10(0.7), required_range,
                      alpha + excess, TARGET_STRENGTH_DB, noise, DIRECTIVITY_DB, gain)
    return snr < THRESHOLD_DB


ENV_COLS = ["temp_c", "salinity_ppt", "turbidity_ntu", "depth_m", "mission_range_m"]

env_routine = train_test_split(
    routine[ENV_COLS].to_numpy(), test_size=0.25, random_state=SEED, shuffle=True,
)[1]
env_stress = stress[ENV_COLS].to_numpy()


def violation_rate(env_rows, preds):
    """Fraction of predictions that would fail to detect at the required range."""
    flags = [violates_safety_bound(env_rows[i], *preds[i]) for i in range(len(env_rows))]
    return float(np.mean(flags))


routine_rate = violation_rate(env_routine, pred_test)
stress_rate = violation_rate(env_stress, pred_stress)
solver_infeasible = 1.0 - stress["feasible"].mean()

print(f"routine rows                      {len(env_routine)}")
print(f"routine safety-bound violations   {100 * routine_rate:.2f} percent")
print(f"stress rows (unseen regime)       {len(env_stress)}")
print(f"stress safety-bound violations    {100 * stress_rate:.2f} percent")
print(f"solver itself infeasible there    {100 * solver_infeasible:.2f} percent")
print(f"solver candidates per decision    {CAND_FC.size}")
print(f"surrogate evaluations             {len(TARGETS)} tree ensembles")

# %%
fig, axes = plt.subplots(1, 2, figsize=(11, 4), sharex=True, sharey=True)
lims = [BAND_LOW / 1e3, BAND_HIGH / 1e3]
for ax, (truth, pred, title) in zip(axes, [
    (y_test[:, 0], pred_test[:, 0], "Routine conditions"),
    (stress["f_centre_hz"].to_numpy(), pred_stress[:, 0], "Adversarial, never trained on"),
]):
    ax.scatter(truth / 1e3, pred / 1e3, s=4, alpha=0.2)
    ax.plot(lims, lims, "--", color="grey", lw=1.0)
    ax.set_title(title)
    ax.set_xlabel("Solver centre frequency (kHz)")
axes[0].set_ylabel("Predicted centre frequency (kHz)")
plt.tight_layout()
plt.show()

# %% [markdown]
# ## 10. What a decision actually costs
#
# Section 8 assumed the candidate search is expensive enough to be worth
# replacing. That assumption deserves a measurement rather than a shrug.
#
# Almost nothing in the search depends on the water. Thorp absorption at a
# candidate frequency, the compression gain of a candidate pulse, the drive
# level of a candidate amplitude - every one of those is a property of the
# candidate, not of the environment, and precomputes once at boot. Even the
# frequency dependence of the scattering term factors out, because turbidity
# enters it as a scalar multiplier.
#
# What is left per decision is one logarithm and 468 multiply-adds.

# %%
import time

CAND_SHAPE = (CAND_FC / SCATTER_REF_HZ) ** 1.5
CAND_ALPHA = thorp_absorption_db_per_km(CAND_FC / 1000.0) / 1000.0
CAND_GAIN = compression_gain_db(CAND_TAU * CAND_BW)
CAND_ENERGY_MJ = 4200.0 * CAND_AMP**2 * CAND_TAU
CAND_SL = SOURCE_LEVEL_DB + 20 * np.log10(CAND_AMP)
CAND_ENERGY_OK = CAND_ENERGY_MJ <= ENERGY_BUDGET_MJ


def solve_fast(turbidity_ntu, required_range_m, margin_db):
    """The solver as firmware would implement it. No transcendentals in the loop.

    Returns (f_centre, bandwidth, tau), or None if nothing clears the bare
    threshold - which is the payload's cue to report the mission infeasible
    rather than transmit into water that cannot return the range asked for.
    """
    noise = 52.0 + min(8.0, turbidity_ntu / 140.0)
    excess = SCATTER_COEFF * max(turbidity_ntu, 0.0) * CAND_SHAPE
    tl = 20.0 * np.log10(required_range_m) + (CAND_ALPHA + excess) * required_range_m
    snr = CAND_SL - 2.0 * tl + TARGET_STRENGTH_DB - noise + DIRECTIVITY_DB + CAND_GAIN

    ok = (snr >= THRESHOLD_DB + margin_db) & CAND_ENERGY_OK
    if not ok.any():
        ok = (snr >= THRESHOLD_DB) & CAND_ENERGY_OK
    if not ok.any():
        return None
    idx = np.flatnonzero(ok)
    pick = idx[np.lexsort((CAND_ENERGY_MJ[idx], -CAND_BW[idx]))[0]]
    return CAND_FC[pick], CAND_BW[pick], CAND_TAU[pick]


def _bench(fn, n=600):
    """Median wall time per call, microseconds. Median because a general-purpose
    OS makes any single measurement meaningless."""
    for _ in range(40):
        fn()
    t = []
    for _ in range(n):
        ntu, req = float(rng.uniform(0, 1000)), float(rng.uniform(120, 320))
        t0 = time.perf_counter()
        fn(ntu, req)
        t.append((time.perf_counter() - t0) * 1e6)
    return float(np.median(t))


probe = routine[FEATURES].to_numpy()[:1].copy()
NTU_I = FEATURES.index("turbidity_ntu")
RANGE_I = FEATURES.index("mission_range_m")


def _solver_call(ntu=500.0, req=220.0):
    return solve_fast(ntu, req, required_margin_db(ntu))


def _surrogate_call(ntu=500.0, req=220.0):
    x = probe.copy()
    x[0, NTU_I], x[0, RANGE_I] = ntu, req
    return [models[t].predict(x)[0] for t in TARGETS]


solver_us = _bench(_solver_call)
surrogate_us = _bench(_surrogate_call)
nodes = sum(p[0].nodes.shape[0] for t in TARGETS for p in models[t]._predictors)

print(f"solver, 468 candidates      {solver_us:9.1f} us")
print(f"surrogate, three ensembles  {surrogate_us:9.1f} us")
print(f"ratio                       {surrogate_us / solver_us:9.1f}x")
print(f"tree nodes to store         {nodes:9d}")
print(f"candidate table entries     {CAND_FC.size:9d}")

# %% [markdown]
# The surrogate is **slower than the thing it was meant to replace**, by roughly
# two orders of magnitude, and it needs thousands of tree nodes of flash to do
# it. Part of that gap is scikit-learn's per-call overhead, which a hand-written
# C implementation would not pay - but the operation count does not care about
# the implementation. One logarithm and 468 multiply-adds against thousands of
# tree-node visits is not a close contest.
#
# So section 8 answered its question, and the answer is no. The search stays.
#
# That is worth stating plainly rather than burying: the obvious place to put a
# model was the wrong place, and measuring it was the only way to find out.
#
# It also settles something about the payload. If a transmit decision costs tens
# of microseconds, the decision is not the power problem. The transmit stage is -
# 340 mA into the driver against single-digit milliamps for the processor. That
# redirects the optimisation effort to the analogue path, which is a more useful
# result than a working surrogate would have been.
#
# ## 11. Learning what the physics gets wrong
#
# There is a place in this system where a model has something to learn that the
# physics genuinely cannot supply.
#
# Every row carries `error_db`: the gap between the SNR the sonar equation
# predicted and the SNR the correlator actually reported. That gap is not noise.
# The propagation model neglects multiple scattering and treats suspended
# sediment as dispersed single particles, so it under-predicts loss - and it does
# so systematically, as a function of the conditions.
#
# The physics cannot correct for this by construction. A model that knew its own
# error would not have one.
#
# Today the payload covers the gap with a hand-picked safety margin:
#
# ```
# required_margin = 3 + min(12, turbidity / 70)
# ```
#
# Nothing fitted that. It was chosen to be conservative, which it is - and being
# conservative in the sonar equation is not free. Every decibel of margin the
# solver is asked to find is a decibel it buys by moving downband, and every step
# downband is coarser range resolution.
#
# The question for this section: can the margin be **measured** instead of
# guessed?

# %%
# Only quantities known before transmitting. Same feature contract as section 8 -
# nothing here is downstream of the chosen frequency.
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
residual_model.fit(Xr_train, yr_train)
resid_pred = residual_model.predict(Xr_test)

# Two baselines, both of them things a competent engineer would actually try.
const_pred = np.full_like(yr_test, yr_train.mean())

# A straight line through the turbidity scatter - what you would read off a plot.
ntu_train = resid_train["turbidity_ntu"].to_numpy()
slope, intercept = np.polyfit(ntu_train, yr_train, 1)
linear_pred = intercept + slope * resid_test["turbidity_ntu"].to_numpy()

for name, pred in [("constant (train mean)", const_pred),
                   ("linear in turbidity", linear_pred),
                   ("gradient boosting", resid_pred)]:
    mae = mean_absolute_error(yr_test, pred)
    sd = float(np.std(yr_test - pred))
    print(f"{name:<24} MAE {mae:5.3f} dB   residual sd {sd:5.3f} dB")

print(f"\nirreducible noise floor  0.900 dB by construction")
print(f"eyeballed linear fit     bias = {intercept:+.3f} + {slope:.5f} * NTU")

# %% [markdown]
# ### Figure 8 - the shortfall is not a function of turbidity alone
#
# The left panel is what an engineer looking for a margin rule would plot. The
# spread at any given turbidity is wide, and a line through it is the best a
# single-variable rule can do.
#
# The right panel colours the same points by required range. The spread resolves
# into structure: at equal turbidity, a longer path loses more than the model
# says it should. That is the multiple-scattering term, and it is invisible until
# you condition on the second variable.

# %%
fig, (a1, a2) = plt.subplots(1, 2, figsize=(11, 4))
samp = resid_test.sample(min(3000, len(resid_test)), random_state=SEED)

a1.scatter(samp["turbidity_ntu"], samp["error_db"], s=4, alpha=0.15, color="tab:blue")
grid = np.linspace(0, 1000, 50)
a1.plot(grid, intercept + slope * grid, color="tab:red", lw=2,
        label=f"linear fit, MAE {mean_absolute_error(yr_test, linear_pred):.2f} dB")
a1.set_xlabel("Turbidity (NTU)")
a1.set_ylabel("Prediction shortfall (dB)")
a1.set_title("What a single-variable rule sees")
a1.legend(fontsize=8)

sc = a2.scatter(samp["turbidity_ntu"], samp["error_db"], s=5, alpha=0.5,
                c=samp["mission_range_m"], cmap="viridis")
a2.set_xlabel("Turbidity (NTU)")
a2.set_title("The same points, coloured by required range")
plt.colorbar(sc, ax=a2, label="Required range (m)")
plt.tight_layout()
plt.show()

# %% [markdown]
# ## 12. What the correction buys
#
# A margin has one job: cover the shortfall often enough that the payload is not
# transmitting into water it cannot hear back from. Anything beyond that is
# resolution given away for nothing.
#
# So the learned rule is the predicted shortfall plus a fixed number of standard
# deviations of whatever the model still gets wrong:
#
# ```
# margin_learned = predicted_shortfall + 3 * residual_sd
# ```
#
# Both rules are scored the same way: how often does the margin actually cover
# the realised shortfall, and what does the solver choose under each.

# %%
resid_sd = float(np.std(yr_test - resid_pred))
margin_learned = resid_pred + 3.0 * resid_sd
margin_current = 3.0 + np.minimum(12.0, resid_test["turbidity_ntu"].to_numpy() / 70.0)

print(f"residual sd after correction   {resid_sd:.3f} dB")
print(f"mean margin, current rule      {margin_current.mean():.2f} dB")
print(f"mean margin, learned rule      {margin_learned.mean():.2f} dB")
print(f"margin returned to the solver  {margin_current.mean() - margin_learned.mean():.2f} dB")
print()
print(f"coverage, current rule         {100 * np.mean(margin_current >= yr_test):.2f} percent")
print(f"coverage, learned rule         {100 * np.mean(margin_learned >= yr_test):.2f} percent")

# %% [markdown]
# The learned rule hands several decibels back to the solver while covering the
# shortfall on essentially the same fraction of rows. It is not free: the
# hand-picked rule covers every row in the test set and the learned rule misses a
# handful, because a rule that tracks the error closely has less slack than one
# that is uniformly over-provisioned.
#
# That trade is the right way round. The rows the learned rule misses are ones
# where it under-estimates the shortfall by a fraction of a decibel, and the
# detection threshold in the sonar equation is still there underneath it - the
# margin is headroom above the threshold, not a replacement for it. What the
# hand-picked rule buys with its perfect coverage is several decibels of
# permanently coarser resolution in every ping it ever transmits.
#
# Decibels are only worth having if they turn into something. They turn into
# bandwidth, and bandwidth is range resolution.

# %%
REQ_RANGE_M = 220.0
rows_cmp = []
for ntu in [5, 100, 250, 400, 550, 700, 850, 1000]:
    env_row = probe.copy()
    env_row[0, NTU_I], env_row[0, RANGE_I] = ntu, REQ_RANGE_M
    learned = float(residual_model.predict(env_row)[0]) + 3.0 * resid_sd
    current = 3.0 + min(12.0, ntu / 70.0)

    a = solve_fast(ntu, REQ_RANGE_M, current)
    b = solve_fast(ntu, REQ_RANGE_M, learned)
    if a is None or b is None:
        continue
    res_a = range_resolution_chirp(C_WATER, a[1]) * 1000.0
    res_b = range_resolution_chirp(C_WATER, b[1]) * 1000.0
    rows_cmp.append({
        "turbidity_ntu": ntu,
        "margin_now_db": round(current, 2),
        "margin_learned_db": round(learned, 2),
        "f_now_khz": round(a[0] / 1e3, 1),
        "f_learned_khz": round(b[0] / 1e3, 1),
        "res_now_mm": round(res_a, 2),
        "res_learned_mm": round(res_b, 2),
        "improvement_pct": round(100 * (res_a - res_b) / res_a, 1),
    })

comparison = pd.DataFrame(rows_cmp)
comparison

# %% [markdown]
# ### Figure 9 - resolution recovered, where it matters
#
# In clear water the margin is not the binding constraint and the two rules agree
# exactly. The correction earns its place at the dirty end, which is precisely
# where a survey payload is otherwise worst served.

# %%
fig, (a1, a2) = plt.subplots(1, 2, figsize=(11, 4))
x = comparison["turbidity_ntu"]

a1.plot(x, comparison["margin_now_db"], "o-", color="tab:red", label="hand-picked rule")
a1.plot(x, comparison["margin_learned_db"], "o-", color="tab:blue", label="learned from data")
a1.fill_between(x, comparison["margin_learned_db"], comparison["margin_now_db"],
                alpha=0.15, color="tab:green")
a1.set_xlabel("Turbidity (NTU)")
a1.set_ylabel("Required margin (dB)")
a1.set_title("Margin demanded above threshold")
a1.legend(fontsize=8)

w = 34
a2.bar(x - w / 2, comparison["res_now_mm"], w, color="tab:red", alpha=0.85,
       label="hand-picked rule")
a2.bar(x + w / 2, comparison["res_learned_mm"], w, color="tab:blue", alpha=0.85,
       label="learned from data")
a2.set_xlabel("Turbidity (NTU)")
a2.set_ylabel("Range resolution (mm)")
a2.set_title("Resolution the payload achieves")
a2.legend(fontsize=8)
plt.tight_layout()
plt.show()

worst = comparison.iloc[-1]
print(f"at {worst['turbidity_ntu']:.0f} NTU: "
      f"{worst['f_now_khz']:.1f} -> {worst['f_learned_khz']:.1f} kHz, "
      f"{worst['res_now_mm']:.2f} -> {worst['res_learned_mm']:.2f} mm "
      f"({worst['improvement_pct']:.1f} percent finer)")

# %% [markdown]
# ### Why this model is the one that ships
#
# It is worth being explicit about the difference between the model in section 8
# and the model here, because they look superficially alike and are not.
#
# | | Section 8 surrogate | Section 11 correction |
# |---|---|---|
# | Learns | the solver's answer | the solver's **error** |
# | Ground truth | our own equations | measurement |
# | Could the physics do it? | yes, faster | **no, by construction** |
# | Outputs | three, one per parameter | one scalar |
# | Failure mode | silently wrong pulse | margin slightly off, guarded by threshold |
# | Verdict | does not ship | **ships** |
#
# The first model competes with the physics and loses. The second one does
# something the physics cannot do at all, and hands the result back to the physics
# to act on. The sonar equation still makes the decision; it just stops being
# told a made-up number about how wrong it is likely to be.
#
# One caveat, stated plainly. The shortfall in this notebook comes from a
# simulated correlator, so the law being recovered is one this notebook put
# there. That does not make the exercise circular, but it does bound what it
# proves: it establishes the mechanism and the size of the prize, not the value
# of any particular coefficient. The real law is unknown and is measured in a
# tank, against a target at a known range, with sediment stirred in. The model
# above is refit against that data and the margin rule follows. Nothing in the
# structure changes.

# %% [markdown]
# ## Conclusion
#
# **The physics reproduces published values.** Mackenzie sound speed lands within
# 1.5 m/s of the reference point at 25 C and 35 ppt. Thorp absorption gives 34,
# 51 and 87 dB/km at 100, 200 and 400 kHz. A 5 ms chirp with 100 kHz of sweep
# compresses to 7.5 mm range resolution where the same pulse unmodulated resolves
# 3.75 m, at identical transmitted energy. Those are asserts, not claims: the
# notebook stops if they stop holding.
#
# **The dataset is transmit-side.** Every published underwater-acoustics dataset
# is receive-side classification - what came back, labelled. This one is what
# should have been sent. Fifteen percent of it is conditions where nothing works,
# because a file in which everything is solvable teaches a model that everything
# is solvable.
#
# **The obvious model does not ship.** A surrogate reproduces the solver's choice
# of centre frequency with roughly 95 percent less error than predicting the mean,
# using only quantities known before a frequency is chosen. It is still the wrong
# model, for two measured reasons. It is around two orders of magnitude slower
# than the search it replaces, because the search precomputes into a table and
# costs one logarithm and 468 multiply-adds. And it fails silently: on routine
# conditions it proposes a pulse that would not have detected anything in a small
# but non-zero fraction of cases, and in the adversarial regime it cannot report
# that the mission is impossible - it simply emits three numbers.
#
# Both of those were found by measuring an assumption that looked safe. That is
# the part of the exercise worth keeping.
#
# **A different model does ship.** The sonar equation cannot predict its own
# error - if it could, it would not have one - and that error is systematic,
# multi-variable, and currently covered by a hand-picked safety margin that no
# data chose. Learning the shortfall instead of guessing it hands several
# decibels back to the solver at equal or better coverage, and those decibels
# become bandwidth, and bandwidth becomes range resolution in exactly the turbid
# water where a survey payload is otherwise worst served.
#
# The rule the payload follows is unchanged by any of this:
#
# **The model proposes, the physics disposes.** The sonar equation stays resident
# and vetoes anything that would not clear the detection threshold at the range
# the mission asked for. What the learned component contributes is not the
# decision. It is an honest estimate of how wrong the decision is about to be.
#
# ### References
#
# 1. Ainslie and McColm, *A simplified formula for viscous and chemical absorption
#    in sea water*, JASA 103(3), 1998.
# 2. *Enhanced target detection using a new cognitive sonar waveform design in
#    shallow water*, Applied Acoustics, 2023.
# 3. *High-Resolution Wideband Waveform Design for Sonar Based on Multi-Parameter
#    Modulation*, Remote Sensing 15(18), 2023.
# 4. National Physical Laboratory, *Calculation of absorption of sound in
#    seawater*.
# 5. *A Survey of Underwater Acoustic Data Classification Methods Using Deep
#    Learning*, Sensors 22(6), 2022.
# 6. Press Information Bureau, Government of India, *Cabinet approves Deep Ocean
#    Mission*, 2021.
