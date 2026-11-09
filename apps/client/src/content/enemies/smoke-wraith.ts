import type { EnemyDef } from '../../game/enemies.ts';

/** Smoke wraith (final ritual). Destroy only, no morality. Claw cooldown, reach and aggro are invented. */
export const SMOKE_WRAITH: EnemyDef = {
  id: 'smoke_wraith',
  kind: 'wraith',
  maxHp: 20,
  speed: 4.5,
  bodyRadius: 0.4,
  hit: { y: 1.1, radius: 1.0 },
  aggroRadius: 40,
  leashRadius: null,
  purifiable: false,
  moralityClass: 'none',
  abilities: [{ kind: 'telegraphedAttack', name: 'claw', damage: 8, cooldownS: 1.8, telegraphS: 0.4, range: 1.6 }],
};
