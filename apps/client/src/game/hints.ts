/**
 * Puzzle idle hints (docs/puzzles.md). Pure and serialisable; the clock is the caller's sim time,
 * so tests drive it with a fake clock. Active from `startFlag` until `cancelFlag` (which cancels
 * the pending steps and clears any highlight).
 */
import type { EntityId, ProgressFlag } from '@tlh/shared';
import type { HintDef, HintStep } from '../content/interactions/types.ts';

export interface HintState {
  /** Sim seconds since the puzzle became active. */
  elapsed: number;
  /** How many steps have fired (steps fire in order). */
  fired: number;
  cancelled: boolean;
}

export function initialHintState(): HintState {
  return { elapsed: 0, fired: 0, cancelled: false };
}

export interface HintStepResult {
  state: HintState;
  /** Steps that fired during this advance, in order. */
  fired: HintStep[];
}

/** Advance one hint by `dt` sim seconds under the current flags. Does not mutate `state`. */
export function stepHint(def: HintDef, state: HintState, flags: readonly ProgressFlag[], dt: number): HintStepResult {
  if (state.cancelled) return { state, fired: [] };
  if (flags.includes(def.cancelFlag)) return { state: { ...state, cancelled: true }, fired: [] };
  if (!flags.includes(def.startFlag)) return { state, fired: [] };
  const elapsed = state.elapsed + dt;
  const fired: HintStep[] = [];
  let count = state.fired;
  while (count < def.steps.length && def.steps[count]!.atSeconds <= elapsed + 1e-9) {
    fired.push(def.steps[count]!);
    count++;
  }
  return { state: { elapsed, fired: count, cancelled: false }, fired };
}

/** Entities to highlight now: fired highlight steps, none once cancelled. */
export function highlightsOf(def: HintDef, state: HintState): EntityId[] {
  if (state.cancelled) return [];
  return def.steps.slice(0, state.fired).flatMap((s) => (s.highlight ? [s.highlight] : []));
}

/** Hint level for the Classic locket (0 until the first step fires; 0 once the puzzle is done). */
export function hintLevelOf(state: HintState): number {
  return state.cancelled ? 0 : state.fired;
}
