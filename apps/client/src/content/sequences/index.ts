import type { SequenceDef } from '../../game/sequences.ts';
import { BEAT1_SEQUENCES } from './beat1.ts';
import { BEAT2_SEQUENCES } from './beat2.ts';
import { BEAT4_SEQUENCES } from './beat4.ts';
import { BEAT5_SEQUENCES } from './beat5.ts';
import { BEAT7_SEQUENCES } from './beat7.ts';
import { BEAT8_SEQUENCES } from './beat8.ts';
import { BEAT10_SEQUENCES } from './beat10.ts';
import { BEAT11_SEQUENCES } from './beat11.ts';

/** Add a beat's sequences by creating `beatN.ts` and listing it here. */
export const ALL_SEQUENCES: readonly SequenceDef[] = [
  ...BEAT1_SEQUENCES,
  ...BEAT2_SEQUENCES,
  ...BEAT4_SEQUENCES,
  ...BEAT5_SEQUENCES,
  ...BEAT7_SEQUENCES,
  ...BEAT8_SEQUENCES,
  ...BEAT10_SEQUENCES,
  ...BEAT11_SEQUENCES,
];
