import { describe, expect, it } from 'vitest';
import { RUNE_WALL } from '../content/world/grounds-layout.ts';
import { RUNE_IDS, RUNE_TUNING, runeSensed, runeState } from './runes.ts';

describe('hidden runes (note 17)', () => {
  it('state: hidden, then revealed, then purified (purified wins)', () => {
    expect(runeState({}, 'rune.grounds.r1')).toBe('hidden');
    expect(runeState({ 'rune.grounds.r1': { revealed: true } }, 'rune.grounds.r1')).toBe('revealed');
    expect(runeState({ 'rune.grounds.r1': { purified: true } }, 'rune.grounds.r1')).toBe('purified');
    expect(runeState({ 'rune.grounds.r1': { revealed: true, purified: true } }, 'rune.grounds.r1')).toBe('purified');
  });

  it('the paint shimmers only with Purify selected and Elena close to it', () => {
    for (const id of RUNE_IDS) {
      const w = RUNE_WALL[id];
      expect(runeSensed('purify', { x: w.x, z: w.z }, id), id).toBe(true);
      expect(runeSensed('arcane_bolt', { x: w.x, z: w.z }, id), id).toBe(false);
      expect(runeSensed('purify', { x: w.x + RUNE_TUNING.senseM + 0.1, z: w.z }, id), id).toBe(false);
    }
  });
});
