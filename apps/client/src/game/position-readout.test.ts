import { describe, expect, it } from 'vitest';
import { compassOf, formatReadout, headingDegrees } from './position-readout.ts';

describe('position readout', () => {
  it('maps yaw to heading and compass (0 = north, left turn = west)', () => {
    expect(headingDegrees(0)).toBe(0);
    expect(compassOf(0)).toBe('N');
    expect(compassOf(Math.PI / 2)).toBe('W');
    expect(compassOf(Math.PI)).toBe('S');
    expect(compassOf(-Math.PI / 2)).toBe('E');
    expect(headingDegrees(-Math.PI / 2)).toBe(270);
    expect(headingDegrees(4 * Math.PI)).toBe(0);
  });

  it('formats one line', () => {
    expect(formatReadout(36.04, -12.5, 0)).toBe('x 36.0  z -12.5  facing N 0°');
  });
});
