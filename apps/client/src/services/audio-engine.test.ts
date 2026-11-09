import { describe, expect, it } from 'vitest';
import {
  AMBIENCE_FADE_S,
  BUS_NAMES,
  VOICE_DUCK_LEVEL,
  busLevel,
  createAudioEngine,
  createBufferCache,
  createMixer,
  duckTarget,
  mixGain,
  type VolumeSettings,
  type VolumeSource,
} from './audio-engine.ts';

const vol = (o: Partial<VolumeSettings> = {}): VolumeSettings => ({ master: 1, music: 1, sfx: 1, ambience: 1, voice: 1, ...o });

/** A context with real-looking gain params so the tests can read what the buses were set to. */
function fakeContext() {
  const log = { sources: [] as { loop: boolean; started: boolean; stopped: boolean }[], decoded: 0 };
  const param = () => {
    const p = {
      value: 0,
      setTargetAtTime(v: number) {
        p.value = v;
      },
      setValueAtTime(v: number) {
        p.value = v;
      },
    };
    return p;
  };
  const node = () => ({ gain: param(), to: null as unknown, connect(n: unknown) { this.to = n; }, disconnect() {} });
  const ctx = {
    currentTime: 0,
    state: 'running',
    destination: { name: 'destination' },
    createGain: () => {
      const n = node();
      n.gain.value = 1;
      return n;
    },
    createBufferSource: () => {
      const s = { buffer: null as unknown, loop: false, playbackRate: { value: 1 }, onended: null, started: false, stopped: false, connect() {}, start() { s.started = true; entry.started = true; }, stop() { s.stopped = true; entry.stopped = true; } };
      const entry = { loop: false, started: false, stopped: false };
      log.sources.push(entry);
      Object.defineProperty(s, 'loop', { get: () => entry.loop, set: (v: boolean) => (entry.loop = v) });
      return s;
    },
    decodeAudioData: async () => {
      log.decoded++;
      return { duration: 1 } as unknown as AudioBuffer;
    },
  };
  return { ctx: ctx as unknown as AudioContext, raw: ctx, log };
}

function volumeSource(initial: VolumeSettings) {
  let current = initial;
  const listeners = new Set<() => void>();
  const source: VolumeSource = { get: () => current, subscribe: (l) => (listeners.add(l), () => listeners.delete(l)) };
  return {
    source,
    set(next: VolumeSettings) {
      current = next;
      listeners.forEach((l) => l());
    },
  };
}

const okFetch = (body = new ArrayBuffer(8)) => (async () => ({ ok: true, headers: new Headers({ 'content-type': 'audio/mpeg' }), arrayBuffer: async () => body })) as unknown as typeof fetch;

describe('bus volume maths', () => {
  it('each bus follows its slider, clamped, with bad numbers silent', () => {
    expect(busLevel('master', vol({ master: 0.5 }))).toBe(0.5);
    expect(busLevel('sfx', vol({ sfx: 0.25 }))).toBe(0.25);
    expect(busLevel('voice', vol({ voice: 2 }))).toBe(1);
    expect(busLevel('voice', vol({ voice: -1 }))).toBe(0);
    expect(busLevel('sfx', vol({ sfx: Number.NaN }))).toBe(0);
    expect(busLevel('ambience', vol())).toBeLessThan(1); // sits under the effects
  });

  it('the music bus is reserved and always silent', () => {
    expect(busLevel('music', vol({ music: 1 }))).toBe(0);
    expect(mixGain('music', vol())).toBe(0);
  });

  it('the listener hears master times the bus', () => {
    expect(mixGain('sfx', vol({ master: 0.5, sfx: 0.5 }))).toBeCloseTo(0.25);
    expect(mixGain('voice', vol({ master: 0, voice: 1 }))).toBe(0);
    expect(mixGain('master', vol({ master: 0.7 }))).toBeCloseTo(0.7);
    for (const b of BUS_NAMES) expect(mixGain(b, vol())).toBeLessThanOrEqual(1);
  });

  it('the duck target is the lowest request, 1 with none', () => {
    expect(duckTarget(new Map())).toBe(1);
    expect(duckTarget(new Map([['a', 0.5], ['b', 0.2]]))).toBe(0.2);
    expect(duckTarget(new Map([['a', 5]]))).toBe(1);
  });
});

describe('mixer', () => {
  it('builds the buses and drives them from the volumes as the sliders move', () => {
    const { ctx } = fakeContext();
    const src = volumeSource(vol({ master: 0.8, sfx: 0.5, ambience: 0.4, voice: 0.9, music: 1 }));
    const mixer = createMixer(ctx, src.source)!;
    const b = mixer.buses;
    expect(b.master.gain.value).toBeCloseTo(0.8);
    expect(b.sfx.gain.value).toBeCloseTo(0.5);
    expect(b.voice.gain.value).toBeCloseTo(0.9);
    expect(b.music.gain.value).toBe(0);
    src.set(vol({ master: 0.2, sfx: 1, ambience: 0, voice: 0.1 }));
    expect(b.master.gain.value).toBeCloseTo(0.2);
    expect(b.sfx.gain.value).toBe(1);
    expect(b.ambience.gain.value).toBe(0);
    expect(b.voice.gain.value).toBeCloseTo(0.1);
    expect(b.music.gain.value).toBe(0);
  });

  it('routes every bus through master to the speakers', () => {
    const { ctx, raw } = fakeContext();
    const b = createMixer(ctx, volumeSource(vol()).source)!.buses;
    expect((b.master as unknown as { to: unknown }).to).toBe(raw.destination);
    for (const n of [b.sfx, b.voice, b.music, b.ambience]) expect((n as unknown as { to: unknown }).to).toBe(b.master);
    expect((b.ambienceIn as unknown as { to: unknown }).to).toBe(b.ambience);
  });

  it('ducks the ambience and releases it', () => {
    const { ctx } = fakeContext();
    const mixer = createMixer(ctx, volumeSource(vol()).source)!;
    mixer.duck('voice', VOICE_DUCK_LEVEL);
    expect(mixer.buses.ambienceIn.gain.value).toBeCloseTo(VOICE_DUCK_LEVEL);
    mixer.duck('sequence', 0.1);
    mixer.duck('voice', null);
    expect(mixer.buses.ambienceIn.gain.value).toBeCloseTo(0.1);
    mixer.duck('sequence', null);
    expect(mixer.buses.ambienceIn.gain.value).toBe(1);
  });

  it('gives null (not an error) when the context cannot build gains', () => {
    expect(createMixer({} as unknown as AudioContext, volumeSource(vol()).source)).toBeNull();
  });
});

describe('buffer cache', () => {
  it('lazy-loads once, shares in-flight loads and remembers the buffer', async () => {
    const { ctx, log } = fakeContext();
    let fetched = 0;
    const fetchFn = (async () => (fetched++, { ok: true, headers: new Headers({ 'content-type': 'audio/mpeg' }), arrayBuffer: async () => new ArrayBuffer(8) })) as unknown as typeof fetch;
    const cache = createBufferCache({ getContext: () => ctx, fetchFn });
    expect(cache.state('sfx_hit')).toBe('unknown');
    const [a, b] = await Promise.all([cache.load('sfx_hit'), cache.load('sfx_hit')]);
    expect(a).toBe(b);
    expect(cache.state('sfx_hit')).toBe('ready');
    await cache.load('sfx_hit');
    expect(fetched).toBe(1);
    expect(log.decoded).toBe(1);
  });

  it('marks a missing file (404 or an HTML fallback page) as missing and never throws', async () => {
    const { ctx } = fakeContext();
    const notFound = (async () => ({ ok: false, headers: new Headers() })) as unknown as typeof fetch;
    const html = (async () => ({ ok: true, headers: new Headers({ 'content-type': 'text/html' }), arrayBuffer: async () => new ArrayBuffer(1) })) as unknown as typeof fetch;
    const broken = (async () => {
      throw new Error('net');
    }) as unknown as typeof fetch;
    for (const fetchFn of [notFound, html, broken]) {
      const cache = createBufferCache({ getContext: () => ctx, fetchFn });
      await expect(cache.load('sfx_hit')).resolves.toBeNull();
      expect(cache.state('sfx_hit')).toBe('missing');
    }
  });

  it('stays unknown (and retries later) while there is no AudioContext', async () => {
    let ctx: AudioContext | null = null;
    const fake = fakeContext();
    const cache = createBufferCache({ getContext: () => ctx, fetchFn: okFetch() });
    await expect(cache.load('sfx_hit')).resolves.toBeNull();
    expect(cache.state('sfx_hit')).toBe('unknown');
    ctx = fake.ctx;
    await expect(cache.load('sfx_hit')).resolves.not.toBeNull();
    expect(cache.state('sfx_hit')).toBe('ready');
  });

  it('preloads a list, skipping what is done', async () => {
    const { ctx } = fakeContext();
    let fetched = 0;
    const fetchFn = (async () => (fetched++, { ok: true, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(1) })) as unknown as typeof fetch;
    const cache = createBufferCache({ getContext: () => ctx, fetchFn });
    await cache.preload(['sfx_a', 'sfx_b', 'sfx_c'], 2);
    await cache.preload(['sfx_a', 'sfx_d']);
    expect(fetched).toBe(4);
  });
});

describe('engine', () => {
  const setup = () => {
    const f = fakeContext();
    const src = volumeSource(vol());
    const engine = createAudioEngine({ getContext: () => f.ctx, fetchFn: okFetch(), getMixer: (c) => createMixer(c, src.source) });
    return { ...f, engine };
  };

  it('plays a loaded cue and returns null for one that is not loaded', async () => {
    const { engine, log } = setup();
    expect(engine.playCue('sfx_hit')).toBeNull();
    await engine.load('sfx_hit');
    expect(engine.playCue('sfx_hit')).not.toBeNull();
    expect(log.sources.filter((s) => s.started)).toHaveLength(1);
  });

  it('cross-fades the ambience when the zone changes, and does nothing for the same loop twice', async () => {
    const { engine, log } = setup();
    engine.setAmbience('amb_home');
    await engine.load('amb_home');
    await Promise.resolve();
    expect(log.sources).toHaveLength(1);
    expect(log.sources[0]).toMatchObject({ loop: true, started: true, stopped: false });
    engine.setAmbience('amb_home');
    expect(log.sources).toHaveLength(1);
    engine.setAmbience('amb_street');
    await engine.load('amb_street');
    await Promise.resolve();
    expect(log.sources).toHaveLength(2);
    expect(log.sources[1]).toMatchObject({ loop: true, started: true });
    expect(log.sources[0]!.stopped).toBe(true); // faded out (stop scheduled past the fade)
    expect(engine.currentAmbience()).toBe('amb_street');
    expect(AMBIENCE_FADE_S).toBeGreaterThan(1);
    engine.setAmbience(null);
    expect(log.sources[1]!.stopped).toBe(true);
  });

  it('a late answer for an older zone does not start (the player already moved on)', async () => {
    const { engine, log } = setup();
    engine.setAmbience('amb_home');
    engine.setAmbience('amb_street');
    await engine.load('amb_home');
    await engine.load('amb_street');
    await Promise.resolve();
    expect(log.sources).toHaveLength(1);
  });

  it('never throws without an AudioContext', () => {
    const engine = createAudioEngine({ getContext: () => null });
    expect(() => {
      engine.setAmbience('amb_home');
      engine.duck('voice', 0.3);
      expect(engine.playCue('sfx_hit')).toBeNull();
    }).not.toThrow();
    expect(engine.currentAmbience()).toBeNull(); // not remembered, so it is asked again once audio is up
  });

  it('never throws when the context misbehaves', () => {
    const engine = createAudioEngine({
      getContext: () => {
        throw new Error('boom');
      },
    });
    expect(() => {
      engine.setAmbience('amb_home');
      engine.duck('voice', null);
    }).not.toThrow();
    expect(engine.playCue('sfx_hit')).toBeNull();
  });
});
