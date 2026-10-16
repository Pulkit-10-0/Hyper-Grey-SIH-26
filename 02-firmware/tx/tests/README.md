# Portable waveform checks

[waveform_test.cpp](waveform_test.cpp) compares the portable synthesizer against analytic references, exercises modulation/window combinations, validates amplitude, stereo layout and endpoints, rejects invalid inputs, and checks buffer boundaries.

Run from the TX project directory (`02-firmware/tx`):

```sh
c++ -std=c++17 -O1 -Wall -Wextra -Werror -pedantic \
  -fsanitize=undefined -Iinclude src/waveform.cpp tests/waveform_test.cpp \
  -o /tmp/seanergy-waveform-test
/tmp/seanergy-waveform-test
```

The documented host run passes **409,765 checks**, covering software sample generation and input validation. See [TX verification](../README.md#verification) for build results and the [bench procedure](../HARDWARE.md) for instrument setup.
