import type { NumberLockConfig } from './types.ts';

/** P3: outbuilding padlock. Code 1966 (journal page 3, "the year it slept"). */
export const P3_PADLOCK: NumberLockConfig = {
  kind: 'number_lock',
  id: 'p3_padlock',
  code: '1966',
  requires: 'enc_approach_resolved',
  grants: 'padlock_open',
  hintAtWrong: [1, 3, 5, 7],
  hintLines: ['vo_angel_p3_h1', 'vo_angel_p3_h2', 'vo_angel_p3_h3', 'vo_angel_p3_h4'],
  glowFromLevel: [
    { level: 3, digits: 2 },
    { level: 4, digits: 4 },
  ],
};
