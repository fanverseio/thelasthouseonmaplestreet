import type { SequenceDef, SequenceStep } from '../../game/sequences.ts';

const say = (lineId: string, seconds: number): SequenceStep[] => [
  { t: 'line', lineId },
  { t: 'wait', seconds },
];

const BRIGGS = 'enemy.garden.briggs';

/**
 * Beat 4: the cursed neighbour (beat-sheet.md, script/act1.md). Interactive: the player keeps control.
 * The encounter runtime (game/encounter-runtime.ts) owns the fight and sets spell_ward (end of the
 * telegraphed first attack), spell_purify (stun) and the outcome flags; the sequence waits on them
 * and sets seq3_done at the end. `seq3_started` is set by the encounter when it engages.
 * Briggs' phase 2 line comes before the weakening prompt.
 */
export const SEQ3_CURSED_NEIGHBOUR: SequenceDef = {
  id: 'seq3_cursed_neighbour',
  kind: 'horror',
  trigger: { entity: BRIGGS },
  requires: ['seq2_done', 'seq3_started'],
  owns: [BRIGGS, 'clue.garden.walkie', 'trg.garden.enter'],
  policy: { locket: 'combat_blocked', angelActions: 'blocked', control: 'full' },
  maxForcedSeconds: 0,
  skippable: false,
  setsOnComplete: ['seq3_done'],
  steps: [
    // Transformation, about 6 s
    { t: 'fx', effect: 'smoke', target: BRIGGS },
    ...say('vo_briggs_b4_01', 2.5),
    ...say('vo_briggs_b4_02', 3.5),
    // Scripted first attack: Ward prompt, then the hit (it never takes HP below 30)
    { t: 'line', lineId: 'vo_angel_b4_01' },
    { t: 'prompt', textId: 'briggs_ward', until: 'flag', flag: 'spell_ward' },
    ...say('vo_briggs_b4_03', 1),
    // Weaken (interact); the stub stuns after a moment
    { t: 'prompt', textId: 'briggs_weaken', until: 'flag', flag: 'spell_purify' },
    // Stun: the Angel offers the choice; the walkie drops after the outcome
    { t: 'line', lineId: 'vo_angel_b4_02' },
    { t: 'prompt', textId: 'briggs_choice', until: 'flag', flag: 'walkie_found' },
  ],
};

export const BEAT4_SEQUENCES: readonly SequenceDef[] = [SEQ3_CURSED_NEIGHBOUR];
