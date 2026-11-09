import { describe, expect, it } from 'vitest';
import type { VoicePlayback } from './voice.ts';
import { createVoicePlayer } from './voice-player.ts';

function fakePlay() {
  const calls: { id: string; stopped: boolean }[] = [];
  const play = (id: string): VoicePlayback => {
    const call = { id, stopped: false };
    calls.push(call);
    return { started: Promise.resolve(true), done: Promise.resolve(), stop: () => (call.stopped = true) };
  };
  return { calls, play };
}

describe('voice player', () => {
  it('plays each spoken line by its id', () => {
    const f = fakePlay();
    const v = createVoicePlayer(f.play);
    v.speak({ lineId: 'vo_elena_b1_01', text: 'Felix?' });
    expect(f.calls.map((c) => c.id)).toEqual(['vo_elena_b1_01']);
  });

  it('a new line stops the one before it, so voices never overlap', () => {
    const f = fakePlay();
    const v = createVoicePlayer(f.play);
    v.speak({ lineId: 'a', text: '' });
    v.speak({ lineId: 'b', text: '' });
    expect(f.calls[0]!.stopped).toBe(true);
    expect(f.calls[1]!.stopped).toBe(false);
    v.stop();
    expect(f.calls[1]!.stopped).toBe(true);
  });

  it('never throws when playback fails', () => {
    const v = createVoicePlayer(() => {
      throw new Error('no audio');
    });
    expect(() => v.speak({ lineId: 'x', text: '' })).not.toThrow();
    expect(() => v.stop()).not.toThrow();
  });
});
