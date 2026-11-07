import { describe, expect, it } from 'vitest';
import { SEQ1_EMPTY_STREET, SEQ2_FELIX_STREETLIGHT } from '../content/sequences/beat2.ts';
import { createGameStore } from '../store/game-store.ts';
import { createWorldRuntime } from './world-runtime.ts';
import { createSkipHold, isHoldSkippable, skipProgress } from './skip-hold.ts';
import { createSequenceRunner, type SequenceEffect } from './sequences.ts';
import { ALL_SEQUENCES } from '../content/sequences/index.ts';

function setup() {
  const store = createGameStore();
  store.getState().startNewGame('classic');
  for (const f of ['locket_taken', 'angel_awake', 'home_done', 'seq1_done']) store.getState().setFlag(f);
  const effects: SequenceEffect[] = [];
  const runner = createSequenceRunner({ store, onEffect: (e) => effects.push(e) });
  const skip = createSkipHold(runner, ALL_SEQUENCES);
  return { store, runner, skip, effects };
}

describe('skip-hold (pure part)', () => {
  it('progress is held ms over SKIP_HOLD_SECONDS, clamped', () => {
    expect(skipProgress(0)).toBe(0);
    expect(skipProgress(500)).toBe(0.5);
    expect(skipProgress(1000)).toBe(1);
    expect(skipProgress(5000)).toBe(1);
    expect(skipProgress(-5)).toBe(0);
  });

  it('only skippable sequences with locked control or a video step qualify', () => {
    expect(isHoldSkippable(undefined)).toBe(false);
    expect(isHoldSkippable(SEQ1_EMPTY_STREET)).toBe(false); // not skippable
    expect(isHoldSkippable(SEQ2_FELIX_STREETLIGHT)).toBe(true); // video step
    expect(isHoldSkippable({ ...SEQ1_EMPTY_STREET, skippable: true })).toBe(false); // full control, no clip
    expect(isHoldSkippable({ ...SEQ1_EMPTY_STREET, skippable: true, policy: { ...SEQ1_EMPTY_STREET.policy, control: 'locked' } })).toBe(true);
  });

  it('shows nothing and never skips while idle or during a non-skippable sequence', () => {
    const g = setup();
    expect(g.skip.feed(5000)).toBe(false);
    expect(g.skip.available).toBe(false);
    g.runner.trigger(SEQ1_EMPTY_STREET);
    expect(g.skip.feed(5000)).toBe(false);
    expect(g.skip.available).toBe(false);
    expect(g.runner.active).toBe('seq1_empty_street');
  });

  it('holding E for 1 s skips: flags, spell and clip stop applied', () => {
    const g = setup();
    g.runner.trigger(SEQ2_FELIX_STREETLIGHT);
    expect(g.effects.some((e) => e.k === 'video')).toBe(true);
    expect(g.skip.feed(0)).toBe(false);
    expect(g.skip.available).toBe(true);
    expect(g.skip.feed(500)).toBe(false);
    expect(g.skip.progress).toBe(0.5);
    expect(g.runner.active).not.toBeNull();
    expect(g.skip.feed(1000)).toBe(true);
    expect(g.runner.active).toBeNull();
    expect(g.skip.available).toBe(false);
    const flags = g.store.getState().progress.flags;
    expect(flags).toContain('seq2_done');
    expect(flags).toContain('spell_bolt');
    expect(g.effects.some((e) => e.k === 'videoStop')).toBe(true);
    expect(g.effects.find((e) => e.k === 'sequenceEnd')).toMatchObject({ how: 'skipped' });
  });

  it('a hold that began before the sequence must be released and pressed again', () => {
    const g = setup();
    g.runner.trigger(SEQ2_FELIX_STREETLIGHT);
    expect(g.skip.feed(900)).toBe(false);
    expect(g.skip.feed(1500)).toBe(false);
    expect(g.runner.active).not.toBeNull();
    g.skip.feed(0);
    expect(g.skip.feed(1000)).toBe(true);
  });

  it('releasing early resets the ring', () => {
    const g = setup();
    g.runner.trigger(SEQ2_FELIX_STREETLIGHT);
    g.skip.feed(0);
    g.skip.feed(800);
    expect(g.skip.progress).toBe(0.8);
    g.skip.feed(0);
    expect(g.skip.progress).toBe(0);
    expect(g.skip.available).toBe(true);
  });

  it('through the world runtime the video overlay disappears on skip', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    for (const f of ['locket_taken', 'angel_awake', 'home_done', 'seq1_done']) store.getState().setFlag(f);
    const world = createWorldRuntime({ store });
    const skip = createSkipHold(world.sequences, ALL_SEQUENCES);
    world.sequences.trigger(SEQ2_FELIX_STREETLIGHT);
    expect(world.video).not.toBeNull();
    skip.feed(0);
    expect(skip.feed(1000)).toBe(true);
    expect(world.video).toBeNull();
    expect(store.getState().player.spellsUnlocked).toContain('arcane_bolt');
  });
});
