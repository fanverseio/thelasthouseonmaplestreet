import type { SequenceDef } from '../../game/sequences.ts';
import { BEAT1_SEQUENCES } from './beat1.ts';

/** Add a beat's sequences by creating `beatN.ts` and listing it here. */
export const ALL_SEQUENCES: readonly SequenceDef[] = [...BEAT1_SEQUENCES];
