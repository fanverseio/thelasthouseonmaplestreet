import { loadServerConfig } from './config.ts';
import { errorResponse } from './handlers/json.ts';
import { handleApiRequest } from './handlers/router.ts';
import type { HandlerContext } from './handlers/types.ts';

/**
 * Shared entry for Vercel Functions in /api. Same handlers as the local server.
 * Hosted mode fails closed: with no store or provider configured, AI is unavailable
 * and the game plays Classic. No client-supplied URL or key is ever read here.
 */
const startedAt = Date.now();
let ctx: HandlerContext | null = null;

function getContext(): HandlerContext | null {
  if (ctx) return ctx;
  try {
    ctx = { config: loadServerConfig({ ...process.env, APP_MODE: 'hosted' }), now: Date.now, startedAt };
    return ctx;
  } catch {
    return null;
  }
}

export async function handleHostedRequest(request: Request): Promise<Response> {
  const context = getContext();
  if (!context) return errorResponse('provider_error', 500);
  return handleApiRequest(request, context);
}
