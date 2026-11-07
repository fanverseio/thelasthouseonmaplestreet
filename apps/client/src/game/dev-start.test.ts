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

describe('Last House dev starts', () => {
  it('?start=interior stands in the entrance hall in the Last House scene on cp_interior', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    expect(applyDevStart(store, 'interior')).toEqual([]);
    const s = store.getState();
    expect(s.game.scene).toBe('last_house');
    expect(s.game.checkpointId).toBe('cp_interior');
    expect(s.player.pos).toEqual([0, 0, 20]);
    expect(s.progress.flags).toContain('runes_done');
    expect(s.progress.flags).not.toContain('enc_interior_resolved');
    expect(s.player.spellsUnlocked).toEqual(['arcane_bolt', 'ward', 'purify']);
  });

  it('?start=ritual-door stands in the ritual chamber with the board solved, on cp_ritual', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    expect(applyDevStart(store, 'ritual-door')).toEqual([]);
    const s = store.getState();
    expect(s.game.scene).toBe('last_house');
    expect(s.game.checkpointId).toBe('cp_ritual');
    expect(s.player.pos).toEqual([0, 0, -12]);
    expect(s.progress.flags).toEqual(expect.arrayContaining(['enc_interior_resolved', 'board_solved']));
    expect(s.progress.flags).not.toContain('seq6_done');
    expect(isDevStart('interior')).toBe(true);
    expect(isDevStart('ritual-door')).toBe(true);
  });
});

describe('dev start: lane and grounds', () => {
  it('replays real flags with no rejection and lands on the right checkpoint', () => {
    for (const [name, checkpoint, pos] of [
      ['lane', 'cp_lane', [-58, 0, -20]],
      ['grounds', 'cp_outbuilding', [-52, 0, 25.5]],
    ] as const) {
      const store = createGameStore();
      store.getState().startNewGame('classic');
      expect(applyDevStart(store, name)).toEqual([]);
      expect(store.getState().progress.flags).toEqual([...DEV_STARTS[name]]);
      expect(store.getState().game.checkpointId).toBe(checkpoint);
      expect(store.getState().player.pos).toEqual(pos);
      expect(store.getState().player.spellsUnlocked).toEqual(expect.arrayContaining(['purify', 'ward', 'arcane_bolt']));
    }
  });

  it('lane stops before Beat 7 and grounds before Beat 8; neither skips a later flag', () => {
    expect(DEV_STARTS.lane).toContain('lane_open');
    expect(DEV_STARTS.lane).not.toContain('enc_approach_resolved');
    expect(DEV_STARTS.grounds).toContain('padlock_open');
    expect(DEV_STARTS.grounds).not.toContain('seq5_done');
    expect(isDevStart('lane')).toBe(true);
    expect(isDevStart('grounds')).toBe(true);
  });
});
