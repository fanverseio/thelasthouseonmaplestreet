/**
 * Combat feedback state (task 5.11): everything the view needs to SHOW a fight, kept headless and in sim time so it
 * can be tested. It listens to the EnemySystem and SpellSystem and never changes a rule.
 *
 * - Enemy hit reaction: a brief colour flash and a small knockback (a visual offset, never the FSM position).
 * - Elena hurt: a 0..1 level that decays; the vignette reads it (softer, slower and gentler with reduce flashing).
 * - Effects: bolt impact sparks, Purify motes (while channelling, and a burst when it completes), and the
 *   dissolve to smoke of a destroyed enemy. Pooled data only, no meshes here.
 * - Resolved enemies: purified = a calm upright figure, destroyed = only a dark coat that fades (no gore).
 */
import type { EnemyEvent, EnemySystem } from './enemies.ts';
import type { SpellEvent, SpellSystem } from './spells.ts';

export const FEEDBACK_TUNING = {
  /** Enemy hit flash and knockback (visual only). */
  hitFlashS: 0.15,
  knockbackM: 0.25,
  knockbackS: 0.18,
  /** Elena's hurt vignette: peak opacity and fade time, normal and with reduce flashing on. */
  hurtPeak: 0.75,
  hurtFadeS: 0.55,
  hurtSoftPeak: 0.3,
  hurtSoftFadeS: 1.4,
  /** Death: fade to black, then respawn (combat-tuning section 7), then a short fade back in. */
  deathFadeS: 1.5,
  wakeFadeS: 0.6,
  /** A destroyed enemy's coat dissolves into smoke over this long, then is gone. */
  dissolveS: 1.5,
  sparkS: 0.35,
  moteS: 1.1,
  moteEveryS: 0.12,
  maxFx: 48,
} as const;

export type FxKind = 'spark' | 'mote' | 'smoke';

export interface Fx {
  kind: FxKind;
  x: number;
  y: number;
  z: number;
  /** Seconds lived and total life. */
  age: number;
  life: number;
  /** Drift per second. */
  vx: number;
  vy: number;
  vz: number;
}

export interface HitFx {
  /** 0..1: how much of the flash is left. */
  flash: number;
  /** Knockback offset (metres), already eased out. */
  offX: number;
  offZ: number;
}

const NO_HIT: HitFx = { flash: 0, offX: 0, offZ: 0 };

/** Opacity of Elena's red screen-edge vignette. With reduce flashing it is softer and never sudden. */
export function hurtVignetteOpacity(level: number, reduceFlashing: boolean): number {
  const l = Math.min(1, Math.max(0, level));
  const peak = reduceFlashing ? FEEDBACK_TUNING.hurtSoftPeak : FEEDBACK_TUNING.hurtPeak;
  return l * peak;
}

/** Death fade: 0 (clear) to 1 (black) while dying, then fading back in after the respawn. */
export function deathFadeOpacity(dyingProgress: number, wakeProgress: number): number {
  if (dyingProgress > 0) return Math.min(1, dyingProgress);
  return Math.min(1, Math.max(0, 1 - wakeProgress));
}

export interface CombatFeedbackOptions {
  enemies: EnemySystem;
  spells: SpellSystem;
  /** Elena's ground position (knockback pushes enemies away from her). */
  player: () => { x: number; z: number };
  reduceFlashing?: () => boolean;
}

interface HitState {
  flashLeft: number;
  knockLeft: number;
  dirX: number;
  dirZ: number;
}

export class CombatFeedback {
  private readonly enemies: EnemySystem;
  private readonly spells: SpellSystem;
  private readonly player: () => { x: number; z: number };
  private readonly reduceFlashing: () => boolean;
  private readonly hits = new Map<string, HitState>();
  private readonly resolvedAt = new Map<string, { outcome: 'purify' | 'destroy'; age: number }>();
  private hurtLevel = 0;
  private moteClock = 0;
  private wake = 1;
  private lastFxSerial = 0;
  readonly fx: Fx[] = [];
  private readonly offs: (() => void)[];
  private listeners = new Set<() => void>();

  constructor(options: CombatFeedbackOptions) {
    this.enemies = options.enemies;
    this.spells = options.spells;
    this.player = options.player;
    this.reduceFlashing = options.reduceFlashing ?? (() => false);
    this.offs = [this.enemies.on((e) => this.onEnemy(e)), this.spells.on((e) => this.onSpell(e))];
  }

  dispose(): void {
    for (const off of this.offs) off();
  }

  /* ---- reading ---- */

  /** Hit reaction of one enemy right now. */
  hitFx(id: string): HitFx {
    const h = this.hits.get(id);
    if (!h) return NO_HIT;
    const k = h.knockLeft > 0 ? h.knockLeft / FEEDBACK_TUNING.knockbackS : 0;
    // Eased out: pushed back at once, then returns.
    const push = FEEDBACK_TUNING.knockbackM * k * k;
    return { flash: h.flashLeft > 0 ? h.flashLeft / FEEDBACK_TUNING.hitFlashS : 0, offX: h.dirX * push, offZ: h.dirZ * push };
  }

  /** Elena's hurt level, 1 at the moment of a hit and fading to 0. */
  get hurt(): number {
    return this.hurtLevel;
  }

  /** 0..1 progress of the fade-in after a respawn (1 = done). */
  get wakeProgress(): number {
    return this.wake;
  }

  /** Seconds since an enemy was resolved and how, or null while it is not. */
  resolved(id: string): { outcome: 'purify' | 'destroy'; age: number } | null {
    return this.resolvedAt.get(id) ?? null;
  }

  /** 1 while a destroyed enemy's coat is solid, falling to 0 as it dissolves. */
  coatOpacity(id: string): number {
    const r = this.resolvedAt.get(id);
    if (!r || r.outcome !== 'destroy') return 1;
    return Math.max(0, 1 - r.age / FEEDBACK_TUNING.dissolveS);
  }

  /** Changes whenever effects appear or vanish (not every frame). */
  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };

  /* ---- events ---- */

  private onEnemy(e: EnemyEvent): void {
    if (e.type === 'hit') {
      const enemy = this.enemies.get(e.id);
      const p = this.player();
      let dx = enemy ? enemy.x - p.x : 0;
      let dz = enemy ? enemy.z - p.z : 0;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;
      this.hits.set(e.id, { flashLeft: FEEDBACK_TUNING.hitFlashS, knockLeft: FEEDBACK_TUNING.knockbackS, dirX: dx, dirZ: dz });
    } else if (e.type === 'player_damaged') {
      if (e.amount > 0) this.hurtLevel = 1;
    } else if (e.type === 'resolved') {
      const enemy = this.enemies.get(e.id);
      this.resolvedAt.set(e.id, { outcome: e.outcome, age: 0 });
      if (enemy) {
        if (e.outcome === 'destroy') this.burst('smoke', enemy.x, 0.9, enemy.z, 7, FEEDBACK_TUNING.dissolveS, 0.5);
        else this.burst('mote', enemy.x, 0.9, enemy.z, 10, FEEDBACK_TUNING.moteS * 1.4, 0.7);
      }
    } else if (e.type === 'reset') {
      this.resolvedAt.delete(e.id);
      this.hits.delete(e.id);
    } else if (e.type === 'spawned') {
      this.resolvedAt.delete(e.id);
    }
  }

  private onSpell(e: SpellEvent): void {
    if (e.type !== 'hit') return;
    // The enemy system may already have taken a killed enemy off the target list.
    const at = this.spells.targetPosition(e.targetId) ?? this.enemies.get(e.targetId)?.position ?? null;
    if (!at) return;
    if (e.spell === 'arcane_bolt') this.burst('spark', at.x, at.y, at.z, e.charged ? 9 : 5, FEEDBACK_TUNING.sparkS, 2.2);
    else if (e.spell === 'purify') this.burst('mote', at.x, at.y, at.z, 10, FEEDBACK_TUNING.moteS, 0.9);
  }

  /** A burst of `n` effects flying outwards at about `speed` m/s. Deterministic spread (no randomness in sim code). */
  private burst(kind: FxKind, x: number, y: number, z: number, n: number, life: number, speed: number): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + this.lastFxSerial * 0.7;
      this.lastFxSerial++;
      this.push({
        kind,
        x,
        y,
        z,
        age: 0,
        life,
        vx: Math.cos(a) * speed * (0.6 + 0.4 * ((i % 3) / 2)),
        vy: kind === 'smoke' || kind === 'mote' ? 0.5 + 0.3 * (i % 2) : speed * 0.4,
        vz: Math.sin(a) * speed * (0.6 + 0.4 * ((i % 3) / 2)),
      });
    }
    this.notify();
  }

  private push(f: Fx): void {
    if (this.fx.length >= FEEDBACK_TUNING.maxFx) this.fx.shift();
    this.fx.push(f);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  /** Elena respawned: start the fade back in. */
  noteRespawn(): void {
    this.wake = 0;
    this.hurtLevel = 0;
  }

  /* ---- stepping ---- */

  /** One sim step. */
  step(dt: number): void {
    // Hurt: linear fade; slower with reduce flashing (a soft wash, not a flash).
    const fade = this.reduceFlashing() ? FEEDBACK_TUNING.hurtSoftFadeS : FEEDBACK_TUNING.hurtFadeS;
    if (this.hurtLevel > 0) this.hurtLevel = Math.max(0, this.hurtLevel - dt / fade);
    if (this.wake < 1) this.wake = Math.min(1, this.wake + dt / FEEDBACK_TUNING.wakeFadeS);
    for (const [id, h] of this.hits) {
      h.flashLeft = Math.max(0, h.flashLeft - dt);
      h.knockLeft = Math.max(0, h.knockLeft - dt);
      if (h.flashLeft === 0 && h.knockLeft === 0) this.hits.delete(id);
    }
    for (const r of this.resolvedAt.values()) r.age += dt;
    // Purify motes rise around the target while the channel runs.
    const target = this.spells.channelTargetId;
    if (target) {
      this.moteClock += dt;
      const at = this.spells.targetPosition(target);
      if (at && this.moteClock >= FEEDBACK_TUNING.moteEveryS) {
        this.moteClock = 0;
        const a = this.lastFxSerial++ * 2.4;
        this.push({ kind: 'mote', x: at.x + Math.cos(a) * 0.6, y: at.y - 0.4, z: at.z + Math.sin(a) * 0.6, age: 0, life: FEEDBACK_TUNING.moteS, vx: 0, vy: 0.6, vz: 0 });
        this.notify();
      }
    } else this.moteClock = 0;
    let removed = false;
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i]!;
      f.age += dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.z += f.vz * dt;
      if (f.age >= f.life) {
        this.fx.splice(i, 1);
        removed = true;
      }
    }
    if (removed) this.notify();
  }
}
