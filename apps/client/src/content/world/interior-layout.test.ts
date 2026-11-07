import type { ProgressFlag } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { moveAndSlide } from '../../game/collision.ts';
import { PLAYER_RADIUS } from '../../game/player.ts';
import { GATES } from './index.ts';
import { DOORS, INTERIOR_SPAWN, interiorColliders } from './interior-layout.ts';

function reach(flags: readonly ProgressFlag[]) {
  const colliders = interiorColliders(flags);
  const free = (x: number, z: number) => {
    const p = moveAndSlide({ x, z }, { x: 0, z: 0 }, PLAYER_RADIUS, colliders);
    return Math.abs(p.x - x) < 1e-9 && Math.abs(p.z - z) < 1e-9;
  };
  const seen = new Set<string>();
  const queue: [number, number][] = [[INTERIOR_SPAWN.x, INTERIOR_SPAWN.z]];
  seen.add(`${INTERIOR_SPAWN.x},${INTERIOR_SPAWN.z}`);
  while (queue.length > 0) {
    const [x, z] = queue.pop()!;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const nz = z + dz;
      const k = `${nx},${nz}`;
      if (Math.abs(nx) > 30 || nz > 30 || nz < -50 || seen.has(k) || !free(nx, nz)) continue;
      seen.add(k);
      queue.push([nx, nz]);
    }
  }
  return (x: number, z: number) => seen.has(`${Math.round(x)},${Math.round(z)}`);
}

describe('interior layout', () => {
  it('every door matches a gate in the manifest with the same flag', () => {
    for (const d of DOORS) {
      expect(GATES.find((g) => g.id === d.gate)?.opensOn, d.gate).toBe(d.opensOn);
    }
  });

  it('opens the house in order: hall, chamber, anchor rooms', () => {
    let r = reach([]);
    expect(r(0, 10)).toBe(true);
    expect(r(0, 0)).toBe(true);
    expect(r(0, -10)).toBe(false);

    r = reach(['board_solved']);
    expect(r(0, -10)).toBe(true);
    expect(r(-8, -18)).toBe(true);
    expect(r(0, -36)).toBe(false);
    expect(r(18, -18)).toBe(false);
    expect(r(-18, -18)).toBe(false);

    r = reach(['board_solved', 'seq6_done']);
    expect(r(0, -36)).toBe(true);
    expect(r(18, -18)).toBe(true);
    expect(r(-18, -18)).toBe(true);
  });

  it('keeps the central seal solid', () => {
    const colliders = interiorColliders(['board_solved', 'seq6_done']);
    const p = moveAndSlide({ x: 0, z: -12 }, { x: 0, z: -12 }, PLAYER_RADIUS, colliders);
    expect(Math.hypot(p.x, p.z + 18)).toBeGreaterThanOrEqual(1.5 + PLAYER_RADIUS - 1e-6);
  });
});
