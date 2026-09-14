# DMA timing

| Quantity | Baseline |
|---|---:|
| Parallel bus sample rate | 2,000,000 samples/s |
| Sample period | 0.500 us |
| DMA block | 1,024 bytes |
| Block duration | 512.0 us |
| Range ping | 4,096 samples / 2.048 ms |
| Balanced ping | 3,072 samples / 1.536 ms |
| Detail ping | 2,048 samples / 1.024 ms |
| Required sustained rate | At least 2 MSps |

Measurement uses GPIO 3 for total envelope and a logic analyser on GPIO 47
for the write strobe. Decode at least four complete blocks; do not report a
short burst rate. Save the native analyser session and exported CSV under
`captures/dma-timing`.
