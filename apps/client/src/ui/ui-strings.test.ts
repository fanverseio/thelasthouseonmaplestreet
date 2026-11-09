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

/** Tasks 5.6-5.9: an enemy fought by the real FSM shows one hint line, not Purify / Destroy buttons. */
describe('the encounter panel hint for FSM enemies', () => {
  const files = import.meta.glob('./encounter-stub.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const src = Object.values(files)[0] ?? '';

  it('shows the stunned hint line, the Ward prompt, and keeps the keyboard fallbacks', () => {
    expect(src).toContain("'Stunned: 2 + hold LMB to Purify · 1 + hold LMB to Destroy'");
    expect(src).toContain("'Ward: press 3, then click'");
    expect(src).toContain("e.code === 'Digit2'");
    expect(src).toContain("e.code === 'Enter'");
  });

  it('renders the Purify / Destroy buttons only for the stub (active.canChoose && !fsm)', () => {
    expect(src).toContain('active.canChoose && !fsm');
    expect(src).toContain('active.canChoose && fsm');
  });
});