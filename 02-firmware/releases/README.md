# TX and RX releases

Build and package TX and RX separately after [software and hardware verification](../measurements/README.md). Neither image is interchangeable with the other board.

PlatformIO outputs are in the selected project's `.pio/build/<environment>/` directory. Record the environment, board, platform/framework versions, source commit and SHA-256 of every distributed file. Use the actual generated upload command and partition layout for that environment; do not reuse the previous ESP-IDF project's filenames or flash offsets.

The imported RX configuration leaves its platform version unpinned, so record the resolved version for each release. Include the RX viewer and its Python dependencies when distributing a host analysis bundle. No flashable release is published by this source import. Generated build files remain ignored by Git.
