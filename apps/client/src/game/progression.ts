/**
 * Progression: the flag set and the only function that changes it.
 * Pure and headless. Both game modes use it; the Angel never calls it.
 * Rules come from docs/beat-sheet.md ("Pre" lines) and docs/contracts.md.
 */
import {
  EXCLUSIVE_FLAG_GROUPS,
  knowledgeLevelFromFlags,
  PROGRESS_FLAGS,
  type KnowledgeLevel,
  type ProgressFlag,
} from '@tlh/shared';

/** Flags that must already be set. A flag with no entry has no prerequisite. */
export const FLAG_PREREQUISITES: Partial<Record<ProgressFlag, readonly ProgressFlag[]>> = {
  angel_awake: ['locket_taken'],
  home_done: ['locket_taken', 'angel_awake'],
  seq2_done: ['seq1_done'],
  spell_bolt: ['seq2_done'],
  seq3_started: ['seq2_done'],
  spell_ward: ['seq3_started'],
  spell_purify: ['spell_ward'],
  walkie_found: ['seq3_started'],
  seq3_done: ['walkie_found'],
  seq4_done: ['seq3_done'],
  fuse_placed: ['fuse_taken'],
  watcher_started: ['fuse_placed'],
  fence_key_taken: ['watcher_started'],
  lane_open: ['fence_key_taken'],
  padlock_open: ['enc_approach_resolved'],
  seq5_done: ['padlock_open'],
  runes_done: ['seq5_done'],
  board_solved: ['enc_interior_resolved'],
  seq6_done: ['board_solved'],
  ritual_active: ['seq6_done'],
  felix3_done: ['ritual_active'],
  anchors_all: ['anchor_north', 'anchor_east', 'anchor_west'],
  ending_keeper: ['anchors_all'],
  ending_broken: ['anchors_all'],
  game_finished: ['anchors_all'],
};

/** Either one of these also satisfies the prerequisite (the two outcomes of a choice). */
const EITHER_OF: Partial<Record<ProgressFlag, readonly (readonly ProgressFlag[])[]>> = {
  walkie_found: [['briggs_purified', 'briggs_destroyed']],
  fence_key_taken: [['watcher_purified', 'watcher_destroyed']],
  game_finished: [['ending_keeper', 'ending_broken']],
};

export type FlagRejection = 'unknown_flag' | 'exclusive_conflict' | 'missing_prerequisite';

export type SetFlagResult =
  | { ok: true; flags: ProgressFlag[]; changed: boolean }
  | { ok: false; reason: FlagRejection; detail: string };

const KNOWN = new Set<string>(PROGRESS_FLAGS);

/**
 * The only writer. Returns a new list (or the same contents when the flag was already set).
 * Rejections never change state. The flag set only grows.
 */
export function setFlag(current: readonly ProgressFlag[], flag: string): SetFlagResult {
  if (!KNOWN.has(flag)) return { ok: false, reason: 'unknown_flag', detail: flag };
  const next = flag as ProgressFlag;
  if (current.includes(next)) return { ok: true, flags: [...current], changed: false };

  for (const group of EXCLUSIVE_FLAG_GROUPS) {
    if (group.includes(next)) {
      const other = group.find((f) => f !== next && current.includes(f));
      if (other) return { ok: false, reason: 'exclusive_conflict', detail: `${next} conflicts with ${other}` };
    }
  }

  const missing = (FLAG_PREREQUISITES[next] ?? []).filter((f) => !current.includes(f));
  if (missing.length > 0) return { ok: false, reason: 'missing_prerequisite', detail: `${next} needs ${missing.join(', ')}` };

  for (const group of EITHER_OF[next] ?? []) {
    if (!group.some((f) => current.includes(f))) {
      return { ok: false, reason: 'missing_prerequisite', detail: `${next} needs one of ${group.join(', ')}` };
    }
  }

  return { ok: true, flags: [...current, next], changed: true };
}

export function hasFlag(flags: readonly ProgressFlag[], flag: ProgressFlag): boolean {
  return flags.includes(flag);
}

/** The Angel's knowledge level: a pure function of flags. */
export function knowledgeLevel(flags: readonly ProgressFlag[]): KnowledgeLevel | null {
  return knowledgeLevelFromFlags(flags);
}

/** The central seal's state table (beat sheet). */
export type SealState = 'locked' | 'reveal' | 'activate' | 'inert' | 'choice' | 'done';

export function sealState(flags: readonly ProgressFlag[]): SealState {
  const has = (f: ProgressFlag) => flags.includes(f);
  if (has('ending_keeper') || has('ending_broken')) return 'done';
  if (has('anchors_all')) return 'choice';
  if (has('ritual_active')) return 'inert';
  if (has('seq6_done')) return 'activate';
  if (has('board_solved')) return 'reveal';
  return 'locked';
}
