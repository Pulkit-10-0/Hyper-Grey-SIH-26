# SeaNergy procurement log

    Document ID: HW-BOM-002  
    Capture date: 2026-09-07  
    Currency: INR

    ## 1. Current position

    | State | Planning value |
    |---|---:|
    | Items evidenced as in hand from the DAA bench/procurement record | INR 3,684 |
    | Items still needed for the preliminary finished-product design | INR 22,464 |
    | Total quantity-1 material estimate | INR 26,148 |

    No item is marked ordered because no purchase-order number, order date or delivery receipt was supplied. "In hand" is limited to parts supported by the existing bench path and DAA procurement screenshots.

    ## 2. Captured supplier evidence

    | Record | Supplier / source | Item evidence | Captured result | Status |
    |---|---|---|---|---|
    | PR-001 | DAA `1.jpeg` | Capacitors, resistors, LM2596, breadboards, MOSFETs, connectors | SKU and quantity visible; price absent | Source copied to `evidence/source-list-01.jpg` |
    | PR-002 | DAA `2.jpeg` | Turbidity, MCP4921, pots, MCP6002, GU1008C, passives | SKU and quantity visible; price absent | Source copied to `evidence/source-list-02.jpg` |
    | PR-003 | DAA `3.jpeg` | MAX98357A, display, TDS, DS18B20 | model and quantity visible; price absent | Source copied to `evidence/source-list-03.jpg` |
    | PR-004 | Robu.in product listing | ESP32-S3-DevKitC-1-N8, SKU 1696735 | INR 1,282 incl. GST; out of stock; 25-30 day restock | Planning price only |
    | PR-005 | Robu.in product listing | MCP4921T-E/SN, SKU R208437 | INR 388 incl. GST; in stock at capture | Planning price only |
    | PR-006 | Robu.in ultrasonic category | GU1008C-40R, SKU R182247 | INR 186 incl. GST | Planning price only |
    | PR-007 | JLCPCB public prototype offer | 1-4 layers, 5 boards, promotional minimum | From USD 2 before size, options and delivery | BOM uses INR 800 landed planning allowance per board |

    ## 3. Long-lead register

    | BOM ID | Item | Lead time | Why critical | Action |
    |---|---|---:|---|---|
    | B008 | ESP32-S3-DevKitC-1-N8 | 30 days | Blocks driver release | Obtain two Indian and one manufacturer quotation |
| B018 | SEANERGY-TX-01 | 42 days | Blocks driver release | Obtain two Indian and one manufacturer quotation |
| B020 | PZT-200K-WB | 56 days | Blocks water validation | Obtain two Indian and one manufacturer quotation |
| B024 | MS5837-30BA | 35 days | Blocks water validation | Obtain two Indian and one manufacturer quotation |
| B033 | WETLINK-M10 | 30 days | Blocks water validation | Obtain two Indian and one manufacturer quotation |

    ## 4. Deliberately not bought

    - Finished-band PZT: not bought because the modelled 148-351 kHz span must be converted into a transducer strategy and vendor impedance data first.
    - Custom transformer: not bought until measured capacitance and resistance define turns ratio and core loss.
    - Pressure penetrators: not bought until hull wall thickness and cable diameter are frozen.
    - Production PCB: not bought because KiCad placement, routing, ERC and DRC remain open.
    - OPA1652 production analog path: not bought until simulation and filter values are reviewed; MCP6002 remains bench-only because 1 MHz GBW is insufficient margin for the highest modelled frequency.

    ## 5. Links

    - https://stg.robu.in/product/espressif-esp32-s3-devkitc-1-n8-developmnt-board/
    - https://robu.in/product/mcp4921t-e-sn-microchip-mcp4921t-e-sn-digital-to-analogue-converter-12-bit-spi-2-7v-to-5-5v-soic-8-pins/
    - https://robu.in/product-category/sensor-modules/ultrasonic-sensor/generic-ultrasonic-sensors/
    - https://jlcpcb.com/
