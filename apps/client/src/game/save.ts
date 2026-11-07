import {
  CURRENT_SAVE_VERSION,
  SaveFileV1Schema,
  type SaveFileV1,
} from '@tlh/shared';
import type { GameStore } from '../store/game-store.ts';
import { selectGameData } from '../store/game-store.ts';
import type { SaveStorage } from '../services/save-storage.ts';
import { respawnPlan } from './checkpoints.ts';
import type { RuntimeState } from './world-runtime.ts';

/** Save system (task 4.1): serialise / migrate / load / apply. Never throws on bad input. */

export type LoadResult =
  | { status: 'none' }
  | { status: 'ok'; save: SaveFileV1 }
  | { status: 'finished'; save: SaveFileV1 }
  | { status: 'corrupt' }
  | { status: 'newer_version'; version: number };

/** One step per version: MIGRATIONS[n] turns a version n file into version n + 1. */
export type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export function migrate(
  raw: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  current: number = CURRENT_SAVE_VERSION,
): LoadResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { status: 'corrupt' };
  let data = raw as Record<string, unknown>;
  let version = data.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) return { status: 'corrupt' };
  if (version > current) return { status: 'newer_version', version };
  while (version < current) {
    const step = migrations[version];
    if (!step) return { status: 'corrupt' };
    try {
      data = step(data);
    } catch {
      return { status: 'corrupt' };
    }
    if (data.version !== version + 1) return { status: 'corrupt' };
    version += 1;
  }
  const parsed = SaveFileV1Schema.safeParse(data);
  if (!parsed.success) return { status: 'corrupt' };
  return { status: parsed.data.finished ? 'finished' : 'ok', save: parsed.data };
}

/** Parse stored text. Null means no save. */
export function parseSave(text: string | null): LoadResult {
  if (text === null) return { status: 'none' };
  try {
    return migrate(JSON.parse(text));
  } catch {
    return { status: 'corrupt' };
  }
}

/** Continue is offered only for a valid, unfinished save. */
export function canContinue(result: LoadResult): boolean {
  return result.status === 'ok';
}

/** New Game asks before overwriting a readable save (or one from a newer game version). */
export function needsOverwriteConfirm(result: LoadResult): boolean {
  return result.status === 'ok' || result.status === 'finished' || result.status === 'newer_version';
}

export function saveNotice(result: LoadResult): string | null {
  if (result.status === 'corrupt') return 'Your saved game could not be read. Start a New Game to continue.';
  if (result.status === 'newer_version') {
    return 'This save was made by a newer version of the game. Start a New Game, or update the game to continue it.';
  }
  return null;
}

/** Drop anything that looks like a credential before it can reach storage. */
const SECRET_KEY = /api[_-]?key|secret|token|password|cookie|authorization|access[_-]?code|base[_-]?url|provider/i;
export function scrub<T>(value: T): T {
  if (Array.isArray(value)) return value.map(scrub) as T;
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) if (!SECRET_KEY.test(k)) out[k] = scrub(v);
    return out as T;
  }
  return value;
}

type StoreState = ReturnType<GameStore['getState']>;

export function serialise(
  state: StoreState,
  runtime: RuntimeState | null,
  meta: { createdAt: string; now: string; finished: boolean },
): SaveFileV1 {
  const { game, player, progress, world, angel } = selectGameData(state);
  const file: SaveFileV1 = {
    version: 1,
    createdAt: meta.createdAt,
    updatedAt: meta.now,
    finished: meta.finished,
    preferredMode: game.preferredMode,
    checkpointId: game.checkpointId,
    progress: scrub(structuredClone(progress)),
    player: {
      hp: player.hp,
      magic: player.magic,
      spellsUnlocked: [...player.spellsUnlocked],
      pos: [...player.pos],
      yaw: player.yaw,
    },
    world: scrub(structuredClone(world.entities)),
    angel: scrub(structuredClone(angel)),
  };
  if (runtime) file.runtime = scrub(structuredClone(runtime)) as unknown as Record<string, unknown>;
  return SaveFileV1Schema.parse(file);
}

/** Runtime bridge: the world runtime lives in the game view, so it registers itself here. */
let runtimeSource: Pick<{ getState(): RuntimeState; restore(s: RuntimeState): void }, 'getState' | 'restore'> | null = null;
let pendingRuntime: RuntimeState | null = null;
let createdAt: string | null = null;

export function attachRuntime(rt: NonNullable<typeof runtimeSource>): () => void {
  runtimeSource = rt;
  if (pendingRuntime) {
    const p = pendingRuntime;
    pendingRuntime = null;
    rt.restore(p);
  }
  return () => {
    if (runtimeSource === rt) runtimeSource = null;
  };
}

export function beginNewSave(): void {
  createdAt = null;
  pendingRuntime = null;
}

export function saveNow(
  store: GameStore,
  storage: SaveStorage,
  opts: { finished?: boolean; now?: () => Date } = {},
): boolean {
  const now = (opts.now?.() ?? new Date()).toISOString();
  createdAt ??= now;
  const runtime = runtimeSource ? runtimeSource.getState() : pendingRuntime;
  try {
    const file = serialise(store.getState(), runtime, { createdAt, now, finished: opts.finished ?? false });
    return storage.save(file);
  } catch {
    return false;
  }
}

/** Ending hook: mark the stored save finished so Continue disappears. */
export function markFinished(store: GameStore, storage: SaveStorage): boolean {
  return saveNow(store, storage, { finished: true });
}

/** Load a save into the store. The player respawns at the checkpoint spawn point. */
export function applySave(store: GameStore, save: SaveFileV1): void {
  const plan = respawnPlan(save.checkpointId);
  const cp = plan.checkpoint;
  store.setState((s) => ({
    game: { ...s.game, preferredMode: save.preferredMode, activeMode: save.preferredMode, checkpointId: cp.id, scene: cp.scene, phase: 'paused' },
    player: {
      ...s.player,
      hp: save.player.hp > 0 ? save.player.hp : plan.hp,
      magic: save.player.magic,
      spellsUnlocked: [...save.player.spellsUnlocked],
      pos: [cp.spawn.x, 0, cp.spawn.z],
      yaw: cp.spawn.yaw,
    },
    progress: structuredClone(save.progress) as typeof s.progress,
    world: { entities: structuredClone(save.world) },
    angel: structuredClone(save.angel) as typeof s.angel,
  }));
  createdAt = save.createdAt;
  pendingRuntime = (save.runtime as unknown as RuntimeState | undefined) ?? null;
  if (runtimeSource && pendingRuntime) {
    const p = pendingRuntime;
    pendingRuntime = null;
    runtimeSource.restore(p);
  }
}
