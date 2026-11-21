import { describe, expect, it } from 'vitest';
import { OUTBUILDING_BOUNDS, OUTBUILDING_WALL_HEIGHT, OUTBUILDING_WALLS, PAINTING, RUNE_WALL, RUNE_Y } from './grounds-layout.ts';

describe('the family painting (note 18)', () => {
  it('is a 3:2 canvas about 3 m wide on the south wall, frame and all inside the room', () => {
    expect(PAINTING.width / PAINTING.height).toBeCloseTo(1.5, 5);
    expect(PAINTING.width).toBe(3);
    const south = OUTBUILDING_WALLS.find((w) => w.id === 'outbuilding.wall.south')!;
    expect(PAINTING.z).toBe(south.minZ); // flush with the wall's inner face
    expect(PAINTING.x - PAINTING.width / 2 - PAINTING.frame).toBeGreaterThan(OUTBUILDING_BOUNDS.minX + 0.4);
    expect(PAINTING.x + PAINTING.width / 2 + PAINTING.frame).toBeLessThan(OUTBUILDING_BOUNDS.maxX - 0.4);
    expect(PAINTING.y + PAINTING.height / 2 + PAINTING.frame).toBeLessThan(OUTBUILDING_WALL_HEIGHT);
    expect(PAINTING.y - PAINTING.height / 2 - PAINTING.frame).toBeGreaterThan(0.2);
  });
});

describe('the hidden runes (note 17)', () => {
  it('each sits on an inside wall face at eye height', () => {
    for (const [id, w] of Object.entries(RUNE_WALL)) {
      const onWall = OUTBUILDING_WALLS.some((r) => (Math.abs(w.z - r.maxZ) < 0.05 || Math.abs(w.x - r.minX) < 0.05) && w.x >= r.minX - 0.05 && w.x <= r.maxX + 0.05 && w.z >= r.minZ - 0.05 && w.z <= r.maxZ + 0.05);
      expect(onWall, id).toBe(true);
    }
    expect(RUNE_Y).toBeGreaterThan(1);
    expect(RUNE_Y).toBeLessThan(2);
  });
});
