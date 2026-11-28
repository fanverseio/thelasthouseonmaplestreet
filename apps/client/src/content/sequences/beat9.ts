import type { SequenceDef } from '../../game/sequences.ts';

/**
 * Beat 9: Elena pushes the glowing front door open and steps into the hall (clip `cin_last_house_enter`,
 * vo_elena_b9_01 spoken in the video). The door interaction starts it on the first entry only and loads the
 * `last_house` scene under the clip (content/interactions/beat9.ts). Sets no flags.
 */
export const CIN_LAST_HOUSE_ENTER: SequenceDef = {
  id: 'cin_last_house_enter',
  kind: 'cinematic',
  trigger: { entity: 'door.grounds.last_house_front' },
  requires: ['runes_done'],
  owns: ['door.grounds.last_house_front'],
  policy: { locket: 'blocked', angelActions: 'blocked', control: 'locked' },
  maxForcedSeconds: 12,
  skippable: true,
  setsOnComplete: [],
  steps: [{ t: 'video', clipId: 'cin_last_house_enter', fallbackSeconds: 12 }],
};

export const BEAT9_SEQUENCES: readonly SequenceDef[] = [CIN_LAST_HOUSE_ENTER];
