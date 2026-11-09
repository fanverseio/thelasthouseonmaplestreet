import type { EnemyDef } from '../../game/enemies.ts';

/**
 * Mr Briggs (garden mini-boss), a victim of the smoke. docs/combat-tuning.md sections 4 and 5.
 * All three abilities are live (task 5.7): the swipe, the ground slam (phase 2, strictly below 60% HP: a 3 m ring,
 * 20 damage through the Ward) and the harmless smoke puff (dims Elena's vision for 2 s). His scripted FIRST attack
 * (2.5 s wind-up, capped at 30 HP) is the encounter binding's `telegraph`, not one of these.
 * Swipe cooldown, slam cooldown, puff cooldown, reach and aggro are invented.
 */
export const BRIGGS: EnemyDef = {
  id: 'briggs',
  kind: 'mini_boss',
  maxHp: 300,
  speed: 3.0,
  bodyRadius: 0.5,
  hit: { y: 1.0, radius: 1.0 },
  aggroRadius: 8,
  leashRadius: null,
  purifiable: true,
  moralityClass: 'mini_boss',
  abilities: [
    { kind: 'telegraphedAttack', name: 'swipe', damage: 12, cooldownS: 2.0, telegraphS: 1.0, range: 2.2 },
    { kind: 'groundSlam', damage: 20, radius: 3, telegraphS: 1.2, cooldownS: 6, activeBelowHp: 0.6 },
    { kind: 'smokePuff', obscureS: 2, cooldownS: 12 },
  ],
};
