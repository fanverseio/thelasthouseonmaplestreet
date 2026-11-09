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
  telegraph: { promptId: 'briggs_ward', seconds: 2.5, damage: 12, hpFloor: 30, wardFlag: 'spell_ward', magicCost: 25 },
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

/**
 * Beat 2-3 (beat-sheet.md): the optional street fox. No sequence, no Ward, no start flag: stub rules only.
 * Leashed to 15 m (walking away resets it and changes nothing). Purify stays refused until spell_purify.
 */
export const STREET_FOX_BINDING: EncounterBinding = {
  id: 'street_fox',
  entity: 'enemy.street.fox',
  requires: ['seq2_done'],
  leash: 15,
  startLines: ['vo_angel_fox_c1'],
  stunAfter: 1,
  stunFlags: [],
  // Q25: before Purify is taught Elena pities it; pressing 2 anyway gets the Angel's refusal line.
  stunLinesNoPurify: [{ line: 'vo_elena_fox_01' }],
  purifyRefusedLine: 'vo_angel_fox_c2',
}

/**
 * Beat 9 (beat-sheet.md): the cursed cat guarding the cellar stairs, `enc_interior`. Mandatory, +/-10 morality.
 * Stub rules only: it engages when Elena comes near, interact weakens it, a short delay stuns it, then purify
 * or destroy. It never damages Elena. Resolving it sets `enc_interior_resolved`, which unlocks the talking board.
 */
export const INTERIOR_CAT_BINDING: EncounterBinding = {
  id: 'interior_cat',
  entity: 'enemy.interior.cat',
  requires: ['runes_done'],
  approachRange: 4,
  startLines: ['vo_angel_b9_01'],
  stunAfter: 2,
  stunFlags: [],
};

/**
 * Beat 7 (beat-sheet.md): the two cursed hounds of `enc_approach`, mandatory, +/-10 morality each. Stub rules
 * only: two bindings, engaged together by trg.grounds.enter (and again by approach range after a death). Each is
 * weakened with E, stuns a moment later, then purify or destroy. enc_approach_resolved is set by the stub only
 * once BOTH are resolved. They never damage Elena.
 */
const houseHound = (n: 1 | 2): EncounterBinding => ({
  id: `hound_${n}`,
  entity: `enemy.grounds.hound_${n}`,
  requires: ['lane_open'],
  approachRange: 5,
  ...(n === 1 && { startLines: ['vo_angel_b7_02'] }),
  stunAfter: 1.5,
  stunFlags: [],
});
export const HOUND_BINDINGS: readonly EncounterBinding[] = [houseHound(1), houseHound(2)];

/** Add a beat's encounters by appending a binding here. */
export const ENCOUNTER_BINDINGS: readonly EncounterBinding[] = [BRIGGS_BINDING, WATCHER_BINDING, STREET_FOX_BINDING, ...HOUND_BINDINGS, INTERIOR_CAT_BINDING];
