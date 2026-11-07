/**
 * DEVELOPER TEST SHORTCUT, dev builds only (the caller checks `import.meta.env.DEV`).
 * Product rule: the shipped game has no chapter select or shortcuts, everyone starts at home.
 * This only replays the real flag sequence through `setFlag`, so checkpoints and rules stay honest.
 */
import type { GameStore } from '../store/game-store.ts';

export const DEV_STARTS = {
  /** Outside the house, locket in hand (after Beat 1). */
  street: ['bed_seen', 'drawing_seen', 'drawer_key_taken', 'locket_taken', 'angel_awake', 'journal_1', 'home_done'],
  /** At the intersection with Arcane Bolt (after Beat 3), ready for the garden. */
  garden: [
    'bed_seen', 'drawing_seen', 'drawer_key_taken', 'locket_taken', 'angel_awake', 'journal_1', 'home_done',
    'seq1_done', 'seq2_done', 'spell_bolt',
  ],
  /** Outside Gartner's shed after Beat 5 (seq4_done): fuse and House 66 next. */
  house66: [
    'bed_seen', 'drawing_seen', 'drawer_key_taken', 'locket_taken', 'angel_awake', 'journal_1', 'home_done',
    'seq1_done', 'seq2_done', 'spell_bolt', 'seq3_started', 'spell_ward', 'spell_purify', 'briggs_purified',
    'walkie_found', 'seq3_done', 'seq4_done',
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
  if (start === 'house66') {
    store.setState((s) => ({
      player: { ...s.player, spellsUnlocked: ['arcane_bolt', 'ward', 'purify'], selectedSpell: 'arcane_bolt' },
    }));
  }
  // Put the player at the checkpoint just written.
  store.getState().respawn();
  return failed;
}
