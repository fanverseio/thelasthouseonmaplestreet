import type { InteractionContent } from './types.ts';

/**
 * Beat 10: the central seal, state `reveal` ONLY (docs/beat-sheet.md "Central seal states": `board_solved` and
 * not `seq6_done`, game/progression.ts sealState). The activate, inert and choice states are other defs on the
 * same entity with their own `show` conditions (Beat 11/12). Finishing `seq6_two_keys` sets `seq6_done`,
 * which opens the three anchor doors through the existing gates.
 */
export const BEAT10: InteractionContent = {
  interactions: [
    {
      id: 'seal.ritual.central',
      prompt: 'Lay your hand on the seal',
      show: { flags: ['board_solved'], notFlags: ['seq6_done'] },
      actions: [{ do: 'startSequence', sequence: 'seq6_two_keys' }],
    },
    {
      id: 'clue.ritual.journal_5',
      prompt: 'Read the journal page',
      show: { flags: ['board_solved'], notFlags: ['journal_5'] },
      actions: [
        { do: 'setFlag', flag: 'journal_5' },
        { do: 'say', line: 'vo_rosalind_j5' },
      ],
    },
  ],
  triggers: [],
  hints: [],
};
