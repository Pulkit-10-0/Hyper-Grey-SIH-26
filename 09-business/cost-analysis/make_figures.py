"""Regenerate cost-paper charts from the values in the 2026 market workbook."""

from pathlib import Path
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

out = Path(__file__).resolve().parent / "figures"
out.mkdir(exist_ok=True)
navy = "#17394B"
teal = "#176D79"
gold = "#C2862C"
mist = "#D7E6E9"
ink = "#26363C"
plt.rcParams.update({
    "font.family": "Times New Roman",
    "font.size": 10,
    "axes.labelcolor": ink,
    "text.color": ink,
    "axes.edgecolor": "#7F969B",
    "axes.spines.top": False,
    "axes.spines.right": False,
    "grid.color": "#E4EAEB",
    "grid.linewidth": 0.7,
    "savefig.facecolor": "white",
})


def save(fig, name):
    fig.savefig(out / name, dpi=300, bbox_inches="tight", pad_inches=0.16)
    plt.close(fig)


# Published 2025 global side-scan category: USD 47.25 million. FX is a scenario.
fx = np.array([90.0, 95.7245, 102.0])
tam = 47.25 * fx / 10
fig, ax = plt.subplots(figsize=(7.4, 2.65))
bars = ax.bar(["90.00", "95.7245\nworkbook", "102.00"], tam, color=[mist, teal, mist], width=0.58)
ax.set_ylabel("Global proxy (INR crore)")
ax.set_xlabel("INR per USD")
ax.set_ylim(0, 555)
ax.grid(axis="y")
ax.set_axisbelow(True)
for bar, value in zip(bars, tam):
    ax.text(bar.get_x() + bar.get_width() / 2, value + 10, f"{value:.2f}", ha="center", color=navy)
save(fig, "tam-fx.png")


segments = [
    ("MoES / NIOT research", 4.32),
    ("Defence and Coast Guard", 5.00),
    ("Ports and coastal", 8.10),
    ("Inland waters", 7.50),
    ("Universities and labs", 7.00),
]
labels, values = zip(*segments)
fig, ax = plt.subplots(figsize=(7.5, 3.5))
bars = ax.barh(labels[::-1], values[::-1], color=[navy, teal, gold, teal, navy][::-1], height=0.62)
ax.set_xlabel("Five-year serviceable value (INR crore)")
ax.set_xlim(0, 9.6)
ax.grid(axis="x")
ax.set_axisbelow(True)
for bar, value in zip(bars, values[::-1]):
    ax.text(value + 0.13, bar.get_y() + bar.get_height() / 2, f"{value:.2f}", va="center")
save(fig, "sam-segments.png")


years = ["Y1", "Y2", "Y3", "Y4", "Y5"]
annual = np.array([0.15, 0.48, 1.08, 1.90, 3.00])
cumulative = np.cumsum(annual)
fig, ax = plt.subplots(figsize=(7.4, 3.0))
bars = ax.bar(years, annual, color=teal, width=0.57, label="Annual revenue")
ax.set_ylabel("Annual revenue (INR crore)")
ax.set_ylim(0, 3.55)
ax.grid(axis="y")
ax.set_axisbelow(True)
for bar, value in zip(bars, annual):
    ax.text(bar.get_x() + bar.get_width() / 2, value + 0.055, f"{value:.2f}", ha="center")
ax2 = ax.twinx()
ax2.plot(years, cumulative, color=gold, marker="o", linewidth=2.3, label="Cumulative")
ax2.set_ylabel("Cumulative revenue (INR crore)")
ax2.set_ylim(0, 7.1)
ax2.spines["top"].set_visible(False)
ax.legend(loc="upper left", frameon=False)
ax2.legend(loc="upper center", frameon=False)
save(fig, "som-ramp.png")


components = [
    ("Electronics and PCB", 26148),
    ("Enclosure and seals", 18500),
    ("Transducers", 36000),
    ("Battery and power", 8500),
    ("Assembly and calibration", 17000),
    ("QA and warranty", 8000),
    ("Packaging and field kit", 3500),
]
components.sort(key=lambda item: item[1])
fig, ax = plt.subplots(figsize=(7.5, 3.65))
bars = ax.barh([x[0] for x in components], [x[1] for x in components], color=[mist, teal, navy, mist, gold, teal, navy])
ax.set_xlabel("Estimated cost (INR per unit)")
ax.set_xlim(0, 42000)
ax.grid(axis="x")
ax.set_axisbelow(True)
for bar, (_, value) in zip(bars, components):
    ax.text(value + 500, bar.get_y() + bar.get_height() / 2, f"{value:,}", va="center")
save(fig, "cogs.png")


cases = [
    ("Base", 195000, 117648),
    ("COGS +10%", 195000, 117648 * 1.10),
    ("Price -10%", 195000 * 0.90, 117648),
    ("Both shifts", 195000 * 0.90, 117648 * 1.10),
]
margins = [(price - cost) / price * 100 for _, price, cost in cases]
fig, ax = plt.subplots(figsize=(7.4, 2.95))
bars = ax.bar([x[0] for x in cases], margins, color=[teal, navy, gold, "#9B6D50"], width=0.62)
ax.set_ylabel("Gross margin (%)")
ax.set_ylim(0, 47)
ax.grid(axis="y")
ax.set_axisbelow(True)
for bar, value in zip(bars, margins):
    ax.text(bar.get_x() + bar.get_width() / 2, value + 0.9, f"{value:.1f}%", ha="center")
save(fig, "margin-sensitivity.png")
