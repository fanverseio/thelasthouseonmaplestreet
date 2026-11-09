import { ZONE_IDS } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import type { EnemyEvent } from '../game/enemies.ts';
import type { RitualEvent } from '../game/ritual.ts';
import type { SpellEvent } from '../game/spells.ts';
import {
  AMBIENCE_FOR_ZONE,
  STRIDE_M,
  TELEPORT_M,
  ambienceForZone,
  creatureCue,
  cueForPuzzleInput,
  cuesForEnemyEvent,
  cuesForNewFlags,
  cuesForPuzzleEvent,
  cuesForRitualEvent,
  cuesForSpellEvent,
  initialFootsteps,
  stepFootsteps,
  surfaceForZone,
} from './audio-cues.ts';
import { isFileCue, SFX_CUE_IDS, footstepCue } from './cue-ids.ts';
import { zoneAt } from '../game/world-runtime.ts';

const names = (r: { cue: string }[]) => r.map((c) => c.cue);

describe('zone -> ambience and surface', () => {
  it('every zone has an ambience loop and a footstep surface', () => {
    for (const z of ZONE_IDS) {
      expect(isFileCue(ambienceForZone(z)), z).toBe(true);
      expect(SFX_CUE_IDS, z).toContain(footstepCue(surfaceForZone(z), 0));
    }
    expect(Object.keys(AMBIENCE_FOR_ZONE).sort()).toEqual([...ZONE_IDS].sort());
  });

  it('maps the zones the way the design says', () => {
    expect(ambienceForZone('home')).toBe('amb_home');
    expect(ambienceForZone('street')).toBe('amb_street');
    expect(ambienceForZone('hideout')).toBe('amb_street');
    expect(ambienceForZone('house66')).toBe('amb_house66');
    expect(ambienceForZone('lane')).toBe('amb_lane');
    expect(ambienceForZone('grounds')).toBe('amb_grounds');
    expect(ambienceForZone('interior')).toBe('amb_interior');
    expect(ambienceForZone('ritual')).toBe('amb_ritual');
    expect(surfaceForZone('street')).toBe('pavement');
    expect(surfaceForZone('ritual')).toBe('stone');
  });

  it('the world runtime zone helper gives a zone that has an ambience', () => {
    expect(ambienceForZone(zoneAt(0, 0, 'exterior', []))).toMatch(/^amb_/);
    expect(zoneAt(0, 0, 'last_house', ['board_solved'])).toBeDefined();
    expect(isFileCue(ambienceForZone(zoneAt(0, 0, 'last_house', [])))).toBe(true);
  });
});

describe('footsteps', () => {
  const rng = () => 0.5;

  it('steps once per stride walked, on a rotating variation that never repeats back to back', () => {
    let s = initialFootsteps(0, 0);
    const steps: number[] = [];
    for (let x = 0.5; x <= 20; x += 0.5) {
      const r = stepFootsteps(s, x, 0, rng);
      s = r.state;
      if (r.step !== null) steps.push(r.step);
    }
    expect(steps).toHaveLength(Math.floor(20 / STRIDE_M));
    for (let i = 1; i < steps.length; i++) expect(steps[i]).not.toBe(steps[i - 1]);
    expect(steps.every((v) => v >= 0 && v < 3)).toBe(true);
  });

  it('is silent when standing still and after a teleport', () => {
    let s = initialFootsteps(0, 0);
    for (let i = 0; i < 20; i++) {
      const r = stepFootsteps(s, 0, 0, rng);
      expect(r.step).toBeNull();
      s = r.state;
    }
    const jump = stepFootsteps({ ...s, walked: STRIDE_M - 0.1 }, TELEPORT_M + 5, 0, rng);
    expect(jump.step).toBeNull();
    expect(jump.state.walked).toBe(0);
    expect(stepFootsteps(s, Number.NaN, 0, rng).step).toBeNull();
  });

  it('builds the cue id from surface and variation (wrapping)', () => {
    expect(footstepCue('grass', 0)).toBe('sfx_footsteps_grass_1');
    expect(footstepCue('stone', 2)).toBe('sfx_footsteps_stone_3');
    expect(footstepCue('wood', 3)).toBe('sfx_footsteps_wood_1');
  });
});

describe('event routing', () => {
  it('plays a creature voice on the telegraph, by enemy id', () => {
    expect(creatureCue('hound_2')).toBe('sfx_hound');
    expect(creatureCue('training_hound')).toBe('sfx_hound');
    expect(creatureCue('smoke_wraith')).toBe('sfx_wraith_hiss');
    expect(creatureCue('shadow_decoy')).toBeNull();
    expect(names(cuesForEnemyEvent({ type: 'telegraph', id: 'fox', ability: 'bite', seconds: 0.4 }))).toEqual(['sfx_fox']);
    expect(names(cuesForEnemyEvent({ type: 'telegraph', id: 'briggs', ability: 'swipe', seconds: 1 }))).toEqual(['sfx_briggs_effort']);
    expect(names(cuesForEnemyEvent({ type: 'telegraph', id: 'watcher', ability: 'grab', seconds: 1 }))).toEqual(['sfx_watcher_effort']);
    expect(names(cuesForEnemyEvent({ type: 'telegraph', id: 'cat', ability: 'pounce', seconds: 1 }))).toEqual(['sfx_cat']);
  });

  it('routes hits, damage, stun, teleport, smoke, slam and the two outcomes', () => {
    const e = (x: EnemyEvent) => names(cuesForEnemyEvent(x));
    expect(e({ type: 'hit', id: 'h', damage: 5, hp: 10 })).toEqual(['sfx_hit']);
    expect(e({ type: 'player_damaged', id: 'h', amount: 8 })).toEqual(['sfx_hurt']);
    expect(e({ type: 'player_damaged', id: 'h', amount: 0 })).toEqual([]);
    expect(e({ type: 'stunned', id: 'h' })).toEqual(['sfx_stun']);
    expect(e({ type: 'teleported', id: 'watcher', node: 'n', x: 0, z: 0 })).toEqual(['sfx_teleport']);
    expect(e({ type: 'smoke_puff', id: 'briggs', seconds: 2, x: 0, z: 0 })).toEqual(['sfx_smoke_breathing']);
    expect(e({ type: 'attack', id: 'b', ability: 'groundSlam', damage: 5, blocked: false, hit: true })).toEqual(['sfx_slam']);
    expect(e({ type: 'attack', id: 'b', ability: 'bite', damage: 5, blocked: false, hit: true })).toEqual([]);
    expect(e({ type: 'resolved', id: 'hound', outcome: 'purify', summoned: false })).toEqual(['sfx_purify_done', 'sfx_purify_relief']);
    expect(e({ type: 'resolved', id: 'hound', outcome: 'destroy', summoned: false })).toEqual(['sfx_destroy']);
    expect(e({ type: 'resolved', id: 'shadow_decoy_1', outcome: 'destroy', summoned: true })).toEqual(['sfx_decoy_vanish']);
    expect(e({ type: 'spawned', id: 'smoke_wraith_1' })).toEqual(['sfx_wraith_hiss']);
  });

  it('routes spells and the ritual', () => {
    const s = (x: SpellEvent) => names(cuesForSpellEvent(x));
    expect(s({ type: 'cast', spell: 'arcane_bolt', charged: false })).toEqual(['sfx_spell_bolt']);
    expect(s({ type: 'cast', spell: 'arcane_bolt', charged: true })).toEqual(['sfx_spell_charged_release']);
    expect(s({ type: 'cast', spell: 'purify', charged: false })).toEqual(['sfx_spell_purify']);
    expect(s({ type: 'cast', spell: 'ward', charged: false })).toEqual(['sfx_spell_ward']);
    expect(s({ type: 'ward_blocked', amount: 5, sourceId: 'x', staggerS: 0.5 })).toEqual(['sfx_ward_hit']);
    expect(s({ type: 'ward_down' })).toEqual([]);
    const r = (x: RitualEvent) => names(cuesForRitualEvent(x));
    expect(r({ type: 'anchor_restored', dir: 'north' })).toEqual(['sfx_anchor_restore']);
    expect(r({ type: 'shell_broken' })).toEqual(['sfx_destroy']);
    expect(r({ type: 'ring_landed', x: 0, z: 0, hit: true, blocked: false })).toEqual(['sfx_slam']);
    expect(r({ type: 'ring_landed', x: 0, z: 0, hit: false, blocked: true })).toEqual(['sfx_ward_hit']);
    expect(r({ type: 'ring_warning', x: 0, z: 0, seconds: 1 })).toEqual([]);
  });

  it('routes puzzle inputs and events, with a soft scare per board scare', () => {
    expect(cueForPuzzleInput('p3_padlock', { k: 'dial', delta: 1 })).toBe('sfx_padlock_click');
    expect(cueForPuzzleInput('p3_padlock', { k: 'try' })).toBeNull();
    expect(cueForPuzzleInput('p5_board', { k: 'letter', letter: 'A' })).toBe('sfx_planchette_slide');
    expect(names(cuesForPuzzleEvent('p3_padlock', { t: 'rattle' }))).toEqual(['sfx_padlock_rattle']);
    expect(names(cuesForPuzzleEvent('p3_padlock', { t: 'solved' }))).toEqual(['sfx_padlock_open']);
    expect(names(cuesForPuzzleEvent('p5_board', { t: 'scare', index: 1, scare: 'piano_note' }))).toEqual(['sfx_scare_piano_note']);
    expect(names(cuesForPuzzleEvent('p5_board', { t: 'hint', level: 1, line: 'vo_angel_p5_h1' }))).toEqual(['sfx_hint_chime']);
    expect(cuesForPuzzleEvent('p5_board', { t: 'wrong', attempts: 1 })).toEqual([]);
  });

  it('flag cues fire for a newly set flag only, never for a load', () => {
    expect(names(cuesForNewFlags(['a'], ['a', 'fuse_placed']))).toEqual(['sfx_fuse_snap']);
    expect(names(cuesForNewFlags([], ['journal_1']))).toEqual(['sfx_drawer_open']);
    expect(names(cuesForNewFlags(['a'], ['a', 'ritual_active']))).toEqual(['sfx_seal_hum']);
    expect(names(cuesForNewFlags(['a'], ['a', 'ending_keeper']))).toEqual(['sfx_seal_choice_boom']);
    expect(cuesForNewFlags(['a'], ['a', 'unrelated'])).toEqual([]);
    expect(cuesForNewFlags(['fuse_placed', 'x'], ['fuse_placed'])).toEqual([]); // a reset
    expect(cuesForNewFlags([], ['fuse_placed', 'journal_1', 'lane_open'])).toEqual([]); // a load
  });
});
