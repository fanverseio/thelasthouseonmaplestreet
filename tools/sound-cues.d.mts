export type CueBus = 'sfx' | 'amb';
export interface SoundCue {
  id: string;
  prompt: string;
  seconds: number;
  loop: boolean;
  bus: CueBus;
  /** ElevenLabs prompt_influence, 0..1. */
  influence?: number;
}
export const SOUND_CUES: SoundCue[];
export const CONTROL_CUES: string[];
export const CREDITS_PER_SECOND: number;
export const MIN_SECONDS: number;
export const MAX_SECONDS: number;
export function cueFolder(cue: SoundCue): 'sfx' | 'amb';
