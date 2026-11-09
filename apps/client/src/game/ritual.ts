/**
 * Final ritual (Beat 11, task 5.10): the smoke pattern director and the three anchor mechanics. Headless, sim time
 * only. The smoke is NOT an FSM enemy: it has no HP and no body. While the ritual is active (`ritual_active`, not
 * yet `anchors_all`) the director paints rings, hazard pools and smoke-wraith spawns around Elena
 * (docs/combat-tuning.md "The smoke"); all damage goes through the EnemySystem's `damagePlayer`, i.e. through
 * `SpellSystem.absorbDamage`, so a Ward blocks it. Pressure follows the anchors restored and stops at
 * `anchors_all`. It holds its breath during any cinematic clip.
 *
 * The anchors (docs/puzzles.md P6), any order, each saved the moment it is restored (a flag):
 *  - north: break the smoke shell (100 HP, registered as a `shell` SpellTarget) with Arcane Bolt, then hold E 3 s.
 *    A broken shell regrows after 20 s if the anchor is not restored (the progress of the hold is lost then).
 *  - east: hold E 6 s to channel while the smoke strikes every 1.5 s. A strike the Ward does not block deals 10 and
 *    pauses the channel for a moment; the progress is kept, always.
 *  - west: channel Purify on the anchor for 4 s (the anchor is a `purifyChannel` SpellTarget). Wraiths harass;
 *    damage that gets through interrupts the channel, the progress is kept.
 * Magic never blocks an anchor: while an unrestored anchor is near (and when its task starts) Elena's magic is
 * topped up to that anchor's floor. Anchors and `ritual_active` are flags, so death keeps them; the progress of a
 * task lives here and survives death too (only the shell's regrow clock restarts).
 */
import type { EntityId, ProgressFlag } from '@tlh/shared';
import { SMOKE_WRAITH } from '../content/enemies/smoke-wraith.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import type { GameStore } from '../store/game-store.ts';
import type { EnemyEvent, EnemySystem } from './enemies.ts';
import type { SpellEvent, SpellSystem, SpellTarget } from './spells.ts';
import type { PlayerPose, WorldRuntime } from './world-runtime.ts';

/* ---------------- Tuning ---------------- */

export type AnchorDir = 'north' | 'east' | 'west';
export const ANCHOR_DIRS: readonly AnchorDir[] = ['north', 'east', 'west'];

/**
 * One typed config. From combat-tuning.md: ring 1.2 s telegraph / 15 damage / radius 2.5 m, pool 5 damage/s, wraiths
 * (2 alive, respawn 8 s), pressure by anchors restored. Everything marked "invented" is not in the doc.
 */
export const RITUAL_TUNING = {
  /** Index = anchors restored (0..2); at 3 every attack stops. */
  pressure: [
    { wraiths: 1, ringEveryS: 4, pools: false },
    { wraiths: 2, ringEveryS: 3.5, pools: false },
    { wraiths: 2, ringEveryS: 3, pools: true },
  ],
  ring: { telegraphS: 1.2, radius: 2.5, damage: 15, /** How long the "landed" cue shows (invented). */ landedS: 0.6 },
  /** Pools drift slowly towards Elena; all numbers except `dps` are invented. */
  pool: { radius: 1.6, dps: 5, tickS: 0.7, driftMps: 0.5, lifeS: 14, everyS: 6, max: 2, spawnMinM: 4, spawnMaxM: 8 },
  /** `respawnS` is from the doc; the others are invented. */
  wraith: { respawnS: 8, corpseS: 2, graceAfterDeathS: 3 },
  /** The chamber, where pools may appear (interior-layout.ts: x -12..12, z -30..-6, minus a margin). */
  chamber: { minX: -10, maxX: 10, minZ: -28, maxZ: -8 },
  north: { holdS: 3, shellHp: 100, shellRegrowS: 20, shellRadius: 1.4, shellY: 1.1, floorMagic: 40 },
  east: { holdS: 6, strikeEveryS: 1.5, strikeWarnS: 0.5, strikeDamage: 10, strikePauseS: 0.8, floorMagic: 25 },
  west: { channelS: 4, harassWraiths: 2, floorMagic: 30, targetRadius: 1.0, targetY: 1.2 },
  /** Elena may keep a channel going this close to the anchor (INTERACT_RANGE 2.5 + the anchor's radius, invented margin). */
  rangeM: 3.1,
  /** Inside this distance of an unrestored anchor the magic floor applies and the rune icon shows. */
  nearM: 8,
  hintS: 3,
} as const;

/** Seconds between rings by anchors restored (0, 1, 2); kept as an export for the tests. */
export const STRIKE_INTERVALS = RITUAL_TUNING.pressure.map((p) => p.ringEveryS) as readonly number[];
export const STRIKE_WARNING_SECONDS = RITUAL_TUNING.ring.telegraphS;
export const STRIKE_LANDED_SECONDS = RITUAL_TUNING.ring.landedS;

const ANCHORS: readonly ProgressFlag[] = ['anchor_north', 'anchor_east', 'anchor_west'];
const WRAITH_SPAWNS = ['spawn.ritual.wraith_1', 'spawn.ritual.wraith_2', 'spawn.ritual.wraith_3', 'spawn.ritual.wraith_4'] as const;
export const SHELL_ID = 'shell.ritual.north';
export const WEST_TARGET_ID = 'anchor.ritual.west';
/** The spell that does each anchor (the rune icon / hint). */
export const ANCHOR_SPELL = { north: 'arcane_bolt', east: 'ward', west: 'purify' } as const;
export const ANCHOR_HINTS = {
  shell: 'A smoke shell covers the anchor. Break it with Arcane Bolt (1).',
  east: 'Hold E. The smoke strikes: raise your Ward (3).',
  west: 'Channel Purify (2) on the anchor. Hold the left mouse button.',
} as const;

const anchorId = (dir: AnchorDir): EntityId => `anchor.ritual.${dir}` as EntityId;

/* ---------------- Views and events ---------------- */

export type StrikePhase = 'idle' | 'warning' | 'landed';

export interface RitualView {
  /** The smoke is attacking (ritual active, not finished). */
  active: boolean;
  /** Anchors restored so far, 0..3. */
  anchors: number;
  strike: StrikePhase;
  /** Rings waiting to land: `t` 0..1 progress of the telegraph. */
  rings: readonly { x: number; z: number; radius: number; t: number }[];
  pools: readonly { x: number; z: number; radius: number }[];
  /** The task Elena is performing with E (north, east), else null. `paused`: a strike just interrupted it. */
  channel: { dir: AnchorDir; progress: number; paused: boolean } | null;
  /** Progress 0..1 of each unrestored anchor's task (kept across interruptions and death). */
  progress: Readonly<Record<AnchorDir, number>>;
  shell: { hp: number; maxHp: number; broken: boolean } | null;
  /** East: a strike is about to land on Elena. */
  eastWarning: boolean;
  /** The nearest unrestored anchor in range and the spell it needs (the rune icon). */
  near: { dir: AnchorDir; spell: 'arcane_bolt' | 'ward' | 'purify' } | null;
  hint: string | null;
}

export type RitualEvent =
  | { type: 'ring_warning'; x: number; z: number; seconds: number }
  | { type: 'ring_landed'; x: number; z: number; hit: boolean; blocked: boolean }
  | { type: 'pool_spawned'; x: number; z: number }
  | { type: 'wraith_spawned'; id: string }
  | { type: 'shell_hit'; hp: number }
  | { type: 'shell_broken' }
  | { type: 'shell_regrown' }
  | { type: 'channel_started'; dir: AnchorDir }
  | { type: 'channel_paused'; dir: AnchorDir }
  | { type: 'channel_interrupted'; dir: AnchorDir }
  | { type: 'anchor_restored'; dir: AnchorDir };

export interface RitualRuntime {
  attach(world: WorldRuntime): void;
  /** Advance by one sim step (createEncounterWorld calls this from the world tick). */
  tick(dt: number, pose: PlayerPose): void;
  /** E on an anchor (the `anchor` action). Returns a failure reason, or null when a task started. */
  pressAnchor(dir: AnchorDir): string | null;
  view(): RitualView;
  /** Rings that have landed since the ritual began (for tests and later scoring). */
  readonly strikesLanded: number;
  /** Seconds of task progress banked on an anchor. */
  anchorProgress(dir: AnchorDir): number;
  /** Live smoke wraiths. */
  wraithCount(): number;
  on(listener: (e: RitualEvent) => void): () => void;
  readonly version: number;
  subscribe(listener: () => void): () => void;
}

export interface RitualOptions {
  store: GameStore;
  /** Anchors need the spell system (shell, Purify) and the enemy system (damage, wraiths); without them the director is inert. */
  spells?: SpellSystem;
  enemies?: EnemySystem;
  seed?: number;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const T = RITUAL_TUNING;

export function createRitualRuntime(options: RitualOptions): RitualRuntime {
  const { store, spells, enemies } = options;
  const rng = mulberry32(options.seed ?? 7);
  let world: WorldRuntime | null = null;
  let pose: PlayerPose = { x: 0, z: 0, yaw: 0 };
  let version = 0;
  const listeners = new Set<() => void>();
  const eventListeners = new Set<(e: RitualEvent) => void>();
  const bump = () => {
    version++;
    for (const l of listeners) l();
  };
  const emit = (e: RitualEvent) => {
    for (const l of eventListeners) l(e);
  };

  /* ---- state ---- */
  let ringClock = 0;
  let landedLeft = 0;
  let landed = 0;
  let tauntOne = false;
  let tauntTwo = false;
  const rings: { x: number; z: number; left: number }[] = [];
  const pools: { x: number; z: number; left: number; tickLeft: number }[] = [];
  let poolClock = 0;
  const wraithIds = new Set<string>();
  const corpses = new Map<string, number>();
  let wraithSerial = 0;
  let wraithClock = 0;
  let paused = false;
  let lastRespawns = store.getState().player.respawns;
  let channel: { dir: AnchorDir } | null = null;
  let pauseLeft = 0;
  let strikeClock = 0;
  let eastWarning = false;
  const progress: Record<AnchorDir, number> = { north: 0, east: 0, west: 0 };
  let shellHp: number = T.north.shellHp;
  let shellBrokenFor: number | null = null; // null: intact
  let hint: string | null = null;
  let hintLeft = 0;
  let shellSaid = false;
  let lastNear = '';
  const offTargets = new Map<string, () => void>();

  const flags = () => store.getState().progress.flags;
  const anchorCount = () => ANCHORS.filter((f) => flags().includes(f)).length;
  const isActive = () => flags().includes('ritual_active') && !flags().includes('anchors_all');
  const restored = (dir: AnchorDir) => flags().includes(`anchor_${dir}` as ProgressFlag);
  const pressure = () => T.pressure[Math.min(anchorCount(), T.pressure.length - 1)]!;
  const clipPlaying = () => world !== null && (world.sequences.active !== null || world.video !== null);
  const holdSeconds = (dir: AnchorDir) => (dir === 'north' ? T.north.holdS : dir === 'east' ? T.east.holdS : T.west.channelS);
  const distTo = (dir: AnchorDir): number => {
    const p = PLACEMENTS[anchorId(dir)];
    return p ? Math.hypot(pose.x - p.x, pose.z - p.z) : Infinity;
  };
  const shellBroken = () => shellBrokenFor !== null;

  function setHint(text: string): void {
    hint = text;
    hintLeft = T.hintS;
    bump();
  }

  /* ---- spell targets (north shell, west anchor) ---- */

  function shellTarget(): SpellTarget {
    const p = PLACEMENTS[anchorId('north')]!;
    return {
      id: SHELL_ID,
      kind: 'shell',
      position: { x: p.x, y: T.north.shellY, z: p.z },
      radius: T.north.shellRadius,
      accepts: { bolt: 'any', purify: false },
    };
  }

  function westTarget(): SpellTarget {
    const p = PLACEMENTS[anchorId('west')]!;
    return {
      id: WEST_TARGET_ID,
      kind: 'anchor',
      position: { x: p.x, y: T.west.targetY, z: p.z },
      radius: T.west.targetRadius,
      accepts: { bolt: 'none', purify: true },
      purifyChannel: {
        seconds: T.west.channelS,
        resume: () => progress.west,
        onProgress: (time) => {
          progress.west = time;
        },
      },
    };
  }

  function setTarget(id: string, want: boolean, make: () => SpellTarget): void {
    if (!spells) return;
    const has = offTargets.has(id);
    if (want && !has) offTargets.set(id, spells.register(make()));
    else if (!want && has) {
      offTargets.get(id)?.();
      offTargets.delete(id);
    }
  }

  function syncTargets(on: boolean): void {
    setTarget(SHELL_ID, on && !restored('north') && !shellBroken(), shellTarget);
    setTarget(WEST_TARGET_ID, on && !restored('west'), westTarget);
  }

  const offSpells = spells?.on((ev: SpellEvent) => {
    if (ev.type !== 'hit' || !isActive()) return;
    if (ev.targetId === SHELL_ID && ev.damage > 0 && !shellBroken()) hitShell(ev.damage);
    else if (ev.targetId === WEST_TARGET_ID && ev.spell === 'purify') restore('west');
  });
  void offSpells;

  function hitShell(damage: number): void {
    shellHp = Math.max(0, shellHp - damage);
    emit({ type: 'shell_hit', hp: shellHp });
    if (shellHp <= 0) {
      shellBrokenFor = 0;
      syncTargets(true);
      emit({ type: 'shell_broken' });
      setHint('The shell breaks. Hold E to restore the anchor.');
    }
    bump();
  }

  /* ---- anchors ---- */

  function restore(dir: AnchorDir): void {
    if (restored(dir)) return;
    const r = store.getState().setFlag(`anchor_${dir}` as ProgressFlag);
    if (!r.ok) return;
    if (channel?.dir === dir) stopChannel();
    progress[dir] = holdSeconds(dir);
    syncTargets(true);
    emit({ type: 'anchor_restored', dir });
    bump();
  }

  function stopChannel(): void {
    if (!channel) return;
    channel = null;
    pauseLeft = 0;
    strikeClock = 0;
    eastWarning = false;
    bump();
  }

  /** Raise magic to at least `floor` (magic must never block an anchor). */
  function ensureMagic(floor: number): void {
    store.setState((s) => (s.player.magic >= floor ? s : { player: { ...s.player, magic: floor } }));
  }

  const FLOORS: Record<AnchorDir, number> = { north: T.north.floorMagic, east: T.east.floorMagic, west: T.west.floorMagic };

  function magicFloor(): void {
    for (const dir of ANCHOR_DIRS) if (!restored(dir) && distTo(dir) <= T.nearM) ensureMagic(FLOORS[dir]);
  }

  function pressAnchor(dir: AnchorDir): string | null {
    if (!isActive()) return 'not_active';
    if (restored(dir)) return 'already_restored';
    if (!spells || !enemies) return 'no_combat_runtime';
    ensureMagic(FLOORS[dir]); // the task starts: magic can never be the reason it fails
    if (dir === 'west') {
      setHint(ANCHOR_HINTS.west);
      return 'use_purify';
    }
    if (dir === 'north' && !shellBroken()) {
      setHint(ANCHOR_HINTS.shell);
      if (!shellSaid) {
        shellSaid = true;
        world?.say('vo_angel_p6_h_north');
      }
      return 'shell_intact';
    }
    if (channel?.dir === dir) return null;
    channel = { dir };
    pauseLeft = 0;
    strikeClock = 0;
    eastWarning = false;
    if (dir === 'east') setHint(ANCHOR_HINTS.east);
    emit({ type: 'channel_started', dir });
    bump();
    return null;
  }

  function stepChannel(dt: number): void {
    if (!channel) return;
    const { dir } = channel;
    if (!world?.held || distTo(dir) > T.rangeM || restored(dir)) {
      stopChannel();
      return;
    }
    if (dir === 'east') stepEastStrikes(dt);
    if (pauseLeft > 0) {
      pauseLeft = Math.max(0, pauseLeft - dt);
    } else {
      progress[dir] += dt;
      if (progress[dir] >= holdSeconds(dir)) {
        restore(dir);
        return;
      }
    }
    bump();
  }

  /** East: the smoke strikes Elena every 1.5 s. The Ward blocks it; a strike that gets through pauses the channel. */
  function stepEastStrikes(dt: number): void {
    if (pauseLeft > 0) return;
    strikeClock += dt;
    const warn = strikeClock >= T.east.strikeEveryS - T.east.strikeWarnS;
    if (warn !== eastWarning) {
      eastWarning = warn;
      if (warn) emit({ type: 'ring_warning', x: pose.x, z: pose.z, seconds: T.east.strikeWarnS });
    }
    if (strikeClock < T.east.strikeEveryS) return;
    strikeClock = 0;
    eastWarning = false;
    const r = enemies?.damagePlayer(T.east.strikeDamage, 'smoke_strike') ?? { dealt: 0, blocked: true };
    landed++;
    landedLeft = T.ring.landedS;
    emit({ type: 'ring_landed', x: pose.x, z: pose.z, hit: !r.blocked, blocked: r.blocked });
    if (!r.blocked) {
      pauseLeft = T.east.strikePauseS;
      emit({ type: 'channel_paused', dir: 'east' });
    }
  }

  /* ---- shell regrow ---- */

  function stepShell(dt: number): void {
    if (shellBrokenFor === null || restored('north')) return;
    if (channel?.dir === 'north') return; // a restore in progress holds the shell down
    shellBrokenFor += dt;
    if (shellBrokenFor >= T.north.shellRegrowS) {
      shellBrokenFor = null;
      shellHp = T.north.shellHp;
      progress.north = 0; // the fail state: the work on the anchor is lost with the shell
      syncTargets(true);
      emit({ type: 'shell_regrown' });
      setHint('The shell has grown back. Break it again.');
    }
  }

  /* ---- the smoke: rings, pools, wraiths ---- */

  function spawnRing(): void {
    rings.push({ x: pose.x, z: pose.z, left: T.ring.telegraphS });
    emit({ type: 'ring_warning', x: pose.x, z: pose.z, seconds: T.ring.telegraphS });
    bump();
  }

  function stepRings(dt: number): void {
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]!;
      r.left -= dt;
      if (r.left > 0) continue;
      rings.splice(i, 1);
      const inside = Math.hypot(pose.x - r.x, pose.z - r.z) <= T.ring.radius;
      let blocked = false;
      if (inside) blocked = enemies?.damagePlayer(T.ring.damage, 'smoke_ring').blocked ?? false;
      landed++;
      landedLeft = T.ring.landedS;
      emit({ type: 'ring_landed', x: r.x, z: r.z, hit: inside, blocked });
      if (!tauntOne) {
        tauntOne = true;
        world?.say('vo_smoke_b11_01');
      } else if (!tauntTwo && anchorCount() >= 2) {
        tauntTwo = true;
        world?.say('vo_smoke_b11_02');
      }
      bump();
    }
  }

  const clampChamber = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  function spawnPool(): void {
    const a = rng() * Math.PI * 2;
    const d = T.pool.spawnMinM + rng() * (T.pool.spawnMaxM - T.pool.spawnMinM);
    const x = clampChamber(pose.x + Math.cos(a) * d, T.chamber.minX, T.chamber.maxX);
    const z = clampChamber(pose.z + Math.sin(a) * d, T.chamber.minZ, T.chamber.maxZ);
    pools.push({ x, z, left: T.pool.lifeS, tickLeft: T.pool.tickS });
    emit({ type: 'pool_spawned', x, z });
    bump();
  }

  function stepPools(dt: number): void {
    for (let i = pools.length - 1; i >= 0; i--) {
      const p = pools[i]!;
      p.left -= dt;
      if (p.left <= 0) {
        pools.splice(i, 1);
        bump();
        continue;
      }
      // Drift slowly towards Elena, inside the chamber.
      const dx = pose.x - p.x;
      const dz = pose.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.2) {
        p.x = clampChamber(p.x + (dx / d) * T.pool.driftMps * dt, T.chamber.minX, T.chamber.maxX);
        p.z = clampChamber(p.z + (dz / d) * T.pool.driftMps * dt, T.chamber.minZ, T.chamber.maxZ);
      }
      if (Math.hypot(pose.x - p.x, pose.z - p.z) <= T.pool.radius) {
        p.tickLeft -= dt;
        if (p.tickLeft <= 0) {
          p.tickLeft = T.pool.tickS;
          enemies?.damagePlayer(T.pool.dps * T.pool.tickS, 'smoke_pool');
        }
      } else p.tickLeft = T.pool.tickS;
    }
  }

  const aliveWraiths = (): number => {
    let n = 0;
    for (const id of wraithIds) if (enemies?.get(id)?.alive) n++;
    return n;
  };

  function wraithTarget(): number {
    let n: number = pressure().wraiths;
    // The west anchor's task is harassed by wraiths whenever Elena is at it.
    if (!restored('west') && distTo('west') <= T.nearM) n = Math.max(n, T.west.harassWraiths);
    return n;
  }

  function spawnWraith(): void {
    if (!enemies) return;
    const id = `wraith.ritual.${++wraithSerial}`;
    const spawn = PLACEMENTS[WRAITH_SPAWNS[Math.floor(rng() * WRAITH_SPAWNS.length) % WRAITH_SPAWNS.length]! as EntityId];
    if (!spawn) return;
    const e = enemies.spawn(SMOKE_WRAITH, { x: spawn.x, z: spawn.z }, { id, transient: true, scene: 'last_house' });
    e.wake();
    wraithIds.add(id);
    emit({ type: 'wraith_spawned', id });
    bump();
  }

  function stepWraiths(dt: number): void {
    wraithClock = Math.max(0, wraithClock - dt);
    for (const [id, left] of [...corpses]) {
      if (left - dt <= 0) {
        corpses.delete(id);
        wraithIds.delete(id);
        enemies?.remove(id);
      } else corpses.set(id, left - dt);
    }
    if (aliveWraiths() < wraithTarget() && wraithClock <= 0) spawnWraith();
  }

  const offEnemies = enemies?.on((e: EnemyEvent) => {
    if (e.type === 'resolved' && wraithIds.has(e.id)) {
      corpses.set(e.id, T.wraith.corpseS);
      wraithClock = T.wraith.respawnS;
    } else if (e.type === 'player_damaged' && e.amount > 0) {
      // Damage that gets through interrupts the west channel (the progress is kept by the target).
      if (spells?.channelTargetId === WEST_TARGET_ID && spells.interruptChannel()) {
        emit({ type: 'channel_interrupted', dir: 'west' });
        bump();
      }
    }
  });
  void offEnemies;

  /** Wraiths freeze with the story: a cinematic clip is playing. */
  function holdWraiths(held: boolean): void {
    for (const id of wraithIds) {
      const e = enemies?.get(id);
      if (e?.alive) e.held = held;
    }
  }

  function clearSmoke(): void {
    rings.length = 0;
    pools.length = 0;
    ringClock = 0;
    poolClock = 0;
    landedLeft = 0;
    for (const id of [...wraithIds]) enemies?.remove(id);
    wraithIds.clear();
    corpses.clear();
  }

  /** Elena died and respawned: the smoke starts over; the progress of the anchors stays. */
  function onDeath(): void {
    stopChannel();
    rings.length = 0;
    pools.length = 0;
    ringClock = 0;
    poolClock = 0;
    landedLeft = 0;
    wraithIds.clear(); // the EnemySystem already removed the transient wraiths
    corpses.clear();
    wraithClock = T.wraith.graceAfterDeathS;
    if (shellBrokenFor !== null) shellBrokenFor = 0; // the shell's regrow clock restarts
    paused = false;
    bump();
  }

  function deactivate(): void {
    const wasBusy = rings.length > 0 || pools.length > 0 || wraithIds.size > 0 || channel !== null || offTargets.size > 0 || landedLeft > 0;
    if (!wasBusy) return;
    stopChannel();
    clearSmoke();
    syncTargets(false);
    bump();
  }

  function tick(dt: number, p: PlayerPose): void {
    pose = p;
    if (hintLeft > 0) {
      hintLeft = Math.max(0, hintLeft - dt);
      if (hintLeft === 0) {
        hint = null;
        bump();
      }
    }
    if (!isActive() || store.getState().game.scene !== 'last_house') {
      deactivate();
      return;
    }
    const respawns = store.getState().player.respawns;
    if (respawns !== lastRespawns) {
      lastRespawns = respawns;
      onDeath();
    }
    syncTargets(true);
    const clip = clipPlaying();
    if (clip !== paused) {
      paused = clip;
      holdWraiths(paused);
      bump();
    }
    // A cinematic is playing: the smoke holds its breath (rings, pools, wraiths, tasks).
    if (paused) return;
    magicFloor();
    const nearKey = view().near?.dir ?? '';
    if (nearKey !== lastNear) {
      lastNear = nearKey; // the rune icon follows Elena between the anchor rooms
      bump();
    }
    stepChannel(dt);
    stepShell(dt);
    stepWraiths(dt);
    stepRings(dt);
    stepPools(dt);
    if (landedLeft > 0) {
      landedLeft = Math.max(0, landedLeft - dt);
      if (landedLeft === 0) bump();
    }
    const pr = pressure();
    if (channel?.dir !== 'east') {
      ringClock += dt;
      if (ringClock >= pr.ringEveryS) {
        ringClock = 0;
        spawnRing();
      }
    }
    if (pr.pools) {
      poolClock += dt;
      if (poolClock >= T.pool.everyS && pools.length < T.pool.max) {
        poolClock = 0;
        spawnPool();
      }
    }
  }

  function view(): RitualView {
    let near: RitualView['near'] = null;
    let nearD = Infinity;
    if (isActive()) {
      for (const dir of ANCHOR_DIRS) {
        const d = distTo(dir);
        if (!restored(dir) && d <= T.nearM && d < nearD) {
          nearD = d;
          near = { dir, spell: ANCHOR_SPELL[dir] };
        }
      }
    }
    return {
      active: isActive(),
      anchors: anchorCount(),
      strike: rings.length > 0 || eastWarning ? 'warning' : landedLeft > 0 ? 'landed' : 'idle',
      rings: rings.map((r) => ({ x: r.x, z: r.z, radius: T.ring.radius, t: 1 - r.left / T.ring.telegraphS })),
      pools: pools.map((p) => ({ x: p.x, z: p.z, radius: T.pool.radius })),
      channel: channel ? { dir: channel.dir, progress: Math.min(1, progress[channel.dir] / holdSeconds(channel.dir)), paused: pauseLeft > 0 } : null,
      progress: {
        north: Math.min(1, progress.north / T.north.holdS),
        east: Math.min(1, progress.east / T.east.holdS),
        west: Math.min(1, progress.west / T.west.channelS),
      },
      shell: isActive() && !restored('north') ? { hp: shellHp, maxHp: T.north.shellHp, broken: shellBroken() } : null,
      eastWarning,
      near,
      hint,
    };
  }

  return {
    attach(w) {
      world = w;
    },
    tick,
    pressAnchor,
    view,
    get strikesLanded() {
      return landed;
    },
    anchorProgress: (dir) => progress[dir],
    wraithCount: aliveWraiths,
    on(l) {
      eventListeners.add(l);
      return () => {
        eventListeners.delete(l);
      };
    },
    get version() {
      return version;
    },
    subscribe(l) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}
