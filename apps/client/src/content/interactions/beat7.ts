import type { InteractionContent, InteractionDef } from './types.ts';

const HOUND_STATE = (n: 1 | 2) => ({ id: `enemy.grounds.hound_${n}`, key: 'state', is: 'resolved' }) as const;

/** Each hound is hidden as an interaction once it is resolved (its state lives in the entity store). */
const hound = (n: 1 | 2): InteractionDef => ({
  id: `enemy.grounds.hound_${n}`,
  prompt: 'Face the hound',
  show: { flags: ['lane_open'], notEntities: [HOUND_STATE(n)] },
  actions: [{ do: 'encounter', op: 'interact', id: `hound_${n}` }],
});

/**
 * Beat 7: the back lane, the window light, the two hounds and the outbuilding padlock (beat-sheet.md,
 * puzzles.md P3). The hounds are two bindings on the encounter stub (content/encounters/); enc_approach_resolved
 * is set by the stub when both are resolved. The padlock opens the P3 overlay only after that. padlock_open
 * opens door.grounds.outbuilding and writes cp_outbuilding (flag rule in game/checkpoints.ts).
 */
export const BEAT7: InteractionContent = {
  interactions: [
    {
      id: 'clue.lane.journal_3',
      prompt: 'Read the journal page',
      show: { flags: ['lane_open'], notFlags: ['journal_3'] },
      actions: [{ do: 'setFlag', flag: 'journal_3' }, { do: 'say', line: 'vo_rosalind_j3' }],
    },
    hound(1),
    hound(2),
    {
      id: 'puzzle.grounds.padlock',
      prompt: 'Try the padlock',
      lockedPrompt: 'Look at the padlock',
      show: { flags: ['lane_open'], notFlags: ['padlock_open'] },
      requires: { flags: ['enc_approach_resolved'] },
      onRefuse: [{ do: 'say', line: 'vo_elena_b7_02' }],
      actions: [{ do: 'openPuzzle', puzzle: 'p3_padlock' }],
    },
  ],
  triggers: [
    // Elena passes her own back garden: Felix's window lights up for about 5 s (atm_home_window).
    { id: 'trg.lane.home_window', requires: { flags: ['lane_open'] }, actions: [{ do: 'startSequence', sequence: 'atm_home_window' }] },
    // Entering the grounds wakes both hounds (approach range re-engages them after a death).
    {
      id: 'trg.grounds.enter',
      requires: { flags: ['lane_open'], notFlags: ['enc_approach_resolved'] },
      actions: [
        { do: 'checkpoint', event: 'enter:trg.grounds.enter' },
        { do: 'encounter', op: 'interact', id: 'hound_1' },
        { do: 'encounter', op: 'interact', id: 'hound_2' },
      ],
    },
  ],
  hints: [],
};
