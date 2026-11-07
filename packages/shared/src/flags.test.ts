import { describe, expect, it } from 'vitest';
import {
  findFlagSetProblems,
  knowledgeLevelFromFlags,
  PROGRESS_FLAGS,
  ProgressFlagListSchema,
} from './flags.ts';

describe('progression flags', () => {
  it('has 48 unique flags', () => {
    expect(PROGRESS_FLAGS).toHaveLength(48);
    expect(new Set(PROGRESS_FLAGS).size).toBe(PROGRESS_FLAGS.length);
  });

  it('accepts a valid flag set', () => {
    expect(ProgressFlagListSchema.safeParse(['locket_taken', 'briggs_purified']).success).toBe(true);
  });

  it('rejects unknown flags', () => {
    expect(ProgressFlagListSchema.safeParse(['locket_taken', 'skip_to_end']).success).toBe(false);
  });

  it('rejects duplicates and mutually exclusive outcomes', () => {
    expect(findFlagSetProblems(['seq1_done', 'seq1_done'])).toHaveLength(1);
    expect(ProgressFlagListSchema.safeParse(['briggs_purified', 'briggs_destroyed']).success).toBe(false);
    expect(ProgressFlagListSchema.safeParse(['ending_keeper', 'ending_broken']).success).toBe(false);
  });
});

describe('knowledgeLevelFromFlags', () => {
  it('is null before the locket is found', () => {
    expect(knowledgeLevelFromFlags([])).toBeNull();
    expect(knowledgeLevelFromFlags(['bed_seen', 'drawing_seen'])).toBeNull();
  });

  it.each([
    [['locket_taken'], 0],
    [['locket_taken', 'seq2_done'], 1],
    [['locket_taken', 'seq2_done', 'seq3_done'], 2],
    [['seq4_done'], 3],
    [['seq5_done'], 4],
    [['seq6_done'], 5],
    [['seq6_done', 'ritual_active'], 6],
  ] as const)('maps %j to level %i', (flags, level) => {
    expect(knowledgeLevelFromFlags(flags)).toBe(level);
  });
});
