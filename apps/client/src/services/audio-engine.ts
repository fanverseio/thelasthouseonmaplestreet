/**
 * WebAudio engine: the AudioContext, the mixer buses, cue file loading and the ambience layer.
 *
 * The AudioContext is created only after the first user click (the warning screen's Continue), so browsers never
 * block it. Everything here is safe without a context: nothing throws, calls just do nothing.
 *
 * Graph:  sfx ------------------------\
 *         voice ----------------------+--> master --> speakers
 *         music (reserved, silent) ---+
 *         ambience layers --> ambienceDuck --> ambience --/
 *
 * Settings sliders drive the buses: master -> master, sfx -> sfx, ambience -> ambience, voice -> voice.
 * The music bus exists for later and is held at 0.
 */
import { settingsStore } from '../store/index.ts';
import { cueUrl } from './cue-ids.ts';

let context: AudioContext | null = null;

export function ensureAudioContext(): AudioContext | null {
  if (context) {
    if (context.state === 'suspended') void context.resume();
    return context;
  }
  const Ctor = typeof window === 'undefined' ? undefined : window.AudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  return context;
}

export function audioReady(): boolean {
  return context !== null;
}

/* ---------------- Bus maths ---------------- */

export type BusName = 'master' | 'sfx' | 'ambience' | 'voice' | 'music';
export const BUS_NAMES: readonly BusName[] = ['master', 'sfx', 'ambience', 'voice', 'music'];

export interface VolumeSettings {
  master: number;
  music: number;
  sfx: number;
  ambience: number;
  voice: number;
}

/** Fixed mix trims per bus: the ambience sits under the effects and the voice. Music is reserved and silent. */
export const BUS_TRIM: Readonly<Record<BusName, number>> = { master: 1, sfx: 1, ambience: 0.6, voice: 1, music: 0 };

const clamp01 = (n: number): number => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** Gain of one bus node: its slider (0..1, bad numbers are 0) times its trim. The music bus is always 0. */
export function busLevel(bus: BusName, volume: VolumeSettings): number {
  if (bus === 'music') return 0;
  return clamp01(volume[bus]) * BUS_TRIM[bus];
}

/** What the listener gets from a bus: the master bus times that bus. */
export function mixGain(bus: BusName, volume: VolumeSettings): number {
  return bus === 'master' ? busLevel('master', volume) : busLevel('master', volume) * busLevel(bus, volume);
}

/** Ambience level while something else needs the foreground. */
export const VOICE_DUCK_LEVEL = 0.3;
export const SEQUENCE_DUCK_LEVEL = 0.2;
export const AMBIENCE_FADE_S = 2.5;
const DUCK_ATTACK_TC = 0.12;
const DUCK_RELEASE_TC = 0.6;

/** The level the duck node should sit at: the lowest of the active duck requests, 1 when there are none. */
export function duckTarget(requests: ReadonlyMap<string, number>): number {
  let level = 1;
  for (const v of requests.values()) level = Math.min(level, clamp01(v));
  return level;
}

/* ---------------- Mixer ---------------- */

export interface AudioBuses {
  master: GainNode;
  sfx: GainNode;
  /** Ambience layers connect here; this node is the duck stage in front of the ambience bus. */
  ambienceIn: GainNode;
  ambience: GainNode;
  voice: GainNode;
  music: GainNode;
}

export interface VolumeSource {
  get(): VolumeSettings;
  subscribe(listener: () => void): () => void;
}

export interface Mixer {
  buses: AudioBuses;
  /** Ask the ambience to sit lower (level 0..1) under `source`; null releases it. */
  duck(source: string, level: number | null): void;
  /** Re-read the volumes now. */
  apply(): void;
  dispose(): void;
}

function ramp(param: AudioParam, value: number, ctx: BaseAudioContext, timeConstant = 0.03): void {
  if (typeof param.setTargetAtTime === 'function') param.setTargetAtTime(value, ctx.currentTime, timeConstant);
  else param.value = value;
}

/** Build the bus graph on a context and keep it in step with the volume source. Returns null if the context cannot. */
export function createMixer(ctx: AudioContext, source: VolumeSource): Mixer | null {
  try {
    const node = () => ctx.createGain();
    const buses: AudioBuses = { master: node(), sfx: node(), ambienceIn: node(), ambience: node(), voice: node(), music: node() };
    buses.master.connect(ctx.destination);
    buses.sfx.connect(buses.master);
    buses.voice.connect(buses.master);
    buses.music.connect(buses.master);
    buses.ambienceIn.connect(buses.ambience);
    buses.ambience.connect(buses.master);
    const requests = new Map<string, number>();
    const apply = () => {
      const v = source.get();
      ramp(buses.master.gain, busLevel('master', v), ctx);
      ramp(buses.sfx.gain, busLevel('sfx', v), ctx);
      ramp(buses.ambience.gain, busLevel('ambience', v), ctx);
      ramp(buses.voice.gain, busLevel('voice', v), ctx);
      ramp(buses.music.gain, busLevel('music', v), ctx);
    };
    // Start from the right values at once (no fade-in from the node default).
    const v0 = source.get();
    buses.master.gain.value = busLevel('master', v0);
    buses.sfx.gain.value = busLevel('sfx', v0);
    buses.ambience.gain.value = busLevel('ambience', v0);
    buses.voice.gain.value = busLevel('voice', v0);
    buses.music.gain.value = 0;
    const off = source.subscribe(apply);
    return {
      buses,
      duck(who, level) {
        if (level === null) requests.delete(who);
        else requests.set(who, level);
        const target = duckTarget(requests);
        ramp(buses.ambienceIn.gain, target, ctx, target < buses.ambienceIn.gain.value ? DUCK_ATTACK_TC : DUCK_RELEASE_TC);
      },
      apply,
      dispose: off,
    };
  } catch {
    return null;
  }
}

/** The real settings as a volume source. */
export const settingsVolumeSource: VolumeSource = {
  get: () => settingsStore.getState().volume,
  subscribe: (listener) => settingsStore.subscribe(listener),
};

const mixers = new WeakMap<AudioContext, Mixer | null>();

/** The mixer for a context (built once, driven by the settings). Null when the context cannot build one. */
export function getMixer(ctx: AudioContext): Mixer | null {
  if (!mixers.has(ctx)) mixers.set(ctx, createMixer(ctx, settingsVolumeSource));
  return mixers.get(ctx) ?? null;
}

export function getBuses(ctx: AudioContext): AudioBuses | null {
  return getMixer(ctx)?.buses ?? null;
}

/* ---------------- Cue files ---------------- */

export type CueState = 'unknown' | 'loading' | 'ready' | 'missing';

export interface BufferCacheDeps {
  getContext: () => AudioContext | null;
  fetchFn?: typeof fetch;
}

export interface BufferCache {
  state(id: string): CueState;
  /** Decoded buffer, once ready. */
  peek(id: string): AudioBuffer | null;
  /** Fetch and decode once; later calls share the result. Resolves null for a missing or undecodable file. */
  load(id: string): Promise<AudioBuffer | null>;
  /** Load several, a few at a time. Never rejects. */
  preload(ids: readonly string[], concurrency?: number): Promise<void>;
}

export function createBufferCache(deps: BufferCacheDeps): BufferCache {
  const done = new Map<string, AudioBuffer | null>();
  const pending = new Map<string, Promise<AudioBuffer | null>>();

  /** undefined: no context or fetch yet, so there is no answer and the cue stays unknown. */
  async function fetchAndDecode(id: string): Promise<AudioBuffer | null | undefined> {
    const ctx = deps.getContext();
    const fetchFn = deps.fetchFn ?? (typeof fetch === 'function' ? fetch : undefined);
    if (!ctx || !fetchFn) return undefined;
    try {
      const res = await fetchFn(cueUrl(id));
      const type = res.headers?.get('content-type') ?? '';
      // Dev servers answer unknown paths with index.html, so check the type as well as the status.
      if (!res.ok || type.includes('text/html')) return null;
      return await ctx.decodeAudioData(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  const cache: BufferCache = {
    state(id) {
      if (done.has(id)) return done.get(id) ? 'ready' : 'missing';
      return pending.has(id) ? 'loading' : 'unknown';
    },
    peek: (id) => done.get(id) ?? null,
    load(id) {
      if (done.has(id)) return Promise.resolve(done.get(id) ?? null);
      const running = pending.get(id);
      if (running) return running;
      const p = fetchAndDecode(id).then((buffer) => {
        pending.delete(id);
        if (buffer === undefined) return null; // no context yet: stays unknown
        done.set(id, buffer);
        return buffer;
      });
      pending.set(id, p);
      return p;
    },
    async preload(ids, concurrency = 4) {
      const queue = ids.filter((id) => cache.state(id) === 'unknown');
      const worker = async () => {
        for (let id = queue.shift(); id !== undefined; id = queue.shift()) await cache.load(id);
      };
      await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
    },
  };
  return cache;
}

export interface PlayOptions {
  /** 0..1 before the bus. */
  gain?: number;
  loop?: boolean;
  /** Playback rate (pitch). */
  rate?: number;
}

export interface PlayingCue {
  /** Stop now, or fade out over `fadeS` seconds. */
  stop(fadeS?: number): void;
}

/** Start a decoded buffer into a destination node (a bus). */
export function startBuffer(ctx: AudioContext, buffer: AudioBuffer, destination: AudioNode, opts: PlayOptions = {}): PlayingCue {
  const gain = ctx.createGain();
  gain.gain.value = opts.gain ?? 1;
  gain.connect(destination);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = opts.loop ?? false;
  if (opts.rate !== undefined) src.playbackRate.value = opts.rate;
  src.connect(gain);
  src.onended = () => {
    try {
      gain.disconnect();
    } catch {
      // already disconnected
    }
  };
  src.start();
  return {
    stop(fadeS = 0) {
      try {
        if (fadeS > 0) {
          gain.gain.setTargetAtTime(0, ctx.currentTime, fadeS / 4);
          src.stop(ctx.currentTime + fadeS * 1.5);
        } else src.stop();
      } catch {
        // already stopped
      }
    },
  };
}

/* ---------------- Engine ---------------- */

export interface AudioEngineDeps {
  getContext?: () => AudioContext | null;
  fetchFn?: typeof fetch;
  getMixer?: (ctx: AudioContext) => Mixer | null;
}

export interface AudioEngine {
  cues: BufferCache;
  cueState(id: string): CueState;
  load(id: string): Promise<AudioBuffer | null>;
  /** Play a loaded cue file on the sfx bus now. Null when it is not loaded or there is no context. */
  playCue(id: string, opts?: PlayOptions): PlayingCue | null;
  /** Cross-fade the ambience bed to this loop (null fades it out). Loads it first when needed. */
  setAmbience(id: string | null): void;
  currentAmbience(): string | null;
  /** Duck the ambience under `source` (null releases). */
  duck(source: string, level: number | null): void;
}

export function createAudioEngine(deps: AudioEngineDeps = {}): AudioEngine {
  const getContext = deps.getContext ?? ensureAudioContext;
  const mixerOf = deps.getMixer ?? getMixer;
  const cues = createBufferCache({ getContext, ...(deps.fetchFn && { fetchFn: deps.fetchFn }) });
  let ambienceId: string | null = null;
  let ambienceToken = 0;
  let ambienceLayer: PlayingCue | null = null;

  const mixer = (): { ctx: AudioContext; mixer: Mixer } | null => {
    try {
      const ctx = getContext();
      const m = ctx ? mixerOf(ctx) : null;
      return ctx && m ? { ctx, mixer: m } : null;
    } catch {
      return null;
    }
  };

  const engine: AudioEngine = {
    cues,
    cueState: (id) => cues.state(id),
    load: (id) => cues.load(id),
    playCue(id, opts) {
      try {
        const buffer = cues.peek(id);
        const m = mixer();
        if (!buffer || !m) return null;
        return startBuffer(m.ctx, buffer, m.mixer.buses.sfx, opts);
      } catch {
        return null;
      }
    },
    setAmbience(id) {
      try {
        if (!mixer()) return; // no context yet: the caller asks again later
        if (id === ambienceId) return;
        ambienceId = id;
        const token = ++ambienceToken;
        const fadeOut = () => {
          ambienceLayer?.stop(AMBIENCE_FADE_S);
          ambienceLayer = null;
        };
        if (id === null) return fadeOut();
        void cues.load(id).then((buffer) => {
          const m = mixer();
          if (token !== ambienceToken || !buffer || !m) return;
          fadeOut();
          const ctx = m.ctx;
          const layerGain = ctx.createGain();
          layerGain.gain.value = 0;
          layerGain.connect(m.mixer.buses.ambienceIn);
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          src.loop = true;
          src.connect(layerGain);
          src.start();
          layerGain.gain.setTargetAtTime(1, ctx.currentTime, AMBIENCE_FADE_S / 4);
          ambienceLayer = {
            stop(fadeS = 0) {
              try {
                layerGain.gain.setTargetAtTime(0, ctx.currentTime, Math.max(0.01, fadeS / 4));
                src.stop(ctx.currentTime + Math.max(0.05, fadeS * 1.5));
              } catch {
                // already stopped
              }
            },
          };
        });
      } catch {
        // audio never breaks the game
      }
    },
    currentAmbience: () => ambienceId,
    duck(source, level) {
      try {
        mixer()?.mixer.duck(source, level);
      } catch {
        // no context
      }
    },
  };
  return engine;
}

/** The shared engine (real context, real settings). */
export const audioEngine: AudioEngine = createAudioEngine();
