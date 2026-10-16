#include "waveform.h"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <vector>

namespace {

constexpr double kPi = 3.14159265358979323846;
constexpr std::array<int, 13> kBarker = {1, 1, 1, 1, 1, -1, -1,
                                       1, 1, -1, 1, -1, 1};
int checks = 0;

void check(bool condition, const char* message) {
  ++checks;
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    std::exit(1);
  }
}

double referenceWindow(sonar::Window type, std::size_t i, std::size_t frames) {
  if (i == 0 || i + 1 == frames) return 0.0;
  const double x = static_cast<double>(i) / (frames - 1);
  const double s = std::sin(kPi * x);
  switch (type) {
    case sonar::Window::Hann:
      return s * s;
    case sonar::Window::Hamming: {
      double result = 0.08 + 0.92 * s * s;
      const double edge = std::min(x, 1.0 - x);
      if (edge < 0.05) {
        const double taper = std::sin(kPi * edge / 0.1);
        result *= taper * taper;
      }
      return result;
    }
    case sonar::Window::Blackman:
      return 0.42 - 0.5 * std::cos(2 * kPi * x) +
             0.08 * std::cos(4 * kPi * x);
  }
  return 0.0;
}

double referenceCycles(const sonar::Config& config, std::size_t i,
                       std::size_t frames) {
  const double t = static_cast<double>(i) / config.sampleRateHz;
  const double duration = static_cast<double>(frames - 1) / config.sampleRateHz;
  const double start = config.startHz;
  const double end = config.endHz;
  if (config.modulation == sonar::Modulation::Lfm) {
    return start * t + 0.5 * (end - start) / duration * t * t;
  }
  if (config.modulation == sonar::Modulation::Geometric) {
    if (start == end) return start * t;
    const double logRatio = std::log(end / start);
    return start * duration / logRatio * std::expm1(logRatio * t / duration);
  }
  return 0.5 * (start + end) * t;
}

void compareReference(const sonar::Config& config) {
  const std::size_t frames = sonar::sampleCount(config);
  check(frames > 0, "valid reference configuration");
  constexpr std::int16_t guard = 12345;
  std::vector<std::int16_t> output(2 * frames + 4, guard);
  check(sonar::synthesize(config, output.data() + 2, frames) == sonar::Error::Ok,
        "synthesis succeeds");
  check(output[0] == guard && output[1] == guard &&
            output[2 * frames + 2] == guard && output[2 * frames + 3] == guard,
        "stereo buffer guards remain intact");
  for (std::size_t i = 0; i < frames; ++i) {
    const double phase = 2 * kPi * referenceCycles(config, i, frames);
    const int sign = config.modulation == sonar::Modulation::Barker13
                         ? kBarker[i * 13 / frames]
                         : 1;
    const double expected = sign * std::sin(phase) * 32767 * config.amplitude *
                            referenceWindow(config.window, i, frames);
    const auto actual = output[2 + i * 2];
    check(std::abs(actual - expected) < 3.5,
          "LUT phase follows analytic chirp or coded-carrier phase");
    check(output[2 + i * 2] == output[3 + i * 2], "stereo channels match");
    check(std::abs(static_cast<int>(actual)) <=
              static_cast<int>(std::ceil(32767 * config.amplitude)),
          "amplitude remains bounded");
  }
  check(output[2] == 0 && output[3] == 0 && output[2 * frames] == 0 &&
            output[2 * frames + 1] == 0,
        "every modulation and window has exact-zero pulse endpoints");
}

void testWindows() {
  for (const auto type : {sonar::Window::Hann, sonar::Window::Hamming,
                          sonar::Window::Blackman}) {
    check(sonar::windowValue(type, 0, 1001) == 0.0f, "window starts at zero");
    check(sonar::windowValue(type, 1000, 1001) == 0.0f, "window ends at zero");
    check(std::abs(sonar::windowValue(type, 500, 1001) - 1.0f) < 1e-6,
          "window center has unity gain");
    for (std::size_t i = 0; i < 1001; ++i) {
      const float value = sonar::windowValue(type, i, 1001);
      check(value >= 0.0f && value <= 1.0f, "window is bounded");
      check(std::abs(value - sonar::windowValue(type, 1000 - i, 1001)) < 1e-6,
            "window is symmetric");
      check(std::abs(value - referenceWindow(type, i, 1001)) < 1e-6,
            "window follows its defining equation");
    }
    check(sonar::windowValue(type, 0, 0) == 0.0f, "empty window is safe");
    check(sonar::windowValue(type, 0, 1) == 0.0f, "single-frame window is safe");
    check(sonar::windowValue(type, 1001, 1001) == 0.0f,
          "out-of-range window index is safe");
  }
  check(sonar::windowValue(sonar::Window::Hamming, 1, 1001) < 0.001f,
        "Hamming edge taper removes its usual endpoint jump");
  check(std::abs(sonar::windowValue(sonar::Window::Hann, 250, 1001) - 0.5f) <
            1e-6,
        "Hann quarter point");
  check(std::abs(sonar::windowValue(sonar::Window::Hamming, 250, 1001) - 0.54f) <
            1e-6,
        "Hamming quarter point");
  check(std::abs(sonar::windowValue(sonar::Window::Blackman, 250, 1001) - 0.34f) <
            1e-6,
        "Blackman quarter point");
}

void testWaveforms() {
  for (const std::uint32_t rate : {48000U, 384000U}) {
    for (const auto mode : {sonar::Modulation::Lfm, sonar::Modulation::Geometric,
                           sonar::Modulation::Barker13}) {
      for (const auto window : {sonar::Window::Hann, sonar::Window::Hamming,
                                sonar::Window::Blackman}) {
        sonar::Config config;
        config.sampleRateHz = rate;
        config.startHz = rate == 48000U ? 1000.0f : 38000.0f;
        config.endHz = rate == 48000U ? 8000.0f : 42000.0f;
        config.durationMs = 28.0f;
        config.amplitude = 0.8f;
        config.modulation = mode;
        config.window = window;
        compareReference(config);
        std::swap(config.startHz, config.endHz);
        config.durationMs = 2.5f;
        compareReference(config);
        config.startHz = config.endHz;
        compareReference(config);
      }
    }
  }
  sonar::Config config;
  config.amplitude = 0.0f;
  compareReference(config);
  config.startHz = config.endHz = config.sampleRateHz / 4.0f;
  config.amplitude = 0.8f;
  compareReference(config);
  config.sampleRateHz = 4000000;
  config.startHz = 100000;
  config.endHz = 500000;
  config.durationMs = 1.0f;
  compareReference(config);
}

void testBarkerCode() {
  for (std::size_t lag = 1; lag < kBarker.size(); ++lag) {
    int sum = 0;
    for (std::size_t i = 0; i + lag < kBarker.size(); ++i) {
      sum += kBarker[i] * kBarker[i + lag];
    }
    check(std::abs(sum) <= 1, "Barker-13 aperiodic autocorrelation sidelobes");
  }
  sonar::Config config;
  config.modulation = sonar::Modulation::Barker13;
  config.startHz = config.endHz = 3000;
  config.durationMs = 13;
  const std::size_t frames = sonar::sampleCount(config);
  std::vector<std::int16_t> output(2 * frames);
  check(sonar::synthesize(config, output.data(), frames) == sonar::Error::Ok,
        "coded waveform builds");
  for (std::size_t chip = 0; chip < 13; ++chip) {
    const std::size_t i = chip * (frames / 13) + 10;
    const double carrier = std::sin(2 * kPi * 3000 * i / config.sampleRateHz);
    check(std::abs(carrier) > 0.2, "code probe avoids carrier zero");
    check((output[i * 2] * carrier > 0) == (kBarker[chip] > 0),
          "Barker chip sign is physically encoded in samples");
  }
}

void expectInvalid(sonar::Config config, sonar::Error expected) {
  std::array<std::int16_t, 4> untouched = {111, 222, 333, 444};
  check(sonar::validate(config) == expected, "validation reports specific error");
  check(sonar::sampleCount(config) == 0, "invalid configuration has no samples");
  check(sonar::synthesize(config, untouched.data(), 2) == expected,
        "invalid synthesis reports configuration error");
  check(untouched == std::array<std::int16_t, 4>{111, 222, 333, 444},
        "invalid configuration does not mutate output");
}

void testInvalidInputs() {
  sonar::Config config;
  config.sampleRateHz = 0;
  expectInvalid(config, sonar::Error::InvalidSampleRate);
  for (const float value : {-1.0f, 0.0f, 12001.0f,
                           std::numeric_limits<float>::infinity(),
                           std::numeric_limits<float>::quiet_NaN()}) {
    config = sonar::Config{};
    config.startHz = value;
    expectInvalid(config, sonar::Error::InvalidFrequency);
    config = sonar::Config{};
    config.endHz = value;
    expectInvalid(config, sonar::Error::InvalidFrequency);
  }
  for (const float value : {-1.0f, 0.0f, 28.1f, 0.001f,
                           std::numeric_limits<float>::infinity(),
                           std::numeric_limits<float>::quiet_NaN()}) {
    config = sonar::Config{};
    config.durationMs = value;
    expectInvalid(config, sonar::Error::InvalidDuration);
  }
  for (const float value : {-0.01f, 0.801f,
                           std::numeric_limits<float>::infinity(),
                           std::numeric_limits<float>::quiet_NaN()}) {
    config = sonar::Config{};
    config.amplitude = value;
    expectInvalid(config, sonar::Error::InvalidAmplitude);
  }
  config = sonar::Config{};
  config.modulation = static_cast<sonar::Modulation>(255);
  expectInvalid(config, sonar::Error::InvalidModulation);
  config = sonar::Config{};
  config.window = static_cast<sonar::Window>(255);
  expectInvalid(config, sonar::Error::InvalidWindow);
  config = sonar::Config{};
  config.durationMs = 0.1f;
  config.modulation = sonar::Modulation::Barker13;
  expectInvalid(config, sonar::Error::InvalidDuration);
  config = sonar::Config{};
  const std::size_t frames = sonar::sampleCount(config);
  check(sonar::synthesize(config, nullptr, frames) == sonar::Error::NullOutput,
        "null buffer rejected");
  std::vector<std::int16_t> output(2 * frames, 12345);
  check(sonar::synthesize(config, output.data(), frames - 1) ==
            sonar::Error::InsufficientCapacity,
        "short buffer rejected");
  check(std::all_of(output.begin(), output.end(),
                    [](std::int16_t sample) { return sample == 12345; }),
        "short buffer rejection leaves all storage untouched");
}

}  // namespace

int main() {
  testWindows();
  testWaveforms();
  testBarkerCode();
  testInvalidInputs();
  std::cout << "Waveform checks passed: " << checks << '\n';
}
