import { z } from 'zod';
import { AngelActionTypeSchema, MAX_PROPOSALS_PER_RESPONSE, WireProposalSchema } from './angel-actions.ts';
import {
  AppModeSchema,
  CapabilitySchema,
  EntityIdSchema,
  EntityKindSchema,
  ItemIdSchema,
  KnowledgeLevelSchema,
  PuzzleIdSchema,
  SpellIdSchema,
  ZoneIdSchema,
} from './ids.ts';
import { ProgressFlagSchema } from './flags.ts';
import { MoralityBandSchema } from './morality.ts';

/** HTTP API contracts. docs/contracts.md section 7. Body limit is 16 KB. */
export const MAX_REQUEST_BODY_BYTES = 16 * 1024;

export const ERROR_CODES = [
  'bad_request',
  'not_configured',
  'access_invalid',
  'session_expired',
  'quota_exhausted',
  'concurrency_limited',
  'ceiling_reached',
  'rate_limited',
  'auth',
  'quota',
  'timeout',
  'refused',
  'invalid',
  'provider_error',
  'not_found',
] as const;
export const ErrorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ApiErrorSchema = z.object({
  error: ErrorCodeSchema,
  fallback: z.enum(['classic', 'in_character', 'none']),
  retryAfterSec: z.number().int().positive().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const HealthResponseSchema = z.object({
  ok: z.literal(true),
  version: z.string(),
  mode: AppModeSchema,
  uptimeSec: z.number().nonnegative(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const LLM_PROTOCOLS = ['openai', 'anthropic', 'mock'] as const;
export const LlmProtocolSchema = z.enum(LLM_PROTOCOLS);
export type LlmProtocol = z.infer<typeof LlmProtocolSchema>;

export const ConfigStatusResponseSchema = z.object({
  mode: AppModeSchema,
  aiAvailable: z.boolean(),
  provider: z.object({ protocol: LlmProtocolSchema, model: z.string() }).nullable(),
  session: z.object({
    active: z.boolean(),
    expiresAt: z.string().optional(),
    chatsRemaining: z.number().int().nonnegative().optional(),
  }),
});
export type ConfigStatusResponse = z.infer<typeof ConfigStatusResponseSchema>;

export const AccessRedeemRequestSchema = z.object({ code: z.string().min(8).max(64) });
export const AccessRedeemResponseSchema = z.object({
  expiresAt: z.string(),
  chatsRemaining: z.number().int().nonnegative(),
});

/**
 * Base URLs for BYOK (local build only): https, or plain http to this machine only.
 * docs/angel-technical.md section 9.
 */
export function isAllowedLlmBaseUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
}

export const ConfigLlmRequestSchema = z.object({
  protocol: LlmProtocolSchema,
  baseUrl: z.string().max(300).refine(isAllowedLlmBaseUrl, 'baseUrl must be https, or http://localhost').optional(),
  model: z.string().min(1).max(200).optional(),
  apiKey: z.string().min(1).max(500).optional(),
});
export type ConfigLlmRequest = z.infer<typeof ConfigLlmRequestSchema>;

export const ChatTurnSchema = z.object({
  role: z.enum(['player', 'angel']),
  text: z.string().max(400),
});
export type ChatTurn = z.infer<typeof ChatTurnSchema>;

export const StateSnapshotSchema = z.object({
  zone: ZoneIdSchema,
  beat: z.number().int().min(1).max(12),
  objective: z.string().max(200),
  knowledgeLevel: KnowledgeLevelSchema,
  flags: z.array(ProgressFlagSchema),
  cluesFound: z.array(EntityIdSchema).max(60),
  moralityBand: MoralityBandSchema,
  hp: z.number().min(0).max(100),
  magic: z.number().min(0).max(100),
  spellsUnlocked: z.array(SpellIdSchema),
  carried: z.array(ItemIdSchema).max(4),
  nearby: z
    .array(
      z.object({ id: EntityIdSchema, kind: EntityKindSchema, capabilities: z.array(CapabilitySchema) }),
    )
    .max(12),
  puzzle: z.object({ id: PuzzleIdSchema, hintLevel: z.number().int().nonnegative() }).optional(),
  sideQuest: z.object({ active: z.string().max(40).nullable(), offered: z.number().int().min(0).max(2) }),
  inEncounter: z.boolean(),
});
export type StateSnapshot = z.infer<typeof StateSnapshotSchema>;

export const ActionDescriptorSchema = z.object({
  type: AngelActionTypeSchema,
  validTargets: z.array(EntityIdSchema).max(24),
  note: z.string().max(200),
});
export type ActionDescriptor = z.infer<typeof ActionDescriptorSchema>;

export const AngelChatRequestSchema = z.object({
  playerText: z.string().min(1).max(300),
  snapshot: StateSnapshotSchema,
  summary: z.string().max(1500),
  recent: z.array(ChatTurnSchema).max(10),
  actions: z.array(ActionDescriptorSchema).max(6),
  glitch: z.enum(['malicious_suggestion', 'unexpected_help']).optional(),
  systemNote: z.literal('connection_restored').optional(),
});
export type AngelChatRequest = z.infer<typeof AngelChatRequestSchema>;

export const AngelChatResponseSchema = z.object({
  speech: z.string().min(1).max(400),
  tone: z.enum(['warm', 'wry', 'cold', 'urgent', 'playful']),
  proposedActions: z.array(WireProposalSchema).max(MAX_PROPOSALS_PER_RESPONSE).optional(),
  sideQuestOffer: z.object({ templateId: z.string().max(40), targetId: EntityIdSchema }).optional(),
  usage: z.object({ chatsRemaining: z.number().int().nonnegative().optional() }),
});
export type AngelChatResponse = z.infer<typeof AngelChatResponseSchema>;

export const TtsRequestSchema = z.object({ text: z.string().min(1).max(400) });
