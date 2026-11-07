import { configStatusHandler } from './config-status.ts';
import { healthHandler } from './health.ts';
import { errorResponse } from './json.ts';
import type { Handler, HandlerContext } from './types.ts';

type Method = 'GET' | 'POST' | 'DELETE';

/** Route table. New endpoints from docs/contracts.md section 7 are added here. */
const ROUTES: Record<string, Partial<Record<Method, Handler>>> = {
  '/api/health': { GET: healthHandler },
  '/api/config/status': { GET: configStatusHandler },
};

export async function handleApiRequest(request: Request, ctx: HandlerContext): Promise<Response> {
  const { pathname } = new URL(request.url);
  const route = ROUTES[pathname];
  if (!route) return errorResponse('not_found', 404);

  const handler = route[request.method as Method];
  if (!handler) {
    const response = errorResponse('bad_request', 405);
    response.headers.set('allow', Object.keys(route).join(', '));
    return response;
  }

  try {
    return await handler(request, ctx);
  } catch {
    // Never echo internal details (they could include configuration).
    return errorResponse('provider_error', 500);
  }
}
