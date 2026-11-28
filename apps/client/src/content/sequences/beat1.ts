import type { SequenceDef, SequenceStep } from '../../game/sequences.ts';
import type { EntityId } from '@tlh/shared';

/** A spoken line, then a pause long enough to read it (the runner is the clock; lines are subtitles). */
const say = (lineId: string, seconds: number): SequenceStep[] => [
  { t: 'line', lineId },
  { t: 'wait', seconds },
];

/**
 * Beat 1 step 5: the locket opens itself. The clip `cin_angel_intro` carries the first three lines
 * (vo_angel_b1_01, vo_elena_b1_07, vo_angel_b1_02, spoken in the video); the last two stay in the game.
 * Skippable: a skip sets angel_awake like a full run.
 */
export const ANGEL_INTRO: SequenceDef = {
  id: 'angel_intro',
  kind: 'cinematic',
  trigger: { flag: 'locket_taken' },
  requires: ['locket_taken'],
  owns: [],
  policy: { locket: 'blocked', angelActions: 'blocked', control: 'full' },
  maxForcedSeconds: 27,
  skippable: true,
  setsOnComplete: ['angel_awake'],
  steps: [
    { t: 'video', clipId: 'cin_angel_intro', fallbackSeconds: 27 },
    ...say('vo_angel_b1_03', 6),
    ...say('vo_angel_b1_04', 5),
    { t: 'setFlag', flag: 'angel_awake' },
  ],
};

/**
 * Beat 1 step 6-7: Elena opens the front door and sees Felix's spirit in the fog (clip `cin_home_door_felix`,
 * with "Mom?" and Elena's reply spoken in the video). Sets home_done at the end or on skip. Requires angel_awake,
 * so the door refuses while the Angel intro is still running (as before the clip existed).
 */
export const CIN_HOME_DOOR_FELIX: SequenceDef = {
  id: 'cin_home_door_felix',
  kind: 'cinematic',
  trigger: { entity: 'door.home.front' as EntityId },
  requires: ['angel_awake'],
  owns: ['door.home.front' as EntityId],
  policy: { locket: 'blocked', angelActions: 'blocked', control: 'locked' },
  maxForcedSeconds: 10,
  skippable: true,
  setsOnComplete: ['home_done'],
  steps: [{ t: 'video', clipId: 'cin_home_door_felix', fallbackSeconds: 10 }],
};

export const BEAT1_SEQUENCES: readonly SequenceDef[] = [ANGEL_INTRO, CIN_HOME_DOOR_FELIX];
