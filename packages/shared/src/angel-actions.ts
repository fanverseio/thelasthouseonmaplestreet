import { z } from 'zod';
import { EntityIdSchema } from './ids.ts';

/** World actions the Angel may propose (AI mode only). docs/contracts.md section 6. */
export const ANGEL_ACTION_TYPES = [
  'flicker_lights',
  'unlock_door',
  'reveal_clue',
  'restore_magic',
  'stir_object',
  'summon_minor_cursed',
] as const;
export const AngelActionTypeSchema = z.enum(ANGEL_ACTION_TYPES);
export type AngelActionType = z.infer<typeof AngelActionTypeSchema>;

export const MAX_PROPOSALS_PER_RESPONSE = 2;
export const RESTORE_MAGIC_MIN = 1;
export const RESTORE_MAGIC_MAX = 25;

export const AngelWorldActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('flicker_lights'), targetId: EntityIdSchema }),
  z.object({ type: z.literal('unlock_door'), targetId: EntityIdSchema }),
  z.object({ type: z.literal('reveal_clue'), targetId: EntityIdSchema }),
  z.object({
    type: z.literal('restore_magic'),
    amount: z.number().int().min(RESTORE_MAGIC_MIN).max(RESTORE_MAGIC_MAX),
  }),
  z.object({ type: z.literal('stir_object'), targetId: EntityIdSchema }),
  z.object({ type: z.literal('summon_minor_cursed'), spawnId: EntityIdSchema }),
]);
export type AngelWorldAction = z.infer<typeof AngelWorldActionSchema>;

/**
 * The loose shape the LLM sends. Unknown keys are stripped by zod.
 * It is normalised into AngelWorldAction before any validation.
 */
export const WireProposalSchema = z.object({
  type: z.string().max(40),
  targetId: z.string().max(64).optional(),
  params: z.object({ amount: z.number().optional() }).optional(),
});
export type WireProposal = z.infer<typeof WireProposalSchema>;

export const REJECTION_REASONS = [
  'schema_invalid',
  'wrong_mode',
  'target_not_found',
  'target_kind_mismatch',
  'capability_missing',
  'entity_critical',
  'zone_blocked',
  'wrong_zone',
  'out_of_range',
  'scripted_lock',
  'cooldown_active',
  'budget_exhausted',
  'cap_reached',
  'amount_out_of_range',
  'already_applied',
  'story_safety_violation',
  'internal_error',
] as const;
export const RejectionReasonSchema = z.enum(REJECTION_REASONS);
export type RejectionReason = z.infer<typeof RejectionReasonSchema>;

export type NormaliseResult =
  | { ok: true; action: AngelWorldAction }
  | { ok: false; reason: Extract<RejectionReason, 'schema_invalid' | 'amount_out_of_range'> };

function isActionType(value: string): value is AngelActionType {
  return (ANGEL_ACTION_TYPES as readonly string[]).includes(value);
}

/**
 * Turn one untrusted proposal into the typed union, or say why not.
 * Pure: never throws, never mutates its input.
 */
export function normaliseProposal(raw: unknown): NormaliseResult {
  const wire = WireProposalSchema.safeParse(raw);
  if (!wire.success || !isActionType(wire.data.type)) return { ok: false, reason: 'schema_invalid' };

  const { type, targetId, params } = wire.data;
  let candidate: unknown;
  if (type === 'restore_magic') {
    const amount = params?.amount;
    if (typeof amount !== 'number') return { ok: false, reason: 'schema_invalid' };
    if (!Number.isInteger(amount) || amount < RESTORE_MAGIC_MIN || amount > RESTORE_MAGIC_MAX) {
      return { ok: false, reason: 'amount_out_of_range' };
    }
    candidate = { type, amount };
  } else if (type === 'summon_minor_cursed') {
    candidate = { type, spawnId: targetId };
  } else {
    candidate = { type, targetId };
  }

  const parsed = AngelWorldActionSchema.safeParse(candidate);
  return parsed.success ? { ok: true, action: parsed.data } : { ok: false, reason: 'schema_invalid' };
}

/** Normalise a response's proposals, considering at most the first two, in order. */
export function normaliseProposals(raw: unknown): NormaliseResult[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_PROPOSALS_PER_RESPONSE).map(normaliseProposal);
}

export const ActionLedgerSchema = z.object({
  lastUsedSimTime: z.partialRecord(AngelActionTypeSchema, z.number().nonnegative()),
  useCount: z.partialRecord(AngelActionTypeSchema, z.number().int().nonnegative()),
  liveSummonedIds: z.array(EntityIdSchema),
});
export type ActionLedger = z.infer<typeof ActionLedgerSchema>;

export function emptyActionLedger(): ActionLedger {
  return { lastUsedSimTime: {}, useCount: {}, liveSummonedIds: [] };
}
