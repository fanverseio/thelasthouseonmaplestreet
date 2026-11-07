import type { ProgressFlag } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { BEAT1 } from '../content/interactions/beat1.ts';
import { highlightsOf, hintLevelOf, initialHintState, stepHint, type HintState } from './hints.ts';
import { SIM_DT } from './player.ts';

const P1 = BEAT1.hints[0]!;

/** Fake clock: advance by `seconds` of sim time, one fixed step at a time. */
function run(state: HintState, flags: readonly ProgressFlag[], seconds: number) {
  let s = state;
  const fired: { at: number; say?: string; highlight?: string }[] = [];
  let t = 0;
  for (let i = 0; i < Math.round(seconds / SIM_DT); i++) {
    const r = stepHint(P1, s, flags, SIM_DT);
    s = r.state;
    t += SIM_DT;
    for (const f of r.fired) fired.push({ at: t, ...(f.say && { say: f.say }), ...(f.highlight && { highlight: f.highlight }) });
  }
  return { state: s, fired };
}

describe('P1 hints (45 s line, 90 s highlight)', () => {
  it('does nothing before drawing_seen', () => {
    const r = run(initialHintState(), ['bed_seen'], 200);
    expect(r.fired).toEqual([]);
    expect(r.state.elapsed).toBe(0);
  });

  it('fires the Elena line at 45 s and the pumpkin highlight at 90 s', () => {
    const flags: ProgressFlag[] = ['bed_seen', 'drawing_seen'];
    const a = run(initialHintState(), flags, 44.9);
    expect(a.fired).toEqual([]);
    const b = run(a.state, flags, 0.2);
    expect(b.fired).toHaveLength(1);
    expect(b.fired[0]).toMatchObject({ say: 'vo_elena_b1_h1' });
    expect(highlightsOf(P1, b.state)).toEqual([]);
    expect(hintLevelOf(b.state)).toBe(1);
    const c = run(b.state, flags, 44.7);
    expect(c.fired).toEqual([]);
    const d = run(c.state, flags, 0.3);
    expect(d.fired[0]).toMatchObject({ highlight: 'prop.home.pumpkin_jar' });
    expect(highlightsOf(P1, d.state)).toEqual(['prop.home.pumpkin_jar']);
    expect(hintLevelOf(d.state)).toBe(2);
    // each step fires once only
    expect(run(d.state, flags, 120).fired).toEqual([]);
  });

  it('is cancelled by drawer_key_taken: nothing fires and the highlight clears', () => {
    const early = run(initialHintState(), ['drawing_seen'], 30);
    const cancelled = run(early.state, ['drawing_seen', 'drawer_key_taken'], 200);
    expect(cancelled.fired).toEqual([]);
    expect(cancelled.state.cancelled).toBe(true);

    const late = run(initialHintState(), ['drawing_seen'], 95);
    expect(highlightsOf(P1, late.state)).toHaveLength(1);
    const after = run(late.state, ['drawing_seen', 'drawer_key_taken'], 1);
    expect(highlightsOf(P1, after.state)).toEqual([]);
    expect(hintLevelOf(after.state)).toBe(0);
  });

  it('is serialisable: a JSON round trip continues on schedule', () => {
    const flags: ProgressFlag[] = ['drawing_seen'];
    const mid = run(initialHintState(), flags, 40);
    const restored = JSON.parse(JSON.stringify(mid.state)) as HintState;
    expect(run(restored, flags, 4.9).fired).toEqual([]);
    expect(run(restored, flags, 5.1).fired).toHaveLength(1);
  });

  it('a long frame still fires every due step in order', () => {
    const r = stepHint(P1, initialHintState(), ['drawing_seen'], 100);
    expect(r.fired.map((f) => f.atSeconds)).toEqual([45, 90]);
  });
});
