/**
 * Encounter stub (task 3.8): a temporary, headless stand-in for real combat.
 * Used by Briggs, the Watcher, the hounds, the street fox and the interior cat until Phase 5.
 * Pure functions only: no store access, no UI. The caller applies the returned flags
 * (through progression.setFlag, in order) and the morality delta (applyMoralityDelta).
 * Rules: docs/combat-tuning.md sections 3 and 6, docs/beat-sheet.md beats 2-3, 4, 6, 7-8, 9.
 */
import { clampMorality, type ProgressFlag } from '@tlh/shared';
import type { ProgressSlice } from '../store/game-store.ts';

export type StubEncounterId = 'street_fox' | 'briggs' | 'watcher' | 'hound_1' | 'hound_2' | 'interior_cat';

export type EncounterChoice = 'purify' | 'destroy';

/** idle -> weakened (interact) -> stunned (persistent, harmless, no timer) -> resolved. */
export type EncounterState = 'idle' | 'weakened' | 'stunned' | 'resolved';
export type EncounterAction = 'weaken' | 'stun';

export interface StubEncounterDef {
  id: StubEncounterId;
  /** Beat-sheet encounter id (enc_*), shared by the two hounds. */
  encounterId: string;
  enemyId: string;
  moralityDelta: Record<EncounterChoice, number>;
  /** Flag set by each outcome; omitted for encounters with no per-enemy outcome flag. */
  outcomeFlags: Partial<Record<EncounterChoice, ProgressFlag>>;
  /** Set once this enemy (and all `group` members) are resolved, whichever outcome. */
  resolvedFlag?: ProgressFlag;
  /** Other encounters that must also be resolved before `resolvedFlag` is set. */
  group?: readonly StubEncounterId[];
  /** Drop flag set after either outcome (always after the outcome flag). */
  dropFlags: readonly ProgressFlag[];
  /** Purify is only allowed once this flag (the spell) is set; otherwise the enemy may stay stunned. */
  purifyRequires?: ProgressFlag;
}

export const STUB_ENCOUNTERS: Record<StubEncounterId, StubEncounterDef> = {
  street_fox: {
    id: 'street_fox',
    encounterId: 'enc_street',
    enemyId: 'enemy.street.fox',
    moralityDelta: { purify: 10, destroy: -10 },
    outcomeFlags: {},
    resolvedFlag: 'enc_street_resolved',
    dropFlags: [],
    purifyRequires: 'spell_purify',
  },
  briggs: {
    id: 'briggs',
    encounterId: 'enc_briggs',
    enemyId: 'enemy.garden.briggs',
    moralityDelta: { purify: 30, destroy: -30 },
    outcomeFlags: { purify: 'briggs_purified', destroy: 'briggs_destroyed' },
    dropFlags: ['walkie_found'],
  },
  watcher: {
    id: 'watcher',
    encounterId: 'enc_watcher',
    enemyId: 'enemy.house66.watcher',
    moralityDelta: { purify: 30, destroy: -30 },
    outcomeFlags: { purify: 'watcher_purified', destroy: 'watcher_destroyed' },
    dropFlags: ['fence_key_taken'],
  },
  hound_1: {
    id: 'hound_1',
    encounterId: 'enc_approach',
    enemyId: 'enemy.grounds.hound_1',
    moralityDelta: { purify: 10, destroy: -10 },
    outcomeFlags: {},
    resolvedFlag: 'enc_approach_resolved',
    group: ['hound_2'],
    dropFlags: [],
  },
  hound_2: {
    id: 'hound_2',
    encounterId: 'enc_approach',
    enemyId: 'enemy.grounds.hound_2',
    moralityDelta: { purify: 10, destroy: -10 },
    outcomeFlags: {},
    resolvedFlag: 'enc_approach_resolved',
    group: ['hound_1'],
    dropFlags: [],
  },
  interior_cat: {
    id: 'interior_cat',
    encounterId: 'enc_interior',
    enemyId: 'enemy.interior.cat',
    moralityDelta: { purify: 10, destroy: -10 },
    outcomeFlags: {},
    resolvedFlag: 'enc_interior_resolved',
    dropFlags: [],
  },
};

export type EncounterRejection = 'invalid_transition' | 'not_stunned' | 'purify_locked' | 'already_resolved';

export type StepResult =
  | { ok: true; state: EncounterState }
  | { ok: false; reason: EncounterRejection; state: EncounterState };

/** Moves an encounter forward one step. It never moves backwards and never skips a step. */
export function stepEncounter(state: EncounterState, action: EncounterAction): StepResult {
  if (state === 'resolved') return { ok: false, reason: 'already_resolved', state };
  if (action === 'weaken' && state === 'idle') return { ok: true, state: 'weakened' };
  if (action === 'stun' && state === 'weakened') return { ok: true, state: 'stunned' };
  return { ok: false, reason: 'invalid_transition', state };
}

export interface ResolveInput {
  id: StubEncounterId;
  /** Current state of this encounter. */
  state: EncounterState;
  choice: EncounterChoice;
  /** Current progression flags (used for the purify unlock and to avoid re-setting flags). */
  flags: readonly ProgressFlag[];
  /** States of the other encounters, for group completion (the two hounds). */
  siblingStates?: Partial<Record<StubEncounterId, EncounterState>>;
  /** Angel-summoned enemies change nothing: no flags, no morality. */
  summoned?: boolean;
}

export type ResolveResult =
  | {
      ok: true;
      /** Set these through progression.setFlag in this order: outcome, resolved, drops. */
      flagsToSet: ProgressFlag[];
      moralityDelta: number;
      /** Reason string for the morality history entry. */
      reason: string;
      next: EncounterState;
    }
  | { ok: false; reason: EncounterRejection; next: EncounterState };

/** Purify or destroy. Only allowed while stunned. Pure: returns what to apply. */
export function resolveEncounter(input: ResolveInput): ResolveResult {
  const def = STUB_ENCOUNTERS[input.id];
  if (input.state === 'resolved') return { ok: false, reason: 'already_resolved', next: input.state };
  if (input.state !== 'stunned') return { ok: false, reason: 'not_stunned', next: input.state };
  if (input.choice === 'purify' && def.purifyRequires && !input.flags.includes(def.purifyRequires)) {
    return { ok: false, reason: 'purify_locked', next: input.state };
  }

  const reason = `${def.enemyId}:${input.choice}`;
  if (input.summoned) {
    return { ok: true, flagsToSet: [], moralityDelta: 0, reason, next: 'resolved' };
  }

  const groupDone = (def.group ?? []).every((id) => input.siblingStates?.[id] === 'resolved');
  const ordered: (ProgressFlag | undefined)[] = [
    def.outcomeFlags[input.choice],
    groupDone ? def.resolvedFlag : undefined,
    ...def.dropFlags,
  ];
  const flagsToSet = ordered.filter((f): f is ProgressFlag => f !== undefined && !input.flags.includes(f));

  return { ok: true, flagsToSet, moralityDelta: def.moralityDelta[input.choice], reason, next: 'resolved' };
}

/**
 * Returns a new morality value (clamped to +/-100) and, for a non-zero delta, appends a history entry.
 * The entry records the requested delta, not the clamped change. A zero delta returns the input unchanged.
 */
export function applyMoralityDelta(
  morality: ProgressSlice['morality'],
  delta: number,
  reason: string,
  at: number,
): ProgressSlice['morality'] {
  if (delta === 0) return morality;
  return {
    value: clampMorality(morality.value + delta),
    history: [...morality.history, { at, delta, reason }],
  };
}
