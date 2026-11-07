import { BEAT1_LINES } from './beat1.ts';
import { BEAT2_LINES } from './beat2.ts';
import { BEAT3_LINES } from './beat3.ts';
import { BEAT4_LINES } from './beat4.ts';
import { BEAT5_LINES } from './beat5.ts';
import { BEAT6_LINES } from './beat6.ts';
import { BEAT11_LINES, BEAT12_LINES } from './beat11.ts';
import { BEAT10_LINES, BEAT9_LINES } from './beat9.ts';
import { BEAT7_LINES } from './beat7.ts';
import { LOCKET_PLACEHOLDER_LINES, LOCKET_SCRIPT_LINES } from './locket.ts';
import { PUZZLE_LINES } from './puzzles.ts';
import type { DialogueLine, VoiceLineId } from './types.ts';

export { CLASSIC_LINES } from './classic.ts';
export type { DialogueLine, Speaker, VoiceLineId } from './types.ts';
export { VOICE_LINE_ID_PATTERN } from './types.ts';

/** Every line, in script order. */
export const ALL_LINES: readonly DialogueLine[] = [...BEAT1_LINES, ...BEAT2_LINES, ...BEAT3_LINES, ...BEAT4_LINES, ...BEAT5_LINES, ...BEAT6_LINES, ...BEAT7_LINES, ...BEAT9_LINES, ...BEAT10_LINES, ...BEAT11_LINES, ...BEAT12_LINES, ...PUZZLE_LINES, ...LOCKET_SCRIPT_LINES, ...LOCKET_PLACEHOLDER_LINES];

const BY_ID = new Map<VoiceLineId, DialogueLine>(ALL_LINES.map((l) => [l.id, l]));

export function getLine(id: VoiceLineId): DialogueLine | undefined {
  return BY_ID.get(id);
}

