import { describe, expect, it } from 'vitest';
import { MIRROR_PLANE, OUTBUILDING_BOUNDS, RUNE_WALL, runeVisibleInMirror } from './grounds-layout.ts';

describe('mirror runes (note 17)', () => {
  it('all three runes show in the mirror from the middle of the room and from in front of the mirror', () => {
    for (const viewer of [{ x: -52, z: 30.5 }, { x: -52, z: 29 }, { x: -50.5, z: 30.5 }, { x: -53.5, z: 30.5 }]) {
      for (const [id, w] of Object.entries(RUNE_WALL)) {
        expect(runeVisibleInMirror(viewer, w), `${id} from ${viewer.x},${viewer.z}`).toBe(true);
      }
    }
  });

  it('the mirror fits on the south wall', () => {
    expect(MIRROR_PLANE.x - MIRROR_PLANE.width / 2).toBeGreaterThan(OUTBUILDING_BOUNDS.minX);
    expect(MIRROR_PLANE.x + MIRROR_PLANE.width / 2).toBeLessThan(OUTBUILDING_BOUNDS.maxX);
  });
});
