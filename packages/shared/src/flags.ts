import { z } from 'zod';
import type { KnowledgeLevel } from './ids.ts';

/**
 * Progression flags: the only representation of story progress.
 * Source of truth: docs/contracts.md section 2 and docs/beat-sheet.md.
 */
export const PROGRESS_FLAGS = [
  // beat 1
  'bed_seen',
  'drawing_seen',
  'drawer_key_taken',
  'locket_taken',
  'angel_awake',
  'home_done',
  // beats 2-3
  'seq1_done',
  'seq2_done',
  'spell_bolt',
  // optional street encounter
  'enc_street_resolved',
  // beat 4
  'seq3_started',
  'spell_ward',
  'spell_purify',
  'briggs_purified',
  'briggs_destroyed',
  'walkie_found',
  'seq3_done',
  // beat 5
  'seq4_done',
  'gartner_comforted',
  'gartner_pressed',
  // beat 6
  'fuse_taken',
  'fuse_placed',
  'watcher_started',
  'watcher_purified',
  'watcher_destroyed',
  'fence_key_taken',
  'lane_open',
  // beats 7-8
  'enc_approach_resolved',
  'padlock_open',
  'seq5_done',
  'runes_done',
  // beat 9
  'enc_interior_resolved',
  'board_solved',
  // beats 10-11
  'seq6_done',
  'ritual_active',
  'anchor_north',
  'anchor_east',
  'anchor_west',
  'felix3_done',
  'anchors_all',
  // beat 12
  'ending_keeper',
  'ending_broken',
  'game_finished',
  // optional lore
  'journal_1',
  'journal_2',
  'journal_3',
  'journal_4',
  'journal_5',
] as const;

export const ProgressFlagSchema = z.enum(PROGRESS_FLAGS);
export type ProgressFlag = z.infer<typeof ProgressFlagSchema>;

/** At most one flag from each group may be set. */
export const EXCLUSIVE_FLAG_GROUPS: readonly (readonly ProgressFlag[])[] = [
  ['briggs_purified', 'briggs_destroyed'],
  ['watcher_purified', 'watcher_destroyed'],
  ['gartner_comforted', 'gartner_pressed'],
  ['ending_keeper', 'ending_broken'],
];

/** Returns a list of problems with a flag set; empty means valid. */
export function findFlagSetProblems(flags: readonly ProgressFlag[]): string[] {
  const problems: string[] = [];
  const seen = new Set<ProgressFlag>();
  for (const flag of flags) {
    if (seen.has(flag)) problems.push(`duplicate flag: ${flag}`);
    seen.add(flag);
  }
  for (const group of EXCLUSIVE_FLAG_GROUPS) {
    const present = group.filter((flag) => seen.has(flag));
    if (present.length > 1) problems.push(`mutually exclusive flags set: ${present.join(', ')}`);
  }
  return problems;
}

export const ProgressFlagListSchema = z.array(ProgressFlagSchema).superRefine((flags, ctx) => {
  for (const message of findFlagSetProblems(flags)) {
    ctx.addIssue({ code: 'custom', message });
  }
});

/** Ordered from highest to lowest; the first flag present decides the level. */
const KNOWLEDGE_THRESHOLDS: readonly (readonly [ProgressFlag, KnowledgeLevel])[] = [
  ['ritual_active', 6],
  ['seq6_done', 5],
  ['seq5_done', 4],
  ['seq4_done', 3],
  ['seq3_done', 2],
  ['seq2_done', 1],
  ['locket_taken', 0],
];

/**
 * The Angel's knowledge level as a pure function of flags.
 * Returns null before the locket is found (there is no Angel yet).
 */
export function knowledgeLevelFromFlags(flags: Iterable<ProgressFlag>): KnowledgeLevel | null {
  const set = new Set(flags);
  for (const [flag, level] of KNOWLEDGE_THRESHOLDS) {
    if (set.has(flag)) return level;
  }
  return null;
}
