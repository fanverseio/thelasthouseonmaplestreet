import type { InteractionContent } from './types.ts';

/**
 * Beat 9: the Last House interior (beat-sheet.md, puzzles.md P5). Entering switches the scene (the runtime waits
 * for the lazy loader), writes cp_interior and puts Elena at the entry. The cat is the `interior_cat` stub
 * encounter (content/encounters/index.ts); the talking board refuses until it is resolved, and solving it
 * (`board_solved`) writes cp_ritual and opens `door.interior.ritual` (content/world/interior-layout.ts).
 */
export const BEAT9: InteractionContent = {
  interactions: [
    {
      id: 'door.grounds.last_house_front',
      prompt: 'Enter the Last House',
      lockedPrompt: 'The front door will not open',
      requires: { flags: ['runes_done'] },
      actions: [
        { do: 'enterScene', scene: 'last_house', event: 'enter:last_house' },
        { do: 'say', line: 'vo_elena_b9_01', after: 2 },
      ],
    },
    {
      id: 'clue.interior.journal_4',
      prompt: 'Read the journal page',
      show: { notFlags: ['journal_4'] },
      actions: [
        { do: 'setFlag', flag: 'journal_4' },
        { do: 'readPage', page: 'journal_4' },
      ],
    },
    {
      id: 'enemy.interior.cat',
      prompt: 'Face the cat',
      show: { notFlags: ['enc_interior_resolved'] },
      actions: [{ do: 'encounter', op: 'interact', id: 'interior_cat' }],
    },
    {
      id: 'puzzle.interior.board',
      prompt: 'Use the talking board',
      lockedPrompt: 'Look at the talking board',
      show: { notFlags: ['board_solved'] },
      requires: { flags: ['enc_interior_resolved'] },
      onRefuse: [{ do: 'say', line: 'vo_elena_b9_02' }],
      actions: [{ do: 'openPuzzle', puzzle: 'p5_board' }],
    },
    {
      id: 'door.interior.ritual',
      prompt: 'Open the cellar door',
      lockedPrompt: 'The cellar door is locked',
      show: { notFlags: ['board_solved'] },
      requires: { flags: ['board_solved'] },
      actions: [],
    },
  ],
  triggers: [],
  hints: [],
  onFlag: [{ flag: 'board_solved', actions: [{ do: 'say', line: 'vo_elena_b9_03' }] }],
};
