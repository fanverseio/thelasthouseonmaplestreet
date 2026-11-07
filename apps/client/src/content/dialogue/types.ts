/** Voice line IDs are `vo_<character>_<id>` (structure.md). */
export type VoiceLineId = string;

export const VOICE_LINE_ID_PATTERN = /^vo_[a-z0-9_]+$/;

export type Speaker = 'Elena' | 'Angel' | 'Felix' | 'Briggs' | 'Gartner' | 'Rosalind';

/** One subtitled, voiced line. `placeholder` marks text the script does not yet contain. */
export interface DialogueLine {
  id: VoiceLineId;
  speaker: Speaker;
  text: string;
  placeholder?: true;
}
