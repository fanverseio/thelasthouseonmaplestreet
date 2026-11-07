import { describe, expect, it } from 'vitest';
import { ALL_LINES, CLASSIC_LINES, getLine, VOICE_LINE_ID_PATTERN } from './index.ts';

describe('dialogue content (beats 1-4)', () => {
  it('every id matches vo_<...> and has text', () => {
    for (const l of ALL_LINES) {
      expect(l.id, l.id).toMatch(VOICE_LINE_ID_PATTERN);
      expect(l.text.trim().length, l.id).toBeGreaterThan(0);
    }
  });

  it('has no duplicate ids', () => {
    const ids = ALL_LINES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    const classic = CLASSIC_LINES.map((l) => l.id);
    expect(new Set(classic).size).toBe(classic.length);
  });

  it('every classic line resolves to a spoken line', () => {
    for (const c of CLASSIC_LINES) expect(getLine(c.id), c.id).toBeDefined();
  });

  it('the speaker matches the id', () => {
    for (const l of ALL_LINES) expect(l.id.startsWith(`vo_${l.speaker.toLowerCase()}_`), l.id).toBe(true);
  });

  it('only placeholder lines are flagged', () => {
    expect(ALL_LINES.filter((l) => l.placeholder).map((l) => l.id)).toEqual(['vo_angel_b4_c0']);
  });
});
