#pragma once

#include <cstddef>
#include <cstdint>

namespace sonar {

enum class Modulation : std::uint8_t { Lfm, Geometric, Barker13 };
enum class Window : std::uint8_t { Hann, Hamming, Blackman };

enum class Error : std::uint8_t {
  Ok,
  InvalidSampleRate,
  InvalidFrequency,
  InvalidDuration,
  InvalidAmplitude,
  InvalidModulation,
  InvalidWindow,
  NullOutput,
  InsufficientCapacity
};

struct Config {
  std::uint32_t sampleRateHz = 48000;
  float startHz = 1500.0f;
  float endHz = 6000.0f;
  float durationMs = 12.0f;
  float amplitude = 0.35f;
  Modulation modulation = Modulation::Lfm;
  Window window = Window::Hann;
};

constexpr float kMaxDurationMs = 28.0f;
constexpr float kMaxAmplitude = 0.8f;

Error validate(const Config& config);
std::size_t sampleCount(const Config& config);

// Called between pings. Capacity is in stereo frames; storage needs 2 * frames.
// The chirp reaches endHz at frame N-1; Barker13 uses the midpoint carrier.
Error synthesize(const Config& config, std::int16_t* stereo,
                 std::size_t capacityFrames);
float windowValue(Window window, std::size_t index, std::size_t frames);

const char* modulationName(Modulation modulation);
const char* windowName(Window window);
const char* errorName(Error error);

}  // namespace sonar
