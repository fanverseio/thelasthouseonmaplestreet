import type { ProgressFlag } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { CLASSIC_LINES } from '../content/dialogue/classic.ts';
import {
  canOpenLocket,
  emptyPlayed,
  markPlayed,
  selectClassicLine,
  type ClassicContext,
  type ClassicLine,
} from './dialogue.ts';

const base = (over: Partial<ClassicContext> = {}): ClassicContext => ({
  beat: 1,
  band: 'neutral',
  flags: [],
  played: emptyPlayed(),
  ...over,
});

const LINES: ClassicLine[] = [
  { id: 'vo_t_hint1', beat: 1, band: 'any', when: { puzzle: 'p1_drawer', hintLevel: 1 }, priority: 1 },
  { id: 'vo_t_hint2', beat: 1, band: 'any', when: { puzzle: 'p1_drawer', hintLevel: 2 }, priority: 1 },
  { id: 'vo_t_once_any', beat: 1, band: 'any', priority: 5, once: true },
  { id: 'vo_t_once_kind', beat: 1, band: 'kind', priority: 9, once: true },
  { id: 'vo_t_rep_kind', beat: 1, band: 'kind', priority: 1 },
  { id: 'vo_t_rep_any_a', beat: 1, band: 'any', priority: 2 },
  { id: 'vo_t_rep_any_b', beat: 1, band: 'any', priority: 1 },
];

describe('selectClassicLine order', () => {
  it('1: an unplayed hint at the current hint level wins', () => {
    const ctx = base({ puzzle: { id: 'p1_drawer', hintLevel: 2 } });
    expect(selectClassicLine(ctx, LINES)?.id).toBe('vo_t_hint2');
  });

  it('ignores hints for another level or puzzle', () => {
    const ctx = base({ puzzle: { id: 'p2_fuse', hintLevel: 1 } });
    expect(selectClassicLine(ctx, LINES)?.id).not.toBe('vo_t_hint1');
    const none = base({ puzzle: { id: 'p1_drawer', hintLevel: 3 } });
    expect(selectClassicLine(none, LINES)?.id).toBe('vo_t_once_any');
  });

  it('a played hint is not repeated', () => {
    const ctx = base({ puzzle: { id: 'p1_drawer', hintLevel: 1 }, played: markPlayed(emptyPlayed(), 'vo_t_hint1') });
    expect(selectClassicLine(ctx, LINES)?.id).toBe('vo_t_once_any');
  });

  it('2: unplayed once-lines (band or any) before repeatables, highest priority first', () => {
    expect(selectClassicLine(base({ band: 'kind' }), LINES)?.id).toBe('vo_t_once_kind');
    expect(selectClassicLine(base({ band: 'dark' }), LINES)?.id).toBe('vo_t_once_any');
  });

  it('once-lines are not repeated', () => {
    let played = emptyPlayed();
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) {
      const line = selectClassicLine(base({ band: 'kind', played }), LINES);
      if (!line) break;
      seen.push(line.id);
      played = markPlayed(played, line.id);
    }
    expect(seen.filter((id) => id === 'vo_t_once_kind')).toHaveLength(1);
    expect(seen.filter((id) => id === 'vo_t_once_any')).toHaveLength(1);
  });

  it('3: band repeatable before any-band repeatable', () => {
    const played = markPlayed(markPlayed(emptyPlayed(), 'vo_t_once_any'), 'vo_t_once_kind');
    expect(selectClassicLine(base({ band: 'kind', played }), LINES)?.id).toBe('vo_t_rep_kind');
  });

  it('4: falls back to any-band repeatables, rotating by least played', () => {
    let played = markPlayed(emptyPlayed(), 'vo_t_once_any');
    const a = selectClassicLine(base({ band: 'dark', played }), LINES);
    expect(a?.id).toBe('vo_t_rep_any_a');
    played = markPlayed(played, a!.id);
    const b = selectClassicLine(base({ band: 'dark', played }), LINES);
    expect(b?.id).toBe('vo_t_rep_any_b');
    played = markPlayed(played, b!.id);
    expect(selectClassicLine(base({ band: 'dark', played }), LINES)?.id).toBe('vo_t_rep_any_a');
  });

  it('is deterministic and does not mutate played data', () => {
    const played = emptyPlayed();
    const a = selectClassicLine(base({ played }), LINES);
    const b = selectClassicLine(base({ played }), LINES);
    expect(a).toEqual(b);
    expect(played).toEqual({});
  });

  it('returns null for a beat with no lines', () => {
    expect(selectClassicLine(base({ beat: 9 }), LINES)).toBeNull();
  });

  it('honours flags and notFlags conditions', () => {
    const lines: ClassicLine[] = [
      { id: 'vo_t_needs', beat: 1, band: 'any', when: { flags: ['angel_awake'] }, priority: 9 },
      { id: 'vo_t_not', beat: 1, band: 'any', when: { notFlags: ['angel_awake'] }, priority: 1 },
    ];
    expect(selectClassicLine(base(), lines)?.id).toBe('vo_t_not');
    expect(selectClassicLine(base({ flags: ['angel_awake'] }), lines)?.id).toBe('vo_t_needs');
  });
});

describe('real catalogue (beats 1-4)', () => {
  const flags = (...f: ProgressFlag[]) => f;

  it('beat 1 hint level 1 gives the P1 hint', () => {
    const line = selectClassicLine(base({ flags: flags('angel_awake'), puzzle: { id: 'p1_drawer', hintLevel: 1 } }));
    expect(line?.id).toBe('vo_elena_b1_h1');
  });

  it('beat 4 uses the band line after seq3_done and falls back before it', () => {
    const after = flags('seq3_done');
    expect(selectClassicLine(base({ beat: 4, band: 'kind', flags: after }))?.id).toBe('vo_angel_b4_kind_c1');
    expect(selectClassicLine(base({ beat: 4, band: 'dark', flags: after }))?.id).toBe('vo_angel_b4_dark_c1');
    expect(selectClassicLine(base({ beat: 4, band: 'neutral', flags: [] }))?.id).toBe('vo_angel_b4_c0');
  });

  it('every beat 1-4 has a line available at all times', () => {
    for (const beat of [1, 2, 3, 4]) {
      expect(CLASSIC_LINES.some((l) => l.beat === beat)).toBe(true);
      expect(selectClassicLine(base({ beat, flags: ['angel_awake'] }))).not.toBeNull();
    }
  });
});

describe('canOpenLocket', () => {
  it('ignores T before angel_awake whatever the policy', () => {
    expect(canOpenLocket([], 'allowed', false)).toBe(false);
    expect(canOpenLocket(['locket_taken'], 'allowed', false)).toBe(false);
  });

  it('allowed policy opens after angel_awake', () => {
    expect(canOpenLocket(['angel_awake'], 'allowed', true)).toBe(true);
  });

  it('combat_blocked is blocked only while combat is active', () => {
    expect(canOpenLocket(['angel_awake'], 'combat_blocked', true)).toBe(false);
    expect(canOpenLocket(['angel_awake'], 'combat_blocked', false)).toBe(true);
  });

  it('blocked never opens', () => {
    expect(canOpenLocket(['angel_awake'], 'blocked', false)).toBe(false);
  });
});
