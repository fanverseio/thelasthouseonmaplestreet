import {
  ConfigStatusResponseSchema,
  HealthResponseSchema,
  type ConfigStatusResponse,
  type HealthResponse,
} from '@tlh/shared';

/** Thin, validated wrappers over the local or hosted API (same origin; Vite proxies /api in dev). */
async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, { signal: signal ?? null, headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response.json();
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return HealthResponseSchema.parse(await getJson('/api/health', signal));
}

export async function fetchConfigStatus(signal?: AbortSignal): Promise<ConfigStatusResponse> {
  return ConfigStatusResponseSchema.parse(await getJson('/api/config/status', signal));
}
