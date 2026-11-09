import type { StubEncounterId } from '../../game/encounter-stub.ts';
import type { EnemyDef } from '../../game/enemies.ts';
import { BRIGGS } from './briggs.ts';
import { CAT } from './cat.ts';
import { FOX } from './fox.ts';
import { HOUND } from './hound.ts';
import { SHADOW_DECOY } from './shadow-decoy.ts';
import { SMOKE_WRAITH } from './smoke-wraith.ts';
import { TRAINING_HOUND } from './training-hound.ts';
import { WATCHER } from './watcher.ts';

export { BRIGGS, CAT, FOX, HOUND, SHADOW_DECOY, SMOKE_WRAITH, TRAINING_HOUND, WATCHER };

/** All enemy definitions by id (combat-tuning.md section 4). The training hound is dev only. */
export const ENEMY_DEFS: Readonly<Record<string, EnemyDef>> = Object.fromEntries(
  [FOX, HOUND, CAT, BRIGGS, WATCHER, SHADOW_DECOY, SMOKE_WRAITH, TRAINING_HOUND].map((d) => [d.id, d]),
);

export function enemyDef(id: string): EnemyDef | undefined {
  return ENEMY_DEFS[id];
}

/** Which EnemyDef fights for each stub encounter row, so a binding only needs `mode: 'fsm'` to switch over. */
export const FSM_DEF_OF_ENCOUNTER: Readonly<Record<StubEncounterId, string>> = {
  street_fox: 'fox',
  briggs: 'briggs',
  watcher: 'watcher',
  hound_1: 'hound',
  hound_2: 'hound',
  interior_cat: 'cat',
};
