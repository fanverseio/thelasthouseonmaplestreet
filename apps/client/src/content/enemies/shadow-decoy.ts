import type { EnemyDef } from '../../game/enemies.ts';

/** Shadow decoy (Watcher fight): one hit kills it, touch 6, no telegraph. Not purifiable, no morality. */
export const SHADOW_DECOY: EnemyDef = {
  id: 'shadow_decoy',
  kind: 'minion',
  maxHp: 1,
  speed: 4.0,
  bodyRadius: 0.4,
  hit: { y: 1.0, radius: 1.0 },
  aggroRadius: 30,
  leashRadius: null,
  purifiable: false,
  moralityClass: 'none',
  abilities: [{ kind: 'telegraphedAttack', name: 'touch', damage: 6, cooldownS: 1.0, telegraphS: 0, range: 1.2 }],
};
