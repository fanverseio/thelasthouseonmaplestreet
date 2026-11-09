import type { EnemyDef } from '../../game/enemies.ts';

/**
 * DEV ONLY practice hound: a hound's numbers, no morality. Spawned by game/dev-training.ts in dev builds
 * (?start=garden), never on the critical path, never changes a flag or the morality.
 */
export const TRAINING_HOUND: EnemyDef = {
  id: 'training_hound',
  kind: 'animal',
  maxHp: 80,
  speed: 5.5,
  bodyRadius: 0.45,
  hit: { y: 0.9, radius: 1.1 },
  aggroRadius: 12,
  leashRadius: 20,
  purifiable: true,
  moralityClass: 'none',
  patrol: { radius: 3, pauseS: 2.5, speedFactor: 0.4 },
  abilities: [{ kind: 'telegraphedAttack', name: 'bite', damage: 10, cooldownS: 1.6, telegraphS: 0.5, range: 1.7 }],
};
