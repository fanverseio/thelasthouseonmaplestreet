import { useStore } from 'zustand';
import { beginNewSave, saveNow } from '../game/save.ts';
import { LocalStorageSaveStorage } from '../services/save-storage.ts';
import { SettingsStorage } from '../services/settings-storage.ts';
import { createGameStore, type GameState } from './game-store.ts';
import { createSettingsStore, type SettingsState } from './settings-store.ts';

/** App-wide store instances and React hooks. Game systems use the vanilla stores directly. */
export const saveStorage = new LocalStorageSaveStorage();
export const gameStore = createGameStore({
  // Every checkpoint write autosaves; a brand new game starts a fresh save.
  onCheckpoint: (cp) => {
    if (cp.onEvent === 'new_game') beginNewSave();
    saveNow(gameStore, saveStorage);
  },
});
// Settings load from 	lh.settings at start-up and are written back on every change (Q23).
export const settingsStorage = new SettingsStorage();
export const settingsStore = createSettingsStore(settingsStorage.load());
settingsStore.subscribe((state) => void settingsStorage.save(state));

const IN_GAME = new Set(['playing', 'paused', 'locket', 'overlay', 'sequence']);
// Also save on pause and when quitting to the menu.
gameStore.subscribe((state, prev) => {
  const next = state.game.phase;
  const before = prev.game.phase;
  if (next === before) return;
  if ((next === 'paused' && before === 'playing') || (next === 'menu' && IN_GAME.has(before))) {
    saveNow(gameStore, saveStorage);
  }
});

export function useGame<T>(selector: (state: GameState) => T): T {
  return useStore(gameStore, selector);
}

export function useSettings<T>(selector: (state: SettingsState) => T): T {
  return useStore(settingsStore, selector);
}
