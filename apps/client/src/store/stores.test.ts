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

describe('settings updates', () => {
  it('clamps volume, sensitivity and field of view', () => {
    const store = createSettingsStore();
    store.getState().updateSettings({ volume: { master: 5 }, mouseSensitivity: 99, fieldOfView: 10 });
    const s = store.getState();
    expect(s.volume.master).toBe(1);
    expect(s.volume.music).toBe(defaultSettings().volume.music);
    expect(s.mouseSensitivity).toBe(3);
    expect(s.fieldOfView).toBe(FOV_MIN);
  });
});

describe('game store progression', () => {
  it('setFlag writes the checkpoint and calls the autosave hook', () => {
    const seen: string[] = [];
    const store = createGameStore({ onCheckpoint: (cp) => seen.push(cp.id) });
    store.getState().startNewGame('classic');
    for (const f of ['locket_taken', 'angel_awake', 'home_done']) expect(store.getState().setFlag(f).ok).toBe(true);
    expect(store.getState().game.checkpointId).toBe('cp_street');
    expect(seen).toEqual(['cp_home_start', 'cp_street']);
  });

  it('rejected flags change nothing and write no checkpoint', () => {
    const seen: string[] = [];
    const store = createGameStore({ onCheckpoint: (cp) => seen.push(cp.id) });
    expect(store.getState().setFlag('seq2_done').ok).toBe(false);
    expect(store.getState().setFlag('nonsense').ok).toBe(false);
    expect(store.getState().progress.flags).toEqual([]);
    expect(seen).toEqual([]);
  });

  it('respawn restores health and magic but keeps flags', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    for (const f of ['locket_taken', 'angel_awake', 'home_done']) store.getState().setFlag(f);
    store.setState((s) => ({ player: { ...s.player, hp: 0, magic: 3 } }));
    store.getState().respawn();
    const s = store.getState();
    expect(s.player).toMatchObject({ hp: 100, magic: 100, pos: [-19.5, 0, 32.5] });
    expect(s.progress.flags).toEqual(['locket_taken', 'angel_awake', 'home_done']);
  });

  it('entering the Last House writes cp_interior', () => {
    const store = createGameStore();
    store.getState().writeCheckpointForEvent('enter:last_house');
    expect(store.getState().game.checkpointId).toBe('cp_interior');
  });
});
