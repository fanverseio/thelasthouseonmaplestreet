/**
 * The sound director: watches the game store and keeps the soundscape in step with it.
 *  - ambience crossfades to the loop of the zone Elena is in (zone helper from the world runtime);
 *  - footsteps follow the distance walked, on the surface of the zone;
 *  - newly set flags make their cue (doors, gates, drawer, fuse, seal);
 *  - in a few zones a faint whisper now and then.
 * Event streams (enemies, spells, ritual, puzzles) are routed by the view through audio-cues.ts and `playAll`.
 * Never throws; does nothing without an audio context.
 */
import { audioEngine, type AudioEngine } from './audio-engine.ts';
import { WHISPER_CUES, footstepCue } from './cue-ids.ts';
import { ambienceForZone, cuesForNewFlags, initialFootsteps, stepFootsteps, surfaceForZone, WHISPER_ZONES, type CueRequest } from './audio-cues.ts';
import { doorCueForFlags, sfx as sharedSfx, type Sfx } from './sfx.ts';
import type { ProgressFlag, SceneId, ZoneId } from '@tlh/shared';

/** The parts of the game state the director reads. */
export interface DirectorState {
  game: { phase: string; scene: SceneId };
  player: { pos: readonly [number, number, number] };
  progress: { flags: readonly ProgressFlag[] };
}

export interface DirectorStore {
  getState(): DirectorState;
  subscribe(listener: (state: DirectorState, prev: DirectorState) => void): () => void;
}

export interface DirectorDeps {
  store: DirectorStore;
  sfx?: Pick<Sfx, 'play'>;
  engine?: Pick<AudioEngine, 'setAmbience' | 'duck'>;
  zoneAt: (x: number, z: number, scene: SceneId, flags: readonly ProgressFlag[]) => ZoneId;
  /** Flags that open a door / a gate, from the gate table. */
  doorFlags: readonly string[];
  /** Seconds, monotonic. */
  now?: () => number;
  random?: () => number;
}

/** How often (seconds) the zone is re-evaluated; it walks every placement so it is not run every frame. */
export const ZONE_CHECK_S = 0.4;
export const WHISPER_MIN_S = 45;
export const WHISPER_MAX_S = 100;
export const WHISPER_GAIN = 0.45;

export interface SoundDirector {
  /** Play a list of cue requests (with their delays). */
  playAll(requests: readonly CueRequest[]): void;
  /** Stop watching and fade the ambience out. */
  dispose(): void;
}

let sequenceDuckTimer: ReturnType<typeof setTimeout> | null = null;

/** A sequence asks the ambience to sit lower for a few seconds (amb_street_duck). */
export function duckAmbienceFor(level: number, seconds: number, engine: Pick<AudioEngine, 'duck'> = audioEngine): void {
  engine.duck('sequence', level);
  if (sequenceDuckTimer) clearTimeout(sequenceDuckTimer);
  sequenceDuckTimer = setTimeout(() => engine.duck('sequence', null), seconds * 1000);
}

export function startSoundDirector(deps: DirectorDeps): SoundDirector {
  const sfx = deps.sfx ?? sharedSfx;
  const engine = deps.engine ?? audioEngine;
  const now = deps.now ?? (() => (typeof performance === 'undefined' ? Date.now() : performance.now()) / 1000);
  const random = deps.random ?? Math.random;
  const { store } = deps;

  const playAll = (requests: readonly CueRequest[]) => {
    for (const r of requests) {
      try {
        sfx.play(r.cue, { ...(r.delayS !== undefined && { delayS: r.delayS }), ...(r.gain !== undefined && { gain: r.gain }) });
      } catch {
        // never throws
      }
    }
  };

  let zone: ZoneId | null = null;
  let lastZoneCheck = -Infinity;
  let walker = initialFootsteps(store.getState().player.pos[0], store.getState().player.pos[2]);
  let nextWhisper = now() + WHISPER_MIN_S + random() * (WHISPER_MAX_S - WHISPER_MIN_S);

  const checkZone = (s: DirectorState, force: boolean) => {
    const t = now();
    if (!force && t - lastZoneCheck < ZONE_CHECK_S) return;
    lastZoneCheck = t;
    const next = deps.zoneAt(s.player.pos[0], s.player.pos[2], s.game.scene, s.progress.flags);
    zone = next;
    engine.setAmbience(ambienceForZone(next)); // idempotent; retries until the audio context exists
  };

  const onState = (s: DirectorState, prev: DirectorState) => {
    try {
      if (s.progress.flags !== prev.progress.flags) {
        const added = cuesForNewFlags(prev.progress.flags, s.progress.flags);
        playAll(added);
        const door = doorCueForFlags(prev.progress.flags, s.progress.flags, deps.doorFlags);
        if (door && !added.some((c) => c.cue === door)) sfx.play(door);
      }
      if (s.game.phase !== 'playing') {
        // Frozen (menu, locket, overlay): no steps, and the next step starts from where she stands.
        walker = initialFootsteps(s.player.pos[0], s.player.pos[2]);
        if (s.game.scene !== prev.game.scene) checkZone(s, true);
        return;
      }
      if (s.game.scene !== prev.game.scene) {
        zone = null; // a new scene: pick its ambience at once
        checkZone(s, true);
      } else checkZone(s, false);
      const [x, , z] = s.player.pos;
      const step = stepFootsteps(walker, x, z, random);
      walker = step.state;
      if (step.step !== null && zone) sfx.play(footstepCue(surfaceForZone(zone), step.step));
      if (zone && WHISPER_ZONES.includes(zone) && now() >= nextWhisper) {
        nextWhisper = now() + WHISPER_MIN_S + random() * (WHISPER_MAX_S - WHISPER_MIN_S);
        const pick = WHISPER_CUES[Math.floor(random() * WHISPER_CUES.length)];
        if (pick) sfx.play(pick, { gain: WHISPER_GAIN });
      }
    } catch {
      // the soundscape never breaks the game
    }
  };

  const off = store.subscribe(onState);
  try {
    checkZone(store.getState(), true);
  } catch {
    // no context yet
  }

  return {
    playAll,
    dispose() {
      off();
      engine.setAmbience(null);
    },
  };
}
