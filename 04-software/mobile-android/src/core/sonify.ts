/**
 * Sonification: render the same sweep shape into the audible band and play it.
 *
 * The transmitted pulse is ultrasonic, so nobody in the room can hear what the
 * payload is doing. This plays an identically shaped chirp shifted down roughly
 * forty times, purely so an audience can hear the sweep.
 *
 * Every failure path is swallowed. Audio is a nicety and must never be able to
 * break a screen.
 */

import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { synthesise, WaveMode, WindowKind } from './dsp';

const SAMPLE_RATE = 22050;
const AUDIBLE_LOW = 420;
const AUDIBLE_HIGH = 2600;

let current: ReturnType<typeof createAudioPlayer> | null = null;

/** Little-endian 16-bit mono WAV around a Float32 sample buffer. */
function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  const ascii = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  ascii(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // format = PCM
  view.setUint16(22, 1, true); // channels
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  ascii(36, 'data');
  view.setUint32(40, dataBytes, true);

  let o = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    o += 2;
  }
  return new Uint8Array(buffer);
}

export async function playChirp(
  mode: WaveMode,
  window: WindowKind,
  tauSeconds: number,
): Promise<void> {
  try {
    // Stretch very short pulses so there is something to actually hear.
    const duration = Math.max(0.45, Math.min(1.6, tauSeconds * 90));
    const swept = mode === 'lfm' || mode === 'geometric';

    const samples = synthesise(
      {
        mode,
        window,
        fStart: swept ? AUDIBLE_LOW : 900,
        fStop: swept ? AUDIBLE_HIGH : 900,
        tau: duration,
        amplitude: 0.75,
      },
      SAMPLE_RATE,
    );

    const bytes = encodeWav(samples, SAMPLE_RATE);

    const file = new File(Paths.cache, 'seanergy-chirp.wav');
    try {
      if (file.exists) file.delete();
    } catch {
      /* first run, nothing to remove */
    }
    file.create({ overwrite: true });
    file.write(bytes);

    await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});

    if (current) {
      try {
        current.remove();
      } catch {
        /* already gone */
      }
      current = null;
    }

    const player = createAudioPlayer(file.uri);
    current = player;
    player.play();

    // Hold for the duration so the caller's busy state matches what is heard.
    await new Promise((r) => setTimeout(r, duration * 1000 + 220));

    try {
      player.remove();
    } catch {
      /* already released */
    }
    if (current === player) current = null;
  } catch {
    /* sonification is optional; stay silent rather than surfacing an error */
  }
}

export function stopChirp(): void {
  try {
    current?.remove();
  } catch {
    /* nothing playing */
  }
  current = null;
}
