import { describe, expect, it } from 'vitest';
import { moveAndSlide } from '../../game/collision.ts';
import { PLAYER_RADIUS } from '../../game/player.ts';
import { exteriorColliders } from './exterior-layout.ts';
import { createWorldRegistry } from './index.ts';
import { PLACEMENTS } from './placements.ts';

describe('placements', () => {
  const registry = createWorldRegistry();

  it('places only entities that exist in the registry', () => {
    for (const id of Object.keys(PLACEMENTS)) expect(registry.has(id), id).toBe(true);
  });

  it('places every critical Beat 1 entity', () => {
    for (const e of registry.inZone('home')) {
      if (e.critical) expect(PLACEMENTS[e.id], e.id).toBeDefined();
    }
  });

  it('stands every entity on free ground, with the door shut and open', () => {
    for (const flags of [[], ['locket_taken']] as const) {
      const colliders = exteriorColliders(flags);
      for (const [id, p] of Object.entries(PLACEMENTS)) {
        const q = moveAndSlide({ x: p.x, z: p.z }, { x: 0, z: 0 }, PLAYER_RADIUS, colliders);
        expect(Math.hypot(q.x - p.x, q.z - p.z), id).toBeLessThan(1e-9);
        expect(p.r, id).toBeGreaterThan(0);
      }
    }
  });
});
