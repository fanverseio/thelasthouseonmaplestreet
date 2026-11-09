/**
 * Which sound cue each game event makes. Pure routing tables (no audio here): the sound director and the views
 * call these, then play the cues through sfx.ts. Cue ids must exist in cue-ids.ts (a test checks the code).
 */
import type { ProgressFlag, ZoneId } from '@tlh/shared';
import type { EnemyEvent } from '../game/enemies.ts';
import type { PuzzleEvent, PuzzleInput } from '../game/puzzles.ts';
import type { RitualEvent } from '../game/ritual.ts';
import type { SpellEvent } from '../game/spells.ts';
import { footstepCue, isSfxCue, type Surface } from './cue-ids.ts';

export interface CueRequest {
  cue: string;
  delayS?: number;
  gain?: number;
}

const one = (cue: string | null): CueRequest[] => (cue ? [{ cue }] : []);

/* ---------------- Zones ---------------- */

/** Ambience loop per zone. The shed hideout is on the street, so it shares the street bed. */
export const AMBIENCE_FOR_ZONE: Readonly<Record<ZoneId, string>> = {
  home: 'amb_home',
  street: 'amb_street',
  garden: 'amb_garden',
  hideout: 'amb_street',
  house66: 'amb_house66',
  lane: 'amb_lane',
  grounds: 'amb_grounds',
  interior: 'amb_interior',
  ritual: 'amb_ritual',
};

export const ambienceForZone = (zone: ZoneId): string => AMBIENCE_FOR_ZONE[zone];

/** What Elena walks on in each zone. */
export const SURFACE_FOR_ZONE: Readonly<Record<ZoneId, Surface>> = {
  home: 'wood',
  street: 'pavement',
  garden: 'grass',
  hideout: 'gravel',
  house66: 'gravel',
  lane: 'gravel',
  grounds: 'grass',
  interior: 'wood',
  ritual: 'stone',
};

export const surfaceForZone = (zone: ZoneId): Surface => SURFACE_FOR_ZONE[zone];

/** Zones where an occasional far-off whisper is allowed (quiet, rare, never a jump scare). */
export const WHISPER_ZONES: readonly ZoneId[] = ['house66', 'interior', 'ritual'];

/* ---------------- Footsteps ---------------- */

export const STRIDE_M = 2;
/** A jump this long in one update is a teleport (a load, a respawn), not walking. */
export const TELEPORT_M = 3;

export interface FootstepState {
  x: number;
  z: number;
  /** Metres walked since the last step. */
  walked: number;
  variation: number;
}

export function initialFootsteps(x = 0, z = 0): FootstepState {
  return { x, z, walked: 0, variation: 0 };
}

/**
 * Advance the walker to (x, z). Returns the next state and, when a stride was completed, the variation to play.
 * `random` picks the next variation so the same step never repeats twice in a row.
 */
export function stepFootsteps(state: FootstepState, x: number, z: number, random: () => number): { state: FootstepState; step: number | null } {
  const d = Math.hypot(x - state.x, z - state.z);
  if (!Number.isFinite(d) || d > TELEPORT_M) return { state: { ...state, x, z, walked: 0 }, step: null };
  const walked = state.walked + d;
  if (walked < STRIDE_M) return { state: { ...state, x, z, walked }, step: null };
  const variation = (state.variation + 1 + Math.floor(random() * 2)) % 3;
  return { state: { x, z, walked: walked - STRIDE_M, variation }, step: variation };
}

export { footstepCue };

/* ---------------- Flags ---------------- */

const FLAG_CUES: ReadonlyArray<{ flag: ProgressFlag; cue: string; delayS?: number }> = [
  { flag: 'fuse_placed', cue: 'sfx_fuse_snap' },
  { flag: 'journal_1', cue: 'sfx_drawer_open' },
  { flag: 'lane_open', cue: 'sfx_gate_creak' },
  { flag: 'ritual_active', cue: 'sfx_seal_hum' },
  { flag: 'ending_keeper', cue: 'sfx_seal_choice_boom' },
  { flag: 'ending_broken', cue: 'sfx_seal_choice_boom' },
];

/** Cues for flags that just turned on. A wholesale change (a load, a reset) is silent. */
export function cuesForNewFlags(prev: readonly string[], next: readonly string[]): CueRequest[] {
  if (!prev.every((f) => next.includes(f))) return [];
  const added = next.filter((f) => !prev.includes(f));
  if (added.length === 0 || added.length > 2) return [];
  return FLAG_CUES.filter((c) => added.includes(c.flag)).map(({ cue, delayS }) => ({ cue, ...(delayS !== undefined && { delayS }) }));
}

/* ---------------- Enemies ---------------- */

/** The creature's own voice, from its enemy id (ids may carry a suffix such as hound_2). */
export function creatureCue(enemyId: string): string | null {
  const id = String(enemyId ?? '').toLowerCase();
  if (id.includes('wraith')) return 'sfx_wraith_hiss';
  if (id.includes('hound')) return 'sfx_hound';
  if (id.includes('fox')) return 'sfx_fox';
  if (id.includes('cat')) return 'sfx_cat';
  if (id.includes('briggs')) return 'sfx_briggs_effort';
  if (id.includes('watcher')) return 'sfx_watcher_effort';
  return null;
}

export function cuesForEnemyEvent(e: EnemyEvent): CueRequest[] {
  switch (e.type) {
    case 'telegraph':
      return one(creatureCue(e.id));
    case 'spawned':
      return String(e.id).toLowerCase().includes('wraith') ? one('sfx_wraith_hiss') : [];
    case 'hit':
      return one('sfx_hit');
    case 'player_damaged':
      return e.amount > 0 ? one('sfx_hurt') : [];
    case 'stunned':
      return one('sfx_stun');
    case 'resolved':
      if (String(e.id).toLowerCase().includes('decoy')) return one('sfx_decoy_vanish');
      return e.outcome === 'purify' ? [{ cue: 'sfx_purify_done' }, { cue: 'sfx_purify_relief', delayS: 0.5 }] : one('sfx_destroy');
    case 'attack':
      return e.ability === 'groundSlam' && e.hit ? one('sfx_slam') : [];
    case 'teleported':
      return one('sfx_teleport');
    case 'smoke_puff':
      return one('sfx_smoke_breathing');
    default:
      return [];
  }
}

/** First cue of an enemy event (kept for simple callers). */
export const cueForEnemyEvent = (e: EnemyEvent): string | null => cuesForEnemyEvent(e)[0]?.cue ?? null;

/* ---------------- Spells and the ritual ---------------- */

export function cuesForSpellEvent(e: SpellEvent): CueRequest[] {
  switch (e.type) {
    case 'cast':
      if (e.spell === 'arcane_bolt') return one(e.charged ? 'sfx_spell_charged_release' : 'sfx_spell_bolt');
      return one(e.spell === 'purify' ? 'sfx_spell_purify' : e.spell === 'ward' ? 'sfx_spell_ward' : null);
    case 'ward_blocked':
      return one('sfx_ward_hit');
    default:
      return [];
  }
}

export function cuesForRitualEvent(e: RitualEvent): CueRequest[] {
  switch (e.type) {
    case 'anchor_restored':
      return one('sfx_anchor_restore');
    case 'shell_hit':
      return one('sfx_hit');
    case 'shell_broken':
      return one('sfx_destroy');
    case 'ring_landed':
      return e.blocked ? one('sfx_ward_hit') : e.hit ? one('sfx_slam') : [];
    case 'wraith_spawned':
      return one('sfx_wraith_hiss');
    default:
      return [];
  }
}

/* ---------------- Puzzles ---------------- */

type PuzzleName = 'p3_padlock' | 'p5_board';

/** The cue for a puzzle input (a dial turned, a letter picked), made when the input is sent. */
export function cueForPuzzleInput(puzzle: PuzzleName, input: PuzzleInput): string | null {
  if (puzzle === 'p3_padlock') return input.k === 'dial' || input.k === 'cursor' ? 'sfx_padlock_click' : null;
  return input.k === 'letter' || input.k === 'reset' ? 'sfx_planchette_slide' : null;
}

/** The soft board scare for a scare name from the puzzle data (door_slam, whispers, ...). */
export function scareCue(scare: string): string | null {
  const cue = `sfx_scare_${scare}`;
  return isSfxCue(cue) ? cue : null;
}

export function cuesForPuzzleEvent(puzzle: PuzzleName, e: PuzzleEvent): CueRequest[] {
  switch (e.t) {
    case 'rattle':
      return one('sfx_padlock_rattle');
    case 'solved':
      return one(puzzle === 'p3_padlock' ? 'sfx_padlock_open' : 'sfx_veil_recede');
    case 'scare':
      return one(scareCue(e.scare));
    case 'hint':
      return one('sfx_hint_chime');
    default:
      return [];
  }
}
