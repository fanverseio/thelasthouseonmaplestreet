import { MAX_REQUEST_BODY_BYTES } from './shared.ts';
import { loadServerConfig } from './config.ts';
import { errorResponse } from './handlers/json.ts';
import { handleApiRequest } from './handlers/router.ts';
import type { HandlerContext } from './handlers/types.ts';
import { createServices } from './services.ts';

/**
 * Shared entry for Vercel Functions in /api. Same handlers as the local server.
 * Hosted mode fails closed: with no store, session secret, account or provider configured, AI is unavailable
 * and the game plays Classic. No client-supplied URL or key is ever read here.
 */
const startedAt = Date.now();
let ctx: HandlerContext | null = null;

function getContext(): HandlerContext | null {
  if (ctx) return ctx;
  try {
    const env = { ...process.env, APP_MODE: 'hosted' };
    const config = loadServerConfig(env);
    ctx = { config, services: createServices(env, config), now: Date.now, startedAt };
    return ctx;
  } catch {
    return null;
  }
}

export async function handleHostedRequest(request: Request): Promise<Response> {
  const context = getContext();
  if (!context) return errorResponse('provider_error', 500);
  const length = Number(request.headers.get('content-length') ?? '0');
  if (length > MAX_REQUEST_BODY_BYTES) return errorResponse('bad_request', 413);
  return handleApiRequest(request, context);
}
