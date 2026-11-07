import type { InteractionContent } from './types.ts';

/** HUD tutorial prompts (docs/beat-sheet.md Beats 2-3). Plain keys only: no morality wording anywhere in UI text. */
export const TUTORIAL_TEXT: Readonly<Record<string, string>> = {
  tut_wasd: 'WASD: move · Mouse: look',
  tut_sprint: 'Shift: sprint',
  tut_interact: 'E: interact',
  tut_bolt: 'LMB: Arcane Bolt',
};

/**
 * Beats 2-3: the street (docs/beat-sheet.md). Order is enforced by `requires`; seq1 and seq2 live in
 * content/sequences/beat2.ts. cp_intersection is written by the existing seq2_done checkpoint rule.
 */
export const BEAT2: InteractionContent = {
  interactions: [
    {
      id: 'clue.street.candy_bag',
      prompt: "Look at Felix's sweets bag",
      show: { flags: ['seq2_done'] },
      actions: [{ do: 'say', line: 'vo_elena_b3_03' }],
    },
  ],
  triggers: [
    { id: 'trg.street.seq1', requires: { flags: ['home_done'] }, actions: [{ do: 'startSequence', sequence: 'seq1_empty_street' }] },
    // Only signals the running seq1 (the runtime sends every fired trigger to the sequence runner).
    { id: 'trg.street.seq1_end', requires: { flags: ['home_done'] }, actions: [] },
    {
      id: 'trg.street.streetlight',
      requires: { flags: ['seq1_done'], notFlags: ['seq2_done'] },
      actions: [{ do: 'startSequence', sequence: 'seq2_felix_streetlight' }],
    },
    // TODO(encounter-runtime): optional street fox. Start the stub encounter 'street_fox' here once the
    // encounter runtime hook exists (game/encounter-runtime*, owned by the Beat 4 work). Skipping changes nothing.
    { id: 'trg.street.fox', requires: { flags: ['seq2_done'] }, actions: [] },
  ],
  hints: [],
  onFlag: [
    {
      // Movement tutorial over the first ~20 m of walking.
      flag: 'home_done',
      actions: [
        { do: 'tutorial', textId: 'tut_wasd', seconds: 4 },
        { do: 'tutorial', textId: 'tut_sprint', seconds: 4, after: 4.5 },
        { do: 'tutorial', textId: 'tut_interact', seconds: 4, after: 9 },
      ],
    },
    {
      flag: 'seq2_done',
      actions: [
        { do: 'say', line: 'vo_elena_b3_02' },
        { do: 'say', line: 'vo_angel_b3_01', after: 3.5 },
        { do: 'say', line: 'vo_angel_b3_02', after: 8 },
        { do: 'tutorial', textId: 'tut_bolt', seconds: 10 },
      ],
    },
  ],
};
