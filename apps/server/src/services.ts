import { randomBytes } from 'node:crypto';
import { loadAccounts, type Account } from './access/access.ts';
import type { ServerConfig } from './config.ts';
import { loadLimits, type LimitsConfig } from './limits/limits.ts';
import { createAdapterFromEnv } from './llm/index.ts';
import type { LlmAdapter } from './llm/types.ts';
import { createMemoryStore, createUpstashStore, upstashCredentials, type UsageStore } from './store/usage-store.ts';

type Env = Record<string, string | undefined>;

/** Log fields are a closed, safe set: never keys, passphrases, cookies or player text. */
export interface LogEntry {
  route: string;
  status: number;
  ms: number;
  error?: string;
  inTok?: number;
  outTok?: number;
  label?: string;
  step?: string;
}

export interface Services {
  llm: LlmAdapter | null;
  /** Null in hosted mode without Upstash: AI then fails closed. */
  store: UsageStore | null;
  limits: LimitsConfig;
  accounts: Account[];
  /** Null in hosted mode without SESSION_SECRET: AI then fails closed. */
  sessionSecret: string | null;
  sessionTtlSec: number;
  log: (entry: LogEntry) => void;
}

export function createServices(env: Env, config: ServerConfig, fetchFn: typeof fetch = fetch, log?: (e: LogEntry) => void): Services {
  const hosted = config.appMode === 'hosted';
  const creds = upstashCredentials(env);
  const ttlMin = Number(env.SESSION_TTL_MINUTES?.trim() || '120');
  const secret = env.SESSION_SECRET?.trim();
  return {
    llm: createAdapterFromEnv(env, fetchFn),
    store: hosted ? (creds ? createUpstashStore(creds, fetchFn) : null) : createMemoryStore(),
    limits: loadLimits(env),
    accounts: loadAccounts(env),
    // Local mode signs cookies with a per-process random secret when none is set (sessions end on restart).
    sessionSecret: secret && secret.length >= 16 ? secret : hosted ? null : randomBytes(32).toString('hex'),
    sessionTtlSec: Math.round((Number.isFinite(ttlMin) && ttlMin > 0 ? ttlMin : 120) * 60),
    log: log ?? ((e) => console.log(JSON.stringify(e))),
  };
}

/** Hosted always needs a login; local needs one only when accounts are configured. */
export function loginRequired(config: ServerConfig, services: Services): boolean {
  return config.appMode === 'hosted' || services.accounts.length > 0;
}

/** AI can answer at all: provider set, and in hosted mode also store, secret and at least one account. */
export function aiAvailable(config: ServerConfig, services: Services): boolean {
  if (!services.llm) return false;
  if (config.appMode === 'local') return services.store !== null && services.sessionSecret !== null;
  return services.store !== null && services.sessionSecret !== null && services.accounts.length > 0;
}
