import type { EnemyDef } from '../../game/enemies.ts';

/** Cursed cat (interior, guards the cellar stairs). docs/combat-tuning.md section 4. */
export const CAT: EnemyDef = {
  id: 'cat',
  kind: 'animal',
  maxHp: 50,
  speed: 6.0,
  bodyRadius: 0.3,
  hit: { y: 0.7, radius: 0.9 },
  aggroRadius: 12,
  leashRadius: 20,
  purifiable: true,
  moralityClass: 'animal',
  abilities: [{ kind: 'telegraphedAttack', name: 'pounce', damage: 10, cooldownS: 2.0, telegraphS: 0.6, range: 1.8 }],
};
