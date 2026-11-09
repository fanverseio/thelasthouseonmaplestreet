/**
 * DEVELOPER TEST SHORTCUT, dev builds only (the caller checks `import.meta.env.DEV`).
 * Product rule: the shipped game has no chapter select or shortcuts, everyone starts at home.
 * This only replays the real flag sequence through `setFlag`, so checkpoints and rules stay honest.
 */
import type { GameStore } from '../store/game-store.ts';

/** The real flag order from a new game up to the runes (Beat 8), used by the Last House starts. */
const TO_RUNES = [
  'bed_seen', 'drawing_seen', 'drawer_key_taken', 'locket_taken', 'angel_awake', 'journal_1', 'home_done',
  'seq1_done', 'seq2_done', 'spell_bolt', 'seq3_started', 'spell_ward', 'spell_purify', 'briggs_purified',
  'walkie_found', 'seq3_done', 'seq4_done', 'fuse_taken', 'fuse_placed', 'watcher_started', 'watcher_purified',
  'fence_key_taken', 'lane_open', 'enc_approach_resolved', 'padlock_open', 'seq5_done', 'runes_done',
] as const;

export const DEV_STARTS = {
  /** Outside the house, locket in hand (after Beat 1). */
  street: ['bed_seen', 'drawing_seen', 'drawer_key_taken', 'locket_taken', 'angel_awake', 'journal_1', 'home_done'],
  /** At the intersection with Arcane Bolt (after Beat 3), ready for the garden. */
  garden: [
    'bed_seen', 'drawing_seen', 'drawer_key_taken', 'locket_taken', 'angel_awake', 'journal_1', 'home_done',
    'seq1_done', 'seq2_done', 'spell_bolt',
  ],
  /**
   * Dev practice range (task 5.6-5.9): the garden start's flags and checkpoint, but all three spells are unlocked and
   * the practice hound (game/dev-training.ts) stands about 6 m from the spawn, so Purify and Ward can be tried at once.
   * Changes no flag and no morality beyond the garden start.
   */
  training: [
    'bed_seen', 'drawing_seen', 'drawer_key_taken', 'locket_taken', 'angel_awake', 'journal_1', 'home_done',
    'seq1_done', 'seq2_done', 'spell_bolt',
  ],
  /** Outside Gartner's shed after Beat 5 (seq4_done): fuse and House 66 next. */
  house66: [
    'bed_seen', 'drawing_seen', 'drawer_key_taken', 'locket_taken', 'angel_awake', 'journal_1', 'home_done',
    'seq1_done', 'seq2_done', 'spell_bolt', 'seq3_started', 'spell_ward', 'spell_purify', 'briggs_purified',
    'walkie_found', 'seq3_done', 'seq4_done',
  ],
  /** At the lane gate with the gate open (after Beat 6): the back lane, the hounds and the padlock are next. */
  lane: [
    'bed_seen', 'drawing_seen', 'drawer_key_taken', 'locket_taken', 'angel_awake', 'journal_1', 'home_done',
    'seq1_done', 'seq2_done', 'spell_bolt', 'seq3_started', 'spell_ward', 'spell_purify', 'briggs_purified',
    'walkie_found', 'seq3_done', 'seq4_done', 'fuse_taken', 'fuse_placed', 'watcher_started', 'watcher_purified',
    'fence_key_taken', 'lane_open',
  ],
  /** At the outbuilding door with the padlock open (after Beat 7): the antique mirror (Beat 8) is next. */
  grounds: [
    'bed_seen', 'drawing_seen', 'drawer_key_taken', 'locket_taken', 'angel_awake', 'journal_1', 'home_done',
    'seq1_done', 'seq2_done', 'spell_bolt', 'seq3_started', 'spell_ward', 'spell_purify', 'briggs_purified',
    'walkie_found', 'seq3_done', 'seq4_done', 'fuse_taken', 'fuse_placed', 'watcher_started', 'watcher_purified',
    'fence_key_taken', 'lane_open', 'journal_3', 'enc_approach_resolved', 'padlock_open',
  ],
  /** Inside the Last House entrance hall after the runes (Beats 9-10): the cat, the talking board, then the seal. */
  interior: [...TO_RUNES],
  /** In the ritual chamber just behind the opened cellar door (board solved): the seal's Sequence 6 is next. */
  'ritual-door': [...TO_RUNES, 'enc_interior_resolved', 'board_solved'],
  /** Seal ready to wake (seq6_done, Beat 11): wake it, then restore the three anchors in any order. */
  ritual: [...TO_RUNES, 'enc_interior_resolved', 'board_solved', 'seq6_done'],
  /** All three anchors restored (anchors_all, Beat 12): the seal's final choice is next. */
  'ritual-choice': [
    ...TO_RUNES, 'enc_interior_resolved', 'board_solved', 'seq6_done', 'ritual_active', 'anchor_north', 'anchor_east',
    'anchor_west', 'felix3_done', 'anchors_all',
  ],
} as const;

export type DevStart = keyof typeof DEV_STARTS;

export function isDevStart(value: string | null): value is DevStart {
  return value !== null && Object.prototype.hasOwnProperty.call(DEV_STARTS, value);
}

/** Apply a dev start to a freshly started game. Returns the flags that could not be set (empty when fine). */
export function applyDevStart(store: GameStore, start: DevStart): string[] {
  const failed: string[] = [];
  for (const flag of DEV_STARTS[start]) {
    if (!store.getState().setFlag(flag).ok) failed.push(flag);
  }
  if (start === 'garden') {
    store.setState((s) => ({ player: { ...s.player, spellsUnlocked: ['arcane_bolt'], selectedSpell: 'arcane_bolt' } }));
  }
  if (start === 'training') {
    store.setState((s) => ({
      player: { ...s.player, spellsUnlocked: ['arcane_bolt', 'ward', 'purify'], selectedSpell: 'arcane_bolt' },
    }));
  }
  if (start === 'house66' || start === 'lane' || start === 'grounds' || start === 'interior' || start === 'ritual-door' || start === 'ritual' || start === 'ritual-choice') {
    store.setState((s) => ({
      player: { ...s.player, spellsUnlocked: ['arcane_bolt', 'ward', 'purify'], selectedSpell: 'arcane_bolt' },
    }));
  }
  // The Last House starts stand inside: entering writes cp_interior (board_solved already wrote cp_ritual).
  if (start === 'interior') store.getState().writeCheckpointForEvent('enter:last_house');
  // Put the player at the checkpoint just written.
  store.getState().respawn();
  return failed;
}

/**
 * Dev-only F9 (the caller checks `import.meta.env.DEV`): drop health to 0 so death and respawn can be tested by
 * hand. The encounter runtime sees hp <= 0 on its next tick and does the real death handling.
 */
export function devKillPlayer(store: GameStore): void {
  store.setState((s) => ({ player: { ...s.player, hp: 0 } }));
}
