import { describe, expect, it } from 'vitest';
import { clampMorality, moralityBand } from './morality.ts';

describe('morality', () => {
  it('clamps to [-100, 100] and rounds', () => {
    expect(clampMorality(105)).toBe(100);
    expect(clampMorality(-250)).toBe(-100);
    expect(clampMorality(12.4)).toBe(12);
    expect(clampMorality(Number.NaN)).toBe(0);
  });

  it.each([
    [-100, 'dark'],
    [-25, 'dark'],
    [-24, 'neutral'],
    [0, 'neutral'],
    [24, 'neutral'],
    [25, 'kind'],
    [100, 'kind'],
  ] as const)('value %i is %s', (value, band) => {
    expect(moralityBand(value)).toBe(band);
  });
});
