import { describe, expect, it } from 'vitest';
import { MemorySaveStorage } from '../services/save-storage.ts';
import { createGameStore, selectGameData } from '../store/game-store.ts';
import {
  applySave,
  attachRuntime,
  beginNewSave,
  canContinue,
  markFinished,
  migrate,
  needsOverwriteConfirm,
  saveNotice,
  saveNow,
  type Migration,
} from './save.ts';
import type { RuntimeState } from './world-runtime.ts';

const RUNTIME: RuntimeState = {
  simTime: 12,
  firedTriggers: ['t1'],
  scheduled: [],
  hints: {},
  played: {},
  subtitle: null,
} as unknown as RuntimeState;

function playedStore(storage: MemorySaveStorage) {
  beginNewSave();
  const store = createGameStore({ onCheckpoint: () => void saveNow(store, storage) });
  store.getState().startNewGame('classic');
  for (const f of ['bed_seen', 'drawing_seen', 'drawer_key_taken', 'locket_taken', 'angel_awake', 'home_done']) {
    store.getState().setFlag(f);
  }
  store.setState((s) => ({
    player: { ...s.player, hp: 70, spellsUnlocked: ['arcane_bolt'] },
    progress: {
      ...s.progress,
      carried: ['drawer_key'],
      morality: { value: 5, history: [{ at: 1, delta: 5, reason: 'kind' }] },
      puzzles: { p1_drawer: { solved: true, hintLevel: 1, data: { tries: 2 } } },
    },
    world: { entities: { 'door.home.front': { open: true } } },
  }));
  return store;
}

describe('save round trip (P4)', () => {
  it('saves and reloads into a fresh store with equal state, including runtime', () => {
    const storage = new MemorySaveStorage();
    const store = playedStore(storage);
    const detach = attachRuntime({ getState: () => RUNTIME, restore: () => undefined });
    expect(saveNow(store, storage)).toBe(true);
    detach();

    const loaded = storage.load();
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') return;
    const fresh = createGameStore();
    let restored: RuntimeState | null = null;
    applySave(fresh, loaded.save);
    const detach2 = attachRuntime({ getState: () => RUNTIME, restore: (s) => (restored = s) });
    detach2();

    const a = selectGameData(store.getState());
    const b = selectGameData(fresh.getState());
    expect(b.progress).toEqual(a.progress);
    expect(b.world).toEqual(a.world);
    expect(b.angel).toEqual(a.angel);
    expect(b.game.checkpointId).toBe(a.game.checkpointId);
    expect(b.player.hp).toBe(70);
    expect(b.player.spellsUnlocked).toEqual(['arcane_bolt']);
    expect(restored).toEqual(RUNTIME);
    // Respawn at the checkpoint spawn in the checkpoint's scene.
    expect(b.game.scene).toBe(a.game.scene);
    expect(b.game.phase).toBe('paused');
  });
});

describe('load results', () => {
  it('reports none, corrupt JSON, schema failure, newer version, finished', () => {
    const storage = new MemorySaveStorage();
    expect(storage.load().status).toBe('none');
    storage.raw = '{not json';
    expect(storage.load().status).toBe('corrupt');
    storage.raw = JSON.stringify({ version: 1, nonsense: true });
    expect(storage.load().status).toBe('corrupt');
    storage.raw = '[]';
    expect(storage.load().status).toBe('corrupt');
    storage.raw = JSON.stringify({ version: 99 });
    expect(storage.load()).toEqual({ status: 'newer_version', version: 99 });

    const store = playedStore(storage);
    expect(storage.load().status).toBe('ok');
    expect(markFinished(store, storage)).toBe(true);
    expect(storage.load().status).toBe('finished');
  });

  it('Continue visibility and notices are pure functions of the load result', () => {
    const storage = new MemorySaveStorage();
    const store = playedStore(storage);
    const ok = storage.load();
    expect(canContinue(ok)).toBe(true);
    expect(needsOverwriteConfirm(ok)).toBe(true);
    markFinished(store, storage);
    expect(canContinue(storage.load())).toBe(false);
    expect(canContinue({ status: 'none' })).toBe(false);
    expect(needsOverwriteConfirm({ status: 'none' })).toBe(false);
    expect(needsOverwriteConfirm({ status: 'corrupt' })).toBe(false);
    expect(saveNotice({ status: 'corrupt' })).toMatch(/could not be read/);
    expect(saveNotice({ status: 'newer_version', version: 2 })).toMatch(/newer version/);
    expect(saveNotice({ status: 'none' })).toBeNull();
  });
});

describe('no secrets in saves (P5)', () => {
  it('strips key-like fields and contains no key-like patterns', () => {
    const storage = new MemorySaveStorage();
    const store = playedStore(storage);
    store.setState((s) => ({
      world: { entities: { ...s.world.entities, 'npc.felix.state': { apiKey: 'sk-abc1234567890abcdef', ok: 1 } } },
    }));
    saveNow(store, storage);
    const text = storage.raw ?? '';
    expect(text).not.toMatch(/sk-[A-Za-z0-9]{10,}|api[_-]?key|secret|token|password|cookie|authorization|AIza|Bearer /i);
    expect(text).toContain('"ok":1');
  });
});

describe('migration chain', () => {
  it('runs a fake V0 -> V1 migration, and fails closed on a missing step', () => {
    const v0 = { version: 0 };
    const upgrade: Migration = (raw) => ({ ...raw, version: 1 });
    const storage = new MemorySaveStorage();
    playedStore(storage);
    const base = JSON.parse(storage.raw ?? '{}') as Record<string, unknown>;
    const asV0 = { ...base, version: 0 };
    expect(migrate(asV0, { 0: upgrade }).status).toBe('ok');
    expect(migrate(v0, {}).status).toBe('corrupt');
    expect(migrate(asV0, { 0: () => ({ version: 5 }) }).status).toBe('corrupt');
    expect(migrate(asV0, { 0: () => { throw new Error('x'); } }).status).toBe('corrupt');
  });
});
