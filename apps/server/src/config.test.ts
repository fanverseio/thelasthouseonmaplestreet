import { describe, expect, it } from 'vitest';
import { ConfigError, isLlmConfigured, loadServerConfig } from './config.ts';

describe('loadServerConfig', () => {
  it('defaults to local mode on port 3000 with no LLM', () => {
    const config = loadServerConfig({});
    expect(config.appMode).toBe('local');
    expect(config.port).toBe(3000);
    expect(config.host).toBe('127.0.0.1');
    expect(config.llm.protocol).toBeNull();
    expect(isLlmConfigured(config.llm)).toBe(false);
  });

  it('reads PORT and APP_MODE', () => {
    const config = loadServerConfig({ PORT: '4100', APP_MODE: 'hosted' });
    expect(config.port).toBe(4100);
    expect(config.appMode).toBe('hosted');
  });

  it.each([{ PORT: '0' }, { PORT: '70000' }, { PORT: 'abc' }, { APP_MODE: 'prod' }, { LLM_PROTOCOL: 'gemini' }])(
    'rejects invalid config %j',
    (env) => {
      expect(() => loadServerConfig(env)).toThrow(ConfigError);
    },
  );

  it('treats mock as configured without a key or model', () => {
    const config = loadServerConfig({ LLM_PROTOCOL: 'mock' });
    expect(config.llm.model).toBe('mock');
    expect(isLlmConfigured(config.llm)).toBe(true);
  });

  it('needs base URL, model and key for real providers', () => {
    const partial = loadServerConfig({ LLM_PROTOCOL: 'openai', LLM_MODEL: 'm' });
    expect(isLlmConfigured(partial.llm)).toBe(false);
    const full = loadServerConfig({
      LLM_PROTOCOL: 'openai',
      LLM_BASE_URL: 'https://api.example.com',
      LLM_MODEL: 'm',
      LLM_API_KEY: 'test-value',
    });
    expect(isLlmConfigured(full.llm)).toBe(true);
  });

  it('does not keep the API key value in the config object', () => {
    const config = loadServerConfig({ LLM_PROTOCOL: 'openai', LLM_API_KEY: 'do-not-store-me' });
    expect(JSON.stringify(config)).not.toContain('do-not-store-me');
  });
});
