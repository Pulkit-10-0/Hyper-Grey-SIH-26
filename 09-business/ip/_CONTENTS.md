# ip

## Purpose
Ownership, licensing and prior art. Short, but its absence is noticed.

## Files that must exist
- `licence.md` — the licence chosen for code, hardware and data, and why
- `prior-art.md` — what exists, and what is genuinely different here
- `attribution.md` — every third-party library, dataset and figure, with licence
- `disclosure.md` — anything published, and when

## What `prior-art.md` must establish
Adaptive and cognitive sonar waveform design is an existing research field.
Say so. Then state precisely what is novel about this submission: a low-cost
embedded implementation with an on-device solver, a published transmit-side
dataset, and a learned surrogate with a measured safety bound.

## Rules
- Do not claim novelty for the sonar equation, LFM chirps, Barker codes or
  pulse compression. All are decades old.
- Do claim the integration, the cost point, and the dataset.
- Every dependency licence checked for compatibility with the chosen licence.

## Acceptance
An examiner reading this cannot find an overclaim. Overclaiming novelty against
a well-known technique is the fastest way to lose credibility with a technical
panel.
