import { describe, expect, it } from 'vitest';

/** Morality is hidden (PRD 5.6). No UI source may render it. */
describe('UI never shows morality', () => {
  const files = import.meta.glob('./*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const entries = Object.entries(files);

  it('finds UI files to scan', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  for (const [name, src] of entries) {
    it(`${name} does not reference morality`, () => {
      expect(src).not.toMatch(/morality/i);
    });
  }
});
