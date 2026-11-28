import type { SequenceDef } from '../../game/sequences.ts';

/**
 * Beat 8: Felix appears when Elena looks at Rosalind's family painting (the mirror was removed, notes 16-18; the
 * sequence and clip ids keep their old name). A generated video clip (author decision: cinematics are clips, not
 * built in code), so the body is one `video` step. Skippable; skipping sets the same seq5_done. The hidden runes
 * can be woken once seq5_done is set (game/runes.ts), so nothing here spawns them.
 */
export const SEQ5_FELIX_MIRROR: SequenceDef = {
  id: 'seq5_felix_mirror',
  kind: 'horror',
  trigger: { entity: 'clue.grounds.painting' },
  requires: ['padlock_open'],
  owns: ['clue.grounds.painting', 'puzzle.grounds.runes', 'rune.grounds.r1', 'rune.grounds.r2', 'rune.grounds.r3'],
  policy: { locket: 'blocked', angelActions: 'blocked', control: 'locked' },
  maxForcedSeconds: 29,
  skippable: true,
  setsOnComplete: ['seq5_done'],
  steps: [{ t: 'video', clipId: 'seq5_felix_mirror', fallbackSeconds: 29 }],
};

export const BEAT8_SEQUENCES: readonly SequenceDef[] = [SEQ5_FELIX_MIRROR];
