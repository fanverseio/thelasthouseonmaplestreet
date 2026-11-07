import { BEAT1 } from './beat1.ts';
import { BEAT2 } from './beat2.ts';
import { BEAT4 } from './beat4.ts';
import { BEAT5 } from './beat5.ts';
import { BEAT6 } from './beat6.ts';
import { BEAT7 } from './beat7.ts';
import { BEAT8 } from './beat8.ts';
import { BEAT9 } from './beat9.ts';
import { BEAT10 } from './beat10.ts';
import { BEAT11 } from './beat11.ts';
import type { InteractionContent } from './types.ts';

export type * from './types.ts';

/** Add a beat by creating `beatN.ts` exporting an `InteractionContent` and listing it here. */
export const BEATS: readonly InteractionContent[] = [BEAT1, BEAT2, BEAT4, BEAT5, BEAT6, BEAT7, BEAT8, BEAT9, BEAT10, BEAT11];

export const ALL_INTERACTIONS: InteractionContent = {
  interactions: BEATS.flatMap((b) => b.interactions),
  triggers: BEATS.flatMap((b) => b.triggers),
  hints: BEATS.flatMap((b) => b.hints),
  onFlag: BEATS.flatMap((b) => b.onFlag ?? []),
  onCond: BEATS.flatMap((b) => b.onCond ?? []),
};
