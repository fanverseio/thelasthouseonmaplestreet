import type { SequenceDef } from '../../game/sequences.ts';

/**
 * Beat 10: Sequence 6, The Two Living Keys (beat-sheet.md, script/act2-3.md). The cinematic is a generated
 * video clip, so the sequence is one `video` step; the Smoke and Elena lines live in the clip
 * (content/dialogue/beat9.ts lists them). Skippable: a skip and a full run end in the same state.
 * Setting `seq6_done` opens the three anchor doors (existing gates) and writes no checkpoint (cp_ritual
 * was written by `board_solved`).
 */
export const SEQ6_TWO_KEYS: SequenceDef = {
  id: 'seq6_two_keys',
  kind: 'cinematic',
  trigger: { entity: 'seal.ritual.central' },
  requires: ['board_solved'],
  owns: ['seal.ritual.central'],
  policy: { locket: 'blocked', angelActions: 'blocked', control: 'locked' },
  maxForcedSeconds: 32,
  skippable: true,
  setsOnComplete: ['seq6_done'],
  steps: [{ t: 'video', clipId: 'seq6_two_keys', fallbackSeconds: 32 }],
};

/**
 * Beat 9 to 10: Elena walks down into the ritual chamber (clip `cin_ritual_enter`, no lines). Fired once by
 * trg.ritual.enter just inside the chamber after board_solved and before seq6_done. Sets no flags.
 */
export const CIN_RITUAL_ENTER: SequenceDef = {
  id: 'cin_ritual_enter',
  kind: 'cinematic',
  trigger: { entity: 'trg.ritual.enter' },
  requires: ['board_solved'],
  owns: ['seal.ritual.central'],
  policy: { locket: 'blocked', angelActions: 'blocked', control: 'locked' },
  maxForcedSeconds: 8,
  skippable: true,
  setsOnComplete: [],
  steps: [{ t: 'video', clipId: 'cin_ritual_enter', fallbackSeconds: 8 }],
};

export const BEAT10_SEQUENCES: readonly SequenceDef[] = [CIN_RITUAL_ENTER, SEQ6_TWO_KEYS];
