import { describe, expect, it } from 'vitest';
import { aabb, cylinder, moveAndSlide } from './collision.ts';

const R = 0.35;

describe('moveAndSlide', () => {
  it('moves freely with no colliders', () => {
    const p = moveAndSlide({ x: 0, z: 0 }, { x: 1, z: 2 }, R, []);
    expect(p.x).toBeCloseTo(1, 9);
    expect(p.z).toBeCloseTo(2, 9);
  });

  it('stops at a wall face', () => {
    const wall = aabb(2, -5, 3, 5);
    const p = moveAndSlide({ x: 0, z: 0 }, { x: 4, z: 0 }, R, [wall]);
    expect(p.x).toBeCloseTo(2 - R, 5);
  });

  it('slides along a wall on a diagonal move', () => {
    const wall = aabb(2, -5, 3, 5);
    const p = moveAndSlide({ x: 1, z: 0 }, { x: 2, z: 2 }, R, [wall]);
    expect(p.x).toBeCloseTo(2 - R, 5);
    expect(p.z).toBeGreaterThan(1.5);
  });

  it('does not tunnel through a thin wall at sprint speed in one big step', () => {
    const wall = aabb(1, -5, 1.05, 5);
    const p = moveAndSlide({ x: 0, z: 0 }, { x: 3, z: 0 }, R, [wall]);
    expect(p.x).toBeLessThanOrEqual(1 - R + 1e-6);
  });

  it('does not tunnel at 7 m/s per 60 Hz step over many steps', () => {
    const wall = aabb(5, -5, 5.02, 5);
    let p = { x: 0, z: 0 };
    for (let i = 0; i < 300; i++) p = moveAndSlide(p, { x: 7 / 60, z: 0 }, R, [wall]);
    expect(p.x).toBeLessThan(5);
  });

  it('handles an inside corner without escaping', () => {
    const walls = [aabb(2, -5, 3, 5), aabb(-5, 2, 5, 3)];
    const p = moveAndSlide({ x: 0, z: 0 }, { x: 4, z: 4 }, R, walls);
    expect(p.x).toBeLessThanOrEqual(2 - R + 1e-6);
    expect(p.z).toBeLessThanOrEqual(2 - R + 1e-6);
  });

  it('slides around a cylinder', () => {
    const post = cylinder(2, 0, 0.5);
    const p = moveAndSlide({ x: 0, z: 0.1 }, { x: 4, z: 0 }, R, [post]);
    expect(Math.hypot(p.x - 2, p.z)).toBeGreaterThanOrEqual(0.5 + R - 1e-6);
    expect(p.x).toBeGreaterThan(2);
  });

  it('pushes a centre-inside-box start out through the nearest face', () => {
    const box = aabb(-1, -1, 1, 1);
    const p = moveAndSlide({ x: 0.9, z: 0 }, { x: 0, z: 0 }, R, [box]);
    expect(p.x).toBeGreaterThanOrEqual(1 + R - 1e-6);
  });
});
