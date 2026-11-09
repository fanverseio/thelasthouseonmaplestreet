/**
 * Spells (tasks 5.1, 5.2): the single typed config from docs/combat-tuning.md section 2, and a headless
 * SpellSystem driven by the fixed sim step and the InputState. No React, no Three.
 *
 * - Arcane Bolt: tap LMB (<= 200 ms) fires a projectile; holding LMB charges it, and releasing after
 *   CHARGE_S fires the charged bolt. A release between the tap limit and CHARGE_S cancels at no cost.
 * - Ward: LMB release with Ward selected; a timed shield. Consumers pass damage through `absorbDamage`.
 * - Purify: holding LMB (past the tap limit) starts a channelled beam on the aimed purifiable target.
 * - Only unlocked spells (progression flags, see SPELL_UNLOCK_FLAGS) can be cast; magic moves through the
 *   store actions `spendMagic` / `gainMagic`.
 * - Targets (enemies, runes, anchors, shells) register themselves and receive typed `hit` events.
 *   Projectiles live in a fixed-size pool, so a frame allocates nothing.
 */
import type { ProgressFlag, SpellId } from '@tlh/shared';
import type { GameStore } from '../store/game-store.ts';
import { TAP_MAX_MS, type InputState } from './input.ts';

/* ---------------- Tuning (docs/combat-tuning.md sections 1 and 2) ---------------- */

export const MAX_MAGIC = 100;

export const MAGIC_REGEN = {
  /** Per second while a hostile enemy is active. */
  combat: 6,
  /** Per second when no hostile enemy is active. */
  calm: 12,
  /** Per second during the final ritual. */
  ritual: 15,
} as const;

export const SPELL_CONFIG = {
  bolt: {
    tap: { cost: 8, damage: 20, cooldown: 0.35 },
    charged: { cost: 25, damage: 45, cooldown: 1.5 },
    /** Seconds LMB must be held for a charged bolt. */
    chargeS: 1.2,
    speed: 30,
    range: 40,
  },
  purify: {
    /** Paid when the channel starts. */
    cost: 30,
    channelS: 2.5,
    cooldown: 1.0,
    range: 8,
    /** Share of the cost returned when the target leaves range. */
    outOfRangeRefund: 0.5,
    /** Targets of these kinds are purified for free. */
    freeKinds: ['rune', 'anchor'] as readonly TargetKind[],
  },
  ward: {
    cost: 25,
    cooldown: 6,
    durationS: 4,
    /** An enemy that hits the Ward staggers this long (consumers read it from the event). */
    staggerS: 0.5,
  },
} as const;

/** Projectile pool size. At 0.35 s cooldown and 40 m range / 30 m/s at most 4 are alive; 16 is ample. */
export const PROJECTILE_POOL_SIZE = 16;
/** How long a hint stays on screen (sim seconds). */
export const HINT_SECONDS = 2.5;

export const SPELL_HINTS = {
  stunnedTap: 'Hold to destroy | 2: Purify',
  needsWeakening: 'It must be weakened first.',
  lowMagic: 'Not enough magic',
} as const;

/** Progression flag that unlocks each spell (the flag is the source of truth). */
export const SPELL_UNLOCK_FLAGS: Readonly<Record<'spell_bolt' | 'spell_ward' | 'spell_purify', SpellId>> = {
  spell_bolt: 'arcane_bolt',
  spell_ward: 'ward',
  spell_purify: 'purify',
};
/** Unlock order from combat-tuning.md: Bolt (end of Seq 2), Ward (Briggs' first telegraph), Purify (Briggs stunned). */
export const SPELL_UNLOCK_ORDER: readonly SpellId[] = ['arcane_bolt', 'ward', 'purify'];
export const SPELL_FLAG_ORDER: readonly ProgressFlag[] = ['spell_bolt', 'spell_ward', 'spell_purify'];

/* ---------------- Targets ---------------- */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type TargetKind = 'enemy' | 'rune' | 'anchor' | 'shell';

export interface TargetAccepts {
  /** `any`: tap and charged bolts hit; `charged_only`: only a charged bolt; `none`: bolts pass through. */
  bolt: 'any' | 'charged_only' | 'none';
  purify: boolean;
}

export type PurifyStatus = 'ready' | 'needs_weakening' | 'invalid';

export interface SpellTarget {
  id: string;
  kind: TargetKind;
  /** Live centre; the owner mutates it as the target moves. */
  position: Vec3;
  radius: number;
  accepts: TargetAccepts;
  /** Stunned enemies report true (used for the stun floor rule and the hint). */
  isStunned?: () => boolean;
  /** Target-side rule hook: the damage a bolt really deals. Default: `base`. */
  boltDamage?: (charged: boolean, base: number) => number;
  /** Whether Purify may start on it right now. Default `ready`. */
  purifyStatus?: () => PurifyStatus;
}

/** The stun floor rule (combat-tuning section 2): a tap bolt on a stunned enemy deals 0. */
export function stunFloorBoltDamage(stunned: boolean, charged: boolean, base: number): number {
  return stunned && !charged ? 0 : base;
}

/* ---------------- Events ---------------- */

export interface SpellHit {
  type: 'hit';
  targetId: string;
  targetKind: TargetKind;
  spell: SpellId;
  charged: boolean;
  /** Damage after the target's rule hook. 0 for Purify. */
  damage: number;
  /** The target was stunned when hit. */
  stunned: boolean;
  /** A charged bolt on a stunned enemy: the destroy choice. */
  destroys: boolean;
}

export type SpellEvent =
  | SpellHit
  | { type: 'cast'; spell: SpellId; charged: boolean }
  | { type: 'fizzle'; spell: SpellId; reason: 'low_magic' | 'cooldown' | 'needs_weakening' | 'pool_full' | 'charge_cancelled' }
  | { type: 'ward_up'; seconds: number }
  | { type: 'ward_blocked'; amount: number; sourceId: string | undefined; staggerS: number }
  | { type: 'ward_down' }
  | { type: 'purify_started'; targetId: string; cost: number }
  | { type: 'purify_cancelled'; targetId: string; reason: 'released' | 'out_of_range' | 'invalid' | 'reset'; refunded: number };

/* ---------------- Geometry ---------------- */

/** Distance along a unit ray to the first intersection with a sphere, or -1 (also -1 beyond `maxT`). */
export function raySphere(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  maxT: number,
  cx: number, cy: number, cz: number, r: number,
): number {
  const lx = cx - ox;
  const ly = cy - oy;
  const lz = cz - oz;
  const tca = lx * dx + ly * dy + lz * dz;
  const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
  const r2 = r * r;
  if (d2 > r2) return -1;
  const thc = Math.sqrt(r2 - d2);
  const t1 = tca + thc;
  if (t1 < 0) return -1;
  const t = Math.max(0, tca - thc);
  return t > maxT ? -1 : t;
}

/** Eye position and facing of the caster. Yaw 0 faces -Z (the player.ts convention). */
export interface AimPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

/* ---------------- Projectile pool ---------------- */

export interface Projectile {
  active: boolean;
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
  traveled: number;
  damage: number;
  charged: boolean;
  /** Spawn order, to tell the oldest apart in tests. */
  serial: number;
}

function emptyProjectile(): Projectile {
  return { active: false, x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: -1, traveled: 0, damage: 0, charged: false, serial: 0 };
}

/* ---------------- The system ---------------- */

export type SpellInput = Pick<InputState, 'lmbDown' | 'lmbHeldMs' | 'lmbTap' | 'lmbReleased'>;

export interface SpellContext {
  /** A hostile enemy is engaged (slows the magic regen). */
  hostileActive: boolean;
  /** The final ritual is on (fastest regen). */
  ritualActive: boolean;
}

/** Plain data for the HUD. */
export interface SpellView {
  selected: SpellId;
  unlocked: boolean;
  /** Seconds left on the selected spell's cooldown, and the length it started with. */
  cooldownLeft: number;
  cooldownTotal: number;
  /** LMB is held on Arcane Bolt: 0..1 towards a charged bolt. */
  charging: boolean;
  charge: number;
  channeling: boolean;
  channel: number;
  channelTargetId: string | null;
  wardLeft: number;
  hint: string | null;
}

export interface SpellSystemOptions {
  store: GameStore;
}

type CooldownMap = Record<SpellId, number>;

export class SpellSystem {
  readonly projectiles: Projectile[] = Array.from({ length: PROJECTILE_POOL_SIZE }, emptyProjectile);
  private readonly store: GameStore;
  private readonly targets = new Map<string, SpellTarget>();
  private readonly listeners = new Set<(e: SpellEvent) => void>();
  private readonly cooldown: CooldownMap = { arcane_bolt: 0, purify: 0, ward: 0 };
  private cooldownTotal: CooldownMap = { arcane_bolt: SPELL_CONFIG.bolt.tap.cooldown, purify: SPELL_CONFIG.purify.cooldown, ward: SPELL_CONFIG.ward.cooldown };
  private wardLeft = 0;
  private channelTarget: string | null = null;
  private channelTime = 0;
  private channelPaid = 0;
  /** A Purify press that already started or fizzled must be released before the next one counts. */
  private pressConsumed = false;
  private hint: string | null = null;
  private hintLeft = 0;
  private serial = 0;
  /** LMB was past the tap limit on the previous step (a release now is the end of a charge). */
  private lastCharging = false;

  constructor(options: SpellSystemOptions) {
    this.store = options.store;
  }

  /* ---- registration ---- */

  /** Register a target; returns the function that removes it. A second target with the same id replaces the first. */
  register(target: SpellTarget): () => void {
    this.targets.set(target.id, target);
    return () => {
      if (this.targets.get(target.id) === target) this.targets.delete(target.id);
    };
  }

  unregister(id: string): void {
    this.targets.delete(id);
  }

  /** Live centre of a registered target, for the beam visual. */
  targetPosition(id: string): Vec3 | null {
    return this.targets.get(id)?.position ?? null;
  }

  get targetCount(): number {
    return this.targets.size;
  }

  on(listener: (e: SpellEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(e: SpellEvent): void {
    for (const l of this.listeners) l(e);
  }

  /* ---- queries ---- */

  isUnlocked(spell: SpellId): boolean {
    return this.store.getState().player.spellsUnlocked.includes(spell);
  }

  cooldownLeft(spell: SpellId): number {
    return this.cooldown[spell];
  }

  get wardActive(): boolean {
    return this.wardLeft > 0;
  }

  get channeling(): boolean {
    return this.channelTarget !== null;
  }

  activeProjectiles(): number {
    let n = 0;
    for (const p of this.projectiles) if (p.active) n++;
    return n;
  }

  /** Magic per second for the current situation. */
  regenRate(ctx: SpellContext): number {
    if (ctx.ritualActive) return MAGIC_REGEN.ritual;
    return ctx.hostileActive ? MAGIC_REGEN.combat : MAGIC_REGEN.calm;
  }

  view(input?: SpellInput): SpellView {
    const s = this.store.getState().player;
    const sel = s.selectedSpell;
    const holding = input?.lmbDown === true && input.lmbHeldMs > TAP_MAX_MS;
    const charging = sel === 'arcane_bolt' && this.isUnlocked(sel) && holding;
    return {
      selected: sel,
      unlocked: this.isUnlocked(sel),
      cooldownLeft: this.cooldown[sel],
      cooldownTotal: this.cooldownTotal[sel],
      charging,
      charge: charging && input ? Math.min(1, input.lmbHeldMs / 1000 / SPELL_CONFIG.bolt.chargeS) : 0,
      channeling: this.channelTarget !== null,
      channel: this.channelTarget !== null ? Math.min(1, this.channelTime / SPELL_CONFIG.purify.channelS) : 0,
      channelTargetId: this.channelTarget,
      wardLeft: this.wardLeft,
      hint: this.hintLeft > 0 ? this.hint : null,
    };
  }

  /* ---- damage filter ---- */

  /**
   * Pass an incoming damage amount through the Ward. While it is up the damage is 0 and a `ward_blocked`
   * event tells the attacker to stagger. Without a Ward the amount is returned unchanged.
   */
  absorbDamage(amount: number, sourceId?: string): number {
    if (this.wardLeft <= 0 || amount <= 0) return amount;
    this.emit({ type: 'ward_blocked', amount, sourceId, staggerS: SPELL_CONFIG.ward.staggerS });
    return 0;
  }

  /* ---- stepping ---- */

  /**
   * One fixed step. `input` edges (`lmbTap`, `lmbReleased`) must be seen by exactly one step: the caller
   * clears them after each step. Does nothing about the 1/2/3 keys (the view selects spells via the store).
   */
  step(dt: number, input: SpellInput, aim: AimPose, ctx: SpellContext): void {
    for (const k of ['arcane_bolt', 'purify', 'ward'] as const) {
      if (this.cooldown[k] > 0) this.cooldown[k] = Math.max(0, this.cooldown[k] - dt);
    }
    if (this.hintLeft > 0) this.hintLeft = Math.max(0, this.hintLeft - dt);
    if (this.wardLeft > 0) {
      this.wardLeft = Math.max(0, this.wardLeft - dt);
      if (this.wardLeft === 0) this.emit({ type: 'ward_down' });
    }
    this.regen(dt, ctx);

    const selected = this.store.getState().player.selectedSpell;
    if (!input.lmbDown) this.pressConsumed = false;

    this.stepChannel(dt, input, aim, selected);
    this.stepCasting(input, aim, selected);
    this.stepProjectiles(dt);
    this.lastCharging = input.lmbDown && input.lmbHeldMs > TAP_MAX_MS;
  }

  private regen(dt: number, ctx: SpellContext): void {
    const st = this.store.getState();
    if (st.player.magic >= MAX_MAGIC) return;
    st.gainMagic(this.regenRate(ctx) * dt);
  }

  private setHint(text: string): void {
    this.hint = text;
    this.hintLeft = HINT_SECONDS;
  }

  private canCast(spell: SpellId): boolean {
    return this.isUnlocked(spell);
  }

  /** Spend `cost` or fail with the low-magic hint. */
  private pay(spell: SpellId, cost: number): boolean {
    if (cost <= 0) return true;
    if (this.store.getState().spendMagic(cost)) return true;
    this.setHint(SPELL_HINTS.lowMagic);
    this.emit({ type: 'fizzle', spell, reason: 'low_magic' });
    return false;
  }

  private stepCasting(input: SpellInput, aim: AimPose, selected: SpellId): void {
    if (selected === 'arcane_bolt' && this.canCast('arcane_bolt')) {
      if (input.lmbTap) this.castBolt(false, aim);
      else if (input.lmbReleased) {
        // A release after the tap limit: charged only when held long enough, otherwise cancelled at no cost.
        if (input.lmbHeldMs / 1000 >= SPELL_CONFIG.bolt.chargeS) this.castBolt(true, aim);
        else if (this.lastCharging) this.emit({ type: 'fizzle', spell: 'arcane_bolt', reason: 'charge_cancelled' });
      }
    } else if (selected === 'ward' && this.canCast('ward')) {
      if (input.lmbReleased) this.castWard();
    } else if (selected === 'purify' && this.canCast('purify')) {
      if (input.lmbDown && input.lmbHeldMs > TAP_MAX_MS && !this.pressConsumed && this.channelTarget === null) {
        this.pressConsumed = true;
        this.startPurify(aim);
      }
    }
  }

  private castBolt(charged: boolean, aim: AimPose): void {
    const cfg = charged ? SPELL_CONFIG.bolt.charged : SPELL_CONFIG.bolt.tap;
    if (this.cooldown.arcane_bolt > 0) {
      this.emit({ type: 'fizzle', spell: 'arcane_bolt', reason: 'cooldown' });
      return;
    }
    const slot = this.projectiles.find((p) => !p.active);
    if (!slot) {
      this.emit({ type: 'fizzle', spell: 'arcane_bolt', reason: 'pool_full' });
      return;
    }
    if (!this.pay('arcane_bolt', cfg.cost)) return;
    const cp = Math.cos(aim.pitch);
    slot.active = true;
    slot.x = aim.x;
    slot.y = aim.y;
    slot.z = aim.z;
    slot.dx = -Math.sin(aim.yaw) * cp;
    slot.dy = Math.sin(aim.pitch);
    slot.dz = -Math.cos(aim.yaw) * cp;
    slot.traveled = 0;
    slot.damage = cfg.damage;
    slot.charged = charged;
    slot.serial = ++this.serial;
    this.cooldown.arcane_bolt = cfg.cooldown;
    this.cooldownTotal.arcane_bolt = cfg.cooldown;
    this.emit({ type: 'cast', spell: 'arcane_bolt', charged });
  }

  private castWard(): void {
    const cfg = SPELL_CONFIG.ward;
    if (this.cooldown.ward > 0) {
      this.emit({ type: 'fizzle', spell: 'ward', reason: 'cooldown' });
      return;
    }
    if (!this.pay('ward', cfg.cost)) return;
    this.wardLeft = cfg.durationS;
    this.cooldown.ward = cfg.cooldown;
    this.cooldownTotal.ward = cfg.cooldown;
    this.emit({ type: 'cast', spell: 'ward', charged: false });
    this.emit({ type: 'ward_up', seconds: cfg.durationS });
  }

  /* ---- Purify ---- */

  private findPurifyTarget(aim: AimPose): SpellTarget | null {
    const cp = Math.cos(aim.pitch);
    const dx = -Math.sin(aim.yaw) * cp;
    const dy = Math.sin(aim.pitch);
    const dz = -Math.cos(aim.yaw) * cp;
    let best: SpellTarget | null = null;
    let bestT = Infinity;
    for (const t of this.targets.values()) {
      if (!t.accepts.purify) continue;
      const hit = raySphere(aim.x, aim.y, aim.z, dx, dy, dz, SPELL_CONFIG.purify.range + t.radius, t.position.x, t.position.y, t.position.z, t.radius);
      if (hit >= 0 && hit < bestT) {
        bestT = hit;
        best = t;
      }
    }
    return best;
  }

  private startPurify(aim: AimPose): void {
    const cfg = SPELL_CONFIG.purify;
    if (this.cooldown.purify > 0) {
      this.emit({ type: 'fizzle', spell: 'purify', reason: 'cooldown' });
      return;
    }
    const target = this.findPurifyTarget(aim);
    if (!target) return;
    const status = target.purifyStatus ? target.purifyStatus() : 'ready';
    if (status === 'invalid') return;
    if (status === 'needs_weakening') {
      // A hostile enemy: fizzles at no cost.
      this.setHint(SPELL_HINTS.needsWeakening);
      this.emit({ type: 'fizzle', spell: 'purify', reason: 'needs_weakening' });
      return;
    }
    const cost = cfg.freeKinds.includes(target.kind) ? 0 : cfg.cost;
    if (!this.pay('purify', cost)) return;
    this.channelTarget = target.id;
    this.channelTime = 0;
    this.channelPaid = cost;
    this.emit({ type: 'cast', spell: 'purify', charged: false });
    this.emit({ type: 'purify_started', targetId: target.id, cost });
  }

  private endChannel(reason: 'released' | 'out_of_range' | 'invalid' | 'reset', refundShare: number): void {
    const id = this.channelTarget;
    if (id === null) return;
    const refunded = Math.round(this.channelPaid * refundShare * 1000) / 1000;
    if (refunded > 0) this.store.getState().gainMagic(refunded);
    this.channelTarget = null;
    this.channelTime = 0;
    this.channelPaid = 0;
    this.cooldown.purify = SPELL_CONFIG.purify.cooldown;
    this.cooldownTotal.purify = SPELL_CONFIG.purify.cooldown;
    this.emit({ type: 'purify_cancelled', targetId: id, reason, refunded });
  }

  private stepChannel(dt: number, input: SpellInput, aim: AimPose, selected: SpellId): void {
    const id = this.channelTarget;
    if (id === null) return;
    const target = this.targets.get(id);
    if (!target || (target.purifyStatus && target.purifyStatus() !== 'ready')) {
      this.endChannel('invalid', 1); // not the player's doing: full refund
      return;
    }
    const dist = Math.hypot(target.position.x - aim.x, target.position.y - aim.y, target.position.z - aim.z) - target.radius;
    if (dist > SPELL_CONFIG.purify.range) {
      this.endChannel('out_of_range', SPELL_CONFIG.purify.outOfRangeRefund);
      return;
    }
    if (!input.lmbDown || selected !== 'purify') {
      this.endChannel('released', 0); // the tuning doc gives a refund only for leaving the range
      return;
    }
    this.channelTime += dt;
    if (this.channelTime >= SPELL_CONFIG.purify.channelS) {
      this.channelTarget = null;
      this.channelTime = 0;
      this.channelPaid = 0;
      this.cooldown.purify = SPELL_CONFIG.purify.cooldown;
      this.cooldownTotal.purify = SPELL_CONFIG.purify.cooldown;
      this.emit({
        type: 'hit',
        targetId: target.id,
        targetKind: target.kind,
        spell: 'purify',
        charged: false,
        damage: 0,
        stunned: target.isStunned?.() ?? false,
        destroys: false,
      });
    }
  }

  /* ---- projectiles ---- */

  private stepProjectiles(dt: number): void {
    const cfg = SPELL_CONFIG.bolt;
    for (const p of this.projectiles) {
      if (!p.active) continue;
      const len = Math.min(cfg.speed * dt, cfg.range - p.traveled);
      let best: SpellTarget | null = null;
      let bestT = Infinity;
      for (const t of this.targets.values()) {
        if (t.accepts.bolt === 'none' || (t.accepts.bolt === 'charged_only' && !p.charged)) continue;
        const hit = raySphere(p.x, p.y, p.z, p.dx, p.dy, p.dz, len, t.position.x, t.position.y, t.position.z, t.radius);
        if (hit >= 0 && hit < bestT) {
          bestT = hit;
          best = t;
        }
      }
      if (best) {
        p.active = false;
        const stunned = best.isStunned?.() ?? false;
        const damage = best.boltDamage ? best.boltDamage(p.charged, p.damage) : p.damage;
        if (!p.charged && stunned && damage === 0) this.setHint(SPELL_HINTS.stunnedTap);
        this.emit({
          type: 'hit',
          targetId: best.id,
          targetKind: best.kind,
          spell: 'arcane_bolt',
          charged: p.charged,
          damage,
          stunned,
          destroys: p.charged && stunned,
        });
        continue;
      }
      p.x += p.dx * len;
      p.y += p.dy * len;
      p.z += p.dz * len;
      p.traveled += len;
      if (p.traveled >= cfg.range) p.active = false;
    }
  }

  /** Death, pause or a scene change: drop projectiles, the Ward, the charge and any channel. */
  reset(): void {
    if (this.channelTarget !== null) this.endChannel('reset', 0);
    for (const p of this.projectiles) p.active = false;
    this.wardLeft = 0;
    this.pressConsumed = false;
    this.lastCharging = false;
    this.hintLeft = 0;
    for (const k of ['arcane_bolt', 'purify', 'ward'] as const) this.cooldown[k] = 0;
  }
}
