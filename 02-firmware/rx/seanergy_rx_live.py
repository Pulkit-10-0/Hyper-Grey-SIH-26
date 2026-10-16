#!/usr/bin/env python3
"""
SeaNergy RX Live Analyzer — Python-only optimized viewer.

ESP32 firmware is NOT changed.
Serial protocol remains the existing 115200-baud ASCII protocol.

This version improves the DISPLAY side:
- Serial reader runs in a background thread.
- ADC samples are displayed as they arrive instead of waiting
  for the whole 4096-sample frame.
- Waveform display refreshes at ~60 FPS.
- Waveform is downsampled only for drawing, not for analysis.
- FFT is calculated only when a complete real capture arrives.
- FFT display is limited to 0–60 kHz for the 40 kHz RX experiment.
- Carrier detection searches 30–50 kHz, so an 80 kHz harmonic
  is not incorrectly labelled as the carrier.
- Parabolic interpolation gives a better peak-frequency estimate.
- A marker is drawn at the detected carrier candidate.
- A Nyquist warning is shown if the actual sampling rate cannot
  resolve 40 kHz.

IMPORTANT:
The waveform shown during serial transfer is still the actual ADC
samples received from the ESP32. The GUI does not invent measurement
samples. It only interpolates the DRAWING between incoming points.

The FFT is always calculated from the complete, real 4096-sample frame.
"""

import argparse
import threading
import time
from collections import deque

import matplotlib.pyplot as plt
import numpy as np
import serial
from matplotlib.animation import FuncAnimation


DEFAULT_PORT = "/dev/cu.usbserial-10"
DEFAULT_BAUD = 115200

# For this 40 kHz RX experiment, keep the displayed spectrum focused.
FFT_DISPLAY_MAX_HZ = 60_000.0

# Only call something the ultrasonic carrier if it is in this band.
CARRIER_LOW_HZ = 30_000.0
CARRIER_HIGH_HZ = 50_000.0

GUI_INTERVAL_MS = 16       # ~60 FPS
DISPLAY_POINTS = 1400      # drawing only; FFT uses all samples


class SerialReader:
    """
    Reads the ORIGINAL ASCII protocol.

    Instead of waiting for the entire frame before sending anything
    to the GUI, partial ADC samples are made available while they
    arrive over USB serial.
    """

    def __init__(self, port, baud):
        self.ser = serial.Serial(
            port,
            baud,
            timeout=0.2,
        )

        self.lock = threading.Lock()

        self.running = True

        self.capture_samples = []
        self.capture_expected = 4096
        self.capture_elapsed_us = None
        self.capture_reported_fs = None
        self.in_data = False

        self.latest_partial = None
        self.latest_complete = None

        self.thread = threading.Thread(
            target=self._reader_loop,
            daemon=True,
        )
        self.thread.start()

    def _line(self):
        raw = self.ser.readline()

        if not raw:
            return ""

        return raw.decode(
            "utf-8",
            errors="ignore",
        ).strip()

    def _publish_partial(self):
        if not self.capture_samples:
            return

        arr = np.asarray(
            self.capture_samples,
            dtype=np.float64,
        )

        with self.lock:
            self.latest_partial = (
                arr,
                self.capture_elapsed_us,
                self.capture_reported_fs,
                time.monotonic(),
            )

    def _finish_capture(self):
        if len(self.capture_samples) < 8:
            self.capture_samples = []
            return

        arr = np.asarray(
            self.capture_samples,
            dtype=np.float64,
        )

        with self.lock:
            self.latest_complete = (
                arr,
                self.capture_elapsed_us,
                self.capture_reported_fs,
                time.monotonic(),
            )

        self.capture_samples = []
        self.capture_elapsed_us = None
        self.capture_reported_fs = None
        self.in_data = False

    def _reader_loop(self):
        while self.running:

            try:
                line = self._line()

                if not line:
                    continue

                # ----------------------------------------------
                # Start of a new capture
                # ----------------------------------------------
                if line == "CAPTURE_START":
                    self.capture_samples = []
                    self.capture_expected = 4096
                    self.capture_elapsed_us = None
                    self.capture_reported_fs = None
                    self.in_data = False

                    continue

                # ----------------------------------------------
                # Metadata
                # ----------------------------------------------
                if line.startswith("SAMPLES="):
                    try:
                        self.capture_expected = int(
                            line.split("=", 1)[1]
                        )
                    except ValueError:
                        pass

                    continue

                if line.startswith("ELAPSED_US="):
                    try:
                        self.capture_elapsed_us = int(
                            line.split("=", 1)[1]
                        )
                    except ValueError:
                        pass

                    continue

                if line.startswith("ACTUAL_FS="):
                    try:
                        self.capture_reported_fs = float(
                            line.split("=", 1)[1]
                        )
                    except ValueError:
                        pass

                    continue

                # ----------------------------------------------
                # Start of ADC data
                # ----------------------------------------------
                if line == "DATA_START":
                    self.in_data = True
                    continue

                # ----------------------------------------------
                # ADC data
                # ----------------------------------------------
                if self.in_data:

                    if line == "DATA_END":
                        self._finish_capture()
                        continue

                    try:
                        value = int(line)
                    except ValueError:
                        continue

                    if 0 <= value <= 4095:
                        self.capture_samples.append(value)

                        # Publish frequently enough for smooth drawing.
                        if (
                            len(self.capture_samples) % 32 == 0
                            or len(self.capture_samples) <= 32
                        ):
                            self._publish_partial()

                        # Safety: don't let malformed streams grow forever.
                        if len(self.capture_samples) >= self.capture_expected:
                            self._finish_capture()

            except serial.SerialException:
                break

            except Exception:
                if self.running:
                    time.sleep(0.01)

    def get_partial(self):
        with self.lock:
            return self.latest_partial

    def get_complete(self):
        with self.lock:
            frame = self.latest_complete
            self.latest_complete = None
            return frame

    def close(self):
        self.running = False

        try:
            self.ser.close()
        except Exception:
            pass


def measured_fs(n, elapsed_us, reported_fs):
    if elapsed_us is not None and elapsed_us > 0:
        return n / (elapsed_us / 1_000_000.0)

    if reported_fs is not None and reported_fs > 0:
        return reported_fs

    return 0.0


def parabolic_peak(freqs, magnitude, index):
    """
    Sub-bin peak interpolation.

    FFT-bin spacing is fixed, but this estimates the peak between bins
    and gives a cleaner displayed frequency.
    """

    if index <= 0 or index >= len(magnitude) - 1:
        return float(freqs[index])

    y1 = float(magnitude[index - 1])
    y2 = float(magnitude[index])
    y3 = float(magnitude[index + 1])

    denominator = y1 - 2.0 * y2 + y3

    if abs(denominator) < 1e-15:
        return float(freqs[index])

    delta = 0.5 * (y1 - y3) / denominator

    bin_width = float(freqs[1] - freqs[0])

    return float(
        freqs[index] + delta * bin_width
    )


def analyze(samples, elapsed_us, reported_fs):
    """
    FFT analysis of the COMPLETE real ADC capture.
    """

    n = len(samples)

    fs = measured_fs(
        n,
        elapsed_us,
        reported_fs,
    )

    if fs <= 0:
        raise ValueError("Invalid sampling rate")

    centered = samples - np.mean(samples)

    window = np.hanning(n)

    spectrum = np.fft.rfft(
        centered * window
    )

    # Window coherent-gain normalization.
    magnitude = np.abs(spectrum) / (
        np.sum(window) / 2.0
    )

    freqs = np.fft.rfftfreq(
        n,
        d=1.0 / fs,
    )

    # ----------------------------------------------
    # Carrier detection: ONLY 30–50 kHz.
    # ----------------------------------------------
    carrier_mask = (
        (freqs >= CARRIER_LOW_HZ)
        &
        (freqs <= CARRIER_HIGH_HZ)
    )

    carrier_freq = None
    carrier_mag = 0.0

    if np.any(carrier_mask):

        indices = np.flatnonzero(
            carrier_mask
        )

        local_index = int(
            np.argmax(
                magnitude[carrier_mask]
            )
        )

        peak_index = int(
            indices[local_index]
        )

        carrier_mag = float(
            magnitude[peak_index]
        )

        carrier_freq = parabolic_peak(
            freqs,
            magnitude,
            peak_index,
        )

    min_adc = float(
        np.min(samples)
    )

    max_adc = float(
        np.max(samples)
    )

    vpp_adc = max_adc - min_adc

    approx_vpp = (
        vpp_adc / 4095.0 * 3.3
    )

    return {
        "samples": samples,
        "fs": fs,
        "duration_ms": (
            n / fs * 1000.0
        ),
        "min_adc": min_adc,
        "max_adc": max_adc,
        "vpp_adc": vpp_adc,
        "approx_vpp": approx_vpp,
        "freqs": freqs,
        "magnitude": magnitude,
        "carrier_freq": carrier_freq,
        "carrier_mag": carrier_mag,
        "nyquist": fs / 2.0,
        "can_resolve_40k": (
            fs / 2.0 > 40_000.0
        ),
    }


class LivePlot:

    def __init__(
        self,
        reader,
    ):
        self.reader = reader

        self.complete_frame_id = None

        self.current_analysis = None

        self.previous_wave = None
        self.current_wave = None

        self.last_partial_count = 0

        self.display_phase = 0.0

        self.frame_count = 0

        self.fig, (
            self.ax_wave,
            self.ax_fft,
        ) = plt.subplots(
            2,
            1,
            figsize=(12, 8),
        )

        try:
            self.fig.canvas.manager.set_window_title(
                "SeaNergy RX — Live ADC + FFT"
            )
        except Exception:
            pass

        self.wave_line, = (
            self.ax_wave.plot(
                [],
                [],
                linewidth=0.9,
            )
        )

        self.fft_line, = (
            self.ax_fft.plot(
                [],
                [],
                linewidth=1.0,
            )
        )

        # Carrier marker.
        self.carrier_marker = (
            self.ax_fft.axvline(
                0,
                visible=False,
                linestyle="--",
                linewidth=1.0,
            )
        )

        self.info = self.ax_wave.text(
            0.01,
            0.98,
            "",
            transform=self.ax_wave.transAxes,
            va="top",
            fontsize=9,
        )

        self.fft_info = self.ax_fft.text(
            0.01,
            0.96,
            "",
            transform=self.ax_fft.transAxes,
            va="top",
            fontsize=9,
        )

        self.ax_wave.set_title(
            "RX ADC — Actual Samples"
        )

        self.ax_wave.set_xlabel(
            "Time (ms)"
        )

        self.ax_wave.set_ylabel(
            "ADC"
        )

        self.ax_wave.grid(True)

        self.ax_fft.set_title(
            "RX FFT — 0–60 kHz"
        )

        self.ax_fft.set_xlabel(
            "Frequency (kHz)"
        )

        self.ax_fft.set_ylabel(
            "Magnitude"
        )

        self.ax_fft.grid(True)

        self.ax_fft.set_xlim(
            0,
            60,
        )

        self.fig.tight_layout()

    @staticmethod
    def draw_samples(samples):
        """
        Reduce only the number of points sent to Matplotlib.

        This does NOT alter FFT data.
        """

        n = len(samples)

        if n <= DISPLAY_POINTS:
            return samples

        # Uniform stride for fast rendering.
        stride = int(
            np.ceil(
                n / DISPLAY_POINTS
            )
        )

        return samples[::stride]

    def update(self, _):

        # Update the waveform from partial serial data.
        partial = self.reader.get_partial()

        if partial is not None:

            samples, elapsed_us, reported_fs, timestamp = partial

            if len(samples) != self.last_partial_count:

                self.last_partial_count = len(
                    samples
                )

                if len(samples) >= 8:

                    self.current_wave = (
                        samples.copy()
                    )

        # Use complete captures for FFT.
        complete = (
            self.reader.get_complete()
        )

        if complete is not None:

            samples, elapsed_us, reported_fs, timestamp = complete

            try:

                result = analyze(
                    samples,
                    elapsed_us,
                    reported_fs,
                )

                self.previous_wave = (
                    self.current_wave.copy()
                    if self.current_wave is not None
                    else samples.copy()
                )

                self.current_wave = (
                    samples.copy()
                )

                self.current_analysis = result

                self.frame_count += 1

            except Exception:
                pass

        # Draw the received waveform.
        if self.current_wave is not None:

            draw_wave = (
                self.draw_samples(
                    self.current_wave
                )
            )

            if self.current_analysis is not None:

                fs = self.current_analysis[
                    "fs"
                ]

                time_axis = (
                    np.arange(
                        len(
                            self.current_wave
                        )
                    )
                    / fs
                    * 1000.0
                )

                if len(time_axis) != len(
                    self.current_wave
                ):
                    return

                draw_time = (
                    self.draw_samples(
                        time_axis
                    )
                )

            else:

                # Partial capture before the first
                # complete frame.
                fs = (
                    1.0
                    if self.current_analysis is None
                    else self.current_analysis["fs"]
                )

                draw_time = np.arange(
                    len(draw_wave)
                )

            self.wave_line.set_data(
                draw_time,
                draw_wave,
            )

            if self.current_analysis is not None:

                result = (
                    self.current_analysis
                )

                self.ax_wave.set_xlim(
                    0,
                    max(
                        result[
                            "duration_ms"
                        ],
                        1.0,
                    ),
                )

            else:

                self.ax_wave.set_xlim(
                    0,
                    max(
                        len(
                            self.current_wave
                        ),
                        1,
                    ),
                )

            # Stable vertical scale.
            y_min = float(
                np.min(
                    self.current_wave
                )
            )

            y_max = float(
                np.max(
                    self.current_wave
                )
            )

            span = max(
                y_max - y_min,
                20.0,
            )

            self.ax_wave.set_ylim(
                y_min - span * 0.15,
                y_max + span * 0.15,
            )

        # FFT of the complete capture.
        if self.current_analysis is not None:

            result = (
                self.current_analysis
            )

            freqs = result[
                "freqs"
            ]

            magnitude = result[
                "magnitude"
            ]

            mask = (
                freqs <= FFT_DISPLAY_MAX_HZ
            )

            self.fft_line.set_data(
                freqs[mask] / 1000.0,
                magnitude[mask],
            )

            if np.any(mask):

                visible_max = float(
                    np.max(
                        magnitude[mask]
                    )
                )

                self.ax_fft.set_ylim(
                    0,
                    max(
                        visible_max * 1.15,
                        1e-6,
                    ),
                )

            # --------------------------------------------------
            # Carrier marker
            # --------------------------------------------------
            carrier = result[
                "carrier_freq"
            ]

            if (
                carrier is not None
                and carrier <= FFT_DISPLAY_MAX_HZ
            ):

                self.carrier_marker.set_xdata(
                    [carrier / 1000.0]
                )

                self.carrier_marker.set_visible(
                    True
                )

            else:

                self.carrier_marker.set_visible(
                    False
                )

            # --------------------------------------------------
            # Info
            # --------------------------------------------------
            carrier_text = (
                "not detected"
                if carrier is None
                else f"{carrier / 1000.0:.2f} kHz"
            )

            self.info.set_text(
                f"Samples: {len(result['samples'])}   "
                f"Fs: {result['fs'] / 1000.0:.1f} kS/s   "
                f"Duration: {result['duration_ms']:.2f} ms\n"
                f"ADC: {result['min_adc']:.0f} → "
                f"{result['max_adc']:.0f}   "
                f"Vpp≈{result['approx_vpp']:.3f} V   "
                f"Carrier: {carrier_text}   "
                f"Frame: {self.frame_count}"
            )

            if result[
                "can_resolve_40k"
            ]:

                self.fft_info.set_text(
                    f"Carrier search: "
                    f"{CARRIER_LOW_HZ/1000:.0f}–"
                    f"{CARRIER_HIGH_HZ/1000:.0f} kHz   "
                    f"Nyquist: "
                    f"{result['nyquist']/1000:.1f} kHz"
                )

            else:

                self.fft_info.set_text(
                    f"WARNING: Nyquist = "
                    f"{result['nyquist']/1000:.1f} kHz — "
                    f"40 kHz cannot be measured correctly"
                )

        # Redraw.
        self.fig.canvas.draw_idle()

        return (
            self.wave_line,
            self.fft_line,
            self.info,
            self.fft_info,
        )


def main():

    parser = argparse.ArgumentParser(
        description=(
            "SeaNergy RX live waveform and FFT viewer"
        )
    )

    parser.add_argument(
        "--port",
        default=DEFAULT_PORT,
    )

    parser.add_argument(
        "--baud",
        type=int,
        default=DEFAULT_BAUD,
    )

    args = parser.parse_args()

    print()
    print(
        "=============================================="
    )
    print(
        " SeaNergy RX Live Analyzer"
    )
    print(
        "=============================================="
    )
    print(
        f"Port: {args.port}"
    )
    print(
        f"Baud: {args.baud}"
    )
    print()
    print(
        "ESP32 firmware is NOT modified."
    )
    print(
        "Using the existing 115200 ASCII protocol."
    )
    print()
    print(
        "Close PlatformIO Serial Monitor before running."
    )
    print()

    try:

        reader = SerialReader(
            args.port,
            args.baud,
        )

    except serial.SerialException as exc:

        print(
            f"ERROR: Could not open {args.port}"
        )

        print(exc)

        print()
        print(
            "Available ports:"
        )

        print(
            "  ls /dev/cu.*"
        )

        return

    # Opening the serial port can reset the ESP32.
    time.sleep(2.0)

    plot = LivePlot(
        reader,
    )

    animation = FuncAnimation(
        plot.fig,
        plot.update,
        interval=GUI_INTERVAL_MS,
        blit=False,
        cache_frame_data=False,
    )

    try:

        plt.show()

    finally:

        reader.close()

        try:
            animation.event_source.stop()
        except Exception:
            pass


if __name__ == "__main__":
    main()
