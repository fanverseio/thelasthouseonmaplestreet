import { useStore } from 'zustand';
import { createGameStore, type GameState } from './game-store.ts';
import { createSettingsStore, type SettingsState } from './settings-store.ts';

/** App-wide store instances and React hooks. Game systems use the vanilla stores directly. */
export const gameStore = createGameStore();
export const settingsStore = createSettingsStore();

export function useGame<T>(selector: (state: GameState) => T): T {
  return useStore(gameStore, selector);
}

export function useSettings<T>(selector: (state: SettingsState) => T): T {
  return useStore(settingsStore, selector);
}
