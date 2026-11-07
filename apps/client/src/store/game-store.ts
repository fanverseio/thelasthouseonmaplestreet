import {
  emptyActionLedger,
  type ActionLedger,
  type AiStatus,
  type ChatTurn,
  type CheckpointId,
  type EntityId,
  type GameEvent,
  type ItemId,
  type Mode,
  type ProgressFlag,
  type PuzzleId,
  type SceneId,
  type SpellId,
} from '@tlh/shared';
import { createStore } from 'zustand/vanilla';

/**
 * Game state store: serialisable data only, grouped by slice.
 * Hot simulation data (projectiles, particles, per-frame positions) lives inside systems, not here.
 * See ARCHITECTURE.md section 4.5. Actions grow with the systems in later tasks.
 */

export const GAME_PHASES = [
  'boot',
  'warning',
  'menu',
  'playing',
  'paused',
  'locket',
  'overlay',
  'sequence',
  'ending',
  'credits',
] as const;
export type GamePhase = (typeof GAME_PHASES)[number];

export interface GameSlice {
  phase: GamePhase;
  preferredMode: Mode;
  activeMode: Mode;
  aiStatus: AiStatus;
  checkpointId: CheckpointId;
  /** Which 3D scene is loaded. Derived from the checkpoint on load, so it is not saved. */
  scene: SceneId;
}

export interface PlayerSlice {
  hp: number;
  magic: number;
  selectedSpell: SpellId;
  spellsUnlocked: SpellId[];
  pos: [number, number, number];
  yaw: number;
}

export interface PuzzleState {
  solved: boolean;
  hintLevel: number;
  data: Record<string, unknown>;
}

export interface ProgressSlice {
  flags: ProgressFlag[];
  morality: { value: number; history: { at: number; delta: number; reason: string }[] };
  carried: ItemId[];
  puzzles: Partial<Record<PuzzleId, PuzzleState>>;
}

export interface WorldSlice {
  entities: Record<EntityId, Record<string, unknown>>;
}

export interface AngelSlice {
  summary: string;
  recent: ChatTurn[];
  eventLog: GameEvent[];
  actionLedger: ActionLedger;
  sideQuests: { templateId: string; targetId: EntityId; state: 'active' | 'done' | 'closed' }[];
  sideQuestsOffered: number;
  glitchesUsed: number;
  simTime: number;
}

export interface GameData {
  game: GameSlice;
  player: PlayerSlice;
  progress: ProgressSlice;
  world: WorldSlice;
  angel: AngelSlice;
}

export interface GameActions {
  setPhase: (phase: GamePhase) => void;
  setScene: (scene: SceneId) => void;
  /** Reset everything for a new playthrough in the chosen mode. */
  startNewGame: (mode: Mode) => void;
}

export type GameState = GameData & GameActions;

export function initialGameData(mode: Mode = 'classic'): GameData {
  return {
    game: {
      phase: 'boot',
      preferredMode: mode,
      activeMode: mode,
      aiStatus: 'unavailable',
      checkpointId: 'cp_home_start',
      scene: 'exterior',
    },
    player: {
      hp: 100,
      magic: 100,
      selectedSpell: 'arcane_bolt',
      spellsUnlocked: [],
      pos: [0, 0, 0],
      yaw: 0,
    },
    progress: { flags: [], morality: { value: 0, history: [] }, carried: [], puzzles: {} },
    world: { entities: {} },
    angel: {
      summary: '',
      recent: [],
      eventLog: [],
      actionLedger: emptyActionLedger(),
      sideQuests: [],
      sideQuestsOffered: 0,
      glitchesUsed: 0,
      simTime: 0,
    },
  };
}

/** Plain data copy of the state (no action functions), e.g. for saving or tests. */
export function selectGameData(state: GameState): GameData {
  const { game, player, progress, world, angel } = state;
  return { game, player, progress, world, angel };
}

export function createGameStore() {
  return createStore<GameState>()((set) => ({
    ...initialGameData(),
    setPhase: (phase) => set((state) => ({ game: { ...state.game, phase } })),
    setScene: (scene) => set((state) => ({ game: { ...state.game, scene } })),
    startNewGame: (mode) => set(() => ({ ...initialGameData(mode), game: { ...initialGameData(mode).game, phase: 'playing' } })),
  }));
}

export type GameStore = ReturnType<typeof createGameStore>;
