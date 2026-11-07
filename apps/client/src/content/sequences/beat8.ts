import type { SequenceDef } from '../../game/sequences.ts';

/**
 * Beat 8: Felix in the Mirror. A generated video clip (author decision: cinematics are clips, not built in
 * code), so the body is one `video` step. Skippable; skipping sets the same seq5_done. The runes appear in the
 * reflection once seq5_done is set (content/interactions/beat8.ts), so nothing here spawns them.
 */
export const SEQ5_FELIX_MIRROR: SequenceDef = {
  id: 'seq5_felix_mirror',
  kind: 'horror',
  trigger: { entity: 'mirror.grounds.antique' },
  requires: ['padlock_open'],
  owns: ['mirror.grounds.antique', 'puzzle.grounds.runes', 'rune.grounds.r1', 'rune.grounds.r2', 'rune.grounds.r3'],
  policy: { locket: 'blocked', angelActions: 'blocked', control: 'locked' },
  maxForcedSeconds: 30,
  skippable: true,
  setsOnComplete: ['seq5_done'],
  steps: [{ t: 'video', clipId: 'seq5_felix_mirror', fallbackSeconds: 25 }],
};

export const BEAT8_SEQUENCES: readonly SequenceDef[] = [SEQ5_FELIX_MIRROR];
