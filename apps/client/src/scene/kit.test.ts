import { describe, expect, it } from 'vitest';
import { BOXES } from '../content/world/exterior-layout.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import { KIT_HOUSES } from './kit.tsx';

describe('house kit placements', () => {
  it('replace greybox boxes in the same place, so colliders stay valid', () => {
    for (const h of KIT_HOUSES) {
      const box = BOXES.find((b) => b.id === h.boxId);
      expect(box, h.boxId).toBeDefined();
      expect(box!.x).toBe(h.x);
      expect(box!.z).toBe(h.z);
    }
  });

  it('every variant footprint (12 x 8, or 14 x 8 for c and d; turned a quarter when facing west) is its box', () => {
    for (const h of KIT_HOUSES) {
      const box = BOXES.find((b) => b.id === h.boxId)!;
      const long = h.variant === 'c' || h.variant === 'd' ? 14 : 12;
      const turned = Math.abs(Math.sin(h.rotY)) > 0.5;
      expect(box.w, h.boxId).toBe(turned ? 8 : long);
      expect(box.d, h.boxId).toBe(turned ? long : 8);
    }
  });

  it('puts the upper window of No. 14 at the window_14 placement', () => {
    const a = KIT_HOUSES.find((h) => h.variant === 'a')!;
    expect(PLACEMENTS['prop.street.window_14' as keyof typeof PLACEMENTS]!.x).toBe(a.x);
  });
});
