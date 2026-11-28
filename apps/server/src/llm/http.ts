import { classifyStatus, LlmError } from './types.ts';

/** Join a base URL and a path with exactly one slash. */
export function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export interface HttpResult {
  status: number;
  body: unknown;
}

/**
 * POST JSON. Network failures and aborts become LlmError; the error never carries the URL, headers or body.
 * Non-2xx responses are returned (not thrown) so the caller can decide whether to try the next step.
 */
export async function postJson(
  fetchFn: typeof fetch,
  url: string,
  headers: Record<string, string>,
  payload: unknown,
  signal: AbortSignal,
): Promise<HttpResult> {
  let response: Response;
  try {
    response = await fetchFn(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', ...headers },
      body: JSON.stringify(payload),
      signal,
    });
  } catch {
    throw new LlmError(signal.aborted ? 'timeout' : 'provider_error');
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    if (signal.aborted) throw new LlmError('timeout');
    body = null;
  }
  return { status: response.status, body };
}

/** Throw the classified error for a failed status. */
export function failFor(status: number): never {
  throw new LlmError(classifyStatus(status), status);
}

/** Find the first balanced JSON object in model text (handles ```json fences and chatter around it). */
export function extractJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  if (start < 0) return undefined;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
}

/** Parse a tool-call argument string or object. */
export function parseArgs(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return extractJsonObject(value);
    }
  }
  return value;
}

export const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export const isOk = (status: number): boolean => status >= 200 && status < 300;
