/** Typed config for the overlay puzzles (docs/puzzles.md). Plain data; machines live in game/puzzles.ts. */
import type { ProgressFlag, PuzzleId } from '@tlh/shared';
import type { VoiceLineId } from '../dialogue/types.ts';

interface BasePuzzleConfig {
  id: PuzzleId;
  /** Flag that must be set before the solve counts (the encounter before the puzzle). */
  requires: ProgressFlag;
  /** Flag set through the store's setFlag on solve. */
  grants: ProgressFlag;
  /** Optional idle hints: sim seconds of no input after which each next hint level is reached. */
  idleHintSeconds?: readonly number[];
}

export interface NumberLockConfig extends BasePuzzleConfig {
  kind: 'number_lock';
  code: string;
  /** Wrong-attempt counts at which hint level 1, 2, ... is reached. */
  hintAtWrong: readonly number[];
  /** Voice line per hint level (index 0 = level 1). */
  hintLines: readonly VoiceLineId[];
  /** Hint levels (1-based) from which dials glow: how many leading digits. */
  glowFromLevel: readonly { level: number; digits: number }[];
}

export interface TalkingBoardConfig extends BasePuzzleConfig {
  kind: 'talking_board';
  word: string;
  /** Wrong letters in one round before the board resets. */
  maxWrong: number;
  /** Scares in order, cycling. Never damage. */
  scares: readonly string[];
  /** Letters revealed after each reset (1st reset reveals the first, and so on). */
  bonusLetters: readonly string[];
  /** Voice line per reset (index 0 = after the first reset). */
  hintLines: readonly VoiceLineId[];
}
