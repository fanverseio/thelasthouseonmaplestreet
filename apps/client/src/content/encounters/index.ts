import type { EncounterBinding } from '../../game/encounter-runtime.ts';

/** Beat 4 (beat-sheet.md): Mr Briggs, the first mini-boss, played on the encounter stub. */
export const BRIGGS_BINDING: EncounterBinding = {
  id: 'briggs',
  entity: 'enemy.garden.briggs',
  sequence: 'seq3_cursed_neighbour',
  startFlag: 'seq3_started',
  requires: ['seq2_done'],
  approachRange: 4,
  startLines: ['vo_elena_b4_01'],
  weakenRequires: 'spell_ward',
  stunAfter: 1.5,
  stunFlags: ['spell_purify'],
  telegraph: { promptId: 'briggs_ward', seconds: 1.5, damage: 12, hpFloor: 30, wardFlag: 'spell_ward', magicCost: 25 },
  // The walkie drops when the smoke lets go; the player picks it up (clue.garden.walkie sets walkie_found).
  deferDrops: true,
  outcomeLines: {
    purify: [{ line: 'vo_elena_b4_02' }, { line: 'vo_briggs_b4_04', after: 3.5 }],
    destroy: [{ line: 'vo_elena_b4_03' }],
  },
};

/** Add a beat's encounters by appending a binding here. */
export const ENCOUNTER_BINDINGS: readonly EncounterBinding[] = [BRIGGS_BINDING];
