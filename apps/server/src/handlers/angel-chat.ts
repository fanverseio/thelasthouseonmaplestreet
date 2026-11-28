import { AngelChatRequestSchema, AngelModelOutputSchema, MAX_PROPOSALS_PER_RESPONSE, type AngelChatResponse, type ErrorCode } from '@tlh/shared';
import { canonViolation, capSpeech, STOCK } from '../angel/canon-filter.ts';
import { ANGEL_OUTPUT_JSON_SCHEMA, buildAngelPrompt } from '../angel/prompt.ts';
import { admitChat, recordSpend } from '../limits/limits.ts';
import { completeStructured, LlmError } from '../llm/index.ts';
import type { LlmUsage } from '../llm/types.ts';
import { aiAvailable } from '../services.ts';
import { resolveCaller } from './caller.ts';
import { errorResponse, jsonResponse } from './json.ts';
import type { Handler } from './types.ts';

export const ANGEL_MAX_TOKENS = 400;

/** Provider error kind -> HTTP status and client fallback (docs/contracts.md section 3 and 7). */
const PROVIDER_ERRORS: Record<LlmError['kind'], { status: number; fallback: 'classic' | 'in_character' }> = {
  auth: { status: 503, fallback: 'classic' },
  quota: { status: 503, fallback: 'classic' },
  timeout: { status: 504, fallback: 'classic' },
  provider_error: { status: 503, fallback: 'classic' },
  refused: { status: 200, fallback: 'in_character' },
  invalid: { status: 502, fallback: 'in_character' },
};

/**
 * POST /api/angel/chat
 * The request carries only data (snapshot, summary, recent turns, action descriptors, player text). The prompt
 * is built here. Output is schema-validated, canon-filtered and capped; at most 2 action proposals pass through
 * (the client's validator decides whether any of them happen). Hosted mode never reads a URL or key from the body.
 */
export const angelChatHandler: Handler = async (request, ctx) => {
  const { services, config } = ctx;
  const started = ctx.now();
  let usage: LlmUsage = { inputTokens: 0, outputTokens: 0 };
  const meta: { label?: string } = {};
  const done = (response: Response, error?: ErrorCode | string) => {
    services.log({
      route: 'angel/chat',
      status: response.status,
      ms: ctx.now() - started,
      ...(error ? { error } : {}),
      inTok: usage.inputTokens,
      outTok: usage.outputTokens,
      ...(meta.label ? { label: meta.label } : {}),
    });
    return response;
  };

  if (!aiAvailable(config, services) || !services.llm || !services.store) {
    return done(errorResponse('not_configured', 503, 'classic'), 'not_configured');
  }
  const who = resolveCaller(request, ctx);
  if (!who.ok) return done(errorResponse(who.error, 401, 'classic'), who.error);
  meta.label = who.caller.label;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return done(errorResponse('bad_request', 400), 'bad_request');
  }
  const parsed = AngelChatRequestSchema.safeParse(raw); // unknown keys (e.g. a smuggled baseUrl or apiKey) are stripped
  if (!parsed.success) return done(errorResponse('bad_request', 400), 'bad_request');

  let admission;
  try {
    admission = await admitChat(services.store, services.limits, who.caller, started);
  } catch {
    return done(errorResponse('not_configured', 503, 'classic'), 'store_unavailable'); // fail closed
  }
  if (!admission.ok) {
    const fallback = admission.error === 'rate_limited' || admission.error === 'concurrency_limited' ? 'in_character' : 'classic';
    return done(errorResponse(admission.error, admission.status, fallback, admission.retryAfterSec), admission.error);
  }

  try {
    const prompt = buildAngelPrompt(parsed.data);
    let result;
    try {
      result = await completeStructured(services.llm, { ...prompt, schema: ANGEL_OUTPUT_JSON_SCHEMA, maxTokens: ANGEL_MAX_TOKENS }, AngelModelOutputSchema);
      usage = result.usage;
    } catch (error) {
      const e = error instanceof LlmError ? error : new LlmError('provider_error');
      usage = e.usage;
      await recordSpend(services.store, services.limits, usage).catch(() => undefined);
      const map = PROVIDER_ERRORS[e.kind];
      return done(errorResponse(e.kind, map.status, map.fallback), e.kind);
    }

    let credits;
    try {
      credits = await recordSpend(services.store, services.limits, usage);
    } catch {
      return done(errorResponse('not_configured', 503, 'classic'), 'store_unavailable');
    }

    const out = result.value;
    let speech = capSpeech(out.speech);
    let proposedActions = (out.proposedActions ?? []).slice(0, MAX_PROPOSALS_PER_RESPONSE);
    let filtered = false;
    if (canonViolation(speech)) {
      speech = STOCK.refuse;
      proposedActions = [];
      filtered = true;
    }
    const body: AngelChatResponse = {
      speech,
      tone: out.tone,
      ...(proposedActions.length > 0 ? { proposedActions } : {}),
      usage: { chatsRemaining: admission.chatsRemaining, credits },
    };
    return done(jsonResponse(body), filtered ? 'canon_filtered' : undefined);
  } finally {
    await admission.release().catch(() => undefined);
  }
};
