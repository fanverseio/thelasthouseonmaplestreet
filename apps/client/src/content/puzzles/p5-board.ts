import type { TalkingBoardConfig } from './types.ts';

/** P5: talking board in the hall. Hangman-style; scares never deal damage. */
export const P5_BOARD: TalkingBoardConfig = {
  kind: 'talking_board',
  id: 'p5_board',
  word: 'KEEPER',
  requires: 'enc_interior_resolved',
  grants: 'board_solved',
  maxWrong: 6,
  scares: ['door_slam', 'whispers', 'chandelier_sway', 'cold_breath', 'piano_note', 'shadow_pass'],
  bonusLetters: ['K', 'P', 'E', 'R'],
  hintLines: ['vo_angel_p5_h1', 'vo_angel_p5_h2', 'vo_angel_p5_h3'],
};
