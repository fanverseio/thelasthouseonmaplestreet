import { describe, expect, it } from 'vitest';
import { createSkipHold } from '../game/skip-hold.ts';
import type { SequenceDef } from '../game/sequences.ts';
import { clipUrl, fallbackDelayMs, holdForRotate, modeAfterPlayRejected, shouldPlay } from './video-playback.ts';

describe('video playback rules', () => {
  it('loads /assets/video/<clipId>.mp4', () => {
    expect(clipUrl('cin_angel_intro')).toBe('/assets/video/cin_angel_intro.mp4');
  });

  it('a refused autoplay waits for a gesture; any other play failure falls back', () => {
    expect(modeAfterPlayRejected(new DOMException('no gesture', 'NotAllowedError'))).toBe('needsTap');
    expect(modeAfterPlayRejected(new DOMException('bad file', 'NotSupportedError'))).toBe('fallback');
    expect(modeAfterPlayRejected(undefined)).toBe('fallback');
  });

  it('the fallback runs the full length before load, and what is left (at least 1 s) after', () => {
    expect(fallbackDelayMs(20, false, 0)).toBe(20_000);
    expect(fallbackDelayMs(20, true, 15)).toBe(5_000);
    expect(fallbackDelayMs(20, true, 25)).toBe(1_000);
  });

  it('holds the clip while a phone is upright, the tap is pending or the game is paused', () => {
    expect(holdForRotate(true, true)).toBe(true);
    expect(holdForRotate(false, true)).toBe(false); // desktop: never
    expect(holdForRotate(true, false)).toBe(false);
    expect(shouldPlay('playing', false, false)).toBe(true);
    expect(shouldPlay('playing', true, false)).toBe(false);
    expect(shouldPlay('playing', false, true)).toBe(false);
    expect(shouldPlay('needsTap', false, false)).toBe(false);
  });
});

describe('hold E on a clip inside a sequence that is not skippable', () => {
  const def = (skippable: boolean): SequenceDef => ({
    id: 'seq4_gartner_confession',
    kind: 'horror',
    trigger: { entity: 'door.hideout.shed' },
    requires: [],
    owns: [],
    policy: { locket: 'blocked', angelActions: 'blocked', control: 'limited' },
    maxForcedSeconds: 22,
    skippable,
    setsOnComplete: [],
    steps: [{ t: 'video', clipId: 'cin_gartner_confession', fallbackSeconds: 22 }],
  });

  it('ends only the clip; with no clip on screen nothing is offered', () => {
    const ended: string[] = [];
    let skips = 0;
    let clip: string | null = 'cin_gartner_confession';
    const runner = { active: 'seq4_gartner_confession' as const, skip: () => ((skips++), { skipped: true, effects: [] }) };
    const hold = createSkipHold(runner, [def(false)], { current: () => clip, end: (id) => ended.push(id) });
    expect(hold.feed(0)).toBe(false); // E is up when the clip starts
    expect(hold.feed(500)).toBe(false);
    expect(hold.available).toBe(true);
    expect(hold.feed(1000)).toBe(true);
    expect(ended).toEqual(['cin_gartner_confession']);
    expect(skips).toBe(0);
    clip = null;
    expect(hold.feed(0)).toBe(false);
    expect(hold.available).toBe(false);
  });

  it('a skippable sequence still skips whole', () => {
    let skips = 0;
    const runner = { active: 'seq4_gartner_confession' as const, skip: () => ((skips++), { skipped: true, effects: [] }) };
    const hold = createSkipHold(runner, [def(true)], { current: () => 'cin_gartner_confession', end: () => undefined });
    hold.feed(0);
    expect(hold.feed(1000)).toBe(true);
    expect(skips).toBe(1);
  });
});
