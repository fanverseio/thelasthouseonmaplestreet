import type { ProgressFlag, SceneId, ZoneId } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { WHISPER_MIN_S, ZONE_CHECK_S, startSoundDirector, type DirectorState, type DirectorStore } from './sound-director.ts';

function fakeStore(initial: Partial<DirectorState> = {}) {
  let state: DirectorState = {
    game: { phase: 'playing', scene: 'exterior' as SceneId },
    player: { pos: [0, 0, 0] },
    progress: { flags: [] as ProgressFlag[] },
    ...initial,
  };
  const listeners = new Set<(s: DirectorState, p: DirectorState) => void>();
  const store: DirectorStore = { getState: () => state, subscribe: (l) => (listeners.add(l), () => listeners.delete(l)) };
  return {
    store,
    set(patch: Partial<DirectorState>) {
      const prev = state;
      state = { ...state, ...patch };
      listeners.forEach((l) => l(state, prev));
    },
    walkTo(x: number, z = 0) {
      this.set({ player: { pos: [x, 0, z] } });
    },
  };
}

function setup(opts: { zone?: () => ZoneId; random?: () => number } = {}) {
  const f = fakeStore();
  const played: { cue: string; gain?: number }[] = [];
  const ambience: (string | null)[] = [];
  const ducks: [string, number | null][] = [];
  let t = 0;
  const zone: { current: ZoneId } = { current: 'street' };
  const director = startSoundDirector({
    store: f.store,
    sfx: { play: (cue, o) => (played.push({ cue, ...(o?.gain !== undefined && { gain: o.gain }) }), true) },
    engine: { setAmbience: (id) => void ambience.push(id), duck: (s, l) => void ducks.push([s, l]) },
    zoneAt: () => (opts.zone ? opts.zone() : zone.current),
    doorFlags: ['home_done'],
    now: () => t,
    random: opts.random ?? (() => 0),
  });
  return { ...f, director, played, ambience, ducks, zone, advance: (s: number) => (t += s) };
}

describe('sound director', () => {
  it('starts the ambience of the zone Elena is in, and crossfades when the zone changes', () => {
    const s = setup();
    expect(s.ambience.at(-1)).toBe('amb_street');
    s.zone.current = 'garden';
    s.advance(ZONE_CHECK_S + 0.1);
    s.walkTo(1);
    expect(s.ambience.at(-1)).toBe('amb_garden');
  });

  it('does not re-run the zone helper every frame', () => {
    let calls = 0;
    const s = setup({ zone: () => (calls++, 'street') });
    const before = calls;
    for (let i = 1; i <= 20; i++) s.walkTo(i * 0.01);
    expect(calls).toBe(before); // all within the throttle window
    s.advance(ZONE_CHECK_S + 0.1);
    s.walkTo(1);
    expect(calls).toBe(before + 1);
  });

  it('plays a footstep on the zone surface for every stride walked', () => {
    const s = setup();
    for (let x = 0.5; x <= 6; x += 0.5) s.walkTo(x);
    const steps = s.played.filter((p) => p.cue.startsWith('sfx_footsteps_pavement_'));
    expect(steps).toHaveLength(3);
  });

  it('is silent while the game is not playing (menu, locket, overlay) and restarts from where she stands', () => {
    const s = setup();
    s.set({ game: { phase: 'locket', scene: 'exterior' } });
    s.walkTo(10);
    s.walkTo(20);
    expect(s.played.filter((p) => p.cue.startsWith('sfx_footsteps_'))).toHaveLength(0);
    s.set({ game: { phase: 'playing', scene: 'exterior' } });
    s.walkTo(20.5);
    expect(s.played.filter((p) => p.cue.startsWith('sfx_footsteps_'))).toHaveLength(0);
  });

  it('makes a door creak and a flag cue for new flags, and nothing for a load', () => {
    const s = setup();
    s.set({ progress: { flags: ['home_done'] as ProgressFlag[] } });
    expect(s.played.map((p) => p.cue)).toEqual(['sfx_door_open']);
    s.set({ progress: { flags: ['home_done', 'fuse_placed'] as ProgressFlag[] } });
    expect(s.played.at(-1)?.cue).toBe('sfx_fuse_snap');
    const n = s.played.length;
    s.set({ progress: { flags: ['a', 'b', 'c', 'd', 'home_done', 'fuse_placed'] as unknown as ProgressFlag[] } });
    expect(s.played.length).toBe(n);
  });

  it('a faint whisper now and then in the haunted zones only, at low gain', () => {
    const s = setup({ zone: () => 'interior' });
    s.advance(WHISPER_MIN_S + 5);
    s.walkTo(0.1);
    const whisper = s.played.find((p) => p.cue.startsWith('sfx_whisper_'));
    expect(whisper).toBeDefined();
    expect(whisper!.gain).toBeLessThan(0.7);

    const street = setup({ zone: () => 'street' });
    street.advance(500);
    street.walkTo(0.1);
    expect(street.played.some((p) => p.cue.startsWith('sfx_whisper_'))).toBe(false);
  });

  it('playAll sends each request (with its delay) and survives a failing sfx', () => {
    const s = setup();
    s.director.playAll([{ cue: 'sfx_hit' }, { cue: 'sfx_purify_relief', delayS: 0.5 }]);
    expect(s.played.slice(-2).map((p) => p.cue)).toEqual(['sfx_hit', 'sfx_purify_relief']);
    const f = fakeStore();
    const d = startSoundDirector({
      store: f.store,
      sfx: {
        play: () => {
          throw new Error('boom');
        },
      },
      engine: { setAmbience: () => undefined, duck: () => undefined },
      zoneAt: () => 'home',
      doorFlags: [],
    });
    expect(() => d.playAll([{ cue: 'sfx_hit' }])).not.toThrow();
    expect(() => f.walkTo(50)).not.toThrow();
  });

  it('dispose stops listening and fades the ambience out', () => {
    const s = setup();
    s.director.dispose();
    expect(s.ambience.at(-1)).toBeNull();
    const n = s.played.length;
    for (let x = 1; x < 10; x++) s.walkTo(x);
    expect(s.played.length).toBe(n);
  });
});
