import { describe, expect, it } from 'vitest';
import { dissolve, WRAITH, wraithPuffs } from './smoke-wraith-layout.ts';

describe('smoke wraith body (three.js, no model)', () => {
  const puffs = wraithPuffs();

  it('is a child-height column: hood at the top, tail at the bottom', () => {
    expect(puffs).toHaveLength(WRAITH.puffs);
    expect(puffs[0]!.y).toBeCloseTo(WRAITH.top);
    expect(puffs.at(-1)!.y).toBeCloseTo(WRAITH.tail);
    expect(WRAITH.top).toBeLessThanOrEqual(1.45);
    for (let i = 1; i < puffs.length; i++) expect(puffs[i]!.y).toBeLessThan(puffs[i - 1]!.y);
  });

  it('the hood is wider than the tail, and the tail puffs are smaller and fainter', () => {
    const hood = puffs.filter((p) => p.u < 0.3);
    const tail = puffs.filter((p) => p.u > 0.75);
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(avg(hood.map((p) => p.radius))).toBeGreaterThan(avg(tail.map((p) => p.radius)));
    expect(avg(hood.map((p) => p.size))).toBeGreaterThan(avg(tail.map((p) => p.size)));
    expect(avg(hood.map((p) => p.opacity))).toBeGreaterThan(avg(tail.map((p) => p.opacity)));
  });

  it('looks the same every time (seeded)', () => {
    expect(wraithPuffs()).toEqual(puffs);
  });

  it('dissolves: spreads, rises and is gone at the end', () => {
    expect(dissolve(0)).toEqual({ spread: 1, rise: 0, alpha: 1 });
    const end = dissolve(1);
    expect(end.alpha).toBe(0);
    expect(end.spread).toBeGreaterThan(1);
    expect(end.rise).toBeGreaterThan(0);
    expect(dissolve(2)).toEqual(end);
  });
});
