import type { ChoiceDef } from '../../game/dialogue-choice.ts';

/**
 * Beat 5 (beat-sheet.md): the one choice with Gartner. Both options give the same information afterwards
 * (the sequence continues the same way) and his innocence is never in doubt (canon.md).
 */
export const GARTNER_CHOICE: ChoiceDef = {
  id: 'gartner_choice',
  options: [
    {
      id: 'comfort',
      label: 'Comfort him',
      flag: 'gartner_comforted',
      delta: 5,
      lines: [{ line: 'vo_elena_b5_c1' }, { line: 'vo_gartner_b5_06a', after: 4.5 }],
    },
    {
      id: 'press',
      label: 'Press him',
      flag: 'gartner_pressed',
      delta: -5,
      lines: [{ line: 'vo_elena_b5_p1' }, { line: 'vo_gartner_b5_06b', after: 3.5 }],
    },
  ],
};

/** Add a beat's choices by appending here. */
export const CHOICES: readonly ChoiceDef[] = [GARTNER_CHOICE];
