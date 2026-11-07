import type { ProgressFlag } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import {
  applyMoralityDelta,
  resolveEncounter,
  stepEncounter,
  STUB_ENCOUNTERS,
  type EncounterChoice,
  type EncounterState,
  type StubEncounterId,
} from './encounter-stub.ts';
import { setFlag } from './progression.ts';

function setAll(order: readonly string[], start: ProgressFlag[] = []): ProgressFlag[] {
  let flags = start;
  for (const f of order) {
    const r = setFlag(flags, f);
    if (!r.ok) throw new Error(`${f} rejected: ${r.detail}`);
    flags = r.flags;
  }
  return flags;
}

const BASE: Record<StubEncounterId, string[]> = {
  street_fox: ['locket_taken', 'angel_awake', 'seq1_done', 'seq2_done', 'seq3_started', 'spell_ward', 'spell_purify'],
  briggs: ['seq1_done', 'seq2_done', 'seq3_started'],
  watcher: ['fuse_taken', 'fuse_placed', 'watcher_started'],
  hound_1: [],
  hound_2: [],
  interior_cat: [],
};

const NEXT: Partial<Record<StubEncounterId, ProgressFlag>> = {
  street_fox: 'enc_street_resolved',
  briggs: 'walkie_found',
  watcher: 'fence_key_taken',
  interior_cat: 'enc_interior_resolved',
};

function stunned(id: StubEncounterId, choice: EncounterChoice, flags: ProgressFlag[], sibling?: StubEncounterId) {
  return resolveEncounter({
    id,
    state: 'stunned',
    choice,
    flags,
    siblingStates: sibling ? { [sibling]: 'resolved' } : undefined,
  });
}

describe('stub encounter table', () => {
  it('has the PRD morality values', () => {
    expect(STUB_ENCOUNTERS.briggs.moralityDelta).toEqual({ purify: 30, destroy: -30 });
    expect(STUB_ENCOUNTERS.watcher.moralityDelta).toEqual({ purify: 30, destroy: -30 });
    for (const id of ['street_fox', 'hound_1', 'hound_2', 'interior_cat'] as const) {
      expect(STUB_ENCOUNTERS[id].moralityDelta).toEqual({ purify: 10, destroy: -10 });
    }
  });
});

describe('both outcomes lead to the same next-step flag (P10)', () => {
  for (const id of Object.keys(NEXT) as StubEncounterId[]) {
    it(`${id}`, () => {
      const results = (['purify', 'destroy'] as const).map((choice) => {
        const r = stunned(id, choice, setAll(BASE[id]));
        if (!r.ok) throw new Error(r.reason);
        // Applying the flags in order must be accepted by progression.
        const after = setAll(r.flagsToSet, setAll(BASE[id]));
        expect(after).toContain(NEXT[id]);
        return r;
      });
      expect(results[0]?.next).toBe('resolved');
      expect(results[0]?.moralityDelta).toBe(-(results[1]?.moralityDelta ?? 0));
    });
  }

  it('hounds: both outcomes end at enc_approach_resolved', () => {
    for (const choice of ['purify', 'destroy'] as const) {
      const r = stunned('hound_2', choice, [], 'hound_1');
      expect(r.ok && r.flagsToSet).toEqual(['enc_approach_resolved']);
    }
  });

  it('sets the outcome flag before the drop flag', () => {
    const r = stunned('briggs', 'destroy', setAll(BASE.briggs));
    expect(r.ok && r.flagsToSet).toEqual(['briggs_destroyed', 'walkie_found']);
    const w = stunned('watcher', 'purify', setAll(BASE.watcher));
    expect(w.ok && w.flagsToSet).toEqual(['watcher_purified', 'fence_key_taken']);
  });
});

describe('hounds need both resolved', () => {
  it('first hound sets nothing', () => {
    const r = resolveEncounter({ id: 'hound_1', state: 'stunned', choice: 'purify', flags: [], siblingStates: { hound_2: 'stunned' } });
    expect(r.ok && r.flagsToSet).toEqual([]);
    expect(r.ok && r.moralityDelta).toBe(10);
  });
  it('second hound sets the flag once the first is resolved', () => {
    const r = stunned('hound_2', 'destroy', [], 'hound_1');
    expect(r.ok && r.flagsToSet).toEqual(['enc_approach_resolved']);
  });
});

describe('purify and destroy only at stun', () => {
  const early: EncounterState[] = ['idle', 'weakened'];
  for (const choice of ['purify', 'destroy'] as const) {
    it(`${choice} is rejected before stun`, () => {
      for (const state of early) {
        const r = resolveEncounter({ id: 'briggs', state, choice, flags: [] });
        expect(r).toEqual({ ok: false, reason: 'not_stunned', next: state });
      }
    });
    it(`${choice} is rejected after resolution`, () => {
      const r = resolveEncounter({ id: 'briggs', state: 'resolved', choice, flags: [] });
      expect(r.ok).toBe(false);
    });
  }
});

describe('street fox', () => {
  it('purify is locked without spell_purify and stays stunned', () => {
    const r = stunned('street_fox', 'purify', []);
    expect(r).toEqual({ ok: false, reason: 'purify_locked', next: 'stunned' });
  });
  it('destroy works without the spell', () => {
    const r = stunned('street_fox', 'destroy', []);
    expect(r.ok && r.flagsToSet).toEqual(['enc_street_resolved']);
  });
  it('skipped (never resolved) changes nothing: no flags, morality untouched', () => {
    const morality = { value: 0, history: [] };
    expect(applyMoralityDelta(morality, 0, 'skip', 1)).toBe(morality);
    expect(stepEncounter('stunned', 'weaken').ok).toBe(false);
  });
});

describe('angel-summoned enemies change nothing', () => {
  it('no flags, zero delta, unchanged morality', () => {
    const r = resolveEncounter({ id: 'briggs', state: 'stunned', choice: 'destroy', flags: [], summoned: true });
    expect(r.ok && r.flagsToSet).toEqual([]);
    expect(r.ok && r.moralityDelta).toBe(0);
    const m = { value: 5, history: [] };
    expect(applyMoralityDelta(m, r.ok ? r.moralityDelta : 1, 'x', 0)).toEqual(m);
  });
});

describe('state machine', () => {
  it('walks idle -> weakened -> stunned', () => {
    const a = stepEncounter('idle', 'weaken');
    expect(a).toEqual({ ok: true, state: 'weakened' });
    expect(stepEncounter('weakened', 'stun')).toEqual({ ok: true, state: 'stunned' });
  });
  it('cannot skip or move backwards', () => {
    expect(stepEncounter('idle', 'stun').ok).toBe(false);
    expect(stepEncounter('weakened', 'weaken').ok).toBe(false);
    expect(stepEncounter('stunned', 'weaken').ok).toBe(false);
    expect(stepEncounter('stunned', 'stun').ok).toBe(false);
    expect(stepEncounter('resolved', 'weaken')).toEqual({ ok: false, reason: 'already_resolved', state: 'resolved' });
  });
});

describe('applyMoralityDelta', () => {
  it('adds a history entry', () => {
    const m = applyMoralityDelta({ value: 0, history: [] }, 30, 'enemy.garden.briggs:purify', 12);
    expect(m).toEqual({ value: 30, history: [{ at: 12, delta: 30, reason: 'enemy.garden.briggs:purify' }] });
  });
  it('clamps at +/-100', () => {
    expect(applyMoralityDelta({ value: 90, history: [] }, 30, 'r', 0).value).toBe(100);
    expect(applyMoralityDelta({ value: -90, history: [] }, -30, 'r', 0).value).toBe(-100);
  });
  it('does not mutate its input', () => {
    const m = { value: 0, history: [] };
    applyMoralityDelta(m, 10, 'r', 0);
    expect(m).toEqual({ value: 0, history: [] });
  });
});
