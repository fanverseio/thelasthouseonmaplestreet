import type { EnemyDef } from '../../game/enemies.ts';

/** Cursed fox (street, skippable). docs/combat-tuning.md section 4. Reach, body and aggro numbers are greybox guesses. */
export const FOX: EnemyDef = {
  id: 'fox',
  kind: 'animal',
  maxHp: 60,
  speed: 5.0,
  bodyRadius: 0.4,
  hit: { y: 0.8, radius: 1.0 },
  aggroRadius: 12,
  leashRadius: 20,
  purifiable: true,
  moralityClass: 'animal',
  abilities: [{ kind: 'telegraphedAttack', name: 'bite', damage: 8, cooldownS: 1.5, telegraphS: 0.4, range: 1.6 }],
};
