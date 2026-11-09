/**
 * Morality (task 5.4): the hidden score of docs/combat-tuning.md section 6. Pure functions plus thin store helpers.
 *
 * - Deltas: mini-boss +/-30, animal +/-10, Gartner +/-5, Angel-summoned and everything else 0.
 * - The value is clamped to [-100, 100]; bands are dark (<= -25), neutral, kind (>= 25).
 * - History: one entry per non-zero change (the requested delta, not the clamped one).
 * - Progression, gates, checkpoints and content interactions never read it (see morality.test.ts).
 * - `resolveEnemyOutcome` / `applyEnemyOutcome` turn a resolved enemy into flags + a morality change. The flag
 *   tables are the ones in encounter-stub.ts, so progression is exactly what the stub encounters produced.
 */
import {
  clampMorality,
  MORALITY_MAX,
  MORALITY_MIN,
  moralityBand,
  type MoralityBand,
  type ProgressFlag,
} from '@tlh/shared';
import type { GameStore, ProgressSlice } from '../store/game-store.ts';
import {
  applyMoralityDelta,
  resolveEncounter,
  STUB_ENCOUNTERS,
  type EncounterChoice,
  type EncounterRejection,
  type EncounterState,
  type StubEncounterId,
} from './encounter-stub.ts';

export { MORALITY_MAX, MORALITY_MIN, type MoralityBand };

/** Deltas from the tuning table (magnitudes; the sign comes from the choice). */
export const MORALITY_DELTAS = {
  miniBoss: 30,
  animal: 10,
  gartner: 5,
} as const;

/** How an enemy counts for morality. `none`: the Angel's summons, decoys, wraiths, test enemies. */
export type MoralityClass = 'mini_boss' | 'animal' | 'none';

export type MoralityState = ProgressSlice['morality'];

/** The delta a purify (+) or destroy (-) of this class gives. */
export function moralityDeltaFor(cls: MoralityClass, choice: EncounterChoice): number {
  const magnitude = cls === 'mini_boss' ? MORALITY_DELTAS.miniBoss : cls === 'animal' ? MORALITY_DELTAS.animal : 0;
  if (magnitude === 0) return 0; // never -0
  return choice === 'purify' ? magnitude : -magnitude;
}

/** Gartner's scene: comfort +5, press -5. */
export function gartnerDelta(choice: 'comfort' | 'press'): number {
  return choice === 'comfort' ? MORALITY_DELTAS.gartner : -MORALITY_DELTAS.gartner;
}

/** New morality state: clamped value, and a history entry for a non-zero delta. A zero delta changes nothing. */
export function applyDelta(morality: MoralityState, delta: number, reason: string, at: number): MoralityState {
  return applyMoralityDelta(morality, delta, reason, at);
}

export function bandOf(morality: MoralityState | number): MoralityBand {
  return moralityBand(typeof morality === 'number' ? morality : morality.value);
}

/** Store helper: apply a delta to the live game. Returns the new value. */
export function addMorality(store: GameStore, delta: number, reason: string, at: number): number {
  store.setState((s) => ({ progress: { ...s.progress, morality: applyDelta(s.progress.morality, delta, reason, at) } }));
  return store.getState().progress.morality.value;
}

export function currentBand(store: GameStore): MoralityBand {
  return bandOf(store.getState().progress.morality);
}

export function moralityHistory(store: GameStore): readonly { at: number; delta: number; reason: string }[] {
  return store.getState().progress.morality.history;
}

/* ---------------- Outcome wiring ---------------- */

export interface EnemyOutcomeInput {
  /** The stub table row for this enemy (outcome flags, drops, group flag); omit for enemies without one. */
  stubId?: StubEncounterId;
  /** Used when there is no stub row. */
  moralityClass?: MoralityClass;
  /** Reason prefix for the history entry (the enemy id). */
  enemyId: string;
  choice: EncounterChoice;
  flags: readonly ProgressFlag[];
  /** States of the other members of a group (the two hounds). */
  siblingStates?: Partial<Record<StubEncounterId, EncounterState>>;
  /** Angel-summoned: no flags, no morality. */
  summoned?: boolean;
}

export type EnemyOutcome =
  | { ok: true; flagsToSet: ProgressFlag[]; moralityDelta: number; reason: string }
  | { ok: false; reason: EncounterRejection };

/**
 * Pure: what resolving this enemy sets. With a stub row the flags, order and deltas are exactly
 * `resolveEncounter`'s; without one only the morality class counts and no flag is set.
 */
export function resolveEnemyOutcome(input: EnemyOutcomeInput): EnemyOutcome {
  if (input.stubId) {
    const r = resolveEncounter({
      id: input.stubId,
      state: 'stunned',
      choice: input.choice,
      flags: input.flags,
      ...(input.siblingStates && { siblingStates: input.siblingStates }),
      ...(input.summoned && { summoned: true }),
    });
    if (!r.ok) return { ok: false, reason: r.reason };
    return { ok: true, flagsToSet: r.flagsToSet, moralityDelta: r.moralityDelta, reason: r.reason };
  }
  const delta = input.summoned ? 0 : moralityDeltaFor(input.moralityClass ?? 'none', input.choice);
  return { ok: true, flagsToSet: [], moralityDelta: delta, reason: `${input.enemyId}:${input.choice}` };
}

export type ApplyOutcomeResult = { ok: true; outcome: Extract<EnemyOutcome, { ok: true }> } | { ok: false; reason: EncounterRejection | 'flag_rejected'; detail?: string };

/** Apply a resolved enemy to the game: flags first (in order, through `setFlag`), then the morality change. */
export function applyEnemyOutcome(store: GameStore, input: Omit<EnemyOutcomeInput, 'flags'>, at: number): ApplyOutcomeResult {
  const outcome = resolveEnemyOutcome({ ...input, flags: store.getState().progress.flags });
  if (!outcome.ok) return { ok: false, reason: outcome.reason };
  for (const flag of outcome.flagsToSet) {
    const set = store.getState().setFlag(flag);
    if (!set.ok) return { ok: false, reason: 'flag_rejected', detail: set.detail };
  }
  addMorality(store, outcome.moralityDelta, outcome.reason, at);
  return { ok: true, outcome };
}

/** The tuning-table delta for a stub row, used to prove the two tables agree. */
export function stubMoralityDelta(id: StubEncounterId, choice: EncounterChoice): number {
  return STUB_ENCOUNTERS[id].moralityDelta[choice];
}

export { clampMorality };
