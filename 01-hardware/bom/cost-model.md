# SeaNergy quantity cost model

Document ID: HW-BOM-003

The model uses the quantity-1 BOM as its base, applies a component discount factor, and replaces the BOM's single PCB/enclosure allowance with the quantity-specific figures below. It is a planning model, not a quotation.

| Quantity | Component factor | PCB per unit | Enclosure per unit | Assembly per unit | Estimated unit cost | Extended batch cost |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1.00 | INR 800 | INR 1,200 | INR 1,500 | INR 27,648 | INR 27,648 |
| 10 | 0.82 | INR 500 | INR 800 | INR 650 | INR 21,751 | INR 217,514 |
| 100 | 0.68 | INR 250 | INR 480 | INR 350 | INR 17,501 | INR 1,750,064 |

## Programme allowance

The SIH planning envelope remains INR 36,000 for one marine-ready demonstration unit. The difference between the material estimate and INR 36,000 covers quotation movement, shipping, custom magnetics, machining/print iteration, seals, calibration consumables and contingency. Laboratory instruments and the 450 L tank are shared infrastructure and are excluded.

## Sensitivity

- A +/-INR 2,000 change in the finished-band PZT changes unit cost by the same amount.
- A second enclosure print adds approximately INR 1,200 at quantity 1.
- Imported penetrator freight and customs are not locked; obtain a landed quote before release.
- Quantity-100 pricing assumes design stability and does not include certification, pressure-vessel machining or warranty reserve.
