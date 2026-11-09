/**
 * Plays the voice-over for each spoken line, one at a time: a new line stops the one before it.
 * Hooked to the world runtime's `onLine`, so subtitles and voice start together. Never throws.
 */
import { playVoiceLine, type VoicePlayback } from './voice.ts';

export interface VoicePlayer {
  speak(line: { lineId: string; text: string }): void;
  stop(): void;
}

export function createVoicePlayer(play: (id: string, text?: string) => VoicePlayback = playVoiceLine): VoicePlayer {
  let current: VoicePlayback | null = null;
  return {
    speak(line) {
      try {
        current?.stop();
        current = play(line.lineId, line.text);
      } catch {
        current = null; // voice never breaks the game; the subtitle still shows
      }
    },
    stop() {
      current?.stop();
      current = null;
    },
  };
}
