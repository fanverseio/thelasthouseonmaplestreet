import type { SequenceDef, SequenceStep } from '../../game/sequences.ts';
import type { EntityId } from '@tlh/shared';

const LIGHTS = ['01', '02', '03', '04', '05', '06'].map((n) => `light.street.${n}` as EntityId);

/** Flicker chain towards the intersection: each light a beat after the last. */
const FLICKER_CHAIN: SequenceStep[] = LIGHTS.flatMap((target): SequenceStep[] => [
  { t: 'light', target, effect: 'flicker', seconds: 1.5 },
  { t: 'wait', seconds: 0.5 },
]);

/**
 * Beat 2: fully interactive (control full). The step list runs while Elena walks; it completes when she
 * reaches `trg.street.seq1_end`, which sets `seq1_done` and opens `gate.street.veil_east` (flag-driven).
 */
export const SEQ1_EMPTY_STREET: SequenceDef = {
  id: 'seq1_empty_street',
  kind: 'horror',
  trigger: { entity: 'trg.street.seq1' as EntityId },
  requires: ['home_done'],
  owns: [...LIGHTS, 'prop.street.window_14' as EntityId],
  policy: { locket: 'allowed', angelActions: 'blocked', control: 'full' },
  maxForcedSeconds: 0,
  skippable: false,
  setsOnComplete: ['seq1_done'],
  steps: [
    { t: 'audio', cue: 'amb_street_duck', bus: 'amb' },
    { t: 'line', lineId: 'vo_elena_b2_01' },
    { t: 'wait', seconds: 2 },
    ...FLICKER_CHAIN,
    { t: 'audio', cue: 'sfx_footsteps_behind', bus: 'sfx' },
    { t: 'line', lineId: 'vo_elena_b2_02' },
    { t: 'wait', seconds: 2.5 },
    { t: 'spawn', target: 'prop.street.window_14' as EntityId },
    { t: 'line', lineId: 'vo_elena_b2_03' },
    { t: 'wait', seconds: 2.5 },
    { t: 'despawn', target: 'prop.street.window_14' as EntityId },
    { t: 'waitFor', cond: { trigger: 'trg.street.seq1_end' as EntityId } },
    { t: 'line', lineId: 'vo_elena_b2_04' },
    { t: 'fx', effect: 'veilRecede', target: 'gate.street.veil_east' as EntityId },
    { t: 'setFlag', flag: 'seq1_done' },
  ],
};

/**
 * Beat 3: a generated video clip (author decision: cinematics are clips, not built in code). Skipping applies
 * the same end state: seq2_done, spell_bolt and the Arcane Bolt unlock. Plays in the dark after the clip ends.
 */
export const SEQ2_FELIX_STREETLIGHT: SequenceDef = {
  id: 'seq2_felix_streetlight',
  kind: 'cinematic',
  trigger: { entity: 'trg.street.streetlight' as EntityId },
  requires: ['seq1_done'],
  owns: ['light.street.intersection' as EntityId],
  policy: { locket: 'blocked', angelActions: 'blocked', control: 'limited' },
  maxForcedSeconds: 25,
  skippable: true,
  setsOnComplete: ['seq2_done', 'spell_bolt'],
  steps: [
    { t: 'video', clipId: 'seq2_felix_streetlight', fallbackSeconds: 20 },
    { t: 'unlockSpell', spell: 'arcane_bolt' },
  ],
};

export const BEAT2_SEQUENCES: readonly SequenceDef[] = [SEQ1_EMPTY_STREET, SEQ2_FELIX_STREETLIGHT];
