import { afterEach, describe, expect, it, vi } from 'vitest';
import { fallbackDurationMs, MIN_SUBTITLE_MS, playVoiceLine, VOICE_FADE_S, voiceUrl } from './voice.ts';

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

describe('voice fades', () => {
  it('fades every line in and out over VOICE_FADE_S', async () => {
    const ramps: [string, number, number][] = [];
    const param = {
      value: 0,
      setValueAtTime: (v: number, t: number) => void ramps.push(['set', v, t]),
      linearRampToValueAtTime: (v: number, t: number) => void ramps.push(['ramp', v, t]),
      cancelScheduledValues: () => undefined,
    };
    let source: { buffer: unknown; connect: () => void; start: () => void; stop: () => void; onended: (() => void) | null } | null = null;
    const ctx = {
      currentTime: 10,
      decodeAudioData: async () => ({ duration: 2 }),
      createGain: () => ({ gain: param, connect: () => undefined }),
      createBufferSource: () => (source = { buffer: null, connect: () => undefined, start: () => undefined, stop: () => undefined, onended: null }),
      destination: {},
    } as unknown as AudioContext;
    const fetchFn = (async () => ({ ok: true, headers: { get: () => 'audio/mpeg' }, arrayBuffer: async () => new ArrayBuffer(8) })) as unknown as typeof fetch;
    const p = playVoiceLine('vo_test', 'hi', { fetchFn, getContext: () => ctx, getVolume: () => 0.8 });
    expect(await p.started).toBe(true);
    expect(ramps).toEqual([
      ['set', 0, 10],
      ['ramp', 0.8, 10 + VOICE_FADE_S],
      ['set', 0.8, 12 - VOICE_FADE_S],
      ['ramp', 0, 12],
    ]);
    expect(VOICE_FADE_S).toBe(0.25);
    source!.onended?.();
    await p.done;
  });
});
