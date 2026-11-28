/**
 * Usage store: counters with optional TTL. Hosted uses Upstash Redis (REST); local uses memory.
 * Both implement the same interface. Any method may throw StoreError; callers fail closed.
 */
export interface UsageStore {
  /** Add `by` (may be negative) and return the new value. Sets the TTL only when the key is new. */
  incr(key: string, by: number, ttlSec?: number): Promise<number>;
  /** Current value, 0 when missing. */
  get(key: string): Promise<number>;
}

export class StoreError extends Error {
  override name = 'StoreError';
}

/** In-memory store for local mode and tests. */
export function createMemoryStore(now: () => number = Date.now): UsageStore {
  const data = new Map<string, { value: number; expiresAt: number | null }>();
  const live = (key: string) => {
    const e = data.get(key);
    if (e && e.expiresAt !== null && e.expiresAt <= now()) {
      data.delete(key);
      return undefined;
    }
    return e;
  };
  return {
    async incr(key, by, ttlSec) {
      const e = live(key);
      if (e) {
        e.value += by;
        return e.value;
      }
      data.set(key, { value: by, expiresAt: ttlSec ? now() + ttlSec * 1000 : null });
      return by;
    },
    async get(key) {
      return live(key)?.value ?? 0;
    },
  };
}

type Env = Record<string, string | undefined>;

/** Upstash REST credentials: UPSTASH_REDIS_REST_* first, then the KV_REST_API_* names the Vercel integration injects. */
export function upstashCredentials(env: Env): { url: string; token: string } | null {
  const url = env.UPSTASH_REDIS_REST_URL?.trim() || env.KV_REST_API_URL?.trim();
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim() || env.KV_REST_API_TOKEN?.trim();
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

/**
 * Upstash Redis over its REST API with plain fetch (pipeline endpoint). 2 s timeout per call.
 * Errors never include the URL or token.
 */
export function createUpstashStore(creds: { url: string; token: string }, fetchFn: typeof fetch = fetch): UsageStore {
  async function pipeline(commands: (string | number)[][]): Promise<unknown[]> {
    let response: Response;
    try {
      response = await fetchFn(`${creds.url}/pipeline`, {
        method: 'POST',
        headers: { authorization: `Bearer ${creds.token}`, 'content-type': 'application/json' },
        body: JSON.stringify(commands),
        signal: AbortSignal.timeout(2000),
      });
    } catch {
      throw new StoreError('store unreachable');
    }
    if (!response.ok) throw new StoreError(`store HTTP ${response.status}`);
    const body = (await response.json().catch(() => null)) as { result?: unknown; error?: string }[] | null;
    if (!Array.isArray(body) || body.some((r) => r && typeof r === 'object' && 'error' in r && r.error)) throw new StoreError('store error');
    return body.map((r) => r?.result);
  }
  return {
    async incr(key, by, ttlSec) {
      const cmds: (string | number)[][] = [['INCRBY', key, Math.round(by)]];
      if (ttlSec) cmds.push(['EXPIRE', key, Math.ceil(ttlSec), 'NX']);
      const [value] = await pipeline(cmds);
      const n = Number(value);
      if (!Number.isFinite(n)) throw new StoreError('store returned a non-number');
      return n;
    },
    async get(key) {
      const [value] = await pipeline([['GET', key]]);
      if (value === null || value === undefined) return 0;
      const n = Number(value);
      if (!Number.isFinite(n)) throw new StoreError('store returned a non-number');
      return n;
    },
  };
}
