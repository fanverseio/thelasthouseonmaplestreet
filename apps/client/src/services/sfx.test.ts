import { describe, expect, it } from 'vitest';
import type { SequenceEffect } from '../game/sequences.ts';
import { CUE_MIN_INTERVAL_S, CUE_TABLE, LATE_CUE_MAX_AGE_S, createSfx, cueForEffect, doorCueForFlags, duckForEffect, sfxGain } from './sfx.ts';

/** Just enough of an AudioContext to count what a cue starts. */
function fakeContext() {
  const started = { osc: 0, noise: 0 };
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect() {}, gain: param(), frequency: param(), Q: param() });
  const ctx = {
    currentTime: 0,
    sampleRate: 8000,
    destination: {},
    createGain: node,
    createBiquadFilter: node,
    createOscillator: () => ({ ...node(), type: 'sine', start: () => void started.osc++, stop() {} }),
    createBuffer: (_c: number, n: number) => ({ getChannelData: () => new Float32Array(n) }),
    createBufferSource: () => ({ ...node(), buffer: null, start: () => void started.noise++ }),
  };
  return { ctx: ctx as unknown as AudioContext, started };
}

const audio = (cue: string, bus: 'sfx' | 'amb' | 'mus' | 'vo' = 'sfx') => ({ k: 'audio', cue, bus, sequenceId: 'seq1_empty_street' }) as unknown as SequenceEffect;

describe('sfx cue table', () => {
  it('covers footsteps, flicker, the three spells and the door', () => {
    for (const id of ['sfx_footsteps_behind', 'sfx_light_flicker', 'sfx_spell_bolt', 'sfx_spell_ward', 'sfx_spell_purify', 'sfx_door_open']) {
      expect(CUE_TABLE[id], id).toBeDefined();
      for (const l of CUE_TABLE[id]!) {
        expect(l.seconds).toBeGreaterThan(0);
        expect(l.seconds).toBeLessThan(1.5);
        expect(l.gain).toBeGreaterThan(0);
        expect(l.gain).toBeLessThanOrEqual(1);
        expect(l.start).toBeGreaterThanOrEqual(0);
      }
    }
    expect(Object.keys(CUE_TABLE).every((k) => k.startsWith('sfx_'))).toBe(true);
  });
});

describe('volume maths', () => {
  it('is master x sfx, clamped, with headroom; bad numbers are silent', () => {
    expect(sfxGain({ master: 1, sfx: 1 })).toBe(0.5);
    expect(sfxGain({ master: 0.5, sfx: 0.5 })).toBeCloseTo(0.125);
    expect(sfxGain({ master: 0, sfx: 1 })).toBe(0);
    expect(sfxGain({ master: 3, sfx: 3 })).toBe(0.5);
    expect(sfxGain({ master: -1, sfx: 1 })).toBe(0);
    expect(sfxGain({ master: Number.NaN, sfx: 1 })).toBe(0);
  });
});

describe('cue routing', () => {
  it('maps sfx audio effects and light flickers, ignores amb, mus and unknown ids', () => {
    expect(cueForEffect(audio('sfx_footsteps_behind'))).toBe('sfx_footsteps_behind');
    expect(cueForEffect(audio('amb_street_duck', 'amb'))).toBeNull();
    expect(cueForEffect(audio('sfx_unknown_thing'))).toBeNull();
    expect(cueForEffect({ k: 'light', target: 'light.street.01', effect: 'flicker', sequenceId: 'seq1_empty_street' } as unknown as SequenceEffect)).toBe('sfx_light_flicker');
    expect(cueForEffect({ k: 'light', target: 'light.street.01', effect: 'on', sequenceId: 'seq1_empty_street' } as unknown as SequenceEffect)).toBeNull();
  });

  it('creaks for a newly set door flag only', () => {
    const doors = ['locket_taken', 'seq3_done'];
    expect(doorCueForFlags(['a'], ['a', 'locket_taken'], doors)).toBe('sfx_door_open');
    expect(doorCueForFlags(['a'], ['a', 'other'], doors)).toBeNull();
    expect(doorCueForFlags(['a', 'locket_taken'], ['a', 'locket_taken'], doors)).toBeNull();
    expect(doorCueForFlags(['a', 'b'], ['locket_taken'], doors)).toBeNull(); // a reset or load
    expect(doorCueForFlags([], ['x', 'y', 'locket_taken'], doors)).toBeNull(); // a load
  });
});

describe('playback', () => {
  it('is silent and never throws without an AudioContext', () => {
    const sfx = createSfx({ getContext: () => null, getVolume: () => 0.5 });
    expect(sfx.play('sfx_door_open')).toBe(false);
    expect(() => sfx.handleEffect(audio('sfx_footsteps_behind'))).not.toThrow();
  });

  it('never throws when the context misbehaves', () => {
    const sfx = createSfx({
      getContext: () => {
        throw new Error('boom');
      },
      getVolume: () => 0.5,
    });
    expect(sfx.play('sfx_door_open')).toBe(false);
  });

  it('starts one voice per layer, ignores unknown cues and a muted mix', () => {
    const { ctx, started } = fakeContext();
    let vol = 0.5;
    const sfx = createSfx({ getContext: () => ctx, getVolume: () => vol, now: () => 0 });
    expect(sfx.play('sfx_footsteps_behind')).toBe(true);
    expect(started.osc).toBe(3);
    expect(sfx.play('sfx_spell_bolt')).toBe(true);
    expect(started.noise).toBe(1);
    expect(sfx.play('nope')).toBe(false);
    vol = 0;
    expect(sfx.play('sfx_door_open')).toBe(false);
  });

  it('rate-limits the same cue but not different cues', () => {
    const { ctx, started } = fakeContext();
    let t = 10;
    const sfx = createSfx({ getContext: () => ctx, getVolume: () => 0.5, now: () => t });
    expect(sfx.play('sfx_door_open')).toBe(true);
    t += CUE_MIN_INTERVAL_S / 2;
    expect(sfx.play('sfx_door_open')).toBe(false);
    expect(sfx.play('sfx_spell_ward')).toBe(true);
    t += CUE_MIN_INTERVAL_S;
    expect(sfx.play('sfx_door_open')).toBe(true);
    expect(started.osc).toBe(2);
  });
});

describe('cue files and the synth fallback', () => {
  type Files = NonNullable<Parameters<typeof createSfx>[0]>['files'];
  const filesStub = (state: 'ready' | 'missing' | 'unknown', buffer: AudioBuffer | null = {} as AudioBuffer) => {
    const calls = { played: [] as string[], loaded: 0 };
    let resolveLoad: (b: AudioBuffer | null) => void = () => undefined;
    const files = {
      cues: { preload: () => Promise.resolve() },
      cueState: () => state,
      load: () => {
        calls.loaded++;
        return new Promise<AudioBuffer | null>((r) => (resolveLoad = r));
      },
      playCue: (cue: string) => (buffer ? (calls.played.push(cue), { stop() {} }) : null),
    } as unknown as NonNullable<Files>;
    return { files, calls, finish: (b: AudioBuffer | null) => resolveLoad(b) };
  };

  it('plays the file, not the synth, when the file is loaded', () => {
    const { ctx, started } = fakeContext();
    const f = filesStub('ready');
    const sfx = createSfx({ getContext: () => ctx, getVolume: () => 0.5, now: () => 0, files: f.files });
    expect(sfx.play('sfx_door_open')).toBe(true);
    expect(f.calls.played).toEqual(['sfx_door_open']);
    expect(started.osc).toBe(0);
  });

  it('uses the synth when the file does not exist', () => {
    const { ctx, started } = fakeContext();
    const f = filesStub('missing');
    const sfx = createSfx({ getContext: () => ctx, getVolume: () => 0.5, now: () => 0, files: f.files });
    expect(sfx.play('sfx_door_open')).toBe(true);
    expect(f.calls.played).toEqual([]);
    expect(started.osc).toBe(1);
  });

  it('plays a file that was still loading when it arrives soon enough, and falls back when it never comes', async () => {
    const { ctx, started } = fakeContext();
    let t = 0;
    const loading = filesStub('unknown');
    const sfx = createSfx({ getContext: () => ctx, getVolume: () => 0.5, now: () => t, files: loading.files });
    expect(sfx.play('sfx_door_open')).toBe(true);
    loading.finish({} as AudioBuffer);
    await Promise.resolve();
    await Promise.resolve();
    expect(loading.calls.played).toEqual(['sfx_door_open']);

    const absent = filesStub('unknown', null);
    const sfx2 = createSfx({ getContext: () => ctx, getVolume: () => 0.5, now: () => t, files: absent.files });
    sfx2.play('sfx_door_open');
    absent.finish(null);
    await Promise.resolve();
    await Promise.resolve();
    expect(started.osc).toBe(1); // the synth stood in

    const late = filesStub('unknown');
    const sfx3 = createSfx({ getContext: () => ctx, getVolume: () => 0.5, now: () => t, files: late.files });
    sfx3.play('sfx_door_open');
    t += LATE_CUE_MAX_AGE_S + 1;
    late.finish({} as AudioBuffer);
    await Promise.resolve();
    await Promise.resolve();
    expect(late.calls.played).toEqual([]); // too late to be worth playing
  });

  it('plays file-only cues (no synth) and ignores ids that are neither', () => {
    const { ctx } = fakeContext();
    const f = filesStub('ready');
    const sfx = createSfx({ getContext: () => ctx, getVolume: () => 0.5, now: () => 0, files: f.files });
    expect(sfx.play('sfx_whisper_1')).toBe(true);
    expect(sfx.play('sfx_not_a_cue')).toBe(false);
    expect(createSfx({ getContext: () => ctx, getVolume: () => 0.5, files: null }).play('sfx_whisper_1')).toBe(false);
  });

  it('starts a loop once the file is ready and stops it, even before it loaded', async () => {
    const { ctx } = fakeContext();
    const f = filesStub('unknown');
    const sfx = createSfx({ getContext: () => ctx, getVolume: () => 0.5, files: f.files });
    const handle = sfx.loop('sfx_spell_charge');
    expect(handle).not.toBeNull();
    handle!.stop();
    f.finish({} as AudioBuffer);
    await Promise.resolve();
    await Promise.resolve();
    expect(f.calls.played).toEqual([]);
    expect(sfx.loop('sfx_not_a_cue')).toBeNull();
  });
});

describe('sequence effects to cues', () => {
  it('maps flicker, burst, veil, mirror and smoke effects, and the ambience duck', () => {
    const light = (effect: string) => ({ k: 'light', target: 'light.street.01', effect, sequenceId: 'seq1_empty_street' }) as unknown as SequenceEffect;
    const fx = (effect: string) => ({ k: 'fx', effect, target: 'x', sequenceId: 'seq1_empty_street' }) as unknown as SequenceEffect;
    expect(cueForEffect(light('burst'))).toBe('sfx_bulb_burst');
    expect(cueForEffect(fx('veilRecede'))).toBe('sfx_veil_recede');
    expect(cueForEffect(fx('mirrorCrack'))).toBe('sfx_mirror_crack');
    expect(cueForEffect(fx('smoke'))).toBe('sfx_smoke_breathing');
    expect(cueForEffect(fx('runes'))).toBeNull();
    expect(duckForEffect(audio('amb_street_duck', 'amb'))).toMatchObject({ level: expect.any(Number), seconds: expect.any(Number) });
    expect(duckForEffect(audio('sfx_door_open'))).toBeNull();
  });
});