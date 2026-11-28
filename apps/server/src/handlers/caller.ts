import { clientIp, decodeSession, readCookie, SESSION_COOKIE, type Session } from '../access/access.ts';
import type { Caller } from '../limits/limits.ts';
import { loginRequired } from '../services.ts';
import type { HandlerContext } from './types.ts';

export type CallerResult = { ok: true; caller: Caller; session: Session | null } | { ok: false; error: 'access_invalid' | 'session_expired' };

/** Who is calling: the signed session when a login is required, otherwise the local caller. */
export function resolveCaller(request: Request, ctx: HandlerContext): CallerResult {
  const ip = clientIp(request);
  const { services } = ctx;
  if (!loginRequired(ctx.config, services)) return { ok: true, caller: { label: 'local', sessionId: 'local', ip }, session: null };
  if (!services.sessionSecret) return { ok: false, error: 'access_invalid' };
  const check = decodeSession(readCookie(request.headers.get('cookie'), SESSION_COOKIE), services.sessionSecret, ctx.now());
  if (!check.ok) return check;
  // A label removed from the env since login no longer works.
  if (!services.accounts.some((a) => a.label === check.session.label)) return { ok: false, error: 'access_invalid' };
  return { ok: true, caller: { label: check.session.label, sessionId: check.session.sid, ip }, session: check.session };
}
