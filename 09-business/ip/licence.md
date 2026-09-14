# SeaNergy licensing plan

## 1. Distribution rule

Keep patent-sensitive firmware, solver implementation, training pipeline, calibration constants, PCB sources and mechanical drawings inside the team repository until the Indian provisional patent filing gate on 25 September 2026. Public releases after that gate must carry an explicit licence, copyright notice, third-party notices and a commit/tag that identifies the released version.

## 2. Recommended rights structure

| Asset | Protection route | Release position |
|---|---|---|
| Physics-constrained adaptive controller | Indian patent filing | Do not publish implementation detail before the filing gate |
| Fixed-point DDS, DMA scheduling and safety guard firmware | Patent claims plus copyright | Release binaries for demonstrations; source release only after the IP review |
| PCB, enclosure and transducer interface drawings | Patent/design assessment plus copyright | Share manufacturing files under controlled access |
| Curated transmit-side dataset | Copyright and database terms | Publish a frozen research subset after filing; retain calibration and field data privately |
| Learned surrogate, feature engineering and acceptance bounds | Patent assessment plus trade secret | Publish interface and measured limits; retain training recipe and tuning coefficients |
| Mobile application and website | Copyright | Apache-2.0 or proprietary release, selected before public distribution |
| SeaNergy name and device mark | Trade mark, Class 9; assess Class 42 | Use the TM symbol after clearance; use the registered symbol only after registration |

## 3. Third-party licence audit

Direct mobile dependencies inspected from package metadata are predominantly MIT. JetBrains Mono and Rajdhani font packages include MIT and OFL-1.1 terms. The website uses Astro, Lenis and Three.js under MIT; GSAP uses its published no-charge standard licence. Python scientific dependencies use permissive BSD/PSF-style licences. The inherited RNNoise tree carries a BSD-style notice in `COPYING`.

Before any public build, generate a complete transitive dependency notice from the lockfiles and retain each package's licence text. The release owner must specifically check font attribution, GSAP distribution terms, native React Native components, firmware library terms and any model or dataset licence.

## 4. Licence decision gate

Recommended product position: proprietary commercial product with published interfaces and a research dataset subset. This preserves deployment revenue and calibration know-how while still demonstrating reproducibility. If the team later adopts an open-core route, use Apache-2.0 for newly released software because its patent grant is clearer than a bare permissive licence.

## 5. Release checklist

1. Confirm the 25 September patent filing receipt and application number.
2. Freeze a tagged source snapshot and Software Bill of Materials.
3. Add project copyright notices and a top-level licence.
4. Add `THIRD_PARTY_NOTICES` with direct and transitive dependencies.
5. Remove credentials, supplier quotations, calibration constants and private field data.
6. Confirm all images, fonts, datasets and external code have redistribution permission.
7. Record the approver, release hash, date and public URL.

## 6. Sources

- IP India patent forms and official fees: https://www.ipindia.gov.in/pages/patents/learn/forms-and-official-fees
- IP India trade mark fees: https://ipindia.gov.in/pages/trade-marks/learn/forms-and-official-fees
- Startup India IPR support: https://www.startupindia.gov.in/santhali/content/sih/en/intellectual-property-rights.html

