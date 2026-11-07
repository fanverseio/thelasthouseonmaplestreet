import type { SequenceDef, SequenceStep } from '../../game/sequences.ts';

const say = (lineId: string, seconds: number): SequenceStep[] => [
  { t: 'line', lineId },
  { t: 'wait', seconds },
];

const BULB = 'light.hideout.shed_bulb';

/**
 * Beat 5: Gartner's confession (beat-sheet.md, script/act1.md). Interactive dialogue: control `limited`
 * (no movement, dialogue only; the view reads the policy), locket and Angel actions blocked, capped at 120 s
 * of dialogue, so it is excluded from the forced-control budget like Briggs. The one choice (comfort or
 * press, content/choices/) is a `prompt` step that ends on either flag; both branches continue with the
 * same information. cp_house66 is written by the seq4_done checkpoint rule.
 */
export const SEQ4_GARTNER_CONFESSION: SequenceDef = {
  id: 'seq4_gartner_confession',
  kind: 'horror',
  trigger: { entity: 'door.hideout.shed' },
  requires: ['walkie_found'],
  owns: ['door.hideout.shed', 'npc.hideout.gartner', BULB],
  policy: { locket: 'blocked', angelActions: 'blocked', control: 'limited' },
  maxForcedSeconds: 0,
  skippable: false,
  setsOnComplete: ['seq4_done'],
  steps: [
    ...say('vo_elena_b5_01', 3.5),
    { t: 'light', target: BULB, effect: 'on' },
    ...say('vo_gartner_b5_01', 3.5),
    ...say('vo_elena_b5_02', 3),
    ...say('vo_gartner_b5_02', 5.5),
    ...say('vo_gartner_b5_03', 5),
    ...say('vo_gartner_b5_04', 5),
    ...say('vo_gartner_b5_05', 4),
    // The choice; its lines are spoken by the choice runtime.
    { t: 'prompt', textId: 'gartner_choice', until: 'flag', flag: 'gartner_comforted', orFlags: ['gartner_pressed'] },
    { t: 'wait', seconds: 8 },
    ...say('vo_gartner_b5_07', 4.5),
    ...say('vo_gartner_b5_08', 8),
    ...say('vo_gartner_b5_09', 4),
    ...say('vo_elena_b5_03', 3.5),
    ...say('vo_gartner_b5_10', 2.5),
    { t: 'light', target: BULB, effect: 'off' },
    { t: 'setFlag', flag: 'seq4_done' },
  ],
};

export const BEAT5_SEQUENCES: readonly SequenceDef[] = [SEQ4_GARTNER_CONFESSION];
