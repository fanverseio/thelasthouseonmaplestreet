import { describe, expect, it } from 'vitest';
import { HOME_BOUNDS } from '../content/world/home-layout.ts';
import { insideAny, MIST_COUNT, MIST_Y, mistExclusions, mistPuffs } from './mist-layout.ts';

describe('ground mist layout', () => {
  it('places the requested number of puffs, deterministically', () => {
    expect(mistPuffs(MIST_COUNT.medium)).toHaveLength(MIST_COUNT.medium);
    expect(mistPuffs(50, 7)).toEqual(mistPuffs(50, 7));
  });

  it('keeps puffs at knee-to-chest height and out of No. 12, the outbuilding and solid buildings', () => {
    const ex = mistExclusions();
    for (const p of mistPuffs(MIST_COUNT.high)) {
      expect(p.y).toBeGreaterThanOrEqual(MIST_Y.min);
      expect(p.y).toBeLessThanOrEqual(MIST_Y.max);
      expect(insideAny(p.x, p.z, ex, 0)).toBe(false);
      const inHome = p.x > HOME_BOUNDS.minX && p.x < HOME_BOUNDS.maxX && p.z > HOME_BOUNDS.minZ && p.z < HOME_BOUNDS.maxZ;
      expect(inHome).toBe(false);
    }
  });
});
