/**
 * Angel world-action validator (ARCHITECTURE 6.4). Pure: no React, no Three, no store writes.
 * The LLM proposes; this decides. A rejection changes no state.
 */
import {
  normaliseProposal,
  type ActionDescriptor,
  type ActionLedger,
  type AngelActionType,
  type AngelWorldAction,
  type Capability,
  type EntityId,
  type EntityKind,
  type Mode,
  type ProgressFlag,
  type RejectionReason,
  type ZoneId,
} from '@tlh/shared';
import type { WorldRegistry } from './world-registry.ts';

export interface ActionRule {
  /** False: the type parses but is rejected (this build enables a small set). */
  enabled: boolean;
  capability: Capability | null;
  kinds: readonly EntityKind[];
  cooldownS: number;
  maxPerRun: number;
  /** Metres from the player, or 'zone' for same zone only, or null for no target. */
  range: number | 'zone' | null;
}

/** Limits from docs/combat-tuning.md section 8. Only flicker, reveal and restore are enabled. */
export const ACTION_RULES: Readonly<Record<AngelActionType, ActionRule>> = {
  flicker_lights: { enabled: true, capability: 'angelFlicker', kinds: ['light'], cooldownS: 10, maxPerRun: 20, range: 'zone' },
  unlock_door: { enabled: false, capability: 'angelUnlock', kinds: ['door'], cooldownS: 30, maxPerRun: 3, range: 15 },
  reveal_clue: { enabled: true, capability: 'angelReveal', kinds: ['clue'], cooldownS: 60, maxPerRun: 3, range: 15 },
  restore_magic: { enabled: true, capability: null, kinds: [], cooldownS: 90, maxPerRun: 6, range: null },
  stir_object: { enabled: false, capability: 'angelStir', kinds: ['prop'], cooldownS: 20, maxPerRun: 6, range: 15 },
  summon_minor_cursed: { enabled: false, capability: 'angelSummon', kinds: ['spawn'], cooldownS: 120, maxPerRun: 2, range: 'zone' },
};

/** Zones where the Angel may not act (the finale chamber). */
export const BLOCKED_ZONES: readonly ZoneId[] = ['ritual'];

export interface ValidationContext {
  mode: Mode;
  registry: WorldRegistry;
  placements: Readonly<Record<string, { x: number; z: number }>>;
  zone: ZoneId;
  pos: { x: number; z: number };
  simTime: number;
  ledger: ActionLedger;
  flags: readonly ProgressFlag[];
  magic: number;
  maxMagic: number;
  /** Sequence or encounter running now, or null. */
  activeOwner: string | null;
  /** World entity states (for "already revealed"). */
  entities: Readonly<Record<string, Record<string, unknown>>>;
}

export type Verdict = { ok: true; action: AngelWorldAction } | { ok: false; reason: RejectionReason };

const targetOf = (a: AngelWorldAction): EntityId | null => ('targetId' in a ? a.targetId : 'spawnId' in a ? a.spawnId : null);

/**
 * Story-safety (defence in depth): an action may never touch the critical path, progress or the ending.
 * Allowed effects are cosmetic, a revealed optional clue, or a little magic. A critical target is allowed only
 * for a light flicker (cosmetic).
 */
export function isStorySafe(action: AngelWorldAction, registry: WorldRegistry): boolean {
  const id = targetOf(action);
  if (!id) return action.type === 'restore_magic';
  const e = registry.get(id);
  if (!e) return false;
  if (e.kind === 'gate' || e.kind === 'anchor' || e.kind === 'seal' || e.kind === 'pickup' || e.kind === 'socket') return false;
  return !e.critical || action.type === 'flicker_lights';
}

/** Full pipeline for one untrusted proposal, in the documented order. */
export function validateProposal(raw: unknown, ctx: ValidationContext): Verdict {
  const parsed = normaliseProposal(raw);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  return validateAction(parsed.action, ctx);
}

/** Steps 2-10 (also used to re-validate a queued action when the locket closes). */
export function validateAction(action: AngelWorldAction, ctx: ValidationContext): Verdict {
  const no = (reason: RejectionReason): Verdict => ({ ok: false, reason });
  if (ctx.mode !== 'ai') return no('wrong_mode');
  const rule = ACTION_RULES[action.type];
  if (!rule.enabled) return no('schema_invalid'); // whitelisted types only; disabled ones are not on the list
  const id = targetOf(action);
  if (rule.capability) {
    const e = id ? ctx.registry.get(id) : undefined;
    if (!id || !e) return no('target_not_found');
    if (!rule.kinds.includes(e.kind)) return no('target_kind_mismatch');
    if (!e.capabilities.includes(rule.capability)) return no('capability_missing');
    if (e.critical && action.type !== 'flicker_lights') return no('entity_critical');
    if (BLOCKED_ZONES.includes(e.zone)) return no('zone_blocked');
    if (e.zone !== ctx.zone) return no('wrong_zone');
    if (typeof rule.range === 'number') {
      const p = ctx.placements[e.id];
      if (p && Math.hypot(p.x - ctx.pos.x, p.z - ctx.pos.z) > rule.range) return no('out_of_range');
    }
    if (e.owner && e.owner !== 'side_quest' && (e.owner === ctx.activeOwner || (e.owner === 'finale' && ctx.flags.includes('ritual_active')))) {
      return no('scripted_lock');
    }
    if (action.type === 'reveal_clue' && ctx.entities[e.id]?.revealed === true) return no('already_applied');
  } else if (BLOCKED_ZONES.includes(ctx.zone)) return no('zone_blocked');
  if (ctx.activeOwner !== null || ctx.flags.includes('ritual_active')) return no('scripted_lock');
  const last = ctx.ledger.lastUsedSimTime[action.type];
  if (last !== undefined && ctx.simTime - last < rule.cooldownS) return no('cooldown_active');
  if ((ctx.ledger.useCount[action.type] ?? 0) >= rule.maxPerRun) return no('budget_exhausted');
  if (action.type === 'restore_magic' && ctx.magic >= ctx.maxMagic) return no('already_applied');
  if (!isStorySafe(action, ctx.registry)) return no('story_safety_violation');
  return { ok: true, action };
}

/** Record a used action in a new ledger (pure). */
export function recordUse(ledger: ActionLedger, type: AngelActionType, simTime: number): ActionLedger {
  return {
    ...ledger,
    lastUsedSimTime: { ...ledger.lastUsedSimTime, [type]: simTime },
    useCount: { ...ledger.useCount, [type]: (ledger.useCount[type] ?? 0) + 1 },
  };
}

/** Action descriptors for the request: enabled types and the targets that would pass right now. */
export function describeActions(ctx: ValidationContext): ActionDescriptor[] {
  const out: ActionDescriptor[] = [];
  for (const [type, rule] of Object.entries(ACTION_RULES) as [AngelActionType, ActionRule][]) {
    if (!rule.enabled) continue;
    if (!rule.capability) {
      const v = validateAction({ type: 'restore_magic', amount: 10 }, ctx);
      if (v.ok) out.push({ type, validTargets: [], note: `Elena's magic is ${Math.round(ctx.magic)} of ${ctx.maxMagic}. Amount 1-25.` });
      continue;
    }
    const validTargets = ctx.registry.entities
      .filter((e) => e.capabilities.includes(rule.capability!))
      .filter((e) => validateAction({ type, targetId: e.id } as AngelWorldAction, ctx).ok)
      .map((e) => e.id)
      .slice(0, 24);
    if (validTargets.length > 0) out.push({ type, validTargets, note: type === 'flicker_lights' ? 'Lights near Elena; a flicker unsettles or points the way.' : 'An optional clue nearby.' });
  }
  return out;
}
