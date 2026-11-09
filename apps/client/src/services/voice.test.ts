import { afterEach, describe, expect, it, vi } from 'vitest';
import { fallbackDurationMs, MIN_SUBTITLE_MS, playVoiceLine, voiceUrl } from './voice.ts';

afterEach(() => vi.useRealTimers());

describe('voice', () => {
  it('builds the asset url', () => {
    expect(voiceUrl('vo_angel_b1_01')).toBe('/assets/audio/vo/vo_angel_b1_01.mp3');
  });

  it('subtitle duration has a floor and grows with text', () => {
    expect(fallbackDurationMs('Hi')).toBe(MIN_SUBTITLE_MS);
    expect(fallbackDurationMs('x'.repeat(100))).toBeGreaterThan(MIN_SUBTITLE_MS);
  });

  it('falls back to subtitle-only after a timed duration when there is no file', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, headers: new Headers() });
    const p = playVoiceLine('vo_x_missing', 'Hello', { fetchFn: fetchFn as never, getContext: () => ({}) as never });
    await expect(p.started).resolves.toBe(false);
    let finished = false;
    void p.done.then(() => (finished = true));
    await vi.advanceTimersByTimeAsync(MIN_SUBTITLE_MS - 1);
    expect(finished).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(finished).toBe(true);
  });

  it('never throws when audio or fetch fail', async () => {
    vi.useFakeTimers();
    const p = playVoiceLine('vo_x_err', 'Hello', {
      fetchFn: (() => Promise.reject(new Error('net'))) as never,
      getContext: () => ({}) as never,
    });
    await expect(p.started).resolves.toBe(false);
    p.stop();
    await expect(p.done).resolves.toBeUndefined();
    const none = playVoiceLine('vo_x_noctx', 'Hello', { getContext: () => null });
    await expect(none.started).resolves.toBe(false);
    none.stop();
  });
});
