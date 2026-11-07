import type { DialogueLine } from './types.ts';

/** Angel hint lines for the overlay puzzles P3 and P5 (docs/puzzles.md). */
export const PUZZLE_LINES: readonly DialogueLine[] = [
  { id: 'vo_angel_p3_h1', speaker: 'Angel', text: 'Your grandmother was fond of dates.' },
  { id: 'vo_angel_p3_h2', speaker: 'Angel', text: 'The page in the lane. The year.' },
  { id: 'vo_angel_p3_h3', speaker: 'Angel', text: 'Look closely. The first two dials are glowing. Nineteen.' },
  { id: 'vo_angel_p3_h4', speaker: 'Angel', text: 'Every dial is glowing now. Follow them in order.' },
  { id: 'vo_angel_p5_h1', speaker: 'Angel', text: 'What does a house that holds something need?' },
  { id: 'vo_angel_p5_h2', speaker: 'Angel', text: 'Someone who keeps it.' },
  { id: 'vo_angel_p5_h3', speaker: 'Angel', text: 'Keeper, child.' },
];
