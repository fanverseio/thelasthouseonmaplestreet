/**
 * DEVELOPER TEST ENEMY, dev builds only (the caller checks `import.meta.env.DEV`).
 * A practice hound off the main route near the garden start, so the author can try the enemy FSM, the spells
 * and death by hand. It is Angel-summoned style: no flag and no morality ever change, and it comes back four
 * seconds after it is purified or destroyed. It is not bound to an encounter, so progression cannot see it.
 * `?start=garden` puts it ~14 m away; `?start=training` (all three spells unlocked) puts it ~6 m from the spawn.
 */
import { TRAINING_HOUND } from '../content/enemies/training-hound.ts';
import type { Enemy, EnemySystem } from './enemies.ts';

export const TRAINING_ENEMY_ID = 'enemy.dev.training_hound';
/** South side of the street, east of the fox, ~14 m from the `?start=garden` spawn (58, 30): off the route north. */
export const TRAINING_SPAWN = { x: 46, z: 37 } as const;
/** `?start=training`: on the same side of the street, ~6.4 m from the spawn (58, 30), inside the hound's aggro range. */
export const TRAINING_NEAR_SPAWN = { x: 53, z: 34 } as const;
export const TRAINING_RESPAWN_S = 4;

function startOf(search: string): string | null {
  return new URLSearchParams(search).get('start');
}

/** True for a dev build opened with `?start=garden` or `?start=training`. */
export function shouldSpawnTraining(dev: boolean, search: string): boolean {
  const start = startOf(search);
  return dev && (start === 'garden' || start === 'training');
}

/** Where the practice hound stands for this URL: near the spawn for `?start=training`, else the far spot. */
export function trainingSpawnFor(search: string): { readonly x: number; readonly z: number } {
  return startOf(search) === 'training' ? TRAINING_NEAR_SPAWN : TRAINING_SPAWN;
}

export function spawnTrainingEnemy(enemies: EnemySystem, at: { readonly x: number; readonly z: number } = TRAINING_SPAWN): Enemy {
  return enemies.spawn(TRAINING_HOUND, at, {
    id: TRAINING_ENEMY_ID,
    summoned: true,
    scene: 'exterior',
    respawnAfterS: TRAINING_RESPAWN_S,
  });
}
