import type { ProgressFlag } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { moveAndSlide, type Collider } from '../../game/collision.ts';
import { PLAYER_RADIUS } from '../../game/player.ts';
import { GATES } from './index.ts';
import { exteriorColliders, HOME_SPAWN, homeDoorOpen, VEILS } from './exterior-layout.ts';

function isFree(x: number, z: number, colliders: readonly Collider[]): boolean {
  const p = moveAndSlide({ x, z }, { x: 0, z: 0 }, PLAYER_RADIUS, colliders);
  return Math.abs(p.x - x) < 1e-9 && Math.abs(p.z - z) < 1e-9;
}

/** Flood fill on a 1 m grid. Returns a predicate for "reachable from the spawn". */
function reach(flags: readonly ProgressFlag[]) {
  const colliders = exteriorColliders(flags);
  const key = (x: number, z: number) => `${x},${z}`;
  const seen = new Set<string>();
  const start: [number, number] = [Math.round(HOME_SPAWN.x), Math.round(HOME_SPAWN.z)];
  const queue: [number, number][] = [start];
  seen.add(key(...start));
  while (queue.length > 0) {
    const [x, z] = queue.pop()!;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const nz = z + dz;
      if (Math.abs(nx) > 72 || Math.abs(nz) > 47 || seen.has(key(nx, nz))) continue;
      if (!isFree(nx, nz, colliders)) continue;
      seen.add(key(nx, nz));
      queue.push([nx, nz]);
    }
  }
  return (x: number, z: number) => seen.has(key(Math.round(x), Math.round(z)));
}

const INTERSECTION: [number, number] = [60, 30];
const NO31: [number, number] = [58, 10];
const NORTH_ARC_EAST: [number, number] = [55, -33];
const NORTH_ARC_WEST: [number, number] = [-30, -33];
const HOUSE66_YARD: [number, number] = [-58, -32];
const BACK_GARDEN: [number, number] = [-58, 10];
const LAST_HOUSE_GROUNDS: [number, number] = [-58, 34];

describe('exterior layout', () => {
  it('spawns on free ground', () => {
    expect(isFree(HOME_SPAWN.x, HOME_SPAWN.z, exteriorColliders([]))).toBe(true);
  });

  it('keeps Elena inside her house until locket_taken, then lets her reach the street', () => {
    const before = reach([]);
    // bedroom, hall and kitchen are connected
    expect(before(-25, 39)).toBe(true);
    expect(before(-20, 36)).toBe(true);
    expect(before(-15, 39)).toBe(true);
    // the street is not
    expect(before(-20, 31)).toBe(false);
    expect(before(-30, 31)).toBe(false);
    const after = reach(['locket_taken']);
    expect(after(-20, 31)).toBe(true);
    expect(after(-30, 31)).toBe(true);
    expect(after(...INTERSECTION)).toBe(false);
  });

  it('closes the front doorway with a collider only while the door is shut', () => {
    expect(isFree(-19.5, 34.2, exteriorColliders([]))).toBe(false);
    expect(isFree(-19.5, 34.2, exteriorColliders(['locket_taken']))).toBe(true);
    expect(homeDoorOpen([])).toBe(false);
    expect(homeDoorOpen(['locket_taken'])).toBe(true);
  });

  it('every veil gate matches a gate in the manifest with the same flag', () => {
    for (const v of VEILS) {
      const gate = GATES.find((g) => g.id === v.gate);
      expect(gate, v.gate).toBeDefined();
      expect(gate?.opensOn, v.gate).toBe(v.opensOn);
    }
  });

  it('keeps Elena in the home stretch until the first veil opens', () => {
    const r = reach(['locket_taken']);
    expect(r(...([-30, 31] as const))).toBe(true);
    expect(r(...INTERSECTION)).toBe(false);
    expect(r(...LAST_HOUSE_GROUNDS)).toBe(false);
  });

  it('opens the route one veil at a time', () => {
    const stage = (flags: ProgressFlag[]) => reach(['locket_taken', ...flags]);
    let r = stage(['seq1_done']);
    expect(r(...INTERSECTION)).toBe(true);
    expect(r(...NO31)).toBe(false);
    r = stage(['seq1_done', 'seq2_done']);
    expect(r(...NO31)).toBe(true);
    expect(r(...NORTH_ARC_EAST)).toBe(false);
    r = stage(['seq1_done', 'seq2_done', 'seq3_done']);
    expect(r(...NORTH_ARC_EAST)).toBe(true);
    expect(r(...NORTH_ARC_WEST)).toBe(false);
    r = stage(['seq1_done', 'seq2_done', 'seq3_done', 'seq4_done']);
    expect(r(...NORTH_ARC_WEST)).toBe(true);
    expect(r(...HOUSE66_YARD)).toBe(true);
    expect(r(...BACK_GARDEN)).toBe(false);
    r = stage(['seq1_done', 'seq2_done', 'seq3_done', 'seq4_done', 'fence_key_taken']);
    expect(r(...BACK_GARDEN)).toBe(true);
    expect(r(...LAST_HOUSE_GROUNDS)).toBe(true);
  });

  it('never opens the front road to the Last House', () => {
    const all = VEILS.flatMap((v) => (v.opensOn ? [v.opensOn] : []));
    const colliders = exteriorColliders([...all, 'locket_taken']);
    const iron = VEILS.find((v) => v.opensOn === null)!;
    expect(isFree(iron.x, iron.z, colliders)).toBe(false);
  });

  it('has no gap in the outer boundary', () => {
    const everything: ProgressFlag[] = ['locket_taken', ...VEILS.flatMap((v) => (v.opensOn ? [v.opensOn] : []))];
    const colliders = exteriorColliders(everything);
    const r = reach(everything);
    expect(r(-69, 0)).toBe(false);
    expect(r(69, 0)).toBe(false);
    expect(r(0, -44)).toBe(false);
    expect(colliders.length).toBeGreaterThan(4);
  });
});
