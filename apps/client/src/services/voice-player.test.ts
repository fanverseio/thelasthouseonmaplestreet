import { describe, expect, it } from 'vitest';
import type { VoicePlayback } from './voice.ts';
import { createVoicePlayer, MAX_QUEUED, VOICE_GAP_MS } from './voice-player.ts';

/** Fake playback whose `done` the test resolves by hand, and a fake timer. */
function rig() {
  const calls: { id: string; stopped: boolean; end: () => void }[] = [];
  const play = (id: string): VoicePlayback => {
    let end = () => undefined as void;
    const done = new Promise<void>((r) => (end = r));
    const call = { id, stopped: false, end };
    calls.push(call);
    return { started: Promise.resolve(true), done, stop: () => ((call.stopped = true), end()) };
  };
  const timers: { fn: () => void; ms: number; cleared: boolean }[] = [];
  const setTimer = (fn: () => void, ms: number) => {
    const t = { fn, ms, cleared: false };
    timers.push(t);
    return t;
  };
  const clearTimer = (h: unknown) => void ((h as { cleared: boolean }).cleared = true);
  const v = createVoicePlayer({ play, setTimer, clearTimer });
  const flush = () => new Promise((r) => setTimeout(r, 0));
  const fireTimers = () => timers.filter((t) => !t.cleared).splice(0).forEach((t) => ((t.cleared = true), t.fn()));
  return { v, calls, timers, flush, fireTimers };
}

describe('voice player', () => {
  it('plays a spoken line by its id', () => {
    const r = rig();
    r.v.speak({ lineId: 'vo_elena_b1_01', text: 'Felix?' });
    expect(r.calls.map((c) => c.id)).toEqual(['vo_elena_b1_01']);
  });

  it('waits for the line to end, then 0.5 s, before the next line', async () => {
    const r = rig();
    r.v.speak({ lineId: 'a', text: '' });
    r.v.speak({ lineId: 'b', text: '' });
    expect(r.calls.map((c) => c.id)).toEqual(['a']); // b waits, a is not cut off
    expect(r.calls[0]!.stopped).toBe(false);
    r.calls[0]!.end();
    await r.flush();
    expect(r.calls).toHaveLength(1);
    expect(r.timers.at(-1)!.ms).toBe(VOICE_GAP_MS);
    r.fireTimers();
    expect(r.calls.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('drops the oldest waiting lines when too many pile up', async () => {
    const r = rig();
    for (const id of ['a', 'b', 'c', 'd', 'e']) r.v.speak({ lineId: id, text: '' });
    expect(MAX_QUEUED).toBe(2);
    for (let i = 0; i < 3; i++) {
      r.calls.at(-1)!.end();
      await r.flush();
      r.fireTimers();
    }
    expect(r.calls.map((c) => c.id)).toEqual(['a', 'd', 'e']);
  });

  it('stop() stops the line and clears what was waiting', async () => {
    const r = rig();
    r.v.speak({ lineId: 'a', text: '' });
    r.v.speak({ lineId: 'b', text: '' });
    r.v.stop();
    expect(r.calls[0]!.stopped).toBe(true);
    await r.flush();
    r.fireTimers();
    expect(r.calls.map((c) => c.id)).toEqual(['a']);
  });

  it('interrupt() cuts the line playing and plays the new one at once (T skips)', async () => {
    const r = rig();
    r.v.speak({ lineId: 'a', text: '' });
    r.v.speak({ lineId: 'b', text: '' });
    r.v.interrupt({ lineId: 'c', text: '' });
    expect(r.calls[0]!.stopped).toBe(true);
    expect(r.calls.map((c) => c.id)).toEqual(['a', 'c']); // b was dropped, no gap before c
    await r.flush();
    r.fireTimers();
    expect(r.calls.map((c) => c.id)).toEqual(['a', 'c']); // a ending late starts nothing
  });

  it('never throws when playback fails', () => {
    const v = createVoicePlayer(() => {
      throw new Error('no audio');
    });
    expect(() => v.speak({ lineId: 'x', text: '' })).not.toThrow();
    expect(() => v.stop()).not.toThrow();
  });
});
