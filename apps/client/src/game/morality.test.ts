import { MORALITY_DARK_MAX, MORALITY_KIND_MIN, type ProgressFlag } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { createGameStore } from '../store/game-store.ts';
import {
  addMorality,
  applyDelta,
  applyEnemyOutcome,
  bandOf,
  currentBand,
  gartnerDelta,
  MORALITY_DELTAS,
  MORALITY_MAX,
  MORALITY_MIN,
  moralityDeltaFor,
  moralityHistory,
  resolveEnemyOutcome,
  stubMoralityDelta,
  type MoralityState,
} from './morality.ts';
import { STUB_ENCOUNTERS, type StubEncounterId } from './encounter-stub.ts';

const EMPTY: MoralityState = { value: 0, history: [] };

describe('morality deltas (docs/combat-tuning.md section 6)', () => {
  it('mini-boss +/-30, animal +/-10, Gartner +/-5, everything else 0', () => {
    expect(moralityDeltaFor('mini_boss', 'purify')).toBe(30);
    expect(moralityDeltaFor('mini_boss', 'destroy')).toBe(-30);
    expect(moralityDeltaFor('animal', 'purify')).toBe(10);
    expect(moralityDeltaFor('animal', 'destroy')).toBe(-10);
    expect(moralityDeltaFor('none', 'purify')).toBe(0);
    expect(moralityDeltaFor('none', 'destroy')).toBe(0);
    expect(gartnerDelta('comfort')).toBe(5);
    expect(gartnerDelta('press')).toBe(-5);
    expect(MORALITY_DELTAS).toEqual({ miniBoss: 30, animal: 10, gartner: 5 });
  });

  it('the stub encounter table and this module agree for every enemy', () => {
    const cls: Record<StubEncounterId, 'mini_boss' | 'animal'> = {
      street_fox: 'animal', briggs: 'mini_boss', watcher: 'mini_boss', hound_1: 'animal', hound_2: 'animal', interior_cat: 'animal',
    };
    for (const id of Object.keys(STUB_ENCOUNTERS) as StubEncounterId[]) {
      expect(stubMoralityDelta(id, 'purify'), id).toBe(moralityDeltaFor(cls[id], 'purify'));
      expect(stubMoralityDelta(id, 'destroy'), id).toBe(moralityDeltaFor(cls[id], 'destroy'));
    }
  });

  it('the best case is clamped: 30 + 30 + 4 x 10 + 5 = 105 -> 100', () => {
    let m = EMPTY;
    for (const d of [30, 30, 10, 10, 10, 10, 5]) m = applyDelta(m, d, 'x', 0);
    expect(m.value).toBe(100);
    expect(m.history).toHaveLength(7);
  });

  it('a zero delta (Angel-summoned, skipped fox) changes and records nothing', () => {
    expect(applyDelta(EMPTY, 0, 'summoned', 5)).toBe(EMPTY);
  });

  it('history records the requested delta, not the clamped change', () => {
    const m = applyDelta({ value: 95, history: [] }, 30, 'enemy.garden.briggs:purify', 12);
    expect(m.value).toBe(100);
    expect(m.history).toEqual([{ at: 12, delta: 30, reason: 'enemy.garden.briggs:purify' }]);
  });
});

describe('bands', () => {
  it('dark <= -25, neutral -24..24, kind >= 25, at the edges', () => {
    expect(bandOf(-100)).toBe('dark');
    expect(bandOf(MORALITY_DARK_MAX)).toBe('dark');
    expect(bandOf(-24)).toBe('neutral');
    expect(bandOf(0)).toBe('neutral');
    expect(bandOf(24)).toBe('neutral');
    expect(bandOf(MORALITY_KIND_MIN)).toBe('kind');
    expect(bandOf(100)).toBe('kind');
    expect(bandOf({ value: -30, history: [] })).toBe('dark');
  });

  it('the store helpers move the value and report the band', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    expect(currentBand(store)).toBe('neutral');
    expect(addMorality(store, 30, 'a', 1)).toBe(30);
    expect(currentBand(store)).toBe('kind');
    addMorality(store, -60, 'b', 2);
    expect(currentBand(store)).toBe('dark');
    expect(moralityHistory(store)).toHaveLength(2);
  });
});

describe('P1: morality always stays within bounds (seeded loops)', () => {
  const POOL = [30, -30, 10, -10, 5, -5, 0, 0, 1000, -1000, 7.5, -7.5, Number.NaN];

  it('1000 random runs of up to 40 events: value in [-100, 100], integer, band consistent, history exact', () => {
    for (let seed = 1; seed <= 1000; seed++) {
      let s = seed * 2654435761;
      const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
      let m: MoralityState = EMPTY;
      let model = 0;
      let nonZero = 0;
      const n = 1 + Math.floor(rnd() * 40);
      for (let i = 0; i < n; i++) {
        const delta = POOL[Math.floor(rnd() * POOL.length)]!;
        m = applyDelta(m, delta, `e${i}`, i);
        // Reference model: the same clamp applied to the running sum.
        model = Number.isNaN(model + delta) ? 0 : Math.round(Math.min(100, Math.max(-100, model + delta)));
        if (delta !== 0) nonZero++;
        expect(m.value).toBeGreaterThanOrEqual(MORALITY_MIN);
        expect(m.value).toBeLessThanOrEqual(MORALITY_MAX);
        expect(Number.isInteger(m.value)).toBe(true);
        const band = bandOf(m);
        expect(band).toBe(m.value <= -25 ? 'dark' : m.value >= 25 ? 'kind' : 'neutral');
      }
      expect(m.value).toBe(model);
      expect(m.history).toHaveLength(nonZero);
    }
  });

  it('the band is monotonic across the whole range and covers all three bands', () => {
    const order = { dark: 0, neutral: 1, kind: 2 } as const;
    let prev = -1;
    const seen = new Set<string>();
    for (let v = MORALITY_MIN; v <= MORALITY_MAX; v++) {
      const b = bandOf(v);
      expect(order[b]).toBeGreaterThanOrEqual(prev);
      prev = order[b];
      seen.add(b);
    }
    expect([...seen].sort()).toEqual(['dark', 'kind', 'neutral']);
  });
});

describe('outcome wiring reuses the stub flag tables', () => {
  const FLAGS_BEFORE_BRIGGS: ProgressFlag[] = ['locket_taken', 'angel_awake', 'home_done', 'seq1_done', 'seq2_done', 'spell_bolt', 'seq3_started', 'spell_ward', 'spell_purify'];

  it('Briggs purified: outcome flag, then drops, +30', () => {
    const r = resolveEnemyOutcome({ stubId: 'briggs', enemyId: 'enemy.garden.briggs', choice: 'purify', flags: FLAGS_BEFORE_BRIGGS });
    expect(r).toEqual({ ok: true, flagsToSet: ['briggs_purified', 'walkie_found'], moralityDelta: 30, reason: 'enemy.garden.briggs:purify' });
  });

  it('Briggs destroyed: briggs_destroyed, -30', () => {
    const r = resolveEnemyOutcome({ stubId: 'briggs', enemyId: 'enemy.garden.briggs', choice: 'destroy', flags: FLAGS_BEFORE_BRIGGS });
    expect(r).toMatchObject({ ok: true, flagsToSet: ['briggs_destroyed', 'walkie_found'], moralityDelta: -30 });
  });

  it('the group flag waits for both hounds, and a purify before the spell is taught is refused for the fox', () => {
    const first = resolveEnemyOutcome({ stubId: 'hound_1', enemyId: 'h1', choice: 'destroy', flags: [], siblingStates: { hound_2: 'stunned' } });
    expect(first).toMatchObject({ ok: true, flagsToSet: [], moralityDelta: -10 });
    const second = resolveEnemyOutcome({ stubId: 'hound_2', enemyId: 'h2', choice: 'purify', flags: [], siblingStates: { hound_1: 'resolved' } });
    expect(second).toMatchObject({ ok: true, flagsToSet: ['enc_approach_resolved'], moralityDelta: 10 });
    expect(resolveEnemyOutcome({ stubId: 'street_fox', enemyId: 'f', choice: 'purify', flags: [] })).toEqual({ ok: false, reason: 'purify_locked' });
  });

  it('Angel-summoned enemies change no flag and no morality, whatever the choice', () => {
    for (const choice of ['purify', 'destroy'] as const) {
      expect(resolveEnemyOutcome({ stubId: 'hound_1', enemyId: 'x', choice, flags: [], summoned: true })).toMatchObject({ ok: true, flagsToSet: [], moralityDelta: 0 });
      expect(resolveEnemyOutcome({ moralityClass: 'animal', enemyId: 'x', choice, flags: [], summoned: true })).toMatchObject({ flagsToSet: [], moralityDelta: 0 });
    }
  });

  it('an enemy without a stub row uses its class: wraith and decoy 0, an animal +/-10', () => {
    expect(resolveEnemyOutcome({ moralityClass: 'none', enemyId: 'w', choice: 'destroy', flags: [] })).toMatchObject({ flagsToSet: [], moralityDelta: 0 });
    expect(resolveEnemyOutcome({ moralityClass: 'animal', enemyId: 'a', choice: 'destroy', flags: [] })).toMatchObject({ moralityDelta: -10 });
  });

  it('applyEnemyOutcome sets the flags through the store and moves the morality once', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    for (const f of FLAGS_BEFORE_BRIGGS) expect(store.getState().setFlag(f).ok, f).toBe(true);
    const r = applyEnemyOutcome(store, { stubId: 'briggs', enemyId: 'enemy.garden.briggs', choice: 'purify' }, 3);
    expect(r.ok).toBe(true);
    expect(store.getState().progress.flags).toEqual(expect.arrayContaining(['briggs_purified', 'walkie_found']));
    expect(store.getState().progress.morality.value).toBe(30);
    expect(moralityHistory(store)).toEqual([{ at: 3, delta: 30, reason: 'enemy.garden.briggs:purify' }]);
  });
});

describe('morality never drives progression (static)', () => {
  const core = import.meta.glob('./{progression,gates,checkpoints}.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const interactions = import.meta.glob('../content/interactions/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const files = Object.entries({ ...core, ...interactions }).filter(([name]) => !name.endsWith('.test.ts'));
  /** A read of the score: the slice, the helpers or an import of the module. Comments are stripped first. */
  const READS = /progress\.morality|\.morality\b|\bmorality\s*[:=]|moralityBand|clampMorality|MORALITY_|currentBand|moralityHistory|bandOf\b|from\s+['"][^'"]*morality/;
  const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('checks the files it claims to', () => {
    expect(files.length).toBeGreaterThanOrEqual(13);
    expect(files.map(([n]) => n)).toEqual(expect.arrayContaining(['./progression.ts', './gates.ts', './checkpoints.ts']));
  });

  it.each(files.map(([name, src]) => ({ name, src })))('$name does not read morality', ({ src }) => {
    expect(strip(src)).not.toMatch(READS);
  });
});
