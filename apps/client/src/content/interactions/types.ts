/**
 * Data types for interactions, trigger volumes and puzzle hints. Later beats only add data files
 * that export these shapes; the headless runtime (game/world-runtime.ts) interprets them.
 */
import type { EntityId, ItemId, ProgressFlag, SequenceId } from '@tlh/shared';
import type { VoiceLineId } from '../dialogue/types.ts';

/** Every listed part must hold. Empty or missing means "always". */
export interface Cond {
  flags?: readonly ProgressFlag[];
  notFlags?: readonly ProgressFlag[];
  carried?: readonly ItemId[];
}

export type Action =
  /** Goes through the store's setFlag, the only flag writer. A rejected flag refuses the interaction. */
  | { do: 'setFlag'; flag: ProgressFlag }
  | { do: 'pickUp'; item: ItemId }
  /** Consumes the item; refuses when it is not carried. */
  | { do: 'useSocket'; item: ItemId }
  /** Subtitle (and voice) for a dialogue line, optionally `after` this many sim seconds. */
  | { do: 'say'; line: VoiceLineId; after?: number }
  | { do: 'startSequence'; sequence: SequenceId }
  /** HUD tutorial prompt (text in beat2.ts TUTORIAL_TEXT) for seconds sim seconds, optionally after a delay. */
  | { do: 'tutorial'; textId: string; seconds: number; after?: number }
  /** Writes the checkpoint tied to a named event, e.g. `enter:trg.garden.enter`. */
  | { do: 'checkpoint'; event: string }
  /** Hands the press to the encounter runtime (game/encounter-runtime.ts): engage or weaken. */
  | { do: 'encounter'; op: 'interact'; id: string }
  /** Opens an overlay puzzle (phase 'overlay'; the view releases pointer lock). State is kept on close. */
  | { do: 'openPuzzle'; puzzle: 'p3_padlock' | 'p5_board' };

export interface InteractionDef {
  id: EntityId;
  /** Shown as "E  <prompt>". */
  prompt: string;
  /** Prompt while `requires` is unmet. Defaults to `prompt`. */
  lockedPrompt?: string;
  /** Hidden (not an interactable) unless this holds. */
  show?: Cond;
  /** Pressing E while this is unmet is refused (nothing changes except `onRefuse`). */
  requires?: Cond;
  onRefuse?: readonly Action[];
  actions: readonly Action[];
}

/** A circle trigger volume (radius from content/world/placements.ts) that fires once. */
export interface TriggerDef {
  id: EntityId;
  requires?: Cond;
  actions: readonly Action[];
}

export interface HintStep {
  /** Sim seconds after the puzzle became active. */
  atSeconds: number;
  /** Elena or Angel line spoken when the step fires. */
  say?: VoiceLineId;
  /** Entity the view should highlight from this step on. */
  highlight?: EntityId;
  /** Authored light flicker on this entity (not an Angel action). */
  flicker?: EntityId;
}

/** Idle hints for one puzzle (docs/puzzles.md). Active from `startFlag` until `cancelFlag`. */
export interface HintDef {
  id: string;
  /** The classic-dialogue puzzle id this feeds (hint level = steps fired). */
  puzzle: 'p1_drawer' | 'p2_fuse';
  /** The clock only runs while Elena is within `radius` metres of this entity's placement. */
  near?: { entity: EntityId; radius: number };
  startFlag: ProgressFlag;
  cancelFlag: ProgressFlag;
  steps: readonly HintStep[];
}

/** Runs actions once, the first time the flag is seen set (any source). */
export interface FlagRule {
  flag: ProgressFlag;
  actions: readonly Action[];
}

/** Everything the world runtime needs for one or more beats. Concatenate the arrays of each beat. */
export interface InteractionContent {
  interactions: readonly InteractionDef[];
  triggers: readonly TriggerDef[];
  hints: readonly HintDef[];
  onFlag?: readonly FlagRule[];
}
