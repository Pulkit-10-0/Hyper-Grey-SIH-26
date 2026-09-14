# Enclosure print settings

Document ID: HW-MECH-002  
Status: prototype settings; a printed polymer part has no pressure rating until tested.

| Parameter | PETG prototype | PLA comparison | Resin / PA12 production note |
|---|---:|---:|---|
| Layer height | 0.20 mm | 0.20 mm | 0.10 mm resin or service specification |
| Nozzle | 0.40 mm | 0.40 mm | not applicable |
| Walls | 6 | 6 | >=2.5 mm equivalent |
| Top/bottom | 8 layers | 8 layers | design-specific |
| Infill | 45% gyroid | 45% gyroid | solid or validated process |
| Nozzle temperature | 240 +/-5 degC | 210 +/-5 degC | supplier process |
| Bed | 80 +/-5 degC | 60 +/-5 degC | supplier process |
| Orientation | seal face upward; no support on groove | same | minimise seal-land stair stepping |
| Dimensional target | +/-0.20 mm general | +/-0.20 mm general | +/-0.10 mm target |

PETG is selected over PLA for the prototype because it is less brittle and has better moisture resistance. FDM layer interfaces can leak, so the seal land must be machined or resin-sealed and inspected. Resin offers smoother surfaces but can be brittle; SLS PA12 or machined polymer/aluminium is preferred for a pressure-qualified iteration.

Record filament lot, moisture conditioning, slicer version, orientation, print time, as-printed mass and all measured critical dimensions.
