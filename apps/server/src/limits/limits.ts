import type { Credits, ErrorCode } from '@tlh/shared';
import type { LlmUsage } from '../llm/types.ts';
import type { UsageStore } from '../store/usage-store.ts';

type Env = Record<string, string | undefined>;

export interface LimitsConfig {
  ceilingUsd: number;
  priceInputPerMTok: number;
  priceOutputPerMTok: number;
  chatsPerCode: number;
  chatsPerSession: number;
  ratePerMinute: number;
  concurrencyPerCode: number;
  concurrencyGlobal: number;
}

function numberEnv(env: Env, name: string, fallback: number): number {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Limits from env. Defaults follow docs/hosting-ops.md section 5. When no prices are set, a cautious default
 * (1 USD in / 4 USD out per million tokens) is used so the ceiling still means something.
 */
export function loadLimits(env: Env): LimitsConfig {
  const priceIn = numberEnv(env, 'LLM_PRICE_INPUT_PER_MTOK', 0);
  const priceOut = numberEnv(env, 'LLM_PRICE_OUTPUT_PER_MTOK', 0);
  const unpriced = priceIn === 0 && priceOut === 0;
  return {
    ceilingUsd: numberEnv(env, 'AI_SPEND_CEILING_USD', 25),
    priceInputPerMTok: unpriced ? 1 : priceIn,
    priceOutputPerMTok: unpriced ? 4 : priceOut,
    chatsPerCode: numberEnv(env, 'QUOTA_CHAT_PER_CODE', 150),
    chatsPerSession: numberEnv(env, 'QUOTA_CHAT_PER_SESSION', 40),
    ratePerMinute: numberEnv(env, 'RATE_LIMIT_PER_MINUTE', 10),
    concurrencyPerCode: numberEnv(env, 'CONCURRENCY_PER_CODE', 1),
    concurrencyGlobal: numberEnv(env, 'CONCURRENCY_GLOBAL', 8),
  };
}

export const SPEND_KEY = 'spend:total';
const CONC_TTL_SEC = 15;

/** Cost of one response in micro-USD (integer). */
export function costMicroUsd(usage: LlmUsage, limits: LimitsConfig): number {
  return Math.round(usage.inputTokens * limits.priceInputPerMTok + usage.outputTokens * limits.priceOutputPerMTok);
}

export function creditsFrom(spentMicro: number, limits: LimitsConfig): Credits {
  const ceilingMicro = limits.ceilingUsd * 1e6;
  const left = Math.max(0, ceilingMicro - spentMicro);
  const pct = ceilingMicro > 0 ? Math.floor((left / ceilingMicro) * 100) : 0;
  return { remainingPct: Math.min(100, pct), remainingUsd: Math.round(left / 1e4) / 100, ceilingUsd: limits.ceilingUsd };
}

export async function readCredits(store: UsageStore, limits: LimitsConfig): Promise<Credits> {
  return creditsFrom(await store.get(SPEND_KEY), limits);
}

export interface Caller {
  /** Account label (quota key). `local` when no login is configured. */
  label: string;
  /** Session ID, or `local`. */
  sessionId: string;
  ip: string;
}

export type Admission =
  | { ok: true; chatsRemaining: number; release: () => Promise<void> }
  | { ok: false; error: ErrorCode; status: number; retryAfterSec?: number };

/**
 * Check every limit before a chat, in order: ceiling, quotas, rate, concurrency. Counts the chat against the
 * quotas on admission (a failed provider call still costs a chat; this is the abuse-safe choice).
 * Store errors propagate: the caller fails closed.
 */
export async function admitChat(store: UsageStore, limits: LimitsConfig, caller: Caller, now: number): Promise<Admission> {
  if ((await store.get(SPEND_KEY)) >= limits.ceilingUsd * 1e6) return { ok: false, error: 'ceiling_reached', status: 503 };

  const codeKey = `quota:chat:${caller.label}`;
  const sessKey = `quota:sess:${caller.sessionId}`;
  if ((await store.get(codeKey)) >= limits.chatsPerCode || (await store.get(sessKey)) >= limits.chatsPerSession) {
    return { ok: false, error: 'quota_exhausted', status: 503 };
  }

  const minute = Math.floor(now / 60000);
  const rate = await store.incr(`rate:${caller.sessionId}:${caller.ip}:${minute}`, 1, 70);
  if (rate > limits.ratePerMinute) {
    return { ok: false, error: 'rate_limited', status: 429, retryAfterSec: Math.max(1, 60 - Math.floor((now % 60000) / 1000)) };
  }

  const concCode = `conc:${caller.label}`;
  const code = await store.incr(concCode, 1, CONC_TTL_SEC);
  const all = await store.incr('conc:global', 1, CONC_TTL_SEC);
  const release = async () => {
    await Promise.allSettled([store.incr(concCode, -1), store.incr('conc:global', -1)]);
  };
  if (code > limits.concurrencyPerCode || all > limits.concurrencyGlobal) {
    await release();
    return { ok: false, error: 'concurrency_limited', status: 429, retryAfterSec: 3 };
  }

  const used = await store.incr(codeKey, 1);
  const usedSession = await store.incr(sessKey, 1, 3 * 3600);
  const chatsRemaining = Math.max(0, Math.min(limits.chatsPerCode - used, limits.chatsPerSession - usedSession));
  return { ok: true, chatsRemaining, release };
}

/** Add a response's cost to the shared spend counter and return the credits left. */
export async function recordSpend(store: UsageStore, limits: LimitsConfig, usage: LlmUsage): Promise<Credits> {
  const cost = costMicroUsd(usage, limits);
  const spent = cost > 0 ? await store.incr(SPEND_KEY, cost) : await store.get(SPEND_KEY);
  return creditsFrom(spent, limits);
}

/** Chats left for a caller without counting one (for /api/config/status). */
export async function chatsLeft(store: UsageStore, limits: LimitsConfig, caller: Caller): Promise<number> {
  const used = await store.get(`quota:chat:${caller.label}`);
  const usedSession = await store.get(`quota:sess:${caller.sessionId}`);
  return Math.max(0, Math.min(limits.chatsPerCode - used, limits.chatsPerSession - usedSession));
}
