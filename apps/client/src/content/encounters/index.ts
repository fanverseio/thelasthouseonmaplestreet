import type { EncounterBinding } from '../../game/encounter-runtime.ts';

/**
 * Beat 4 (beat-sheet.md): Mr Briggs, the first mini-boss, fought on the enemy FSM (task 5.7). He stays frozen through
 * the transformation; the sequence's briggs_ward prompt starts the scripted first attack (2.5 s wind-up, capped at 30 HP)
 * and teaches Ward at the START of that wind-up, so LMB Ward works during it. Below 60% HP he adds the ground slam.
 */
export const BRIGGS_BINDING: EncounterBinding = {
  id: 'briggs',
  mode: 'fsm',
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
 * Beat 6 (beat-sheet.md): the Watcher of House 66 (Mr Corwin), a victim of the smoke, fought on the enemy FSM (task 5.8):
 * teleports between the yard nodes, decoys at 60% and 40%, Felix's name at 90 / 50 / 30%. No sequence (he is not a
 * horror sequence). The fence key drops after either outcome and is a pickup.
 */
export const WATCHER_BINDING: EncounterBinding = {
  id: 'watcher',
  mode: 'fsm',
  entity: 'enemy.house66.watcher',
  startFlag: 'watcher_started',
  requires: ['fuse_placed'],
  approachRange: 4,
  startLines: ['vo_watcher_b6_02'],
  stunAfter: 2.5,
  stunFlags: [],
  // vo_watcher_b6_05 is the 30% voice line (voiceAtHp), spoken as he reaches the stun floor.
  stunLines: [{ line: 'vo_angel_b6_01', after: 2.5 }],
  deferDrops: true,
  outcomeLines: {
    purify: [{ line: 'vo_watcher_b6_06' }],
    destroy: [{ line: 'vo_elena_b6_03' }],
  },
};

/**
 * Beat 2-3 (beat-sheet.md): the optional street fox, on the enemy FSM (task 5.6). No sequence, no Ward, no start flag.
 * Leashed to 15 m (walking away makes it give up and changes nothing). Purify stays unavailable until spell_purify;
 * a stunned fox stays stunned and harmless, and a charged Bolt destroys it.
 */
export const STREET_FOX_BINDING: EncounterBinding = {
  id: 'street_fox',
  mode: 'fsm',
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
 * On the enemy FSM (task 5.9): it engages when Elena comes near and pounces. Resolving it sets
 * `enc_interior_resolved`, which unlocks the talking board.
 */
export const INTERIOR_CAT_BINDING: EncounterBinding = {
  id: 'interior_cat',
  mode: 'fsm',
  entity: 'enemy.interior.cat',
  requires: ['runes_done'],
  approachRange: 4,
  startLines: ['vo_angel_b9_01'],
  stunAfter: 2,
  stunFlags: [],
};

/**
 * Beat 7 (beat-sheet.md): the two cursed hounds of `enc_approach`, mandatory, +/-10 morality each, on the enemy FSM
 * (task 5.9): two bindings, engaged together by trg.grounds.enter (and again by approach range after a death).
 * enc_approach_resolved is set only once BOTH are resolved.
 */
const houseHound = (n: 1 | 2): EncounterBinding => ({
  id: `hound_${n}`,
  mode: 'fsm',
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
