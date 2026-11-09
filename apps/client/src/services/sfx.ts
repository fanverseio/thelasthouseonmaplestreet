/**
 * Placeholder sound cues, synthesised with WebAudio (no files). The runtime only emits cue ids
 * (amb_*, sfx_*, mus_*); this plays a short oscillator / noise burst for the few known sfx ids until real
 * audio arrives. Never throws, silent without an AudioContext, follows settings volume.master x volume.sfx,
 * and rate-limits each cue.
 */
import { settingsStore } from '../store/index.ts';
import type { EnemyEvent } from '../game/enemies.ts';
import type { SequenceEffect } from '../game/sequences.ts';
import { ensureAudioContext } from './audio-engine.ts';

export interface CueLayer {
  type: 'tone' | 'noise';
  wave?: OscillatorType;
  /** Start and end frequency (Hz). For noise: the band-pass centre sweep. */
  f0: number;
  f1: number;
  /** Seconds after the cue starts. */
  start: number;
  seconds: number;
  /** 0..1 before volume. */
  gain: number;
}

const thud = (start: number): CueLayer => ({ type: 'tone', wave: 'sine', f0: 90, f1: 40, start, seconds: 0.18, gain: 0.9 });
const buzz = (start: number): CueLayer => ({ type: 'tone', wave: 'square', f0: 110, f1: 100, start, seconds: 0.07, gain: 0.35 });

/** Known cue ids. Anything else is ignored (silent). */
export const CUE_TABLE: Readonly<Record<string, readonly CueLayer[]>> = {
  // footsteps thud: three slow steps
  sfx_footsteps_behind: [thud(0), thud(0.45), thud(0.9)],
  // light flicker buzz: stuttering mains hum
  sfx_light_flicker: [buzz(0), buzz(0.1), buzz(0.17), buzz(0.32), buzz(0.4)],
  // spell cast whooshes: a swept noise band
  sfx_spell_bolt: [{ type: 'noise', f0: 600, f1: 2600, start: 0, seconds: 0.25, gain: 0.8 }],
  sfx_spell_ward: [{ type: 'noise', f0: 300, f1: 1200, start: 0, seconds: 0.5, gain: 0.7 }],
  sfx_spell_purify: [
    { type: 'noise', f0: 1800, f1: 500, start: 0, seconds: 0.6, gain: 0.6 },
    { type: 'tone', wave: 'sine', f0: 440, f1: 660, start: 0, seconds: 0.5, gain: 0.25 },
  ],
  // door open creak: a slow, wavering saw
  sfx_door_open: [{ type: 'tone', wave: 'sawtooth', f0: 140, f1: 210, start: 0, seconds: 0.7, gain: 0.3 }],
  // combat feedback (task 5.11): all synthesised placeholders
  sfx_hit: [
    { type: 'noise', f0: 900, f1: 300, start: 0, seconds: 0.12, gain: 0.7 },
    { type: 'tone', wave: 'sine', f0: 170, f1: 80, start: 0, seconds: 0.12, gain: 0.5 },
  ],
  sfx_hurt: [
    { type: 'tone', wave: 'sawtooth', f0: 210, f1: 90, start: 0, seconds: 0.3, gain: 0.35 },
    { type: 'noise', f0: 500, f1: 200, start: 0, seconds: 0.2, gain: 0.5 },
  ],
  sfx_stun: [{ type: 'tone', wave: 'sine', f0: 520, f1: 240, start: 0, seconds: 0.5, gain: 0.35 }],
  sfx_purify_done: [
    { type: 'tone', wave: 'sine', f0: 523, f1: 784, start: 0, seconds: 0.6, gain: 0.4 },
    { type: 'tone', wave: 'sine', f0: 784, f1: 1046, start: 0.15, seconds: 0.7, gain: 0.3 },
  ],
  sfx_destroy: [
    { type: 'noise', f0: 1200, f1: 200, start: 0, seconds: 0.7, gain: 0.6 },
    { type: 'tone', wave: 'sine', f0: 120, f1: 50, start: 0, seconds: 0.5, gain: 0.5 },
  ],
  sfx_slam: [
    { type: 'tone', wave: 'sine', f0: 70, f1: 30, start: 0, seconds: 0.4, gain: 1 },
    { type: 'noise', f0: 400, f1: 100, start: 0, seconds: 0.3, gain: 0.6 },
  ],
  sfx_teleport: [
    { type: 'tone', wave: 'sine', f0: 900, f1: 200, start: 0, seconds: 0.35, gain: 0.3 },
    { type: 'noise', f0: 2000, f1: 400, start: 0, seconds: 0.3, gain: 0.35 },
  ],
};

/** Which cue (if any) an enemy-system event should sound (task 5.11). Quiet events return null. */
export function cueForEnemyEvent(e: EnemyEvent): string | null {
  switch (e.type) {
    case 'hit':
      return 'sfx_hit';
    case 'player_damaged':
      return e.amount > 0 ? 'sfx_hurt' : null;
    case 'stunned':
      return 'sfx_stun';
    case 'resolved':
      return e.outcome === 'purify' ? 'sfx_purify_done' : 'sfx_destroy';
    case 'attack':
      return e.ability === 'groundSlam' && e.hit ? 'sfx_slam' : null;
    case 'teleported':
      return 'sfx_teleport';
    default:
      return null;
  }
}

/** Minimum seconds between two plays of the same cue. */
export const CUE_MIN_INTERVAL_S = 0.15;
const MASTER_HEADROOM = 0.5;

/** Linear gain for sfx: master x sfx, clamped 0..1, times headroom. Bad numbers give 0. */
export function sfxGain(volume: { master: number; sfx: number }): number {
  const v = volume.master * volume.sfx;
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v)) * MASTER_HEADROOM;
}

/** Which cue (if any) a sequence effect should sound. */
export function cueForEffect(e: SequenceEffect): string | null {
  if (e.k === 'audio' && e.bus === 'sfx') return e.cue in CUE_TABLE ? e.cue : null;
  if (e.k === 'light' && e.effect === 'flicker') return 'sfx_light_flicker';
  return null;
}

/** A newly set door-opening flag gives the creak. Wholesale changes (a load, a reset) stay silent. */
export function doorCueForFlags(prev: readonly string[], next: readonly string[], doorFlags: readonly string[]): string | null {
  if (!prev.every((f) => next.includes(f))) return null;
  const added = next.filter((f) => !prev.includes(f));
  if (added.length === 0 || added.length > 2) return null;
  return added.some((f) => doorFlags.includes(f)) ? 'sfx_door_open' : null;
}

export interface SfxDeps {
  getContext?: () => AudioContext | null;
  getVolume?: () => number;
  /** Seconds, monotonic. */
  now?: () => number;
}

export interface Sfx {
  /** Play a known cue now. Returns whether anything was started. */
  play(cue: string): boolean;
  handleEffect(effect: SequenceEffect): void;
}

function renderLayer(ctx: AudioContext, layer: CueLayer, gain: number): void {
  const t0 = ctx.currentTime + layer.start;
  const t1 = t0 + layer.seconds;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.linearRampToValueAtTime(Math.max(0.0001, layer.gain * gain), t0 + Math.min(0.02, layer.seconds / 4));
  env.gain.exponentialRampToValueAtTime(0.0001, t1);
  env.connect(ctx.destination);
  if (layer.type === 'tone') {
    const osc = ctx.createOscillator();
    osc.type = layer.wave ?? 'sine';
    osc.frequency.setValueAtTime(layer.f0, t0);
    osc.frequency.linearRampToValueAtTime(layer.f1, t1);
    osc.connect(env);
    osc.start(t0);
    osc.stop(t1 + 0.02);
  } else {
    const frames = Math.max(1, Math.round(ctx.sampleRate * layer.seconds));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(layer.f0, t0);
    filter.frequency.linearRampToValueAtTime(layer.f1, t1);
    src.connect(filter);
    filter.connect(env);
    src.start(t0);
  }
}

export function createSfx(deps: SfxDeps = {}): Sfx {
  const getContext = deps.getContext ?? ensureAudioContext;
  const getVolume =
    deps.getVolume ??
    (() => {
      const v = settingsStore.getState().volume;
      return sfxGain({ master: v.master, sfx: v.sfx });
    });
  const now = deps.now ?? (() => (typeof performance === 'undefined' ? Date.now() : performance.now()) / 1000);
  const last = new Map<string, number>();

  function play(cue: string): boolean {
    try {
      const layers = CUE_TABLE[cue];
      if (!layers) return false;
      const t = now();
      const prev = last.get(cue);
      if (prev !== undefined && t - prev < CUE_MIN_INTERVAL_S) return false;
      const gain = getVolume();
      if (gain <= 0) return false;
      const ctx = getContext();
      if (!ctx) return false;
      last.set(cue, t);
      for (const layer of layers) renderLayer(ctx, layer, gain);
      return true;
    } catch {
      return false;
    }
  }

  return {
    play,
    handleEffect(effect) {
      const cue = cueForEffect(effect);
      if (cue) play(cue);
    },
  };
}

/** Shared instance for the view and the encounter panel. */
export const sfx: Sfx = createSfx();
