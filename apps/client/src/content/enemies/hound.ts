import type { EnemyDef } from '../../game/enemies.ts';

/** Cursed hound (grounds, two of them). docs/combat-tuning.md section 4. */
export const HOUND: EnemyDef = {
  id: 'hound',
  kind: 'animal',
  maxHp: 80,
  speed: 5.5,
  bodyRadius: 0.45,
  hit: { y: 0.8, radius: 1.0 },
  aggroRadius: 12,
  leashRadius: 20,
  purifiable: true,
  moralityClass: 'animal',
  abilities: [{ kind: 'telegraphedAttack', name: 'bite', damage: 10, cooldownS: 1.6, telegraphS: 0.5, range: 1.7 }],
};
