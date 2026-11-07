import type { ProgressFlag } from '@tlh/shared';
import type { InteractionContent, InteractionDef } from './types.ts';

/** Briggs has not been resolved yet. */
const UNRESOLVED: readonly ProgressFlag[] = ['briggs_purified', 'briggs_destroyed'];

/** The walkie is shown once the smoke lets go, whichever way the choice went. */
const walkie = (outcome: 'briggs_purified' | 'briggs_destroyed'): InteractionDef => ({
  id: 'clue.garden.walkie',
  prompt: 'Pick up the walkie-talkie',
  show: { flags: [outcome], notFlags: ['walkie_found'] },
  actions: [
    { do: 'setFlag', flag: 'walkie_found' },
    { do: 'say', line: 'vo_gartner_b4_01' },
    { do: 'say', line: 'vo_elena_b4_04', after: 7 },
  ],
});

/** Beat 4: the cursed neighbour (beat-sheet.md). The fight itself is game/encounter-runtime.ts. */
export const BEAT4: InteractionContent = {
  interactions: [
    // Before the Ward: speak to Briggs (engages). After it: weaken him. Both go to the encounter runtime.
    {
      id: 'enemy.garden.briggs',
      prompt: 'Speak to Mr Briggs',
      show: { notFlags: [...UNRESOLVED, 'spell_ward'] },
      actions: [{ do: 'encounter', op: 'interact', id: 'briggs' }],
    },
    {
      id: 'enemy.garden.briggs',
      prompt: 'Weaken Mr Briggs',
      show: { flags: ['spell_ward'], notFlags: UNRESOLVED },
      actions: [{ do: 'encounter', op: 'interact', id: 'briggs' }],
    },
    walkie('briggs_purified'),
    walkie('briggs_destroyed'),
    {
      id: 'pickup.garden.fuse',
      prompt: 'Take the fuse',
      show: { flags: ['seq3_done'], notFlags: ['fuse_taken'] },
      actions: [
        { do: 'pickUp', item: 'fuse' },
        { do: 'setFlag', flag: 'fuse_taken' },
      ],
    },
  ],
  triggers: [
    // Entering the garden writes cp_garden (the mini-boss respawn point).
    { id: 'trg.garden.enter', requires: { flags: ['seq2_done'] }, actions: [{ do: 'checkpoint', event: 'enter:trg.garden.enter' }] },
  ],
  hints: [],
};
