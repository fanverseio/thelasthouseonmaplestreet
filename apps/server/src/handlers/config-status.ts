import type { ConfigStatusResponse } from '@tlh/shared';
import { isLlmConfigured } from '../config.ts';
import { jsonResponse } from './json.ts';
import type { Handler } from './types.ts';

/**
 * GET /api/config/status
 * Never includes keys or base URLs. In hosted mode the provider is not disclosed.
 * Hosted sessions arrive in tasks.md section 8; until then `session.active` is false.
 */
export const configStatusHandler: Handler = (_request, ctx) => {
  const { appMode, llm } = ctx.config;
  const available = isLlmConfigured(llm);
  const body: ConfigStatusResponse = {
    mode: appMode,
    aiAvailable: available,
    provider: appMode === 'local' && available && llm.protocol ? { protocol: llm.protocol, model: llm.model } : null,
    session: { active: false },
  };
  return jsonResponse(body);
};
