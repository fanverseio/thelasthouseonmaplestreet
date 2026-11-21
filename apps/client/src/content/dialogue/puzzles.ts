import type { DialogueLine } from './types.ts';

/** Angel hint lines for the overlay puzzles P3 and P5 (docs/puzzles.md). */
export const PUZZLE_LINES: readonly DialogueLine[] = [
  { id: 'vo_angel_p3_h1', speaker: 'Angel', text: 'Your grandmother was fond of dates.' },
  { id: 'vo_angel_p3_h2', speaker: 'Angel', text: 'The page in the lane. The year.' },
  { id: 'vo_angel_p3_h3', speaker: 'Angel', text: 'Look closely. The first two dials are glowing. Nineteen.' },
  { id: 'vo_angel_p3_h4', speaker: 'Angel', text: 'Every dial is glowing now. Follow them in order.' },
  { id: 'vo_angel_p5_h1', speaker: 'Angel', text: 'What does a house that holds something need?' },
  { id: 'vo_angel_p5_h2', speaker: 'Angel', text: 'Someone who keeps it.' },
  { id: 'vo_angel_p5_h3', speaker: 'Angel', text: 'Keeper, child. Spell it before I do.' },
  // Pressing T again at the same puzzle: the Angel teases, then gives the answer (game/t-hints.ts).
  { id: 'vo_angel_p3_t2', speaker: 'Angel', text: 'Oh, honestly. Nineteen sixty-six, dear. The year on the journal page. Do try to keep up.' },
  { id: 'vo_angel_p5_t2', speaker: 'Angel', text: 'Still stuck? Charming. K, E, E, P, E, R. Keeper. I am blushing on your behalf.' },
  { id: 'vo_angel_p4_t2', speaker: 'Angel', text: 'Oh, honestly. Hold Purify near the walls, child. Two marks by the doorway, one on the east wall. Wake each one and purify it. Do try.' },
];
