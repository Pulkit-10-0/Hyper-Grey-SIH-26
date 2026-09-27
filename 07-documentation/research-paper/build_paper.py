"""Build the editable two-column manuscript from the project technical report."""

from pathlib import Path
import re

here = Path(__file__).resolve().parent
repo = here.parents[1]
report = (repo / "07-documentation/technical-report/technical-report.tex").read_text(encoding="utf-8")
preamble = (repo / "07-documentation/technical-report/preamble.tex").read_text(encoding="utf-8")

report = report.replace(
    r"\documentclass[11pt,a4paper]{article}",
    r"\documentclass[10pt,a4paper,twocolumn]{article}",
    1,
)
report, removed = re.subn(
    r"\\begin\{titlepage\}.*?\\end\{titlepage\}",
    "",
    report,
    count=1,
    flags=re.DOTALL,
)
if removed != 1:
    raise RuntimeError("Original title page was not found")
report = report.replace("\\tableofcontents\n\\newpage", "", 1)
report = report.replace(
    r"\section{Abstract and problem statement}",
    r"\section{Introduction and problem statement}",
    1,
)
report = report.replace(
    r"\subsection{Headline results}",
    r"\subsection{Finished-configuration projections}",
    1,
)
report = report.replace(
    r"\section{Validation results}",
    r"\section{Projected validation results}",
    1,
)
report = report.replace(r"\begin{thebibliography}{9}", r"\begin{thebibliography}{99}", 1)

title = r"""
\twocolumn[{
\begin{minipage}{\textwidth}
\vspace*{1mm}
{\color{ocean}\rule{\textwidth}{1.1pt}}\par\vspace{3mm}
{\fontsize{18}{21}\selectfont\bfseries Physics-Constrained Adaptive Sonar Waveform Selection and Low-Power Transmit Architecture for Autonomous Underwater Vehicles\par}
\vspace{2mm}
{\large\color{ocean}SeaNergy | Smart India Hackathon 2026 | Problem Statement 26058\par}
\vspace{3mm}
\noindent\textbf{Abstract.} An autonomous underwater vehicle crossing clear and sediment-laden water cannot use one transmit waveform without sacrificing detection margin, range resolution or energy. This manuscript develops a physics-constrained selector that maximizes feasible bandwidth subject to an active-sonar link budget, transducer band, energy limit and explicit infeasibility state. Direct digital synthesis and timer-driven DMA supply a low-occupancy implementation path. A reproducible 20,000-case generated study tests the candidate solver, a direct surrogate and a learned prediction-residual correction. The 100--500 kHz numerical study and 24--80 kHz hardware-oriented study are distinct. Team-reported bench intervals are 1.25--1.49 ms from sensor reading to waveform start and 50.0--50.9 dBc spurious-free dynamic range; a 4.33--4.65 mJ budget exceeded by 48.0--48.9 percent implies 6.41--6.92 mJ per ping in that configuration. Separately, final-configuration engineering projections include 2.003 MSps streaming, 19.8 dB pulse-compression gain, and an 80-to-32 kHz downband move under increased sediment. Derivations, evidence classes, limitations, and a route to calibrated field performance are supplied throughout.\par
\vspace{2mm}
\noindent\textbf{Keywords:} adaptive sonar; AUV; waveform selection; pulse compression; DDS; DMA; sediment scattering; low-power embedded sensing.\par
\vspace{2mm}{\color{ocean}\rule{\textwidth}{0.4pt}}
\end{minipage}\vspace{5mm}
}]
"""
report = report.replace(r"\begin{document}", r"\begin{document}" + title, 1)

recent = r"""
\subsection{Research position and recent work}
This paper studies the transmit decision and its implementation, not a full survey imager. Acoustic return quality also depends on the receiving chain, beam pattern, trajectory, target and seafloor. Optical turbidity is a proxy for suspended particles, not a universal acoustic-loss coefficient. Haalboom et al. used optical and acoustic sensors together to observe a sediment plume and identified particle aggregation as an important uncertainty \cite{haalboom2022}. Fonseca et al. demonstrated a frequency-dependent seafloor backscatter model across a wide measurement band and showed the value of interpretable physical parameters \cite{fonseca2025}. A recent simulation-based adaptive sonar study further motivates explicit evidence labelling when discussing energy and accuracy \cite{reddy2026}. The contribution here is a constrained selection method, an embedded transmit path and a reproducible failure analysis rather than an assumption that a learned waveform is automatically safe.
"""
report = report.replace(
    r"\subsection{What the problem statement asks for}",
    recent + "\n" + r"\subsection{What the problem statement asks for}",
    1,
)

bench = r"""
\subsection{Team-reported bench intervals and provenance}
Results in the sixteen-test validation dossier are engineering projections for a finished configuration. They are not silently promoted to physical measurements in this paper. Separately, a team member supplied bounded observations from a bench run: sensor-reading-to-waveform-start latency of 1.25--1.49 ms, spurious-free dynamic range of 50.0--50.9 dBc against a 55 dBc design target, and complete-ping consumption 48.0--48.9 percent above a 4.33--4.65 mJ per-ping budget. Interval arithmetic gives an implied 6.41--6.92 mJ per ping for that run. Reaching the same energy budget at unchanged task conditions would require approximately 32.4--32.8 percent less energy than reported consumption. These are team-reported intervals and a derived range, not point measurements.

The latency boundary excludes echo travel and the full ping-to-ping cycle. The 4.1--5.0 dB SFDR shortfall and energy overrun identify analog and power work. Projections elsewhere have different hardware assumptions and must not be averaged with this bench case. Reproducible dataset and software numbers are a third category. Evidence classes used below are: \textbf{R}, regenerated from committed code or data; \textbf{T}, team-reported bench interval; and \textbf{P}, final-configuration projection.

\begin{figure}[t]
\centering
\includegraphics[width=0.80\linewidth]{figures/pcb.png}
\caption{Revision-B PCB layout and connector arrangement from the project KiCad files. This view establishes geometry; electrical and acoustic performance require their own evidence.}
\label{fig:pcbpaper}
\end{figure}
"""
report = report.replace(
    r"\section{Background: why a fixed ping is wrong}",
    bench + "\n" + r"\section{Background: why a fixed ping is wrong}",
    1,
)
report = re.sub(
    r"\\begin\{(table|figure)\}\[[^\]]*\]",
    lambda m: r"\begin{" + m.group(1) + r"*}[t]",
    report,
)
report = report.replace(r"\end{table}", r"\end{table*}")
report = report.replace(r"\end{figure}", r"\end{figure*}")

refs = r"""
\bibitem{haalboom2022}
S. Haalboom et al., Monitoring of Anthropogenic Sediment Plumes in the Clarion-Clipperton Zone, NE Equatorial Pacific Ocean, \textit{Frontiers in Marine Science}, vol. 9, 882155, 2022. doi:10.3389/fmars.2022.882155.
\bibitem{fonseca2025}
L. Fonseca, X. Lurton, R. Fezzani and M. Roche, A simplified semi-empirical model for multifrequency seafloor backscattering angular response, \textit{Frontiers in Remote Sensing}, vol. 6, 1619218, 2025. doi:10.3389/frsen.2025.1619218.
\bibitem{reddy2026}
C. K. K. Reddy et al., BEML-sonar: a bio-inspired echolocation and machine learning-enhanced SONAR, \textit{Scientific Reports}, vol. 16, 27099, 2026. doi:10.1038/s41598-026-56574-7. Results are simulation based.
"""
report = report.replace(r"\end{thebibliography}", refs + "\n" + r"\end{thebibliography}", 1)

preamble = preamble.replace(
    r"\usepackage[a4paper,margin=24mm,top=26mm,bottom=26mm]{geometry}",
    r"\usepackage[a4paper,top=19mm,bottom=20mm,left=18mm,right=18mm]{geometry}",
    1,
)
preamble = preamble.replace(r"\usepackage[T1]{fontenc}" + "\n", "")
preamble = preamble.replace(r"\usepackage[utf8]{inputenc}" + "\n", "")
preamble = preamble.replace(
    r"\usepackage{lmodern}",
    r"\usepackage{fontspec}" + "\n" + r"\setmainfont{Times New Roman}",
)
preamble += "\n" + r"\setlength{\columnsep}{6mm}" + "\n" + r"\raggedbottom" + "\n"

(here / "SeaNergy_Adaptive_Sonar_Research_Paper.tex").write_text(report, encoding="utf-8")
(here / "preamble.tex").write_text(preamble, encoding="utf-8")
