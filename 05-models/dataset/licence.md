# licence

## The dataset

`adaptive_sonar_waveform_selection.csv` is released under the
**Creative Commons Attribution 4.0 International licence (CC BY 4.0)**.

<https://creativecommons.org/licenses/by/4.0/>

You may share and adapt it, including commercially, provided you give
attribution.

### Attribution line

```
Hyper Grey (2026). Adaptive Sonar Waveform Selection: an environment-to-waveform
decision dataset. CC BY 4.0.
```

BibTeX:

```bibtex
@misc{hypergrey2026sonar,
  author = {{Hyper Grey}},
  title  = {Adaptive Sonar Waveform Selection: an environment-to-waveform
            decision dataset},
  year   = {2026},
  note   = {20,000 rows. Generated from published acoustic physics, seed 20260829},
  howpublished = {Kaggle},
  license = {CC BY 4.0}
}
```

## The notebook and the code

`../notebook/notebook.py`, `../notebook/run_local.py` and
`../evaluation/evaluate.py` are released under the **MIT licence**, so the
generator can be reused without the attribution requirement propagating into
someone's source tree.

```
MIT License

Copyright (c) 2026 Hyper Grey

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## What is and is not being licensed

**This is a generated dataset, not observed data.** Every row is computed from
published acoustic relations. No proprietary measurement, no third-party survey
data, and no output from any instrument we do not own went into it. There is
nothing here we do not have the right to release.

The **relations themselves are not ours** and are not licensed by this file.
Mackenzie's sound-speed equation and Thorp's absorption expression are published
science, cited in the notebook and in `../../03-research/`. Implementing a
published equation creates a copyright interest in the implementation, not in
the equation. We claim the former and not the latter.

The sediment-scattering term is **our own engineering model**, calibrated so that
scattering roughly matches the medium's own absorption at the band reference
frequency and 800 NTU. It is not fitted to measured data and is not presented as
a published relation. It is documented as an engineering choice in
[generation.md](generation.md) and in the reality ledger on the dossier site.

## Fitness for use

Suitable for: method development, benchmarking waveform-selection approaches,
teaching the sonar equation, and reproducing this project's results.

**Not suitable for:** calibrating a real sonar, predicting the performance of
real hardware, or any navigational or safety-related purpose. The environment is
modelled and the correlator outcome is simulated. It is not measured data and
must never be cited as if it were.
