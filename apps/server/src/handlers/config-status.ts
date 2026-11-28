import type { ConfigStatusResponse, Credits } from '@tlh/shared';
import { chatsLeft, readCredits } from '../limits/limits.ts';
import { aiAvailable, loginRequired } from '../services.ts';
import { resolveCaller } from './caller.ts';
import { jsonResponse } from './json.ts';
import type { Handler } from './types.ts';

/**
 * GET /api/config/status
 * Never includes keys, base URLs or passphrases. In hosted mode the provider is not disclosed.
 * Hosted fails closed: if the store cannot be read, AI is reported unavailable.
 */
export const configStatusHandler: Handler = async (request, ctx) => {
  const { appMode, llm } = ctx.config;
  const { services } = ctx;
  let available = aiAvailable(ctx.config, services);
  const needLogin = loginRequired(ctx.config, services);
  const who = resolveCaller(request, ctx);
  let credits: Credits | null = null;
  const session: ConfigStatusResponse['session'] = { active: false };
  if (available && services.store) {
    try {
      credits = await readCredits(services.store, services.limits);
      if (who.ok) {
        session.active = needLogin;
        if (who.session) session.expiresAt = new Date(who.session.exp).toISOString();
        session.chatsRemaining = await chatsLeft(services.store, services.limits, who.caller);
      }
    } catch {
      available = false; // fail closed
      credits = null;
      session.active = false;
      delete session.chatsRemaining;
      delete session.expiresAt;
    }
  }
  const body: ConfigStatusResponse = {
    mode: appMode,
    aiAvailable: available,
    provider: appMode === 'local' && available && services.llm ? { protocol: services.llm.protocol, model: llm.model || services.llm.model } : null,
    loginRequired: needLogin,
    session,
    credits,
  };
  return jsonResponse(body);
};
