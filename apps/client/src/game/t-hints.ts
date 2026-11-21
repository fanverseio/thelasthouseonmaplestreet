/**
 * T hints for the two overlay puzzles (the padlock P3 and the talking board P5). While one is active, each T press
 * climbs a two-step ladder: press 1 plays the indirect hint (level 1 of the existing hint lines), press 2 and later
 * plays the Angel teasing Elena and giving the exact answer. Pure; flags are never changed here.
 */
import type { ProgressFlag, PuzzleId } from '@tlh/shared';
import type { VoiceLineId } from '../content/dialogue/types.ts';

interface TPuzzle {
  id: PuzzleId;
  /** The puzzle can be solved once this flag is set. */
  requires: ProgressFlag;
  /** The flag the puzzle grants; the ladder ends when it is set. */
  grants: ProgressFlag;
  indirect: VoiceLineId;
  exact: VoiceLineId;
}

export const T_HINT_PUZZLES: readonly TPuzzle[] = [
  { id: 'p5_board', requires: 'enc_interior_resolved', grants: 'board_solved', indirect: 'vo_angel_p5_h1', exact: 'vo_angel_p5_t2' },
  { id: 'p3_padlock', requires: 'enc_approach_resolved', grants: 'padlock_open', indirect: 'vo_angel_p3_h1', exact: 'vo_angel_p3_t2' },
  // After the painting scene the second T explains where the three hidden runes are and how to wake them.
  { id: 'p4_runes', requires: 'seq5_done', grants: 'runes_done', indirect: 'vo_angel_p4_h2', exact: 'vo_angel_p4_t2' },
];

/** The puzzle whose T ladder is active under these flags, or null. */
export function activeTPuzzle(flags: readonly ProgressFlag[]): TPuzzle | null {
  return T_HINT_PUZZLES.find((p) => flags.includes(p.requires) && !flags.includes(p.grants)) ?? null;
}

/** Hint level for the nth T press (1-based): 1 indirect, 2 exact (and every press after). */
export function tHintLevel(presses: number): 1 | 2 {
  return presses <= 1 ? 1 : 2;
}

export function tHintLine(puzzle: TPuzzle, presses: number): VoiceLineId {
  return tHintLevel(presses) === 1 ? puzzle.indirect : puzzle.exact;
}
