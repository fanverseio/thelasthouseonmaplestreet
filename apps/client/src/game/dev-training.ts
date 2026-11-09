/**
 * DEVELOPER TEST ENEMY, dev builds only (the caller checks `import.meta.env.DEV`).
 * A practice hound off the main route near the garden start, so the author can try the enemy FSM, the spells
 * and death by hand. It is Angel-summoned style: no flag and no morality ever change, and it comes back four
 * seconds after it is purified or destroyed. It is not bound to an encounter, so progression cannot see it.
 */
import { TRAINING_HOUND } from '../content/enemies/training-hound.ts';
import type { Enemy, EnemySystem } from './enemies.ts';

export const TRAINING_ENEMY_ID = 'enemy.dev.training_hound';
/** South side of the street, east of the fox, ~14 m from the `?start=garden` spawn (58, 30): off the route north. */
export const TRAINING_SPAWN = { x: 46, z: 37 } as const;
export const TRAINING_RESPAWN_S = 4;

/** True for a dev build opened with `?start=garden`. */
export function shouldSpawnTraining(dev: boolean, search: string): boolean {
  return dev && new URLSearchParams(search).get('start') === 'garden';
}

export function spawnTrainingEnemy(enemies: EnemySystem): Enemy {
  return enemies.spawn(TRAINING_HOUND, TRAINING_SPAWN, {
    id: TRAINING_ENEMY_ID,
    summoned: true,
    scene: 'exterior',
    respawnAfterS: TRAINING_RESPAWN_S,
  });
}
