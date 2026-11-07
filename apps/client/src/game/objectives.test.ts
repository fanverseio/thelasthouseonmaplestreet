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

  it('has an objective for every beat 7-12 step, in story order', () => {
    const steps: [string[], string][] = [
      [['lane_open'], 'Follow the back lane to the Last House.'],
      [['lane_open', 'enc_approach_resolved'], 'Open the outbuilding padlock.'],
      [['lane_open', 'enc_approach_resolved', 'padlock_open'], 'Look into the mirror.'],
      [['padlock_open', 'seq5_done'], 'Find the three runes in the mirror.'],
      [['seq5_done', 'runes_done'], 'Enter the Last House.'],
      [['runes_done', 'enc_interior_resolved'], 'Solve the talking board.'],
      [['enc_interior_resolved', 'board_solved'], 'Approach the seal.'],
      [['board_solved', 'seq6_done'], 'Activate the seal.'],
      [['seq6_done', 'ritual_active'], 'Restore the three anchors.'],
      [['ritual_active', 'anchor_north', 'felix3_done'], 'Restore the remaining anchors.'],
      [['felix3_done', 'anchors_all'], 'Make your choice at the seal.'],
      [['anchors_all', 'ending_keeper'], 'Walk Felix out of the Last House.'],
      [['anchors_all', 'ending_broken'], 'Get Felix out of the Last House.'],
      [['ending_keeper', 'game_finished'], 'Take Felix home.'],
    ];
    for (const [flags, text] of steps) expect(objectiveFor(flags as never), flags.join()).toBe(text);
  });
});