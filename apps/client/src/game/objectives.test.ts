import { describe, expect, it } from 'vitest';
import { FIRST_OBJECTIVE, objectiveFor } from './objectives.ts';

describe('objectiveFor', () => {
  it('starts with the first objective', () => {
    expect(objectiveFor([])).toBe(FIRST_OBJECTIVE);
  });

  it('follows the latest story flag regardless of order in the list', () => {
    expect(objectiveFor(['seq2_done', 'seq1_done', 'home_done', 'locket_taken'])).toBe('Search the garden at No. 31.');
  });

  it('never contains digits that look like a morality score', () => {
    expect(objectiveFor(['anchors_all'])).not.toMatch(/[-+]\d/);
  });
});
