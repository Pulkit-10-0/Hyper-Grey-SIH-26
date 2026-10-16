# Portable waveform checks

[waveform_test.cpp](waveform_test.cpp) compares the portable synthesizer against analytic references, exercises modulation/window combinations, validates amplitude, stereo layout and endpoints, rejects invalid inputs, and checks buffer boundaries.

Run from the TX project directory (`02-firmware/tx`):

```sh
c++ -std=c++17 -O1 -Wall -Wextra -Werror -pedantic \
  -fsanitize=undefined -Iinclude src/waveform.cpp tests/waveform_test.cpp \
  -o /tmp/seanergy-waveform-test
/tmp/seanergy-waveform-test
```

The documented run passes 409,765 checks. It verifies software sample generation, not peripheral timing, physical ADC/DAC behaviour, acoustic range or battery savings. See [TX verification](../README.md#verification) and the [bench procedure](../HARDWARE.md).
