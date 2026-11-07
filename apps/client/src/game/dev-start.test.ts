import { describe, expect, it } from 'vitest';
import { createGameStore } from '../store/game-store.ts';
import { applyDevStart, DEV_STARTS, isDevStart } from './dev-start.ts';

describe('dev start', () => {
  it('replays real flags with no rejection and lands on the right checkpoint', () => {
    for (const [name, checkpoint] of [['street', 'cp_street'], ['garden', 'cp_intersection'], ['house66', 'cp_house66']] as const) {
      const store = createGameStore();
      store.getState().startNewGame('classic');
      expect(applyDevStart(store, name)).toEqual([]);
      expect(store.getState().progress.flags).toEqual([...DEV_STARTS[name]]);
      expect(store.getState().game.checkpointId).toBe(checkpoint);
    }
  });

  it('garden start has Arcane Bolt', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    applyDevStart(store, 'garden');
    expect(store.getState().player.spellsUnlocked).toContain('arcane_bolt');
  });

  it('only accepts known names', () => {
    expect(isDevStart('street')).toBe(true);
    expect(isDevStart('toString')).toBe(false);
    expect(isDevStart(null)).toBe(false);
  });
});
