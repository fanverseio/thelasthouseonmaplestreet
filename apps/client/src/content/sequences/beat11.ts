import type { SequenceDef } from '../../game/sequences.ts';

/**
 * Beats 11-12: the three cinematics are generated video clips, so each sequence is a single `video` step
 * (clipId = the sequence id, fallbackSeconds = the middle of the script's length). All three are skippable
 * and set their flags on completion and on skip. The dialogue inside the clips (Felix's encouragement, the
 * ending lines) is not subtitled by the game yet; script/act2-3.md lists it.
 */

/** Felix's spirit beside the seal after the first anchor (15-20 s). Sets `felix3_done`. */
export const CIN_FELIX_ANCHOR: SequenceDef = {
  id: 'cin_felix_anchor',
  kind: 'cinematic',
  trigger: { entity: 'npc.ritual.felix' },
  requires: ['ritual_active'],
  owns: ['npc.ritual.felix'],
  policy: { locket: 'blocked', angelActions: 'blocked', control: 'locked' },
  maxForcedSeconds: 20,
  skippable: true,
  setsOnComplete: ['felix3_done'],
  steps: [{ t: 'video', clipId: 'cin_felix_anchor', fallbackSeconds: 15 }],
};

/** Ending A, The Bloodline Keeper (20-30 s). Sets `game_finished`; the ending flag came from the choice. */
export const CIN_ENDING_KEEPER: SequenceDef = {
  id: 'cin_ending_keeper',
  kind: 'ending',
  trigger: { flag: 'ending_keeper' },
  requires: ['ending_keeper'],
  owns: ['seal.ritual.central'],
  policy: { locket: 'blocked', angelActions: 'blocked', control: 'locked' },
  maxForcedSeconds: 30,
  skippable: true,
  setsOnComplete: ['game_finished'],
  steps: [{ t: 'video', clipId: 'cin_ending_keeper', fallbackSeconds: 25 }],
};

/** Ending B, The Broken Seal (20-30 s). Sets `game_finished`. */
export const CIN_ENDING_BROKEN: SequenceDef = {
  id: 'cin_ending_broken',
  kind: 'ending',
  trigger: { flag: 'ending_broken' },
  requires: ['ending_broken'],
  owns: ['seal.ritual.central'],
  policy: { locket: 'blocked', angelActions: 'blocked', control: 'locked' },
  maxForcedSeconds: 30,
  skippable: true,
  setsOnComplete: ['game_finished'],
  steps: [{ t: 'video', clipId: 'cin_ending_broken', fallbackSeconds: 25 }],
};

export const BEAT11_SEQUENCES: readonly SequenceDef[] = [CIN_FELIX_ANCHOR, CIN_ENDING_KEEPER, CIN_ENDING_BROKEN];
