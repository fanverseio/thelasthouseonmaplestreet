import { APP_VERSION, type HealthResponse } from '@tlh/shared';
import { jsonResponse } from './json.ts';
import type { Handler } from './types.ts';

/** GET /api/health */
export const healthHandler: Handler = (_request, ctx) => {
  const body: HealthResponse = {
    ok: true,
    version: APP_VERSION,
    mode: ctx.config.appMode,
    uptimeSec: Math.max(0, Math.floor((ctx.now() - ctx.startedAt) / 1000)),
  };
  return jsonResponse(body);
};
