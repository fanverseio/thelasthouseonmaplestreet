/**
 * Classic Mode dialogue: line selection and locket gating. Pure and deterministic.
 * Selection order follows docs/angel-persona.md section 7; locket rules follow docs/beat-sheet.md
 * and docs/input-ux.md section 3.
 */
import { knowledgeLevelFromFlags, type MoralityBand, type PuzzleId, type ProgressFlag, type ZoneId } from '@tlh/shared';
import { CLASSIC_LINES } from '../content/dialogue/classic.ts';
import type { VoiceLineId } from '../content/dialogue/types.ts';

export interface ClassicLine {
  id: VoiceLineId;
  beat: number;
  band: MoralityBand | 'any';
  when?: {
    zone?: ZoneId;
    flags?: ProgressFlag[];
    notFlags?: ProgressFlag[];
    puzzle?: PuzzleId;
    hintLevel?: number;
    /** Every one of these enemies has engaged (or been resolved). */
    engaged?: string[];
  };
  /** Higher plays first within a tier. */
  priority: number;
  once?: boolean;
  /** Lowest Angel knowledge level (K0-K6) at which this line may play; unset means K0. */
  minK?: number;
}

/** Plain serialisable play counts by line ID. */
export type PlayedLines = Record<VoiceLineId, number>;

export function emptyPlayed(): PlayedLines {
  return {};
}

/** Returns a new record with the line's count incremented. */
export function markPlayed(played: PlayedLines, id: VoiceLineId): PlayedLines {
  return { ...played, [id]: (played[id] ?? 0) + 1 };
}

export interface ClassicContext {
  beat: number;
  band: MoralityBand;
  flags: readonly ProgressFlag[];
  zone?: ZoneId;
  /** Enemy entity ids that have engaged (or been resolved). */
  engaged?: readonly string[];
  /** The puzzle currently in progress, with its hint level. */
  puzzle?: { id: PuzzleId; hintLevel: number };
  played: PlayedLines;
}

function conditionsMet(line: ClassicLine, ctx: ClassicContext): boolean {
  if ((line.minK ?? 0) > (knowledgeLevelFromFlags(ctx.flags) ?? 0)) return false;
  const w = line.when;
  if (!w) return true;
  if (w.zone !== undefined && w.zone !== ctx.zone) return false;
  if (w.flags && !w.flags.every((f) => ctx.flags.includes(f))) return false;
  if (w.notFlags && w.notFlags.some((f) => ctx.flags.includes(f))) return false;
  if (w.engaged && !w.engaged.every((e) => ctx.engaged?.includes(e))) return false;
  return true;
}

function isHint(line: ClassicLine): boolean {
  return line.when?.puzzle !== undefined;
}

/** Highest priority first; stable on the catalogue order so the result never depends on chance. */
function best(candidates: ClassicLine[], played: PlayedLines): ClassicLine | null {
  let pick: ClassicLine | null = null;
  for (const c of candidates) {
    if (!pick) {
      pick = c;
      continue;
    }
    const cc = played[c.id] ?? 0;
    const pc = played[pick.id] ?? 0;
    // Repeatables rotate: least played first, then priority. Unplayed lines have count 0 everywhere.
    if (cc < pc || (cc === pc && c.priority > pick.priority)) pick = c;
  }
  return pick;
}

/**
 * Pick the line T should play, or null when nothing applies.
 * Order: (1) unplayed puzzle hint at the current hint level; (2) unplayed once-line for beat and band;
 * (3) repeatable line for beat and band; (4) repeatable any-band line for the beat.
 */
export function selectClassicLine(
  ctx: ClassicContext,
  lines: readonly ClassicLine[] = CLASSIC_LINES,
): ClassicLine | null {
  const forBeat = lines.filter((l) => l.beat === ctx.beat && conditionsMet(l, ctx));
  const unplayed = (l: ClassicLine) => (ctx.played[l.id] ?? 0) === 0;

  const hints = forBeat.filter(
    (l) =>
      isHint(l) &&
      l.when?.puzzle === ctx.puzzle?.id &&
      l.when?.hintLevel === ctx.puzzle?.hintLevel &&
      unplayed(l),
  );
  const hint = best(hints, ctx.played);
  if (hint) return hint;

  const plain = forBeat.filter((l) => !isHint(l));
  const bandMatch = (l: ClassicLine) => l.band === ctx.band || l.band === 'any';

  const once = best(
    plain.filter((l) => l.once === true && bandMatch(l) && unplayed(l)),
    ctx.played,
  );
  if (once) return once;

  const banded = best(
    plain.filter((l) => !l.once && l.band === ctx.band),
    ctx.played,
  );
  if (banded) return banded;

  return best(
    plain.filter((l) => !l.once && l.band === 'any'),
    ctx.played,
  );
}

/** Per-beat locket policy (docs/beat-sheet.md). */
export type LocketPolicy = 'allowed' | 'combat_blocked' | 'blocked';

/**
 * Whether T may open the locket right now. Before `angel_awake` T does nothing. `combat_blocked`
 * means blocked only while a hostile enemy is active. The caller also checks the phase is `playing`.
 */
export function canOpenLocket(
  flags: readonly ProgressFlag[],
  policy: LocketPolicy,
  combatActive: boolean,
): boolean {
  if (!flags.includes('angel_awake')) return false;
  if (policy === 'blocked') return false;
  if (policy === 'combat_blocked') return !combatActive;
  return true;
}
