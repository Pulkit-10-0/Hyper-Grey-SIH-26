#pragma once

#include <cstddef>
#include <cstdint>

#ifndef SONAR_PCM5102A
#define SONAR_PCM5102A 0
#endif
#ifndef SONAR_ENABLE_DISPLAYS
#define SONAR_ENABLE_DISPLAYS 1
#endif

namespace sonar::board {
constexpr int kBclk = 5;
constexpr int kWordSelect = 6;
constexpr int kDataOut = 7;
constexpr int kPwmTx = 16;
constexpr std::uint32_t kSampleRate = SONAR_PCM5102A ? 384000 : 48000;
constexpr std::size_t kDmaBlockFrames = 256;
constexpr std::size_t kWarmupFrames =
    ((kSampleRate * 20 / 1000 + kDmaBlockFrames - 1) / kDmaBlockFrames) * kDmaBlockFrames;
constexpr std::uint32_t kWarmupUs = kWarmupFrames * 1000000ULL / kSampleRate;
constexpr std::size_t kMaxPulseFrames = (kSampleRate * 28 + 999) / 1000;
constexpr std::size_t kDmaBlocks =
    (kWarmupFrames + kMaxPulseFrames + kDmaBlockFrames - 1) / kDmaBlockFrames + 1;
constexpr std::size_t kPlaybackFrames = kDmaBlocks * kDmaBlockFrames;
constexpr std::uint32_t kMinPeriodMs = 150;
constexpr std::uint32_t kMaxPeriodMs = 5000;
constexpr const char* kBackend = SONAR_PCM5102A ? "PCM5102A" : "MAX98357A AUDIO";
constexpr const char* kVersion = "4.0.0";
}
