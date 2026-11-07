import { describe, expect, it } from 'vitest';
import { createGameStore, initialGameData, selectGameData } from './game-store.ts';
import { createSettingsStore, defaultSettings, FOV_MAX, FOV_MIN } from './settings-store.ts';

describe('game store', () => {
  it('starts in boot phase with empty progress', () => {
    const state = createGameStore().getState();
    expect(state.game.phase).toBe('boot');
    expect(state.progress.flags).toEqual([]);
    expect(state.game.checkpointId).toBe('cp_home_start');
  });

  it('holds only JSON-serialisable data', () => {
    const data = selectGameData(createGameStore().getState());
    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
  });

  it('startNewGame resets data and sets both modes', () => {
    const store = createGameStore();
    store.setState({ progress: { ...initialGameData().progress, flags: ['locket_taken'] } });
    store.getState().startNewGame('ai');
    const { game, progress } = store.getState();
    expect(progress.flags).toEqual([]);
    expect(game).toMatchObject({ preferredMode: 'ai', activeMode: 'ai', phase: 'playing' });
  });

  it('setPhase changes only the phase', () => {
    const store = createGameStore();
    const before = selectGameData(store.getState());
    store.getState().setPhase('menu');
    const after = selectGameData(store.getState());
    expect(after.game.phase).toBe('menu');
    expect({ ...after, game: { ...after.game, phase: 'boot' } }).toEqual(before);
  });

  it('separate stores do not share state', () => {
    const a = createGameStore();
    const b = createGameStore();
    a.getState().setPhase('menu');
    expect(b.getState().game.phase).toBe('boot');
  });
});

describe('settings store', () => {
  it('defaults are within documented ranges', () => {
    const settings = defaultSettings();
    expect(settings.fieldOfView).toBeGreaterThanOrEqual(FOV_MIN);
    expect(settings.fieldOfView).toBeLessThanOrEqual(FOV_MAX);
    for (const value of Object.values(settings.volume)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('clamps field of view to 70-100', () => {
    const store = createSettingsStore();
    store.getState().setFieldOfView(140);
    expect(store.getState().fieldOfView).toBe(FOV_MAX);
    store.getState().setFieldOfView(10);
    expect(store.getState().fieldOfView).toBe(FOV_MIN);
  });
});
