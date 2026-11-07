import { AppModeSchema, DEFAULT_API_PORT, LlmProtocolSchema, type AppMode, type LlmProtocol } from '@tlh/shared';

/**
 * Server configuration read from environment variables.
 * The API key itself is not kept here: only whether one is present.
 * Real provider calls arrive in tasks.md section 7.
 */
export interface ServerConfig {
  appMode: AppMode;
  host: string;
  port: number;
  llm: {
    protocol: LlmProtocol | null;
    model: string;
    hasBaseUrl: boolean;
    hasKey: boolean;
  };
}

type Env = Record<string, string | undefined>;

export class ConfigError extends Error {
  override name = 'ConfigError';
}

function readPort(env: Env): number {
  const raw = env.PORT?.trim();
  if (!raw) return DEFAULT_API_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError(`PORT must be a whole number from 1 to 65535 (got "${raw}").`);
  }
  return port;
}

export function loadServerConfig(env: Env): ServerConfig {
  const modeRaw = env.APP_MODE?.trim() || 'local';
  const mode = AppModeSchema.safeParse(modeRaw);
  if (!mode.success) throw new ConfigError(`APP_MODE must be "local" or "hosted" (got "${modeRaw}").`);

  const protocolRaw = env.LLM_PROTOCOL?.trim();
  let protocol: LlmProtocol | null = null;
  if (protocolRaw) {
    const parsed = LlmProtocolSchema.safeParse(protocolRaw);
    if (!parsed.success) {
      throw new ConfigError(`LLM_PROTOCOL must be "openai", "anthropic" or "mock" (got "${protocolRaw}").`);
    }
    protocol = parsed.data;
  }

  return {
    appMode: mode.data,
    host: '127.0.0.1',
    port: readPort(env),
    llm: {
      protocol,
      model: env.LLM_MODEL?.trim() || (protocol === 'mock' ? 'mock' : ''),
      hasBaseUrl: Boolean(env.LLM_BASE_URL?.trim()),
      hasKey: Boolean(env.LLM_API_KEY?.trim()),
    },
  };
}

/** True when the configured provider has everything it needs to answer. */
export function isLlmConfigured(llm: ServerConfig['llm']): boolean {
  if (llm.protocol === 'mock') return true;
  if (llm.protocol === null) return false;
  return llm.hasBaseUrl && llm.hasKey && llm.model.length > 0;
}
