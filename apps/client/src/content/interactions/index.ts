import { BEAT1 } from './beat1.ts';
import type { InteractionContent } from './types.ts';

export type * from './types.ts';

/** Add a beat by creating `beatN.ts` exporting an `InteractionContent` and listing it here. */
export const BEATS: readonly InteractionContent[] = [BEAT1];

export const ALL_INTERACTIONS: InteractionContent = {
  interactions: BEATS.flatMap((b) => b.interactions),
  triggers: BEATS.flatMap((b) => b.triggers),
  hints: BEATS.flatMap((b) => b.hints),
};
