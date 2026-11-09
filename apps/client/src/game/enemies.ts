/**
 * Enemies (task 5.3): a data-driven FSM plus an abilities layer, headless (ARCHITECTURE 4.3,
 * docs/combat-tuning.md sections 3-5). No React, no Three.
 *
 * - States: idle, patrol, chase, attack, stunned, purified, destroyed. Stunned has no timer.
 * - Stun floor: while not stunned, a hit cannot take HP below `STUN_THRESHOLD` of max; reaching it stuns a
 *   purifiable enemy for good. While stunned only a charged Bolt (destroy) or a finished Purify (save) changes
 *   it, and it deals no damage. Entering stun tops Elena's magic up to `STUN_MIN_MAGIC`.
 * - Non-purifiable enemies (smoke wraith, decoys) simply die at 0 HP.
 * - Steering: straight towards Elena, slid along static colliders with `moveAndSlide`. No navmesh. Animals
 *   have a leash around their spawn: when Elena leaves it they walk home (state `patrol`) and heal.
 * - Attacks are telegraphed (a wind-up the view can show) and hurt Elena through `SpellSystem.absorbDamage`,
 *   so a Ward blocks them and staggers the attacker. A short invulnerability follows every hit.
 * - Every enemy registers itself as a SpellTarget and consumes the SpellSystem's `hit` events.
 * - Abilities (all real since 5.7 / 5.8): telegraphedAttack, groundSlam, smokePuff (Briggs), teleport,
 *   spawnDecoys, voiceAtHp (the Watcher). A handler can be swapped through the `abilities` option without
 *   touching this file's FSM.
 * - A `held` enemy does nothing (a dormant encounter enemy, or a mini-boss waiting for its scripted first attack).
 *   `startScripted` runs that scripted, capped wind-up (task 5.7).
 * - Outcomes are reported as `resolved` events; `morality.ts` turns them into flags and morality.
 */
import { moveAndSlide, type Collider } from './collision.ts';
import type { MoralityClass } from './morality.ts';
import {
  stunFloorBoltDamage,
  type SpellEvent,
  type SpellSystem,
  type SpellTarget,
  type Vec3,
} from './spells.ts';
import type { EntityId, SceneId } from '@tlh/shared';
import { enemyDef } from '../content/enemies/index.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import type { GameStore } from '../store/game-store.ts';

/* ---------------- Tuning (docs/combat-tuning.md sections 1, 3, 5) ---------------- */

/** Every purifiable enemy stuns at 30% HP. */
export const STUN_THRESHOLD = 0.3;
/** Entering stun raises Elena's magic to at least this, so Purify (30) and a charged Bolt (25) are both affordable. */
export const STUN_MIN_MAGIC = 60;
/** Invulnerability after Elena takes a hit. */
export const PLAYER_INVULN_S = 0.6;
/** A swing still lands when Elena is this much farther than its reach at the end of the wind-up. */
export const STRIKE_GRACE_M = 0.5;
/** Pause after a swing before the enemy moves again. */
export const RECOVER_S = 0.25;
/** Enemies stop this share of their reach away from Elena. */
export const STANDOFF = 0.75;
/** A patrol leg is abandoned after this long (stuck against a wall). */
export const PATROL_LEG_MAX_S = 8;

/* ---------------- Definitions ---------------- */

export type EnemyState = 'idle' | 'patrol' | 'chase' | 'attack' | 'stunned' | 'purified' | 'destroyed';
export type EnemyKind = 'animal' | 'mini_boss' | 'minion' | 'wraith';
export type EnemyChoice = 'purify' | 'destroy';

export interface TelegraphedAttackSpec {
  kind: 'telegraphedAttack';
  name: string;
  damage: number;
  cooldownS: number;
  telegraphS: number;
  /** Reach in metres (the attack starts inside it). */
  range: number;
  /** The hit can never take Elena's HP below this (the scripted first attack, 5.7). */
  hpFloor?: number;
}
/**
 * A ring on the ground, AoE damage through the Ward (5.7). The ring is centred on the enemy and `radius`
 * metres wide. `activeBelowHp`: only strictly below this HP fraction (Briggs' phase 2).
 */
export interface GroundSlamSpec {
  kind: 'groundSlam';
  damage: number;
  radius: number;
  telegraphS: number;
  cooldownS: number;
  activeBelowHp?: number;
}
/** A harmless puff that obscures Elena's vision for `obscureS` seconds (5.7). The view draws it. */
export interface SmokePuffSpec {
  kind: 'smokePuff';
  obscureS: number;
  cooldownS: number;
}
/**
 * Teleports only to the named nodes (5.8), never while stunned, never while Elena is closer than
 * `minPlayerDistance` and never onto a node closer to her than that. `telegraphS` marks the destination first.
 */
export interface TeleportSpec {
  kind: 'teleport';
  nodes: readonly string[];
  intervalS: readonly [number, number];
  telegraphS: number;
  minPlayerDistance: number;
}
/** One-hit decoys: `count` of them the first time HP falls to each fraction (5.8). */
export interface SpawnDecoysSpec {
  kind: 'spawnDecoys';
  thresholds: readonly number[];
  count: number;
  decoy: string;
}
/** An authored line (`lines[i]` for `thresholds[i]`) the first time HP falls to each fraction (5.8). */
export interface VoiceAtHpSpec {
  kind: 'voiceAtHp';
  thresholds: readonly number[];
  lines: readonly string[];
}
export type AbilitySpec = TelegraphedAttackSpec | GroundSlamSpec | SmokePuffSpec | TeleportSpec | SpawnDecoysSpec | VoiceAtHpSpec;
export type AbilityKind = AbilitySpec['kind'];

export interface EnemyDef {
  id: string;
  kind: EnemyKind;
  maxHp: number;
  /** Metres per second. */
  speed: number;
  /** Collision circle radius (against walls). */
  bodyRadius: number;
  /** The sphere spells hit: centre height and radius (generous, so aiming level at the head works). */
  hit: { y: number; radius: number };
  /** Notices Elena inside this range (metres). */
  aggroRadius: number;
  /** Animals only: gives up when Elena is farther than this from the enemy's spawn. */
  leashRadius: number | null;
  purifiable: boolean;
  moralityClass: MoralityClass;
  /** Wanders around its spawn while unaware. */
  patrol?: { radius: number; pauseS: number; speedFactor: number };
  abilities: readonly AbilitySpec[];
}

/* ---------------- Events ---------------- */

export type EnemyEvent =
  | { type: 'spawned'; id: string }
  | { type: 'telegraph'; id: string; ability: string; seconds: number }
  | { type: 'attack'; id: string; ability: string; damage: number; blocked: boolean; hit: boolean }
  | { type: 'hit'; id: string; damage: number; hp: number }
  | { type: 'staggered'; id: string; seconds: number }
  | { type: 'stunned'; id: string }
  | { type: 'resolved'; id: string; outcome: EnemyChoice; summoned: boolean }
  | { type: 'reset'; id: string }
  | { type: 'player_damaged'; id: string; amount: number }
  /** Briggs' smoke puff: the view dims Elena's vision for `seconds`. Harmless. */
  | { type: 'smoke_puff'; id: string; seconds: number; x: number; z: number }
  /** The Watcher marks where he will appear; `seconds` before he does. */
  | { type: 'teleport_telegraph'; id: string; node: string; x: number; z: number; seconds: number }
  | { type: 'teleported'; id: string; node: string; x: number; z: number }
  | { type: 'decoys'; id: string; threshold: number; count: number }
  /** An authored line to speak (the encounter runtime says it). `delayS` spaces several lines of one hit. */
  | { type: 'voice'; id: string; line: string; threshold: number; delayS: number };

/* ---------------- Instances ---------------- */

export interface SpawnOptions {
  /** SpellTarget id; defaults to the def id. Must be unique among live enemies. */
  id?: string;
  /** Angel-summoned: resolving it changes no flag and no morality. */
  summoned?: boolean;
  /** Row of the stub tables (encounter-stub.ts) this enemy settles progression through. */
  stubId?: string;
  /** Start already stunned (a loaded save). */
  stunned?: boolean;
  /** Removed (not reset) when Elena dies. */
  transient?: boolean;
  /** Dev only: a resolved enemy comes back fresh after this many seconds. */
  respawnAfterS?: number;
  /** The scene it lives in; it only acts (and counts as hostile) while that scene is loaded. Default: any. */
  scene?: SceneId;
  /** Start held: does nothing until `release()` (a dormant encounter enemy). */
  held?: boolean;
  /** Spawned by another enemy (decoys). Dismissed when that enemy is stunned, resolved or reset. */
  parentId?: string;
}

export interface EnemyView {
  id: string;
  defId: string;
  state: EnemyState;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  /** 0..1 progress of the wind-up, or null when not winding up. */
  telegraph: number | null;
  staggered: boolean;
  /** Radius (m) of the ground ring to draw during a slam wind-up, else null. */
  ring: number | null;
  /** The Watcher's destination mark, with 0..1 progress, else null. */
  mark: { x: number; z: number; t: number } | null;
}

interface ActiveAttack {
  spec: AbilitySpec;
  phase: 'windup' | 'recover';
  left: number;
  total: number;
}

/** The scripted first attack (5.7): a wind-up that always ends in a strike capped at `hpFloor`. */
export interface ScriptedAttack {
  name: string;
  damage: number;
  seconds: number;
  /** The strike can never take Elena's HP below this. */
  hpFloor?: number;
}
interface ActiveScripted extends ScriptedAttack {
  left: number;
  total: number;
}

/** A scripted strike lands when Elena is within this many metres of the enemy (invented). */
export const SCRIPTED_REACH_M = 6;
/** A ground slam starts when Elena is within its radius plus this (invented). */
export const SLAM_TRIGGER_MARGIN_M = 1;
/** The first smoke puff comes this long after Briggs starts chasing (invented). */
export const PUFF_FIRST_DELAY_S = 4;
/** An enemy puff is only released while Elena is within this many metres (invented). */
export const PUFF_RANGE_M = 8;
/** Decoys appear on a ring of this radius around the Watcher (invented). */
export const DECOY_RING_M = 1.8;
/** Seconds between two voice lines crossed by the same hit (invented). */
export const VOICE_GAP_S = 3.5;
/** A teleport retries after this long when it was blocked (Elena too close, no free node) (invented). */
export const TELEPORT_RETRY_S = 0.75;

export class Enemy {
  readonly id: string;
  readonly def: EnemyDef;
  readonly spawnPoint: { x: number; z: number };
  readonly summoned: boolean;
  readonly stubId: string | undefined;
  readonly transient: boolean;
  readonly respawnAfterS: number | undefined;
  readonly scene: SceneId | undefined;
  readonly parentId: string | undefined;
  /** Does nothing while true (dormant, or waiting for the scripted first attack). */
  held: boolean;
  /** The scripted first attack in progress (5.7), if any. */
  scripted: ActiveScripted | null = null;
  /** The live centre spells aim at; mutated in place. */
  readonly position: Vec3;
  x: number;
  z: number;
  hp: number;
  state: EnemyState = 'idle';
  /** Aware of Elena (aggro, a hit, or `wake()`); stays set until it gives up or resets. */
  engaged = false;
  /** Walking home after losing Elena. */
  returning = false;
  attack: ActiveAttack | null = null;
  staggerLeft = 0;
  /** Seconds left per ability that has a cooldown. */
  readonly cooldowns = new Map<AbilitySpec, number>();
  /** Per-ability scratch data for handlers (teleport clocks, fired thresholds...). */
  readonly scratch = new Map<AbilitySpec, Record<string, unknown>>();
  patrolTarget: { x: number; z: number } | null = null;
  patrolPause = 0;
  patrolLegLeft = 0;
  respawnLeft = 0;

  constructor(def: EnemyDef, at: { x: number; z: number }, options: SpawnOptions = {}) {
    this.def = def;
    this.id = options.id ?? def.id;
    this.spawnPoint = { x: at.x, z: at.z };
    this.x = at.x;
    this.z = at.z;
    this.hp = def.maxHp;
    this.summoned = options.summoned === true;
    this.stubId = options.stubId;
    this.transient = options.transient === true;
    this.respawnAfterS = options.respawnAfterS;
    this.scene = options.scene;
    this.parentId = options.parentId;
    this.held = options.held === true;
    this.position = { x: at.x, y: def.hit.y, z: at.z };
  }

  get stunFloor(): number {
    return this.def.purifiable ? this.def.maxHp * STUN_THRESHOLD : 0;
  }
  get resolved(): boolean {
    return this.state === 'purified' || this.state === 'destroyed';
  }
  get alive(): boolean {
    return !this.resolved;
  }
  /** Dangerous right now: chasing, attacking or winding up the scripted first attack. */
  get hostile(): boolean {
    return this.state === 'chase' || this.state === 'attack' || this.scripted !== null;
  }
  get hpFraction(): number {
    return this.hp / this.def.maxHp;
  }
  /** Force it to notice Elena (an encounter engaging it). Does nothing to a stunned or resolved enemy. */
  wake(): void {
    if (this.alive && this.state !== 'stunned') this.engaged = true;
  }
  /** Let a held enemy act (an encounter engaged it). */
  release(): void {
    this.held = false;
  }
  view(): EnemyView {
    const a = this.attack;
    const sc = this.scripted;
    const windup = a && a.phase === 'windup';
    const tp = this.def.abilities.find((x) => x.kind === 'teleport');
    const pend = tp ? (this.scratch.get(tp)?.['pending'] as { x: number; z: number; left: number; total: number } | undefined) : undefined;
    return {
      id: this.id,
      defId: this.def.id,
      state: this.state,
      x: this.x,
      z: this.z,
      hp: this.hp,
      maxHp: this.def.maxHp,
      telegraph: sc ? (sc.total > 0 ? 1 - sc.left / sc.total : 1) : windup ? (a.total > 0 ? 1 - a.left / a.total : 1) : null,
      staggered: this.staggerLeft > 0,
      ring: windup && a.spec.kind === 'groundSlam' ? a.spec.radius : null,
      mark: pend ? { x: pend.x, z: pend.z, t: pend.total > 0 ? 1 - pend.left / pend.total : 1 } : null,
    };
  }
  sync(): void {
    this.position.x = this.x;
    this.position.z = this.z;
  }
  cooldownOf(spec: AbilitySpec): number {
    return this.cooldowns.get(spec) ?? 0;
  }
  scratchOf(spec: AbilitySpec): Record<string, unknown> {
    let s = this.scratch.get(spec);
    if (!s) {
      s = {};
      this.scratch.set(spec, s);
    }
    return s;
  }
}

/* ---------------- Abilities layer ---------------- */

/** What an ability may ask of the system. */
export interface AbilityHost {
  /** Hurt Elena through the Ward and the invulnerability window. */
  hitPlayer(amount: number, sourceId: string, hpFloor?: number): { dealt: number; blocked: boolean };
  emit(e: EnemyEvent): void;
  /** Seeded random in [0, 1). */
  random(): number;
  /** Spawn another enemy by definition id (decoys). Undefined when the id is unknown. */
  spawn(defId: string, at: { x: number; z: number }, options: SpawnOptions): Enemy | undefined;
  /** Where an authored node (`node.house66.tp_1`) stands, or undefined when it is not placed. */
  node(id: string): { x: number; z: number } | undefined;
}

export interface AbilityContext {
  player: { x: number; z: number };
  /** Distance from the enemy to Elena. */
  dist: number;
  host: AbilityHost;
}

export interface AbilityHandler<S extends AbilitySpec = AbilitySpec> {
  /** The FSM is in chase: should this ability take over now? Return true once it started. */
  tryStart?(e: Enemy, spec: S, ctx: AbilityContext): boolean;
  /** Each step while this ability owns the `attack` state. */
  run?(e: Enemy, spec: S, ctx: AbilityContext, dt: number): 'running' | 'done';
  /** Each step while the enemy is alive and not stunned, whatever it is doing (clocks, thresholds). */
  passive?(e: Enemy, spec: S, ctx: AbilityContext, dt: number): void;
  /** Elena's spell just changed the enemy's HP (after the stun floor, before a stun): HP thresholds fire here. */
  onHit?(e: Enemy, spec: S, host: AbilityHost): void;
  /** Stunned, staggered, reset: drop any in-flight state. */
  cancel?(e: Enemy, spec: S): void;
}

export type AbilityRegistry = { [K in AbilityKind]: AbilityHandler<Extract<AbilitySpec, { kind: K }>> };

/** The real attack: wind-up (telegraph), strike through absorbDamage, recovery, cooldown. */
export const telegraphedAttack: AbilityHandler<TelegraphedAttackSpec> = {
  tryStart(e, spec, ctx) {
    if (e.cooldownOf(spec) > 0 || ctx.dist > spec.range) return false;
    e.attack = { spec, phase: 'windup', left: spec.telegraphS, total: spec.telegraphS };
    e.state = 'attack';
    ctx.host.emit({ type: 'telegraph', id: e.id, ability: spec.name, seconds: spec.telegraphS });
    return true;
  },
  run(e, spec, ctx, dt) {
    const a = e.attack;
    if (!a) return 'done';
    a.left -= dt;
    if (a.phase === 'windup' && a.left <= 0) {
      const reach = ctx.dist <= spec.range + STRIKE_GRACE_M;
      let dealt = 0;
      let blocked = false;
      if (reach) ({ dealt, blocked } = ctx.host.hitPlayer(spec.damage, e.id, spec.hpFloor));
      ctx.host.emit({ type: 'attack', id: e.id, ability: spec.name, damage: dealt, blocked, hit: reach });
      e.cooldowns.set(spec, spec.cooldownS);
      a.phase = 'recover';
      a.left = RECOVER_S;
    }
    return a.phase === 'recover' && a.left <= 0 ? 'done' : 'running';
  },
  cancel() {
    // The attack record is cleared by the FSM; the cooldown only starts at a real strike.
  },
};

/** A no-op handler (kept for tests that swap one in). */
export const NOOP_ABILITY: AbilityHandler<never> = {};

/**
 * Briggs' phase 2 (5.7): a visible ring of `radius` metres around him. The wind-up is telegraphed (the view reads
 * `ring`); at its end Elena takes `damage` through the Ward if she is inside the ring. Only below `activeBelowHp`.
 */
export const groundSlam: AbilityHandler<GroundSlamSpec> = {
  tryStart(e, spec, ctx) {
    if (spec.activeBelowHp !== undefined && e.hpFraction >= spec.activeBelowHp) return false;
    if (e.cooldownOf(spec) > 0 || ctx.dist > spec.radius + SLAM_TRIGGER_MARGIN_M) return false;
    e.attack = { spec, phase: 'windup', left: spec.telegraphS, total: spec.telegraphS };
    e.state = 'attack';
    ctx.host.emit({ type: 'telegraph', id: e.id, ability: spec.kind, seconds: spec.telegraphS });
    return true;
  },
  run(e, spec, ctx, dt) {
    const a = e.attack;
    if (!a) return 'done';
    a.left -= dt;
    if (a.phase === 'windup' && a.left <= 0) {
      const inside = ctx.dist <= spec.radius;
      let dealt = 0;
      let blocked = false;
      if (inside) ({ dealt, blocked } = ctx.host.hitPlayer(spec.damage, e.id));
      ctx.host.emit({ type: 'attack', id: e.id, ability: spec.kind, damage: dealt, blocked, hit: inside });
      e.cooldowns.set(spec, spec.cooldownS);
      a.phase = 'recover';
      a.left = RECOVER_S;
    }
    return a.phase === 'recover' && a.left <= 0 ? 'done' : 'running';
  },
};

/**
 * Briggs' smoke puff (5.7): harmless. Released when Elena is near, on a cooldown, the first time a few seconds
 * after he starts chasing. The view dims her vision for `obscureS` (the enemy system deals no damage with it).
 */
export const smokePuff: AbilityHandler<SmokePuffSpec> = {
  tryStart(e, spec, ctx) {
    const s = e.scratchOf(spec);
    if (s['armed'] !== true) {
      s['armed'] = true;
      e.cooldowns.set(spec, PUFF_FIRST_DELAY_S);
      return false;
    }
    if (e.cooldownOf(spec) > 0 || ctx.dist > PUFF_RANGE_M) return false;
    e.cooldowns.set(spec, spec.cooldownS);
    ctx.host.emit({ type: 'smoke_puff', id: e.id, seconds: spec.obscureS, x: e.x, z: e.z });
    return true;
  },
};

interface TeleportPending {
  node: string;
  x: number;
  z: number;
  left: number;
  total: number;
}

function nextTeleportIn(spec: TeleportSpec, host: AbilityHost): number {
  const [lo, hi] = spec.intervalS;
  return lo + host.random() * (hi - lo);
}

/**
 * The Watcher's teleport (5.8). Every `intervalS` seconds while engaged he picks one of the authored `nodes`
 * that is at least `minPlayerDistance` from Elena (and not where he already stands), marks it for `telegraphS`
 * seconds, then appears there. He never teleports while Elena is closer than `minPlayerDistance`, and a stun
 * (the handler is not stepped while stunned, and `cancel` drops the mark) ends it.
 */
export const teleport: AbilityHandler<TeleportSpec> = {
  passive(e, spec, ctx, dt) {
    const s = e.scratchOf(spec);
    const pending = s['pending'] as TeleportPending | undefined;
    if (pending) {
      pending.left -= dt;
      if (pending.left > 0 || e.state === 'attack') return; // finish a swing first
      s['pending'] = undefined;
      s['clock'] = nextTeleportIn(spec, ctx.host);
      if (Math.hypot(ctx.player.x - pending.x, ctx.player.z - pending.z) < spec.minPlayerDistance) return; // Elena stepped onto the mark
      e.x = pending.x;
      e.z = pending.z;
      e.sync();
      ctx.host.emit({ type: 'teleported', id: e.id, node: pending.node, x: pending.x, z: pending.z });
      return;
    }
    if (!e.engaged) return;
    const clock = ((s['clock'] as number | undefined) ?? nextTeleportIn(spec, ctx.host)) - dt;
    s['clock'] = clock;
    if (clock > 0 || e.state === 'attack') return;
    if (ctx.dist < spec.minPlayerDistance) {
      s['clock'] = TELEPORT_RETRY_S;
      return;
    }
    const options: { node: string; x: number; z: number }[] = [];
    for (const id of spec.nodes) {
      const p = ctx.host.node(id);
      if (!p) continue;
      if (Math.hypot(p.x - ctx.player.x, p.z - ctx.player.z) < spec.minPlayerDistance) continue;
      if (Math.hypot(p.x - e.x, p.z - e.z) < 1) continue; // already there
      options.push({ node: id, x: p.x, z: p.z });
    }
    if (options.length === 0) {
      s['clock'] = TELEPORT_RETRY_S;
      return;
    }
    const pick = options[Math.min(options.length - 1, Math.floor(ctx.host.random() * options.length))]!;
    s['pending'] = { ...pick, left: spec.telegraphS, total: spec.telegraphS } satisfies TeleportPending;
    ctx.host.emit({ type: 'teleport_telegraph', id: e.id, node: pick.node, x: pick.x, z: pick.z, seconds: spec.telegraphS });
  },
  cancel(e, spec) {
    const s = e.scratch.get(spec);
    if (s) s['pending'] = undefined;
  },
};

/** True when `e` has fallen to `t` of its HP (a little slack for the float maths of the stun floor). */
function atOrBelow(e: Enemy, t: number): boolean {
  return e.hpFraction <= t + 1e-9;
}

/** The Watcher's decoys (5.8): `count` one-hit decoys the first time HP falls to each threshold. Each fires once. */
export const spawnDecoys: AbilityHandler<SpawnDecoysSpec> = {
  onHit(e, spec, host) {
    const s = e.scratchOf(spec);
    const fired = (s['fired'] ??= []) as number[];
    for (const t of spec.thresholds) {
      if (fired.includes(t) || !atOrBelow(e, t)) continue;
      fired.push(t);
      const base = host.random() * Math.PI * 2;
      for (let i = 0; i < spec.count; i++) {
        const n = ((s['n'] as number | undefined) ?? 0) + 1;
        s['n'] = n;
        const angle = base + (i * Math.PI * 2) / Math.max(1, spec.count);
        host.spawn(
          spec.decoy,
          { x: e.x + Math.cos(angle) * DECOY_RING_M, z: e.z + Math.sin(angle) * DECOY_RING_M },
          { id: `${e.id}.decoy_${n}`, summoned: true, transient: true, parentId: e.id, ...(e.scene && { scene: e.scene }) },
        );
      }
      host.emit({ type: 'decoys', id: e.id, threshold: t, count: spec.count });
    }
  },
};

/** The Watcher's voice (5.8): `lines[i]` the first time HP falls to `thresholds[i]`. Each fires once. */
export const voiceAtHp: AbilityHandler<VoiceAtHpSpec> = {
  onHit(e, spec, host) {
    const s = e.scratchOf(spec);
    const fired = (s['fired'] ??= []) as number[];
    let k = 0;
    spec.thresholds.forEach((t, i) => {
      const line = spec.lines[i];
      if (line === undefined || fired.includes(t) || !atOrBelow(e, t)) return;
      fired.push(t);
      host.emit({ type: 'voice', id: e.id, line, threshold: t, delayS: k++ * VOICE_GAP_S });
    });
  },
};

export const DEFAULT_ABILITIES: AbilityRegistry = {
  telegraphedAttack,
  groundSlam,
  smokePuff,
  teleport,
  spawnDecoys,
  voiceAtHp,
};

/* ---------------- The system ---------------- */

export interface EnemySystemOptions {
  store: GameStore;
  spells: SpellSystem;
  /** Static colliders for the scene on screen. Default: none. */
  colliders?: () => readonly Collider[];
  /** Seed for patrol choices and abilities. */
  seed?: number;
  /** Replace some ability handlers. */
  abilities?: Partial<AbilityRegistry>;
  /** Where an authored node stands (teleport targets). Default: the world placements. */
  nodes?: (id: string) => { x: number; z: number } | undefined;
  /** Enemy definitions by id (decoys). Default: content/enemies. */
  defs?: (id: string) => EnemyDef | undefined;
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

export class EnemySystem {
  private readonly store: GameStore;
  private readonly spells: SpellSystem;
  private readonly colliders: () => readonly Collider[];
  private readonly rng: () => number;
  private readonly abilities: AbilityRegistry;
  private readonly nodeAt: (id: string) => { x: number; z: number } | undefined;
  private readonly defOf: (id: string) => EnemyDef | undefined;
  private readonly enemies = new Map<string, Enemy>();
  private readonly unregister = new Map<string, () => void>();
  private readonly listeners = new Set<(e: EnemyEvent) => void>();
  private readonly changeListeners = new Set<() => void>();
  private readonly offSpells: () => void;
  private invulnLeft = 0;
  private _version = 0;

  constructor(options: EnemySystemOptions) {
    this.store = options.store;
    this.spells = options.spells;
    this.colliders = options.colliders ?? (() => []);
    this.rng = mulberry32(options.seed ?? 1);
    this.abilities = { ...DEFAULT_ABILITIES, ...options.abilities };
    this.nodeAt = options.nodes ?? ((id) => PLACEMENTS[id as EntityId]);
    this.defOf = options.defs ?? enemyDef;
    this.offSpells = this.spells.on((e) => this.onSpell(e));
  }

  /* ---- registry ---- */

  /** Create an enemy and register it as a spell target. A second enemy with the same id replaces the first. */
  spawn(def: EnemyDef, at: { x: number; z: number }, options: SpawnOptions = {}): Enemy {
    const e = new Enemy(def, at, options);
    this.remove(e.id);
    this.enemies.set(e.id, e);
    if (options.stunned && def.purifiable) {
      e.state = 'stunned';
      e.hp = e.stunFloor;
      e.engaged = true;
    }
    this.register(e);
    this.emit({ type: 'spawned', id: e.id });
    return e;
  }

  remove(id: string): void {
    this.unregister.get(id)?.();
    this.unregister.delete(id);
    if (this.enemies.delete(id)) this.changed();
  }

  get(id: string): Enemy | undefined {
    return this.enemies.get(id);
  }

  all(): readonly Enemy[] {
    return [...this.enemies.values()];
  }

  /** Any alive enemy chasing or attacking (slows the magic regen, blocks the locket). */
  hostileActive(): boolean {
    const scene = this.store.getState().game.scene;
    for (const e of this.enemies.values()) if (e.hostile && (!e.scene || e.scene === scene)) return true;
    return false;
  }

  on(listener: (e: EnemyEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** For views: a counter that changes when enemies appear, disappear or change state. */
  get version(): number {
    return this._version;
  }
  /** An arrow property, so it can be passed to `useSyncExternalStore` unbound. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  };

  dispose(): void {
    this.offSpells();
    for (const u of this.unregister.values()) u();
    this.unregister.clear();
    this.enemies.clear();
  }

  private emit(e: EnemyEvent): void {
    for (const l of this.listeners) l(e);
    this.changed();
  }

  private changed(): void {
    this._version++;
    for (const l of this.changeListeners) l();
  }

  private register(e: Enemy): void {
    const target: SpellTarget = {
      id: e.id,
      kind: 'enemy',
      position: e.position,
      radius: e.def.hit.radius,
      accepts: { bolt: 'any', purify: e.def.purifiable },
      isStunned: () => e.state === 'stunned',
      boltDamage: (charged, base) => stunFloorBoltDamage(e.state === 'stunned', charged, base),
      purifyStatus: () => (e.state === 'stunned' ? 'ready' : e.resolved ? 'invalid' : 'needs_weakening'),
    };
    this.unregister.set(e.id, this.spells.register(target));
  }

  /* ---- spell events ---- */

  private onSpell(ev: SpellEvent): void {
    if (ev.type === 'ward_blocked') {
      const e = ev.sourceId !== undefined ? this.enemies.get(ev.sourceId) : undefined;
      if (e && e.alive && e.state !== 'stunned') {
        e.staggerLeft = ev.staggerS;
        this.emit({ type: 'staggered', id: e.id, seconds: ev.staggerS });
      }
      return;
    }
    if (ev.type !== 'hit' || ev.targetKind !== 'enemy') return;
    const e = this.enemies.get(ev.targetId);
    if (!e || e.resolved) return;
    if (ev.spell === 'purify') {
      if (e.state === 'stunned' && e.def.purifiable) this.resolve(e, 'purify');
      return;
    }
    if (e.state === 'stunned') {
      if (ev.destroys) this.resolve(e, 'destroy'); // a tap deals 0 and only shows the hint
      return;
    }
    if (ev.damage <= 0) return;
    this.damageEnemy(e, ev.damage);
  }

  private damageEnemy(e: Enemy, damage: number): void {
    e.wake();
    if (e.def.purifiable) {
      const floor = e.stunFloor;
      e.hp = Math.max(floor, e.hp - damage); // the stun floor: one hit never goes below the threshold
      this.emit({ type: 'hit', id: e.id, damage, hp: e.hp });
      this.hitHooks(e);
      if (e.hp <= floor) this.stun(e);
      return;
    }
    e.hp = Math.max(0, e.hp - damage);
    this.emit({ type: 'hit', id: e.id, damage, hp: e.hp });
    this.hitHooks(e);
    if (e.hp <= 0) this.resolve(e, 'destroy');
  }

  /** HP-threshold abilities (decoys, voice) look at the new HP. */
  private hitHooks(e: Enemy): void {
    for (const spec of e.def.abilities) this.handlerOf(spec).onHit?.(e, spec, this.host);
  }

  private cancelAttack(e: Enemy): void {
    if (e.attack) this.handlerOf(e.attack.spec).cancel?.(e, e.attack.spec);
    e.attack = null;
    if (e.state === 'attack') e.state = 'chase';
  }

  /** Drop every in-flight ability state (teleport marks, the scripted wind-up) and the minions it spawned. */
  private cancelAbilities(e: Enemy): void {
    for (const spec of e.def.abilities) this.handlerOf(spec).cancel?.(e, spec);
    e.scripted = null;
    this.dismissMinions(e.id);
  }

  private dismissMinions(parentId: string): void {
    for (const m of [...this.enemies.values()]) if (m.parentId === parentId) this.remove(m.id);
  }

  private stun(e: Enemy): void {
    this.cancelAttack(e);
    this.cancelAbilities(e);
    e.state = 'stunned';
    e.staggerLeft = 0;
    e.returning = false;
    // Magic floor: both choices (charged Bolt 25, Purify 30) must always be affordable.
    this.store.setState((s) => (s.player.magic >= STUN_MIN_MAGIC ? s : { player: { ...s.player, magic: STUN_MIN_MAGIC } }));
    this.emit({ type: 'stunned', id: e.id });
  }

  private resolve(e: Enemy, outcome: EnemyChoice): void {
    this.cancelAttack(e);
    this.cancelAbilities(e);
    e.state = outcome === 'purify' ? 'purified' : 'destroyed';
    e.engaged = false;
    e.respawnLeft = e.respawnAfterS ?? 0;
    this.unregister.get(e.id)?.();
    this.unregister.delete(e.id);
    this.emit({ type: 'resolved', id: e.id, outcome, summoned: e.summoned });
    if (e.transient && e.parentId !== undefined) this.remove(e.id); // a killed decoy is gone, not a corpse
  }

  /**
   * Start the scripted first attack (5.7): the enemy freezes, a telegraph runs for `seconds`, then it strikes once,
   * through the Ward, never taking Elena below `hpFloor`. Afterwards it is released and fights normally.
   * Refused for an enemy that is stunned, resolved or already winding up.
   */
  startScripted(id: string, attack: ScriptedAttack): boolean {
    const e = this.enemies.get(id);
    if (!e || !e.alive || e.state === 'stunned' || e.scripted) return false;
    e.scripted = { ...attack, left: attack.seconds, total: attack.seconds };
    e.held = true;
    e.engaged = true;
    this.emit({ type: 'telegraph', id: e.id, ability: attack.name, seconds: attack.seconds });
    return true;
  }

  private stepScripted(e: Enemy, dt: number, player: { x: number; z: number }): void {
    const a = e.scripted;
    if (!a) return;
    a.left -= dt;
    if (a.left > 0) return;
    e.scripted = null;
    e.held = false;
    const reach = Math.hypot(player.x - e.x, player.z - e.z) <= SCRIPTED_REACH_M;
    let dealt = 0;
    let blocked = false;
    if (reach) ({ dealt, blocked } = this.hitPlayer(a.damage, e.id, a.hpFloor));
    this.emit({ type: 'attack', id: e.id, ability: a.name, damage: dealt, blocked, hit: reach });
  }

  /** Force a stunned enemy's outcome (used when the choice was made some other way, e.g. a panel). */
  forceResolve(id: string, outcome: EnemyChoice): boolean {
    const e = this.enemies.get(id);
    if (!e || e.resolved) return false;
    if (outcome === 'purify' && !e.def.purifiable) return false;
    this.resolve(e, outcome);
    return true;
  }

  /* ---- damage to Elena ---- */

  private readonly host: AbilityHost = {
    hitPlayer: (amount, sourceId, hpFloor) => this.hitPlayer(amount, sourceId, hpFloor),
    emit: (e) => this.emit(e),
    random: () => this.rng(),
    spawn: (defId, at, options) => {
      const def = this.defOf(defId);
      return def ? this.spawn(def, at, options) : undefined;
    },
    node: (id) => this.nodeAt(id),
  };

  private hitPlayer(amount: number, sourceId: string, hpFloor?: number): { dealt: number; blocked: boolean } {
    const before = this.store.getState().player.hp;
    if (before <= 0 || amount <= 0) return { dealt: 0, blocked: false };
    const after = this.spells.absorbDamage(amount, sourceId); // Ward: 0 and the attacker staggers
    if (after <= 0) return { dealt: 0, blocked: true };
    if (this.invulnLeft > 0) return { dealt: 0, blocked: false };
    let hp = before - after;
    if (hpFloor !== undefined) hp = Math.max(hp, Math.min(before, hpFloor));
    hp = Math.max(0, hp);
    this.store.setState((s) => ({ player: { ...s.player, hp } }));
    this.invulnLeft = PLAYER_INVULN_S;
    const dealt = before - hp;
    this.emit({ type: 'player_damaged', id: sourceId, amount: dealt });
    return { dealt, blocked: false };
  }

  /**
   * Hurt Elena from outside the enemy FSM (the final ritual's smoke rings, pools and strikes, task 5.10): through
   * the Ward and the invulnerability window like any enemy attack. `blocked`: the Ward absorbed it.
   */
  damagePlayer(amount: number, sourceId: string): { dealt: number; blocked: boolean } {
    return this.hitPlayer(amount, sourceId);
  }

  /* ---- death ---- */

  /**
   * Elena died (tasks 5.5, 5.7). Resolved enemies stay resolved. A STUNNED enemy, mini-boss or not, keeps its
   * persistent stun (and its HP at the floor). An unresolved, unstunned mini-boss resets to full HP, idle at its
   * spawn, and so does any other enemy. Everything goes back to its spawn; scripted wind-ups, teleport marks and
   * cooldowns are dropped. Transient enemies (decoys, wraiths) are removed. Flags are never touched.
   */
  handlePlayerDeath(): void {
    this.invulnLeft = 0;
    for (const e of [...this.enemies.values()]) {
      if (e.resolved) continue;
      if (e.transient) {
        this.remove(e.id);
        continue;
      }
      this.cancelAttack(e);
      this.cancelAbilities(e);
      e.held = false;
      e.x = e.spawnPoint.x;
      e.z = e.spawnPoint.z;
      e.sync();
      e.staggerLeft = 0;
      e.returning = false;
      e.patrolTarget = null;
      e.cooldowns.clear();
      e.scratch.clear();
      if (e.state === 'stunned') {
        e.engaged = true;
      } else {
        e.hp = e.def.maxHp;
        e.state = 'idle';
        e.engaged = false;
      }
      this.emit({ type: 'reset', id: e.id });
    }
  }

  /** Bring a resolved enemy back fresh (dev respawn). */
  private revive(e: Enemy): void {
    e.state = 'idle';
    e.hp = e.def.maxHp;
    e.x = e.spawnPoint.x;
    e.z = e.spawnPoint.z;
    e.sync();
    e.engaged = false;
    e.returning = false;
    e.attack = null;
    e.cooldowns.clear();
    this.register(e);
    this.emit({ type: 'reset', id: e.id });
  }

  /* ---- stepping ---- */

  /** One fixed step. `player` is Elena's position on the ground plane. */
  step(dt: number, player: { x: number; z: number }): void {
    if (this.invulnLeft > 0) this.invulnLeft = Math.max(0, this.invulnLeft - dt);
    const dead = this.store.getState().player.hp <= 0;
    const scene = this.store.getState().game.scene;
    for (const e of [...this.enemies.values()]) {
      if (e.scene && e.scene !== scene) continue; // Elena's coordinates belong to another scene
      if (e.resolved) {
        if (e.respawnLeft > 0) {
          e.respawnLeft -= dt;
          if (e.respawnLeft <= 0) this.revive(e);
        }
        continue;
      }
      if (e.state === 'stunned') continue; // harmless and timeless
      if (dead) continue; // the runtime handles the death on its tick
      if (e.scripted) {
        this.stepScripted(e, dt, player);
        continue;
      }
      if (e.held) continue; // dormant, or waiting for its scripted first attack
      this.stepEnemy(e, dt, player);
      e.sync();
    }
  }

  private context(e: Enemy, player: { x: number; z: number }): AbilityContext {
    return { player, dist: Math.hypot(player.x - e.x, player.z - e.z), host: this.host };
  }

  private handlerOf(spec: AbilitySpec): AbilityHandler {
    return this.abilities[spec.kind] as unknown as AbilityHandler;
  }

  private stepEnemy(e: Enemy, dt: number, player: { x: number; z: number }): void {
    for (const [spec, left] of e.cooldowns) if (left > 0) e.cooldowns.set(spec, Math.max(0, left - dt));
    if (e.staggerLeft > 0) {
      e.staggerLeft = Math.max(0, e.staggerLeft - dt);
      if (e.attack) this.cancelAttack(e); // a staggered enemy loses its wind-up
      return;
    }
    const ctx = this.context(e, player);
    for (const spec of e.def.abilities) this.handlerOf(spec).passive?.(e, spec, ctx, dt);

    if (e.state === 'attack' && e.attack) {
      const r = this.handlerOf(e.attack.spec).run?.(e, e.attack.spec, ctx, dt) ?? 'done';
      if (r === 'done') {
        e.attack = null;
        e.state = 'chase';
      }
      return;
    }

    const homeDist = Math.hypot(player.x - e.spawnPoint.x, player.z - e.spawnPoint.z);
    const leash = e.def.leashRadius;
    const leashOk = leash === null || homeDist <= leash;

    if (e.returning) {
      this.stepHome(e, dt);
      return;
    }
    if (e.state === 'idle' || e.state === 'patrol') {
      if (leashOk && (e.engaged || ctx.dist <= e.def.aggroRadius)) {
        e.engaged = true;
        e.state = 'chase';
        e.patrolTarget = null;
      } else {
        this.stepIdle(e, dt);
        return;
      }
    }
    if (e.state === 'chase') {
      if (!leashOk) {
        e.returning = true;
        e.engaged = false;
        e.state = 'patrol';
        return;
      }
      for (const spec of e.def.abilities) {
        if (this.handlerOf(spec).tryStart?.(e, spec, ctx)) return;
      }
      const reach = primaryReach(e.def);
      const stop = reach > 0 ? reach * STANDOFF : 0.5;
      if (ctx.dist > stop) this.moveToward(e, player.x, player.z, e.def.speed, dt, ctx.dist - stop);
    }
  }

  /** Idle or wandering around the spawn. */
  private stepIdle(e: Enemy, dt: number): void {
    const p = e.def.patrol;
    if (!p) {
      e.state = 'idle';
      return;
    }
    if (e.patrolTarget) {
      e.state = 'patrol';
      e.patrolLegLeft -= dt;
      const d = Math.hypot(e.patrolTarget.x - e.x, e.patrolTarget.z - e.z);
      if (d <= 0.3 || e.patrolLegLeft <= 0) {
        e.patrolTarget = null;
        e.patrolPause = p.pauseS;
        e.state = 'idle';
      } else {
        this.moveToward(e, e.patrolTarget.x, e.patrolTarget.z, e.def.speed * p.speedFactor, dt, d);
      }
      return;
    }
    e.state = 'idle';
    e.patrolPause -= dt;
    if (e.patrolPause <= 0) {
      const angle = this.rng() * Math.PI * 2;
      const r = this.rng() * p.radius;
      e.patrolTarget = { x: e.spawnPoint.x + Math.cos(angle) * r, z: e.spawnPoint.z + Math.sin(angle) * r };
      e.patrolLegLeft = PATROL_LEG_MAX_S;
    }
  }

  /** Lost interest: walk back to the spawn, heal, and become idle again. */
  private stepHome(e: Enemy, dt: number): void {
    const d = Math.hypot(e.spawnPoint.x - e.x, e.spawnPoint.z - e.z);
    if (d <= 0.3) {
      e.returning = false;
      e.state = 'idle';
      e.hp = e.def.maxHp;
      e.patrolPause = e.def.patrol?.pauseS ?? 0;
      return;
    }
    e.state = 'patrol';
    this.moveToward(e, e.spawnPoint.x, e.spawnPoint.z, e.def.speed, dt, d);
  }

  /** Steer straight at a point, sliding along walls. `maxStep`: never travel farther than this. */
  private moveToward(e: Enemy, tx: number, tz: number, speed: number, dt: number, maxStep: number): void {
    const dx = tx - e.x;
    const dz = tz - e.z;
    const d = Math.hypot(dx, dz);
    if (d < 1e-6) return;
    const step = Math.min(speed * dt, Math.max(0, maxStep));
    const next = moveAndSlide({ x: e.x, z: e.z }, { x: (dx / d) * step, z: (dz / d) * step }, e.def.bodyRadius, this.colliders());
    e.x = next.x;
    e.z = next.z;
  }
}

/** The reach of the first telegraphed attack (the distance an enemy stands off at). */
export function primaryReach(def: EnemyDef): number {
  for (const a of def.abilities) if (a.kind === 'telegraphedAttack') return a.range;
  return 0;
}

/** Validation for typed enemy data (used by tests and at startup in dev). Returns problems, empty when fine. */
export function validateEnemyDef(def: EnemyDef): string[] {
  const problems: string[] = [];
  const bad = (m: string) => problems.push(`${def.id}: ${m}`);
  if (def.maxHp <= 0) bad('maxHp must be positive');
  if (def.speed <= 0) bad('speed must be positive');
  if (def.bodyRadius <= 0 || def.hit.radius <= 0) bad('radii must be positive');
  if (def.aggroRadius <= 0) bad('aggroRadius must be positive');
  if (def.leashRadius !== null && def.leashRadius < def.aggroRadius) bad('leash must be at least the aggro radius');
  if (!def.abilities.some((a) => a.kind === 'telegraphedAttack')) bad('needs a telegraphedAttack');
  for (const a of def.abilities) {
    if (a.kind === 'telegraphedAttack' && (a.damage <= 0 || a.cooldownS <= 0 || a.telegraphS < 0 || a.range <= 0)) bad(`bad attack ${a.name}`);
    if (a.kind === 'spawnDecoys' || a.kind === 'voiceAtHp') {
      if (a.thresholds.some((t) => t <= 0 || t >= 1)) bad(`${a.kind} thresholds must be fractions in (0, 1)`);
    }
  }
  return problems;
}
