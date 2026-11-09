import { knowledgeLevelFromFlags, PUZZLE_IDS, type MoralityBand, type ProgressFlag, type PuzzleId } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { emptyPlayed, selectClassicLine } from '../../game/dialogue.ts';
import { anchorHintLevel, beatOfFlags } from '../../game/world-runtime.ts';
import { ALL_INTERACTIONS } from '../interactions/index.ts';
import { P3_PADLOCK, P5_BOARD } from '../puzzles/index.ts';
import { ALL_LINES, CLASSIC_LINES, getLine } from './index.ts';

const BANDS: MoralityBand[] = ['dark', 'neutral', 'kind'];

/** Hint levels per puzzle, derived from the content that produces them. */
function hintLevels(): Record<PuzzleId, number> {
  const out = Object.fromEntries(PUZZLE_IDS.map((p) => [p, 0])) as Record<PuzzleId, number>;
  for (const h of ALL_INTERACTIONS.hints) out[h.puzzle] = Math.max(out[h.puzzle], new Set(h.steps.map((s) => s.atSeconds)).size);
  out.p3_padlock = P3_PADLOCK.hintLines.length;
  out.p5_board = P5_BOARD.hintLines.length;
  out.p6_anchors = 3; // north, east, west
  return out;
}

describe('Classic locket catalogue (task 4.11)', () => {
  it('has no duplicate ids and every id resolves to an Angel/Elena line', () => {
    const ids = CLASSIC_LINES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of CLASSIC_LINES) expect(getLine(l.id), l.id).toBeDefined();
  });

  it('every beat 1-12 has any-band lines', () => {
    for (let beat = 1; beat <= 12; beat++) {
      expect(CLASSIC_LINES.some((l) => l.beat === beat && l.band === 'any' && !l.when?.puzzle), `beat ${beat}`).toBe(true);
    }
  });

  it('from beat 4 every beat has at least 2 lines per band', () => {
    for (let beat = 4; beat <= 12; beat++) {
      for (const band of BANDS) {
        expect(CLASSIC_LINES.filter((l) => l.beat === beat && l.band === band).length, `beat ${beat} ${band}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('every hint level of every puzzle P1-P6 has a line', () => {
    const levels = hintLevels();
    for (const id of PUZZLE_IDS) {
      expect(levels[id], id).toBeGreaterThan(0);
      for (let n = 1; n <= levels[id]; n++) {
        if (id === 'p1_drawer' && n === 2) continue; // Q21: the 90 s step is the pumpkin glow only, no locket line
        expect(CLASSIC_LINES.some((l) => l.when?.puzzle === id && l.when.hintLevel === n), `${id} level ${n}`).toBe(true);
      }
    }
    for (const l of CLASSIC_LINES.filter((c) => c.when?.puzzle)) {
      expect(l.when!.hintLevel, l.id).toBeLessThanOrEqual(levels[l.when!.puzzle!]);
    }
  });

  it('invented lines are flagged as placeholders and none is voiced by a sequence speaker other than the Angel', () => {
    const placeholders = ALL_LINES.filter((l) => l.placeholder && CLASSIC_LINES.some((c) => c.id === l.id));
    expect(placeholders.length).toBeGreaterThan(30);
    for (const l of placeholders) expect(l.speaker, l.id).toBe('Angel');
  });

  it('knowledge: no line is picked below its minimum level, for every flag prefix and band', () => {
    const order: ProgressFlag[] = [
      'locket_taken', 'angel_awake', 'home_done', 'seq1_done', 'seq2_done', 'seq3_started', 'seq3_done', 'seq4_done',
      'fuse_placed', 'fence_key_taken', 'lane_open', 'padlock_open', 'seq5_done', 'runes_done', 'board_solved',
      'seq6_done', 'ritual_active', 'anchors_all',
    ];
    for (let i = 1; i <= order.length; i++) {
      const flags = order.slice(0, i);
      for (const band of BANDS) {
        let played = emptyPlayed();
        for (let n = 0; n < 12; n++) {
          const line = selectClassicLine({ beat: beatOfFlags(flags), band, flags, played });
          if (!line) break;
          expect(line.minK ?? 0, `${line.id} at ${flags.at(-1)}`).toBeLessThanOrEqual((knowledgeLevelFromFlags(flags) ?? 0));
          played = { ...played, [line.id]: (played[line.id] ?? 0) + 1 };
        }
      }
    }
  });

  it('every stage of the story has a line to play', () => {
    const order: ProgressFlag[] = [
      'angel_awake', 'home_done', 'seq1_done', 'seq2_done', 'seq3_started', 'seq3_done', 'seq4_done', 'fuse_placed',
      'lane_open', 'padlock_open', 'seq5_done', 'runes_done', 'board_solved', 'seq6_done', 'ritual_active', 'anchors_all',
    ];
    for (let i = 1; i <= order.length; i++) {
      const flags = order.slice(0, i);
      for (const band of BANDS) {
        expect(selectClassicLine({ beat: beatOfFlags(flags), band, flags, played: emptyPlayed() }), `${flags.at(-1)} ${band}`).not.toBeNull();
      }
    }
  });

  it('beatOfFlags is monotone along the critical path and ends at 12', () => {
    const order: ProgressFlag[] = [
      'angel_awake', 'home_done', 'seq1_done', 'seq2_done', 'seq3_started', 'seq4_done', 'fuse_placed', 'lane_open',
      'padlock_open', 'runes_done', 'board_solved', 'ritual_active', 'anchors_all',
    ];
    const beats = order.map((_, i) => beatOfFlags(order.slice(0, i + 1)));
    expect(beats).toEqual([1, 2, 3, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('P6 hint level follows the first unrestored anchor', () => {
    expect(anchorHintLevel(['seq6_done'])).toBe(0);
    expect(anchorHintLevel(['ritual_active'])).toBe(1);
    expect(anchorHintLevel(['ritual_active', 'anchor_east'])).toBe(1);
    expect(anchorHintLevel(['ritual_active', 'anchor_north'])).toBe(2);
    expect(anchorHintLevel(['ritual_active', 'anchor_north', 'anchor_east'])).toBe(3);
    expect(anchorHintLevel(['ritual_active', 'anchors_all', 'anchor_north'])).toBe(0);
  });
});

describe('Classic locket: Q16, Q17 and Q21', () => {
  const K4: ProgressFlag[] = ['locket_taken', 'angel_awake', 'home_done', 'seq1_done', 'seq2_done', 'seq3_done', 'seq4_done', 'seq5_done', 'runes_done'];
  const play = (flags: ProgressFlag[], engaged: string[], times: number, band: MoralityBand = 'neutral') => {
    let played = emptyPlayed();
    const out: string[] = [];
    for (let n = 0; n < times; n++) {
      const line = selectClassicLine({ beat: beatOfFlags(flags), band, flags, engaged, played });
      if (!line) break;
      out.push(line.id);
      played = { ...played, [line.id]: (played[line.id] ?? 0) + 1 };
    }
    return out;
  };

  it('vo_angel_b9_01 is held until the cat has engaged', () => {
    expect(play(K4, [], 8)).not.toContain('vo_angel_b9_01');
    expect(play(K4, ['enemy.interior.cat'], 8)).toContain('vo_angel_b9_01');
  });

  it('plays two new lines between board_solved and seq6_done, none of them above K4', () => {
    const flags: ProgressFlag[] = [...K4, 'enc_interior_resolved', 'board_solved'];
    expect(knowledgeLevelFromFlags(flags)).toBe(4);
    const ids = play(flags, ['enemy.interior.cat'], 6);
    expect(ids).toContain('vo_angel_b10_board_c1');
    expect(ids).toContain('vo_angel_b10_board_c2');
    for (const id of ['vo_angel_b10_board_c1', 'vo_angel_b10_board_c2']) {
      expect(CLASSIC_LINES.find((l) => l.id === id)?.minK, id).toBe(4);
      expect(getLine(id)?.placeholder, id).toBe(true);
      expect(getLine(id)?.speaker, id).toBe('Angel');
    }
    // After seq6_done they are gone.
    expect(play([...flags, 'seq6_done'], ['enemy.interior.cat'], 8)).not.toContain('vo_angel_b10_board_c1');
  });

  it('vo_angel_p1_h2 is gone from the catalogue and the content', () => {
    expect(CLASSIC_LINES.some((l) => l.id === 'vo_angel_p1_h2')).toBe(false);
    expect(getLine('vo_angel_p1_h2')).toBeUndefined();
  });
});