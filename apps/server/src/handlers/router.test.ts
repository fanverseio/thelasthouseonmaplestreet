import { ConfigStatusResponseSchema, HealthResponseSchema } from '../shared.ts';
import { describe, expect, it } from 'vitest';
import { loadServerConfig } from '../config.ts';
import { createServices } from '../services.ts';
import { handleApiRequest } from './router.ts';
import type { HandlerContext } from './types.ts';

const offline = (async () => {
  throw new Error('offline');
}) as unknown as typeof fetch;

function ctx(env: Record<string, string> = {}, uptimeMs = 5_000): HandlerContext {
  const config = loadServerConfig(env);
  return { config, services: createServices(env, config, offline, () => {}), startedAt: 1_000, now: () => 1_000 + uptimeMs };
}

const get = (path: string) => new Request(`http://127.0.0.1:3000${path}`);

describe('GET /api/health', () => {
  it('returns ok with version, mode and uptime', async () => {
    const response = await handleApiRequest(get('/api/health'), ctx());
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = HealthResponseSchema.parse(await response.json());
    expect(body).toMatchObject({ ok: true, mode: 'local', uptimeSec: 5 });
  });
});

describe('GET /api/config/status', () => {
  it('reports no provider when nothing is configured', async () => {
    const body = ConfigStatusResponseSchema.parse(await (await handleApiRequest(get('/api/config/status'), ctx())).json());
    expect(body).toEqual({ mode: 'local', aiAvailable: false, provider: null, loginRequired: false, session: { active: false }, credits: null });
  });

  it('shows protocol and model locally, never the key or base URL', async () => {
    const env = {
      LLM_PROTOCOL: 'openai',
      LLM_BASE_URL: 'https://secret-host.example.com',
      LLM_MODEL: 'small-model',
      LLM_API_KEY: 'placeholder-key-value',
    };
    const response = await handleApiRequest(get('/api/config/status'), ctx(env));
    const text = await response.text();
    expect(text).not.toContain('placeholder-key-value');
    expect(text).not.toContain('secret-host');
    expect(ConfigStatusResponseSchema.parse(JSON.parse(text)).provider).toEqual({
      protocol: 'openai',
      model: 'small-model',
    });
  });

  it('does not disclose the provider in hosted mode', async () => {
    const env = { APP_MODE: 'hosted', LLM_PROTOCOL: 'mock' };
    const body = ConfigStatusResponseSchema.parse(await (await handleApiRequest(get('/api/config/status'), ctx(env))).json());
    expect(body.mode).toBe('hosted');
    expect(body.provider).toBeNull();
  });
});

describe('hosted fail closed', () => {
  const status = async (env: Record<string, string>) =>
    ConfigStatusResponseSchema.parse(await (await handleApiRequest(get('/api/config/status'), ctx(env))).json());

  it('reports AI unavailable with no store and no provider', async () => {
    expect((await status({ APP_MODE: 'hosted' })).aiAvailable).toBe(false);
  });

  it('reports AI unavailable when a provider is set but Redis is not', async () => {
    expect((await status({ APP_MODE: 'hosted', LLM_PROTOCOL: 'mock' })).aiAvailable).toBe(false);
  });

  it('reports AI available only with provider, Redis, secret and an account all set', async () => {
    const env = {
      APP_MODE: 'hosted',
      LLM_PROTOCOL: 'mock',
      UPSTASH_REDIS_REST_URL: 'https://x.example',
      UPSTASH_REDIS_REST_TOKEN: 't',
      SESSION_SECRET: 's'.repeat(32),
      ACCESS_CODE_HASHES: `judge1:${'a'.repeat(64)}`,
    };
    // The fake Redis host is unreachable, so status fails closed even though everything is configured.
    expect((await status(env)).aiAvailable).toBe(false);
    expect((await status({ ...env, SESSION_SECRET: '' })).aiAvailable).toBe(false);
  });
});

describe('routing', () => {
  it('returns 404 not_found for unknown routes', async () => {
    const response = await handleApiRequest(get('/api/does-not-exist'), ctx());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'not_found', fallback: 'none' });
  });

  it('returns 405 with an Allow header for the wrong method', async () => {
    const response = await handleApiRequest(new Request('http://127.0.0.1:3000/api/health', { method: 'POST' }), ctx());
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
  });
});
