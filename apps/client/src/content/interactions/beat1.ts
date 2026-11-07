import type { InteractionContent } from './types.ts';

/** Beat 1: Elena's Home (beat-sheet.md, puzzles.md P1). Order is enforced by `show`/`requires`. */
export const BEAT1: InteractionContent = {
  interactions: [
    {
      id: 'clue.home.drawing',
      prompt: "Look at Felix's drawing",
      show: { notFlags: ['drawing_seen'] },
      actions: [
        { do: 'setFlag', flag: 'drawing_seen' },
        { do: 'say', line: 'vo_elena_b1_04' },
      ],
    },
    {
      id: 'prop.home.pumpkin_jar',
      prompt: 'Look inside the pumpkin jar',
      show: { flags: ['drawing_seen'], notFlags: ['drawer_key_taken'] },
      actions: [
        { do: 'pickUp', item: 'drawer_key' },
        { do: 'setFlag', flag: 'drawer_key_taken' },
        { do: 'say', line: 'vo_elena_b1_05' },
      ],
    },
    {
      id: 'socket.home.drawer',
      prompt: 'Unlock the drawer',
      lockedPrompt: 'Drawer (locked)',
      show: { notFlags: ['locket_taken'] },
      requires: { carried: ['drawer_key'] },
      actions: [
        { do: 'useSocket', item: 'drawer_key' },
        { do: 'setFlag', flag: 'locket_taken' },
        { do: 'say', line: 'vo_elena_b1_06' },
        { do: 'startSequence', sequence: 'angel_intro' },
      ],
    },
    {
      id: 'clue.home.journal_1',
      prompt: 'Read the note in the drawer',
      show: { flags: ['locket_taken'], notFlags: ['journal_1'] },
      actions: [
        { do: 'setFlag', flag: 'journal_1' },
        { do: 'say', line: 'vo_rosalind_j1' },
      ],
    },
    {
      id: 'door.home.front',
      prompt: 'Open the front door',
      show: { notFlags: ['home_done'] },
      requires: { flags: ['locket_taken'] },
      onRefuse: [{ do: 'say', line: 'vo_elena_b1_09' }],
      // home_done also needs angel_awake (progression rules): the door stays shut until the intro ends.
      actions: [{ do: 'setFlag', flag: 'home_done' }],
    },
  ],
  triggers: [
    {
      id: 'trg.home.bedroom',
      actions: [
        { do: 'setFlag', flag: 'bed_seen' },
        { do: 'say', line: 'vo_elena_b1_01' },
        { do: 'say', line: 'vo_elena_b1_02', after: 3 },
      ],
    },
  ],
  hints: [
    {
      id: 'p1_hints',
      puzzle: 'p1_drawer',
      startFlag: 'drawing_seen',
      cancelFlag: 'drawer_key_taken',
      steps: [
        { atSeconds: 45, say: 'vo_elena_b1_h1' },
        { atSeconds: 90, highlight: 'prop.home.pumpkin_jar' },
      ],
    },
  ],
};
