import { AccessRedeemRequestSchema } from '@tlh/shared';
import { clientIp, encodeSession, matchAccount, newSessionId, sessionCookie } from '../access/access.ts';
import { chatsLeft } from '../limits/limits.ts';
import { aiAvailable, loginRequired } from '../services.ts';
import { errorResponse, jsonResponse } from './json.ts';
import type { Handler } from './types.ts';

/** Failed logins allowed per IP per 10 minutes before 429. */
export const REDEEM_MAX_FAILURES = 5;
const WINDOW_SEC = 600;

/**
 * POST /api/access/redeem { passphrase1, passphrase2 }
 * Both must match one account (constant-time). Success sets the signed HttpOnly session cookie.
 * The passphrases are never logged or echoed.
 */
export const accessRedeemHandler: Handler = async (request, ctx) => {
  const { services, config } = ctx;
  const started = ctx.now();
  const done = (response: Response, error?: string) => {
    services.log({ route: 'access/redeem', status: response.status, ms: ctx.now() - started, ...(error ? { error } : {}) });
    return response;
  };
  if (!loginRequired(config, services)) return done(errorResponse('not_found', 404), 'not_found');
  if (!aiAvailable(config, services) || !services.store || !services.sessionSecret) {
    return done(errorResponse('not_configured', 503, 'classic'), 'not_configured');
  }
  const ip = clientIp(request);
  const failKey = `redeem:fail:${ip}:${Math.floor(started / (WINDOW_SEC * 1000))}`;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return done(errorResponse('bad_request', 400), 'bad_request');
  }
  const parsed = AccessRedeemRequestSchema.safeParse(body);
  if (!parsed.success) return done(errorResponse('bad_request', 400), 'bad_request');
  try {
    if ((await services.store.get(failKey)) >= REDEEM_MAX_FAILURES) {
      return done(errorResponse('rate_limited', 429, 'classic', WINDOW_SEC), 'rate_limited');
    }
    const label = matchAccount(services.accounts, parsed.data.passphrase1, parsed.data.passphrase2);
    if (!label) {
      await services.store.incr(failKey, 1, WINDOW_SEC);
      return done(errorResponse('access_invalid', 401, 'classic'), 'access_invalid');
    }
    const exp = started + services.sessionTtlSec * 1000;
    const sid = newSessionId();
    const cookie = sessionCookie(encodeSession({ sid, label, exp }, services.sessionSecret), services.sessionTtlSec, config.appMode === 'hosted');
    const chatsRemaining = await chatsLeft(services.store, services.limits, { label, sessionId: sid, ip });
    const response = jsonResponse({ expiresAt: new Date(exp).toISOString(), chatsRemaining }, 200, { 'set-cookie': cookie });
    services.log({ route: 'access/redeem', status: 200, ms: ctx.now() - started, label });
    return response;
  } catch {
    return done(errorResponse('not_configured', 503, 'classic'), 'store_unavailable'); // fail closed
  }
};

/** DELETE /api/access/redeem: log out (clears the cookie). */
export const accessLogoutHandler: Handler = (_request, ctx) =>
  jsonResponse({ ok: true }, 200, { 'set-cookie': sessionCookie('', 0, ctx.config.appMode === 'hosted') });
