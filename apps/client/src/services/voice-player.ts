/**
 * Plays the voice-over for each spoken line, one at a time, with a short pause between lines.
 * Hooked to the world runtime's `onLine`. Lines that arrive while one is playing wait in a short
 * queue; if too many pile up, the oldest waiting ones are dropped so voice never falls far behind.
 * Never throws.
 */
import { playVoiceLine, type VoicePlayback } from './voice.ts';

/** Silence between two voice lines (author: 0.5 s). */
export const VOICE_GAP_MS = 500;
/** At most this many lines wait behind the one playing. */
export const MAX_QUEUED = 2;

export interface VoicePlayer {
  speak(line: { lineId: string; text: string }): void;
  /** Cut the line playing now (it fades out) and anything waiting, then play this one at once. */
  interrupt(line: { lineId: string; text: string }): void;
  stop(): void;
}

export interface VoicePlayerDeps {
  play?: (id: string, text?: string) => VoicePlayback;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export function createVoicePlayer(deps: VoicePlayerDeps | ((id: string, text?: string) => VoicePlayback) = {}): VoicePlayer {
  const d: VoicePlayerDeps = typeof deps === 'function' ? { play: deps } : deps;
  const play = d.play ?? playVoiceLine;
  const setTimer = d.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = d.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));

  let current: VoicePlayback | null = null;
  let gap: unknown = null;
  let queue: { lineId: string; text: string }[] = [];
  let epoch = 0; // bumps on stop(), so a finished line from before stop() starts nothing

  const next = () => {
    if (current || gap !== null) return;
    const line = queue.shift();
    if (!line) return;
    const mine = epoch;
    try {
      const playback = play(line.lineId, line.text);
      current = playback;
      void playback.done.then(() => {
        if (mine !== epoch || current !== playback) return;
        current = null;
        gap = setTimer(() => {
          gap = null;
          if (mine === epoch) next();
        }, VOICE_GAP_MS);
      });
    } catch {
      current = null; // voice never breaks the game; the subtitle still shows
      next();
    }
  };

  const stop = () => {
    epoch++;
    queue = [];
    if (gap !== null) clearTimer(gap);
    gap = null;
    try {
      current?.stop();
    } catch {
      // already stopped
    }
    current = null;
  };

  return {
    speak(line) {
      queue.push(line);
      if (queue.length > MAX_QUEUED) queue = queue.slice(-MAX_QUEUED);
      next();
    },
    interrupt(line) {
      stop();
      queue.push(line);
      next();
    },
    stop,
  };
}
