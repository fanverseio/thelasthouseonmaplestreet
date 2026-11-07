import { PROGRESS_FLAGS, type ProgressFlag } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { FLAG_PREREQUISITES, knowledgeLevel, sealState, setFlag } from './progression.ts';

/** Sets flags in order, failing the test if any is rejected. */
function setAll(order: readonly string[], start: ProgressFlag[] = []): ProgressFlag[] {
  let flags = start;
  for (const f of order) {
    const r = setFlag(flags, f);
    if (!r.ok) throw new Error(`${f} rejected: ${r.detail}`);
    flags = r.flags;
  }
  return flags;
}

const HOME = ['bed_seen', 'drawing_seen', 'drawer_key_taken', 'locket_taken', 'angel_awake', 'home_done'];
const STREET = ['seq1_done', 'seq2_done', 'spell_bolt'];
const GARDEN = ['seq3_started', 'spell_ward', 'spell_purify', 'briggs_purified', 'walkie_found', 'seq3_done'];
const HIDEOUT = ['seq4_done', 'gartner_comforted'];
const HOUSE66 = ['fuse_taken', 'fuse_placed', 'watcher_started', 'watcher_destroyed', 'fence_key_taken', 'lane_open'];
const GROUNDS = ['enc_approach_resolved', 'padlock_open', 'seq5_done', 'runes_done'];
const INTERIOR = ['enc_interior_resolved', 'board_solved', 'seq6_done'];
const RITUAL = ['ritual_active', 'anchor_east', 'felix3_done', 'anchor_north', 'anchor_west', 'anchors_all'];

describe('setFlag', () => {
  it('rejects unknown flags without changing state', () => {
    const r = setFlag(['bed_seen'], 'not_a_flag');
    expect(r).toMatchObject({ ok: false, reason: 'unknown_flag' });
  });

  it('is idempotent', () => {
    const r = setFlag(['bed_seen'], 'bed_seen');
    expect(r).toEqual({ ok: true, flags: ['bed_seen'], changed: false });
  });

  it('does not mutate its input', () => {
    const input: ProgressFlag[] = ['bed_seen'];
    setFlag(input, 'drawing_seen');
    expect(input).toEqual(['bed_seen']);
  });

  it('rejects the second flag of an exclusive pair', () => {
    const flags = setAll(['locket_taken', 'angel_awake', 'home_done', ...STREET, 'seq3_started', 'briggs_purified']);
    expect(setFlag(flags, 'briggs_destroyed')).toMatchObject({ ok: false, reason: 'exclusive_conflict' });
  });

  it('rejects a flag whose prerequisite is missing', () => {
    expect(setFlag([], 'seq2_done')).toMatchObject({ ok: false, reason: 'missing_prerequisite' });
    expect(setFlag(['locket_taken'], 'anchors_all')).toMatchObject({ ok: false, reason: 'missing_prerequisite' });
  });

  it('needs one outcome of a choice before its drop', () => {
    const base = setAll(['locket_taken', 'angel_awake', 'home_done', ...STREET, 'seq3_started']);
    expect(setFlag(base, 'walkie_found')).toMatchObject({ ok: false });
    expect(setFlag([...base, 'briggs_destroyed'], 'walkie_found')).toMatchObject({ ok: true });
    expect(setFlag([...base, 'briggs_purified'], 'walkie_found')).toMatchObject({ ok: true });
  });

  it('allows the full critical path in order, with either outcome of every choice', () => {
    const path = [...HOME, ...STREET, ...GARDEN, ...HIDEOUT, ...HOUSE66, ...GROUNDS, ...INTERIOR, ...RITUAL];
    for (const ending of ['ending_keeper', 'ending_broken']) {
      const flags = setAll([...path, ending, 'game_finished']);
      expect(flags).toContain(ending);
      expect(flags).toContain('game_finished');
    }
    const other = setAll(
      [...HOME, ...STREET, ...GARDEN.map((f) => (f === 'briggs_purified' ? 'briggs_destroyed' : f)), ...HIDEOUT],
    );
    expect(other).toContain('briggs_destroyed');
  });

  it('only prerequisites that are real flags are declared', () => {
    for (const [flag, pre] of Object.entries(FLAG_PREREQUISITES)) {
      expect(PROGRESS_FLAGS).toContain(flag);
      for (const p of pre ?? []) expect(PROGRESS_FLAGS).toContain(p);
    }
  });

  it('has no prerequisite cycle: every flag is reachable from an empty set', () => {
    let flags: ProgressFlag[] = [];
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const f of PROGRESS_FLAGS) {
        if (flags.includes(f)) continue;
        const r = setFlag(flags, f);
        if (r.ok && r.changed) {
          flags = r.flags;
          progressed = true;
        }
      }
    }
    // Everything except the second member of each exclusive pair can be set.
    const missing = PROGRESS_FLAGS.filter((f) => !flags.includes(f));
    expect(missing.sort()).toEqual(['briggs_destroyed', 'ending_broken', 'gartner_pressed', 'watcher_destroyed'].sort());
  });
});

describe('knowledgeLevel', () => {
  it('follows the story flags', () => {
    expect(knowledgeLevel([])).toBeNull();
    expect(knowledgeLevel(['locket_taken'])).toBe(0);
    expect(knowledgeLevel(['locket_taken', 'seq2_done'])).toBe(1);
    expect(knowledgeLevel(['ritual_active'])).toBe(6);
  });
});

describe('sealState', () => {
  it('walks the table', () => {
    expect(sealState([])).toBe('locked');
    expect(sealState(['board_solved'])).toBe('reveal');
    expect(sealState(['board_solved', 'seq6_done'])).toBe('activate');
    expect(sealState(['seq6_done', 'ritual_active'])).toBe('inert');
    expect(sealState(['ritual_active', 'anchors_all'])).toBe('choice');
    expect(sealState(['anchors_all', 'ending_keeper'])).toBe('done');
  });
});
