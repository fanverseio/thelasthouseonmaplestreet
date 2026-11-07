/**
 * Shared helpers for headless playthrough tests (no React, no Three, no network).
 * `createHeadlessGame` wires the real store, world runtime, encounters, choices, ritual and ending runtimes
 * and gives a teleporting Elena: she is placed next to an entity (movement and collision are covered by the
 * per-beat tests), the sim is ticked at the fixed step, and every flag, video clip and gate change is recorded.
 */
import type { EntityId, ProgressFlag } from '@tlh/shared';
import { GATES } from '../content/world/gates.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import { MemorySaveStorage } from '../services/save-storage.ts';
import { createGameStore, type GameStore } from '../store/game-store.ts';
import { createEncounterWorld } from './encounter-runtime.ts';
import { gateChanges } from './gates.ts';
import { SIM_DT } from './player.ts';

export type StartEvent = 'garden' | 'interior';

const EVENT_NAME: Record<StartEvent, string> = { garden: 'enter:trg.garden.enter', interior: 'enter:last_house' };

/**
 * A fresh Classic game rebuilt from flags (what a dev start does): flags are set one by one through the real
 * `setFlag` (so prerequisites and checkpoint rules apply), an optional entry event writes its checkpoint, and
 * Elena respawns there. Returns the flags that were rejected (empty when fine).
 */
export function buildStateFromFlags(store: GameStore, flags: readonly ProgressFlag[], event?: StartEvent): string[] {
  store.getState().startNewGame('classic');
  const failed: string[] = [];
  for (const flag of flags) if (!store.getState().setFlag(flag).ok) failed.push(flag);
  if (event) store.getState().writeCheckpointForEvent(EVENT_NAME[event]);
  store.getState().respawn();
  store.getState().setPhase('playing');
  return failed;
}

export interface FlagChange {
  flag: ProgressFlag;
  /** Gates that opened with this flag. */
  opened: EntityId[];
  checkpoint: string;
}

export function createHeadlessGame(options: { store?: GameStore; storage?: MemorySaveStorage } = {}) {
  const store = options.store ?? createGameStore();
  if (!options.store) store.getState().startNewGame('classic');
  store.getState().setPhase('playing');
  const storage = options.storage ?? new MemorySaveStorage();
  // Every clip the story asks for, even one that is skipped before the next tick.
  const clips: string[] = [];
  const { world, encounters, choices, ritual, ending } = createEncounterWorld({
    store,
    storage,
    onEffect: (e) => {
      if (e.k === 'video') clips.push(e.clipId);
    },
  });

  const start = store.getState().player.pos;
  const pos = { x: start[0], z: start[2] };
  const flags = () => store.getState().progress.flags;

  // Recorded from here on: every flag in the order it was set, the gates it opened, and every clip shown.
  const order: ProgressFlag[] = [];
  const changes: FlagChange[] = [];
  let seen = flags();
  store.subscribe((s) => {
    const now = s.progress.flags;
    if (now === seen) return;
    const before = seen;
    seen = now;
    for (const flag of now.filter((f) => !before.includes(f))) {
      order.push(flag);
      changes.push({
        flag,
        opened: gateChanges(GATES, before, now).opened,
        checkpoint: s.game.checkpointId,
      });
    }
  });

  const tick = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / SIM_DT); i++) {
      world.tick(SIM_DT, { x: pos.x, z: pos.z });
    }
  };
  /** Stand next to an entity (its placement, `dz` metres south) and let the runtime see it. */
  const goTo = (id: string, dz = 0.3) => {
    const p = PLACEMENTS[id as EntityId];
    if (!p) throw new Error(`no placement for ${id}`);
    pos.x = p.x;
    pos.z = p.z + dz;
    tick(SIM_DT * 2);
  };
  /** Take Elena to wherever the store put her (after a respawn or a scene change). */
  const syncPos = () => {
    const p = store.getState().player.pos;
    pos.x = p[0];
    pos.z = p[2];
  };
  const press = () => world.interact({ x: pos.x, z: pos.z });
  const morality = () => store.getState().progress.morality.value;
  return { store, storage, world, encounters, choices, ritual, ending, pos, flags, order, changes, clips, tick, goTo, syncPos, press, morality };
}

export type HeadlessGame = ReturnType<typeof createHeadlessGame>;

/** Make every network entry point throw, and count the calls. Restore with the returned function. */
export function disableNetwork(): { calls: () => number; restore: () => void } {
  let count = 0;
  const g = globalThis as Record<string, unknown>;
  const names = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource'];
  const saved = names.map((n) => [n, g[n], n in g] as const);
  for (const n of names) {
    g[n] = function blocked() {
      count++;
      throw new Error(`network disabled in headless playthrough: ${n}`);
    };
  }
  return {
    calls: () => count,
    restore: () => {
      for (const [n, value, had] of saved) {
        if (had) g[n] = value;
        else delete g[n];
      }
    },
  };
}
