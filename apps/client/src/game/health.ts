/**
 * Elena's HP regeneration (docs/combat-tuning.md section 1): none in combat; 5 HP/s after 6 s without taking
 * damage. Headless. Damage is detected as "HP went down since the last step", so any source resets the clock
 * (an enemy, a slam, the ritual smoke). Healing from a respawn or a regen step does not.
 */
import type { GameStore } from '../store/game-store.ts';

export const MAX_HP = 100;
export const HP_REGEN = {
  /** Seconds without taking damage before the regen starts. */
  delayS: 6,
  /** HP per second once it has started. */
  perSecond: 5,
} as const;

export class HpRegen {
  private readonly store: GameStore;
  private lastHp: number;
  private quietS = 0;

  constructor(store: GameStore) {
    this.store = store;
    this.lastHp = store.getState().player.hp;
  }

  /** Seconds since Elena last lost HP (capped by the caller's stepping, handy for tests). */
  get secondsSinceDamage(): number {
    return this.quietS;
  }

  /** One fixed step. Dead (HP 0) Elena never regenerates: the runtime handles the death. */
  step(dt: number): void {
    const hp = this.store.getState().player.hp;
    if (hp < this.lastHp) this.quietS = 0;
    else this.quietS += dt;
    this.lastHp = hp;
    if (hp <= 0 || hp >= MAX_HP || this.quietS < HP_REGEN.delayS) return;
    const next = Math.min(MAX_HP, hp + HP_REGEN.perSecond * dt);
    this.store.setState((s) => ({ player: { ...s.player, hp: next } }));
    this.lastHp = next;
  }

  /** After a respawn: start the quiet clock from zero at the new HP. */
  reset(): void {
    this.quietS = 0;
    this.lastHp = this.store.getState().player.hp;
  }
}
