import type { EnemyDef } from '../../game/enemies.ts';

/**
 * The Watcher of House 66 (Mr Corwin), a victim of the smoke. docs/combat-tuning.md sections 4 and 5.
 * Grab is live. Teleport, decoys and the voice lines are typed stubs until task 5.8.
 * The voice line ids are placeholders for the authored lines; grab cooldown, reach and aggro are invented.
 */
export const WATCHER: EnemyDef = {
  id: 'watcher',
  kind: 'mini_boss',
  maxHp: 280,
  speed: 3.5,
  bodyRadius: 0.5,
  hit: { y: 1.0, radius: 1.0 },
  aggroRadius: 8,
  leashRadius: null,
  purifiable: true,
  moralityClass: 'mini_boss',
  abilities: [
    { kind: 'telegraphedAttack', name: 'grab', damage: 15, cooldownS: 2.5, telegraphS: 0.8, range: 2.0 },
    {
      kind: 'teleport',
      nodes: ['node.house66.tp_1', 'node.house66.tp_2', 'node.house66.tp_3', 'node.house66.tp_4', 'node.house66.tp_5', 'node.house66.tp_6'],
      intervalS: [6, 9],
      telegraphS: 0.8,
      minPlayerDistance: 2,
    },
    { kind: 'spawnDecoys', thresholds: [0.6, 0.4], count: 2, decoy: 'shadow_decoy' },
    { kind: 'voiceAtHp', thresholds: [0.9, 0.5, 0.3], lines: ['vo_watcher_felix_90', 'vo_watcher_felix_50', 'vo_watcher_felix_30'] },
  ],
};
