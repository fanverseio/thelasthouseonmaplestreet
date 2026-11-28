import {
  AngelChatResponseSchema,
  ApiErrorSchema,
  ConfigStatusResponseSchema,
  HealthResponseSchema,
  type AngelChatRequest,
  type ConfigStatusResponse,
  type ErrorCode,
  type HealthResponse,
} from '@tlh/shared';
import type { ChatResult } from '../game/angel-director.ts';

/** Thin, validated wrappers over the local or hosted API (same origin; Vite proxies /api in dev). */
async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, { signal: signal ?? null, headers: { accept: 'application/json' }, credentials: 'same-origin' });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response.json();
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return HealthResponseSchema.parse(await getJson('/api/health', signal));
}

export async function fetchConfigStatus(signal?: AbortSignal): Promise<ConfigStatusResponse> {
  return ConfigStatusResponseSchema.parse(await getJson('/api/config/status', signal));
}

async function postJson(path: string, body: unknown, signal?: AbortSignal): Promise<{ status: number; json: unknown }> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
    signal: signal ?? null,
  });
  return { status: response.status, json: await response.json().catch(() => null) };
}

export type LoginResult = { ok: true } | { ok: false; error: ErrorCode | 'network' };

/** Two-passphrase login. The passphrases go only to our own API, never into storage. */
export async function login(passphrase1: string, passphrase2: string): Promise<LoginResult> {
  try {
    const r = await postJson('/api/access/redeem', { passphrase1, passphrase2 });
    if (r.status === 200) return { ok: true };
    const err = ApiErrorSchema.safeParse(r.json);
    return { ok: false, error: err.success ? err.data.error : 'provider_error' };
  } catch {
    return { ok: false, error: 'network' };
  }
}

/** Client-side cap above the server's 8 s budget (repair retry included) so a hung request still ends. */
const CHAT_TIMEOUT_MS = 12000;

export async function sendAngelChat(request: AngelChatRequest): Promise<ChatResult> {
  try {
    const r = await postJson('/api/angel/chat', request, AbortSignal.timeout(CHAT_TIMEOUT_MS));
    const err = ApiErrorSchema.safeParse(r.json);
    if (err.success) return { ok: false, error: err.data.error, status: r.status, ...(err.data.retryAfterSec ? { retryAfterSec: err.data.retryAfterSec } : {}) };
    const body = AngelChatResponseSchema.safeParse(r.json);
    if (r.status === 200 && body.success) return { ok: true, body: body.data };
    return { ok: false, error: r.status >= 500 ? 'provider_error' : 'invalid', status: r.status };
  } catch (e) {
    return { ok: false, error: e instanceof DOMException && e.name === 'TimeoutError' ? 'timeout' : 'network' };
  }
}
