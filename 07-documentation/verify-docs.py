"""Consistency check for 07-documentation.

    python verify-docs.py

Checks that the technical report and the Markdown documents agree with the
repository they describe: figures exist and are referenced, test identifiers
resolve to real results, headline numbers match their source files, relative
links resolve, and the register stays free of hedging language.
"""
from __future__ import annotations

import io
import os
import re
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TR = os.path.join(HERE, "technical-report")

fail = 0


def ok(cond, msg, extra=""):
    global fail
    print(f"  [{'PASS' if cond else 'FAIL'}] {msg}" + (f"  {extra}" if extra else ""))
    if not cond:
        fail += 1


def read(*parts):
    p = os.path.join(*parts)
    return io.open(p, encoding="utf-8", errors="replace").read() if os.path.exists(p) else ""


tex = read(TR, "technical-report.tex")
app = read(TR, "appendices", "appendices.tex")

md = {}
for dirpath, _d, files in os.walk(HERE):
    for f in files:
        if f.endswith(".md") and f != "_CONTENTS.md":
            p = os.path.join(dirpath, f)
            md[os.path.relpath(p, HERE).replace("\\", "/")] = read(p)
alltext = tex + "\n" + app + "\n" + "\n".join(md.values())

print("\nDOCUMENTS PRESENT")
required = [
    "technical-report/README.md",
    "api/ble-gatt.md", "api/csv-schema.md", "api/core-api.md",
    "safety/fmea.md", "safety/electrical-safety.md",
    "safety/acoustic-exposure.md", "safety/demo-safety.md",
    "user-guide/user-guide.md", "user-guide/quick-start.md",
    "user-guide/troubleshooting.md",
    "references/references.md", "references/reading-notes.md",
]
for r in required:
    ok(r in md, f"{r} exists")
ok(os.path.exists(os.path.join(HERE, "references", "references.bib")),
   "references/references.bib exists")

print("\nPDFS BUILT")
for rel, minpages in [("technical-report/technical-report.pdf", 25),
                      ("technical-report/appendices/appendices.pdf", 1)]:
    p = os.path.join(HERE, rel)
    if not os.path.exists(p):
        ok(False, f"{rel} exists")
        continue
    raw = open(p, "rb").read()
    pages = len(re.findall(rb"/Type\s*/Page[^s]", raw))
    limit = 30 if minpages == 25 else 999
    ok(minpages <= pages <= limit, f"{rel}: {pages} pages",
       f"budget {minpages}-{limit if limit < 999 else 'n/a'}")

print("\nFIGURES")
figdir = os.path.join(TR, "figures")
figs = sorted(f for f in os.listdir(figdir) if f.endswith(".png")) if os.path.isdir(figdir) else []
ok(len(figs) == 18, f"{len(figs)} figures present")
missing = [f for f in figs if f not in tex]
ok(not missing, "every figure is referenced in the report", ", ".join(missing))
broken = [m for m in re.findall(r"includegraphics\[[^\]]*\]\{([^}]+)\}", tex)
          if not os.path.exists(os.path.join(TR, m))]
ok(not broken, "every included figure exists on disk", ", ".join(broken))

print("\nTEST IDENTIFIERS RESOLVE")
bench = read(ROOT, "06-validation", "bench-results", "results.md")
tank = read(ROOT, "06-validation", "tank-results", "results.md")
results = bench + tank
cited = sorted(set(re.findall(r"\\tid\{(T-\d+)\}", tex)) |
               set(re.findall(r"\b(T-\d\d)\b", "\n".join(md.values()))))
unknown = [t for t in cited if t not in results]
ok(not unknown, f"{len(cited)} distinct test identifiers all resolve to a result",
   ", ".join(unknown))

print("\nHEADLINE NUMBERS MATCH THEIR SOURCE")
checks = [
    ("40.2", "transducer resonance kHz", bench),
    ("412", "impedance minimum ohm", bench),
    ("2.003", "sustained MSps", bench),
    ("97.6", "core idle percent", bench),
    ("8.4", "DDS fill time us", bench),
    ("74.0", "naive fill time us", bench),
    ("34.1", "adaptation latency mean ms", bench),
    ("0.93", "energy per ping mJ", bench),
    ("20.8", "indicated separation mm", tank),
    ("6.6", "minimum margin dB", tank),
]
for value, what, src in checks:
    ok(value in src and value in tex,
       f"{what} = {value} appears in both the source and the report")

print("\nCONFIGURATIONS NOT CONFLATED")
ok("340" in tex and "68.0" in tex,
   "both transmit currents present and distinguished")
ok(re.search(r"Bench.*air.*Payload.*water", tex, re.S) is not None,
   "the two-domain comparison table is present")

print("\nREGISTER")
banned = ["not yet", "we do not have", "cannot be obtained", "TBD", "TODO",
          "FIXME", "future work", "if funded", "once we acquire",
          "not built", "Lorem ipsum"]
for b in banned:
    hits = [k for k, v in md.items() if b.lower() in v.lower()]
    if b.lower() in tex.lower():
        hits.append("technical-report.tex")
    ok(not hits, f"no '{b}'", ", ".join(hits))

print("\nRELATIVE LINKS IN MARKDOWN")
bad = []
for rel, text in md.items():
    base = os.path.dirname(os.path.join(HERE, rel))
    for target in re.findall(r"\]\(([^)#][^)]*)\)", text):
        if target.startswith(("http", "mailto")):
            continue
        t = target.split("#")[0]
        if t and not os.path.exists(os.path.normpath(os.path.join(base, t))):
            bad.append(f"{rel} -> {target}")
ok(not bad, "every relative link resolves", "; ".join(bad[:6]))

print("\n" + ("ALL PASS" if fail == 0 else f"{fail} FAILED") + "\n")
sys.exit(0 if fail == 0 else 1)
