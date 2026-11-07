import type { SequenceDef, SequenceStep } from '../../game/sequences.ts';

/** A spoken line, then a pause long enough to read it (the runner is the clock; lines are subtitles). */
const say = (lineId: string, seconds: number): SequenceStep[] => [
  { t: 'line', lineId },
  { t: 'wait', seconds },
];

/**
 * Beat 1 step 5: the locket opens itself. Lines only, the player keeps full control (script/act1.md).
 * Felix's "Mum?" comes from the street in the middle of the intro, as in the script table.
 */
export const ANGEL_INTRO: SequenceDef = {
  id: 'angel_intro',
  kind: 'cinematic',
  trigger: { flag: 'locket_taken' },
  requires: ['locket_taken'],
  owns: [],
  policy: { locket: 'blocked', angelActions: 'blocked', control: 'full' },
  maxForcedSeconds: 0,
  skippable: false,
  setsOnComplete: ['angel_awake'],
  steps: [
    ...say('vo_angel_b1_01', 4.5),
    ...say('vo_elena_b1_07', 1.5),
    ...say('vo_angel_b1_02', 6),
    ...say('vo_angel_b1_03', 6),
    ...say('vo_felix_b1_01', 2),
    ...say('vo_elena_b1_08', 2.5),
    ...say('vo_angel_b1_04', 5),
    { t: 'setFlag', flag: 'angel_awake' },
  ],
};

export const BEAT1_SEQUENCES: readonly SequenceDef[] = [ANGEL_INTRO];
