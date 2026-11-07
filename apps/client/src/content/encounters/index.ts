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

/**
 * Beat 6 (beat-sheet.md): the Watcher of House 66 (Mr Corwin), a victim of the smoke. Stub rules only:
 * interact weakens, a short delay stuns, then purify or destroy. No sequence (he is not a horror
 * sequence), no wind-up and no teleports yet. The fence key drops after either outcome and is a pickup.
 */
export const WATCHER_BINDING: EncounterBinding = {
  id: 'watcher',
  entity: 'enemy.house66.watcher',
  startFlag: 'watcher_started',
  requires: ['fuse_placed'],
  approachRange: 4,
  startLines: ['vo_watcher_b6_02'],
  stunAfter: 2.5,
  stunFlags: [],
  stunLines: [{ line: 'vo_watcher_b6_05' }, { line: 'vo_angel_b6_01', after: 2.5 }],
  deferDrops: true,
  outcomeLines: {
    purify: [{ line: 'vo_watcher_b6_06' }],
    destroy: [{ line: 'vo_elena_b6_03' }],
  },
};

/** Add a beat's encounters by appending a binding here. */
export const ENCOUNTER_BINDINGS: readonly EncounterBinding[] = [BRIGGS_BINDING, WATCHER_BINDING];
