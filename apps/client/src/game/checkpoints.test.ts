import { CHECKPOINT_IDS, PROGRESS_FLAGS, type ProgressFlag } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { exteriorColliders } from '../content/world/exterior-layout.ts';
import { HOME_BOUNDS } from '../content/world/home-layout.ts';
import { GATES } from '../content/world/index.ts';
import { interiorColliders } from '../content/world/interior-layout.ts';
import { PLAYER_RADIUS } from './player.ts';
import { moveAndSlide } from './collision.ts';
import { CHECKPOINTS, checkpointForEvent, checkpointForFlag, checkpointForFlags, getCheckpoint, respawnPlan } from './checkpoints.ts';
import { gateChanges, isGateOpen, openGates, veilOpacity, VEIL_RECEDE_SECONDS } from './gates.ts';
import { setFlag } from './progression.ts';

/** Flags that are set by the time each checkpoint is written (beat sheet order). */
const FLAGS_AT: Record<string, ProgressFlag[]> = {
  cp_home_start: [],
  cp_street: ['locket_taken', 'angel_awake', 'home_done'],
  cp_intersection: ['locket_taken', 'angel_awake', 'home_done', 'seq1_done', 'seq2_done'],
  cp_garden: ['locket_taken', 'angel_awake', 'home_done', 'seq1_done', 'seq2_done'],
  cp_garden_after: ['locket_taken', 'angel_awake', 'home_done', 'seq1_done', 'seq2_done', 'seq3_started', 'briggs_purified', 'walkie_found', 'seq3_done'],
  cp_house66: ['locket_taken', 'angel_awake', 'home_done', 'seq1_done', 'seq2_done', 'seq3_started', 'briggs_purified', 'walkie_found', 'seq3_done', 'seq4_done'],
  cp_watcher: ['locket_taken', 'angel_awake', 'home_done', 'seq1_done', 'seq2_done', 'seq3_started', 'briggs_purified', 'walkie_found', 'seq3_done', 'seq4_done', 'fuse_taken', 'fuse_placed'],
  cp_lane: ['locket_taken', 'angel_awake', 'home_done', 'seq1_done', 'seq2_done', 'seq3_started', 'briggs_purified', 'walkie_found', 'seq3_done', 'seq4_done', 'fuse_taken', 'fuse_placed', 'watcher_started', 'watcher_destroyed', 'fence_key_taken', 'lane_open'],
  cp_grounds: ['locket_taken', 'angel_awake', 'home_done', 'seq1_done', 'seq2_done', 'seq3_started', 'briggs_purified', 'walkie_found', 'seq3_done', 'seq4_done', 'fuse_taken', 'fuse_placed', 'watcher_started', 'watcher_destroyed', 'fence_key_taken', 'lane_open'],
  cp_outbuilding: ['locket_taken', 'angel_awake', 'home_done', 'seq1_done', 'seq2_done', 'seq3_started', 'briggs_purified', 'walkie_found', 'seq3_done', 'seq4_done', 'fuse_taken', 'fuse_placed', 'watcher_started', 'watcher_destroyed', 'fence_key_taken', 'lane_open', 'enc_approach_resolved', 'padlock_open'],
  cp_interior: ['padlock_open', 'seq5_done', 'runes_done'],
  cp_ritual: ['enc_interior_resolved', 'board_solved'],
};

describe('checkpoints', () => {
  it('has exactly one definition per checkpoint ID in the shared list', () => {
    expect(CHECKPOINTS.map((c) => c.id).sort()).toEqual([...CHECKPOINT_IDS].sort());
  });

  it('is written by exactly one trigger each', () => {
    for (const c of CHECKPOINTS) {
      expect(Boolean(c.onFlag) !== Boolean(c.onEvent), c.id).toBe(true);
      if (c.onFlag) expect(PROGRESS_FLAGS).toContain(c.onFlag);
    }
  });

  it('matches the beat sheet table', () => {
    expect(checkpointForFlag('home_done')?.id).toBe('cp_street');
    expect(checkpointForFlag('seq2_done')?.id).toBe('cp_intersection');
    expect(checkpointForFlag('seq3_done')?.id).toBe('cp_garden_after');
    expect(checkpointForFlag('seq4_done')?.id).toBe('cp_house66');
    expect(checkpointForFlag('fuse_placed')?.id).toBe('cp_watcher');
    expect(checkpointForFlag('lane_open')?.id).toBe('cp_lane');
    expect(checkpointForFlag('padlock_open')?.id).toBe('cp_outbuilding');
    expect(checkpointForFlag('board_solved')?.id).toBe('cp_ritual');
    expect(checkpointForEvent('enter:trg.garden.enter')?.id).toBe('cp_garden');
    expect(checkpointForEvent('enter:trg.grounds.enter')?.id).toBe('cp_grounds');
    expect(checkpointForEvent('enter:last_house')?.id).toBe('cp_interior');
    expect(checkpointForEvent('new_game')?.id).toBe('cp_home_start');
    expect(checkpointForFlag('anchors_all')).toBeNull();
  });

  it('picks the latest flag checkpoint for a flag set', () => {
    expect(checkpointForFlags([]).id).toBe('cp_home_start');
    expect(checkpointForFlags(['home_done']).id).toBe('cp_street');
    expect(checkpointForFlags(['home_done', 'seq2_done', 'seq3_done']).id).toBe('cp_garden_after');
  });

  it('puts every respawn point on free ground in its scene', () => {
    for (const c of CHECKPOINTS) {
      const flags = FLAGS_AT[c.id] ?? [];
      const colliders = c.scene === 'last_house' ? interiorColliders(flags) : exteriorColliders(flags);
      const p = moveAndSlide({ x: c.spawn.x, z: c.spawn.z }, { x: 0, z: 0 }, PLAYER_RADIUS, colliders);
      expect(Math.hypot(p.x - c.spawn.x, p.z - c.spawn.z), c.id).toBeLessThan(1e-9);
    }
  });

  it('starts inside the house and writes the porch checkpoint outside the front door', () => {
    const start = getCheckpoint('cp_home_start').spawn;
    const porch = getCheckpoint('cp_street').spawn;
    expect(start.z).toBeGreaterThan(HOME_BOUNDS.minZ);
    expect(start.x).toBeGreaterThan(HOME_BOUNDS.minX);
    expect(porch.z).toBeLessThan(HOME_BOUNDS.minZ);
    // Walking north from the hall: the shut door stops Elena, the open doorway lets her through.
    const closed = exteriorColliders([]);
    const step = moveAndSlide({ x: porch.x, z: HOME_BOUNDS.minZ + 1 }, { x: 0, z: -3 }, PLAYER_RADIUS, closed);
    expect(step.z).toBeGreaterThan(HOME_BOUNDS.minZ);
    // Q26: the locket alone (drawer opened, key taken) does not open the doorway; only home_done does.
    const lockedYet = exteriorColliders(['locket_taken', 'angel_awake']);
    const stillBlocked = moveAndSlide({ x: porch.x, z: HOME_BOUNDS.minZ + 1 }, { x: 0, z: -3 }, PLAYER_RADIUS, lockedYet);
    expect(stillBlocked.z).toBeGreaterThan(HOME_BOUNDS.minZ);
    const open = exteriorColliders(['locket_taken', 'angel_awake', 'home_done']);
    const through = moveAndSlide({ x: porch.x, z: HOME_BOUNDS.minZ + 1 }, { x: 0, z: -3 }, PLAYER_RADIUS, open);
    expect(through.z).toBeLessThan(HOME_BOUNDS.minZ);
  });

  it('respawns with full health and magic', () => {
    const plan = respawnPlan('cp_lane');
    expect(plan).toMatchObject({ hp: 100, magic: 100 });
    expect(plan.checkpoint).toBe(getCheckpoint('cp_lane'));
  });

  it('keeps flags as they were: respawn never removes progress', () => {
    const before: ProgressFlag[] = ['locket_taken', 'angel_awake', 'home_done'];
    respawnPlan('cp_street');
    const r = setFlag(before, 'home_done');
    expect(r.ok && r.flags).toEqual(before);
  });
});

describe('gates', () => {
  it('opens only from flags', () => {
    expect(openGates(GATES, [])).toEqual([]);
    expect(openGates(GATES, ['seq1_done'])).toEqual(['gate.street.veil_east']);
  });

  it('never opens the front road to the Last House', () => {
    const everything = [...PROGRESS_FLAGS];
    const road = GATES.find((g) => g.id === 'gate.street.last_house_road')!;
    expect(isGateOpen(road, everything)).toBe(false);
  });

  it('reports newly opened gates once', () => {
    const d = gateChanges(GATES, ['locket_taken'], ['locket_taken', 'seq3_done']);
    expect(d.closed).toEqual([]);
    expect(d.opened.sort()).toEqual(['door.garden.garage', 'gate.street.veil_north']);
    expect(gateChanges(GATES, ['seq3_done'], ['seq3_done']).opened).toEqual([]);
  });

  it('fades the veil placeholder to nothing', () => {
    expect(veilOpacity(0)).toBeCloseTo(0.92);
    expect(veilOpacity(VEIL_RECEDE_SECONDS / 2)).toBeCloseTo(0.46);
    expect(veilOpacity(VEIL_RECEDE_SECONDS * 2)).toBe(0);
  });
});
