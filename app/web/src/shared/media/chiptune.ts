/**
 * Tiny 8-bit style sound effects made with the Web Audio API (no audio files).
 * Only call these from a click/tap, browsers block sound otherwise.
 */

// Set to false to silence every site sound effect at once.
export const SOUND_EFFECTS_ENABLED = true;

let audioContext: AudioContext | null = null;

export function playNotes(
  frequencies: number[],
  { step = 0.085, length = 0.16, volume = 0.045 } = {},
) {
  if (!SOUND_EFFECTS_ENABLED || typeof window === "undefined") {
    return;
  }

  try {
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioCtor) {
      return;
    }

    audioContext ??= new AudioCtor();
    const context = audioContext;
    const start = context.currentTime + 0.02;

    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const at = start + index * step;

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(volume, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + length);

      oscillator.connect(gain).connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + length + 0.02);
    });
  } catch {
    // Sound is decoration only.
  }
}
