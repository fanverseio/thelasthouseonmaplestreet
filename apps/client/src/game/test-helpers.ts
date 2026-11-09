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
import { applyDevStart, type DevStart } from './dev-start.ts';
import { createEncounterWorld, type EncounterBinding, type EncounterRuntime } from './encounter-runtime.ts';
import { STUB_ENCOUNTERS, type StubEncounterId } from './encounter-stub.ts';
import { EnemySystem, type Enemy, type EnemyEvent } from './enemies.ts';
import { gateChanges } from './gates.ts';
import { SIM_DT } from './player.ts';
import { SpellSystem, type SpellEvent, type SpellHit } from './spells.ts';
import type { PlayerPose } from './world-runtime.ts';

export type StartEvent = 'garden' | 'grounds' | 'interior';

/* ---------------- Real fights (tasks 5.6-5.9) ---------------- */

/** The real SpellSystem and EnemySystem of a headless game (what ui/game-view.tsx builds). */
export function createCombat(store: GameStore): { spells: SpellSystem; enemies: EnemySystem } {
  const spells = new SpellSystem({ store });
  const enemies = new EnemySystem({ store, spells, seed: 11 });
  return { spells, enemies };
}

export interface FighterHost {
  store: GameStore;
  spells: SpellSystem;
  enemies: EnemySystem;
  encounters: EncounterRuntime;
  /** The runtime that ticks the encounters (and with them the enemies). */
  world: { tick(dt: number, pose: PlayerPose): void };
  /** Elena's position; the fighter never moves her. */
  pos: { x: number; z: number };
}

/** A story encounter id, or the id of any other live enemy (the dev practice hound). */
export type FightEnemy = StubEncounterId | (string & {});

/**
 * Drives the real fights through the SpellSystem exactly as the player does: select the spell, press LMB, hold,
 * release, with the aim recomputed at the enemy every step. Elena stays put (she is teleported by the test) and,
 * with `keepAlive`, is topped up to full HP and magic before each step so a long fight cannot kill her; the fights
 * themselves (damage, caps, Ward) are covered by the unit tests of enemies.ts and the 5.x test files.
 */
export function createFighter(host: FighterHost, options: { keepAlive?: boolean } = {}) {
  const { store, spells, enemies, encounters, pos } = host;
  const keepAlive = options.keepAlive ?? true;
  const input = { lmbDown: false, lmbHeldMs: 0, lmbTap: false, lmbReleased: false };
  const flags = () => store.getState().progress.flags;
  const enemyOf = (id: FightEnemy): Enemy => {
    const e = id in STUB_ENCOUNTERS ? encounters.fsmEnemy(id as StubEncounterId) : enemies.get(id);
    if (!e) throw new Error(`no FSM enemy for ${id} (is mode 'fsm' on and the enemy spawned?)`);
    return e;
  };

  /** One fixed step of the world, the enemies and the spells, aimed at `at`. */
  const step = (at?: Enemy) => {
    if (keepAlive) {
      store.setState((s) => ({ player: { ...s.player, hp: s.player.hp > 0 ? 100 : s.player.hp, magic: 100 } }));
    }
    host.world.tick(SIM_DT, { x: pos.x, z: pos.z });
    if (input.lmbDown) input.lmbHeldMs += SIM_DT * 1000;
    let aim = { x: pos.x, y: 1.65, z: pos.z, yaw: 0, pitch: 0 };
    if (at) {
      const dx = at.x - pos.x;
      const dz = at.z - pos.z;
      const flat = Math.hypot(dx, dz) || 1e-6;
      aim = { ...aim, yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(at.position.y - 1.65, flat) };
    }
    spells.step(SIM_DT, input, aim, { hostileActive: enemies.hostileActive(), ritualActive: false });
    input.lmbTap = false;
    input.lmbReleased = false;
  };
  const run = (seconds: number, at?: Enemy) => {
    for (let i = 0; i < Math.round(seconds / SIM_DT); i++) step(at);
  };
  const select = (spell: 'arcane_bolt' | 'purify' | 'ward') => {
    expectUnlocked(spell);
    store.getState().selectSpell(spell);
  };
  const expectUnlocked = (spell: string) => {
    if (!store.getState().player.spellsUnlocked.includes(spell as never)) throw new Error(`spell ${spell} is not unlocked`);
  };

  const api = {
    input,
    step,
    run,
    enemy: enemyOf,
    /** Tap LMB with Arcane Bolt (20 damage), then wait out its cooldown. */
    tap(id: FightEnemy) {
      const e = enemyOf(id);
      select('arcane_bolt');
      input.lmbTap = true;
      step(e);
      run(0.5, e); // the projectile flies, the cooldown ends
    },
    /** Hold LMB for the charge time and release: a charged Bolt (45 damage; destroys a stunned enemy). */
    charged(id: FightEnemy) {
      const e = enemyOf(id);
      select('arcane_bolt');
      input.lmbDown = true;
      input.lmbHeldMs = 0;
      run(1.3, e);
      input.lmbDown = false;
      input.lmbReleased = true;
      step(e);
      input.lmbHeldMs = 0;
      run(1.7, e);
    },
    /** Select Purify and hold LMB on the enemy for the channel (2.5 s). */
    purify(id: FightEnemy) {
      const e = enemyOf(id);
      select('purify');
      input.lmbDown = true;
      input.lmbHeldMs = 0;
      run(3, e);
      input.lmbDown = false;
      input.lmbReleased = true;
      step(e);
      input.lmbHeldMs = 0;
      run(0.1, e);
    },
    /** Select Ward and press LMB. */
    ward() {
      select('ward');
      input.lmbDown = true;
      input.lmbHeldMs = 0;
      step();
      input.lmbDown = false;
      input.lmbReleased = true;
      step();
      input.lmbHeldMs = 0;
    },
    /** Bolt taps until the enemy reaches its persistent stun (30% HP). Fails after `maxSeconds` of fighting. */
    stun(id: FightEnemy, maxSeconds = 90) {
      const e = enemyOf(id);
      for (let t = 0; e.state !== 'stunned' && t < maxSeconds; t += 0.55) api.tap(id);
      if (e.state !== 'stunned') throw new Error(`${id} did not stun within ${maxSeconds} s (hp ${e.hp}, state ${e.state})`);
      run(0.1, e);
    },
    /** Stun it (if needed), then settle it: `purify` channels Purify, `destroy` releases a charged Bolt. */
    defeat(id: FightEnemy, choice: 'purify' | 'destroy') {
      if (encounters.view(id as StubEncounterId).state === 'resolved') return;
      const e = enemyOf(id);
      if (e.state !== 'stunned') api.stun(id);
      if (choice === 'purify') api.purify(id);
      else api.charged(id);
      if (encounters.view(id as StubEncounterId).state !== 'resolved') throw new Error(`${id} was not resolved by ${choice} (state ${e.state})`);
    },
    has: (flag: ProgressFlag) => flags().includes(flag),
  };
  return api;
}

export type Fighter = ReturnType<typeof createFighter>;

/**
 * A small headless rig for the fight tests: a dev start, the real world / encounter / enemy / spell systems, a
 * teleporting Elena and a fighter. `keepAlive` is OFF by default here: the fight tests care about damage.
 */
export function createFightRig(start: DevStart, options: { keepAlive?: boolean; bindings?: readonly EncounterBinding[] } = {}) {
  const store = createGameStore();
  store.getState().startNewGame('classic');
  const failed = applyDevStart(store, start);
  if (failed.length > 0) throw new Error(`dev start ${start} rejected ${failed.join(', ')}`);
  store.getState().setPhase('playing');
  store.setState((s) => ({ player: { ...s.player, respawns: 0 } })); // the dev start itself respawns once
  const combat = createCombat(store);
  const { world, encounters } = createEncounterWorld({ store, enemies: combat.enemies, ...(options.bindings && { bindings: options.bindings }) });
  const p = store.getState().player.pos;
  const pos = { x: p[0], z: p[2] };
  const flags = () => store.getState().progress.flags;
  const hp = () => store.getState().player.hp;
  const events: EnemyEvent[] = [];
  combat.enemies.on((e) => events.push(e));
  const fight = createFighter({ store, ...combat, encounters, world, pos }, { keepAlive: options.keepAlive ?? false });
  /** Idle time: the world and the spells (cooldowns, Ward, magic regen) step together, as the player rig does. */
  const tick = (seconds: number) => fight.run(seconds);
  const goTo = (x: number, z: number) => {
    pos.x = x;
    pos.z = z;
    tick(SIM_DT * 2);
  };
  const press = () => world.interact({ x: pos.x, z: pos.z });
  const morality = () => store.getState().progress.morality.value;
  return { store, world, encounters, spells: combat.spells, enemies: combat.enemies, fight, pos, events, flags, hp, tick, goTo, press, morality };
}

export type FightRig = ReturnType<typeof createFightRig>;

/** Deliver a spell hit to the enemy system without flying a projectile (for unit tests of one rule). */
export function injectSpellHit(spells: SpellSystem, hit: Partial<SpellHit> & Pick<SpellHit, 'targetId'>): void {
  const full: SpellHit = { type: 'hit', targetKind: 'enemy', spell: 'arcane_bolt', charged: false, damage: 20, stunned: false, destroys: false, ...hit };
  (spells as unknown as { emit(e: SpellEvent): void }).emit(full);
}

const EVENT_NAME: Record<StartEvent, string> = {
  garden: 'enter:trg.garden.enter',
  grounds: 'enter:trg.grounds.enter',
  interior: 'enter:last_house',
};

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
  const combat = createCombat(store);
  const { world, encounters, choices, ritual, ending } = createEncounterWorld({
    store,
    storage,
    enemies: combat.enemies,
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
  /** Real fights through the SpellSystem (bolts, charged bolt, Purify channel); see createFighter. */
  const fight = createFighter({ store, ...combat, encounters, world, pos });
  return { store, storage, world, encounters, choices, ritual, ending, spells: combat.spells, enemies: combat.enemies, fight, pos, flags, order, changes, clips, tick, goTo, syncPos, press, morality };
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
