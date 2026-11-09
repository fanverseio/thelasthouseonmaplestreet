import type { InteractionContent } from './types.ts';

/**
 * Beat 5: Gartner's confession at the shed behind No. 40 (beat-sheet.md). The scene itself is
 * content/sequences/beat5.ts; the choice is content/choices/. seq4_done opens gate.street.veil_house66
 * and writes cp_house66. The journal page is optional and never gates anything.
 */
export const BEAT5: InteractionContent = {
  interactions: [
    {
      id: 'door.hideout.shed',
      prompt: 'Knock on the shed door',
      lockedPrompt: 'The shed door is shut',
      show: { notFlags: ['seq4_done'] },
      requires: { flags: ['walkie_found'] },
      actions: [{ do: 'startSequence', sequence: 'seq4_gartner_confession' }],
    },
    // Gartner waits by the door; talking to him is the same scene.
    {
      id: 'npc.hideout.gartner',
      prompt: 'Talk to Gartner',
      lockedPrompt: 'A boy is hiding in the shed',
      show: { flags: ['walkie_found'], notFlags: ['seq4_done'] },
      requires: { flags: ['walkie_found'] },
      actions: [{ do: 'startSequence', sequence: 'seq4_gartner_confession' }],
    },
    {
      id: 'clue.hideout.journal_2',
      prompt: 'Read the journal page',
      show: { flags: ['seq4_done'], notFlags: ['journal_2'] },
      actions: [{ do: 'setFlag', flag: 'journal_2' }, { do: 'say', line: 'vo_rosalind_j2' }],
    },
  ],
  triggers: [],
  hints: [],
};
