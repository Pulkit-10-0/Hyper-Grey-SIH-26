"""QA for 05-models.

    python qa.py

Checks that every number quoted in the markdown here matches the generated
metrics, that all eleven figures exist and are referenced, that every relative
link resolves on disk, and that no placeholder text survived.

A document that quotes a number nothing produced is the failure mode this
guards against. Run it after `notebook/run_local.py` or `evaluation/evaluate.py`,
and before committing.
"""
import io, json, os, re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.abspath(__file__))
fail = 0


def ok(cond, msg, extra=""):
    global fail
    print(f"  [{'PASS' if cond else 'FAIL'}] {msg}" + (f"  {extra}" if extra else ""))
    if not cond:
        fail += 1


ev = json.load(io.open(os.path.join(ROOT, "evaluation", "metrics.json"), encoding="utf-8"))
nb = json.load(io.open(os.path.join(ROOT, "notebook", "run-metrics.json"), encoding="utf-8"))

docs = {}
for dirpath, _dirs, files in os.walk(ROOT):
    for f in files:
        if f.endswith(".md"):
            p = os.path.join(dirpath, f)
            docs[os.path.relpath(p, ROOT)] = io.open(p, encoding="utf-8").read()

alltext = "\n".join(docs.values())

print("\nDOCUMENTS")
ok(len(docs) >= 9, f"{len(docs)} markdown documents present",
   ", ".join(sorted(docs)))

print("\nDATASET FACTS MATCH THE GENERATED FILE")
ok(nb["rows"] == 20000 and nb["cols"] == 27, "20,000 x 27")
ok(nb["csv_reproduces_published"], "CSV reproduces published byte-for-byte")
# Derive rather than hardcode: the hash changes whenever the generator changes,
# and the check that matters is that the documentation carries the current one.
ok(nb["csv_sha256"] in alltext,
   "the current sha256 appears in the documentation", nb["csv_sha256"][:16] + "...")
stale = re.findall(r"[0-9a-f]{64}", alltext)
ok(all(h == nb["csv_sha256"] for h in stale),
   "no stale sha256 left in any document",
   ", ".join(sorted({h[:16] for h in stale if h != nb["csv_sha256"]})))
ok(abs(nb["feasible_overall_pct"] - 77.0) < 0.005, "feasible overall 77.00 %",
   str(nb["feasible_overall_pct"]))
ok(nb["feasible_by_stratum_pct"]["adversarial"] == 0.0,
   "adversarial stratum feasible 0.00 %")
ok(nb["candidates_per_decision"] == 468, "468 candidates per decision")

print("\nACCURACY NUMBERS QUOTED CORRECTLY")
by = {a["target"]: a for a in ev["accuracy"]}
checks = [
    ("f_centre_hz", "69,567", by["f_centre_hz"]["baseline_mae"], 69567),
    ("f_centre_hz", "3,584", by["f_centre_hz"]["model_mae"], 3584),
    ("bandwidth_hz", "61,298", by["bandwidth_hz"]["baseline_mae"], 61298),
    ("bandwidth_hz", "3,995", by["bandwidth_hz"]["model_mae"], 3995),
]
for tgt, printed, actual, want in checks:
    ok(abs(actual - want) < 1.0 and printed in alltext,
       f"{tgt} {printed} Hz quoted and matches", f"actual {actual:.1f}")
for tgt, pct in [("f_centre_hz", "94.8"), ("bandwidth_hz", "93.5"), ("pulse_s", "30.7")]:
    ok(abs(by[tgt]["reduction_pct"] - float(pct)) < 0.06 and f"{pct} %" in alltext,
       f"{tgt} reduction {pct} % quoted and matches",
       f"actual {by[tgt]['reduction_pct']:.2f}")

print("\nSAFETY NUMBERS QUOTED CORRECTLY")
s = ev["safety"]
ok(abs(s["routine_violation_pct"] - 2.35) < 0.005 and "2.35 %" in alltext,
   "routine violation 2.35 % quoted and matches", f"{s['routine_violation_pct']:.4f}")
ok(s["routine_violations"] == 100 and "100 of 4,250" in alltext,
   "100 of 4,250 violations")
ok(s["model_induced_violations"] == 13 and "13 of 4,250" in alltext,
   "13 model-induced violations quoted")
ok(abs(s["model_induced_violation_pct"] - 0.31) < 0.005 and "0.31 %" in alltext,
   "model-induced rate 0.31 % quoted and matches",
   f"{s['model_induced_violation_pct']:.4f}")
ok(s["rows_both_failed"] == 87 and "87" in alltext, "87 impossible-mission rows")
ok(s["rows_model_passed_but_solver_failed"] == 51 and "51" in alltext,
   "51 rows model passed / solver failed")
ok(s["solver_violations_on_same_rows"] == 138 and "138" in alltext,
   "138 solver violations on the same rows")
ok(s["stress_violation_pct"] == 100.0, "adversarial violation 100 %")
ok(s["rows_both_failed"] + s["model_induced_violations"] == s["routine_violations"],
   "87 + 13 = 100 violations accounted for",
   f"{s['rows_both_failed']} + {s['model_induced_violations']}")
ok(s["rows_both_failed"] + s["rows_model_passed_but_solver_failed"]
   == s["solver_violations_on_same_rows"], "87 + 51 = 138 solver violations")

print("\nLATENCY NUMBERS QUOTED CORRECTLY")
lat = ev["latency"]
ok(lat["solver_forms_agree"], "optimised solver agrees with the reference form")
ok(lat["total_tree_nodes"] == 19337 and "19,337" in alltext,
   "19,337 tree nodes quoted")
ok(lat["solver_faster_by"] > 100, "solver faster by more than 100x",
   f"{lat['solver_faster_by']:.0f}x")
ok("41.5" in alltext and "9.0 ms" in alltext,
   "41.5 us and 9.0 ms quoted in the docs")
ok(abs(lat["solver_precomputed"]["median_us"] - 41.5) < 8,
   "quoted 41.5 us is within run-to-run spread",
   f"latest {lat['solver_precomputed']['median_us']:.1f}")

print("\nPHYSICS SPOT CHECKS")
p = nb["physics_checks"]
ok(abs(p["thorp_db_per_km_at_100kHz"] - 34.07) < 0.01 and "34.07" in alltext,
   "Thorp 100 kHz = 34.07 dB/km")
ok(abs(p["thorp_db_per_km_at_200kHz"] - 51.02) < 0.01 and "51.02" in alltext,
   "Thorp 200 kHz = 51.02 dB/km")
ok(abs(p["thorp_db_per_km_at_400kHz"] - 87.01) < 0.01 and "87.01" in alltext,
   "Thorp 400 kHz = 87.01 dB/km")
ok(abs(p["sound_speed_25C_35ppt_0m"] - 1534.29) < 0.01 and "1534.29" in alltext,
   "sound speed 1534.29 m/s")

print("\nFIGURES PRESENT")
nbf = os.path.join(ROOT, "notebook", "figures")
evf = os.path.join(ROOT, "evaluation", "figures")
nbp = sorted(f for f in os.listdir(nbf) if f.endswith(".png"))
evp = sorted(f for f in os.listdir(evf) if f.endswith(".png"))
ok(len(nbp) == 9, "9 notebook figures", ", ".join(nbp))
ok(len(evp) == 5, "5 evaluation figures", ", ".join(evp))
for name in nbp + evp:
    ok(name in alltext, f"{name} referenced in the docs")

print("\nRELATIVE LINKS RESOLVE")
bad = []
for rel, text in docs.items():
    base = os.path.dirname(os.path.join(ROOT, rel))
    for target in re.findall(r"\]\(([^)#][^)]*)\)", text):
        if target.startswith("http"):
            continue
        if not os.path.exists(os.path.normpath(os.path.join(base, target))):
            bad.append(f"{rel} -> {target}")
ok(not bad, "every relative link resolves on disk", "; ".join(bad))

print("\nNO PLACEHOLDER TEXT")
for bad_word in ["TODO", "TBD", "FIXME", "XXX", "Lorem ipsum", "PLACEHOLDER"]:
    ok(bad_word not in alltext, f"no '{bad_word}'")

print("\n" + ("ALL PASS" if fail == 0 else f"{fail} FAILED") + "\n")
sys.exit(0 if fail == 0 else 1)
