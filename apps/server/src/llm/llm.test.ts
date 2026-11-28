import { AngelModelOutputSchema } from '../shared.ts';
import { describe, expect, it } from 'vitest';
import { ANGEL_OUTPUT_JSON_SCHEMA, buildAngelPrompt } from '../angel/prompt.ts';
import { chatRequest, scriptedFetch } from '../test-fixtures.ts';
import { anthropicMessagesUrl, createAnthropicAdapter } from './anthropic.ts';
import { extractJsonObject } from './http.ts';
import { completeStructured, createAdapterFromEnv, LlmError } from './index.ts';
import { createMockAdapter } from './mock.ts';
import { createOpenAiAdapter } from './openai.ts';

// Built from parts so the repo secret scan does not flag a fake key.
const KEY = ['sk', 'test', '0123456789abcdef0123456789'].join('-');
const cfg = (protocol: 'openai' | 'anthropic', baseUrl = 'https://llm.example/v1') => ({ protocol, baseUrl, model: 'm', apiKey: KEY });
const input = () => {
  const p = buildAngelPrompt(chatRequest('hello'));
  return { ...p, schema: ANGEL_OUTPUT_JSON_SCHEMA, maxTokens: 250 };
};
const reply = { speech: 'Hush, child.', tone: 'wry' };
const openaiTool = (args: unknown) => ({
  status: 200,
  json: { choices: [{ message: { tool_calls: [{ function: { name: 'angel_reply', arguments: JSON.stringify(args) } }] } }], usage: { prompt_tokens: 100, completion_tokens: 20 } },
});
const kindOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return e instanceof LlmError ? e.kind : 'other';
  }
};

describe('openai adapter', () => {
  it('uses tool calling first and reports usage', async () => {
    const f = scriptedFetch(() => openaiTool(reply));
    const r = await completeStructured(createOpenAiAdapter(cfg('openai'), f.fn), input(), AngelModelOutputSchema);
    expect(r.value.speech).toBe('Hush, child.');
    expect(r.usage).toEqual({ inputTokens: 100, outputTokens: 20 });
    expect(f.calls[0]!.url).toBe('https://llm.example/v1/chat/completions');
    expect(f.calls[0]!.headers.authorization).toBe(`Bearer ${KEY}`);
    expect(f.calls[0]!.body.tools).toBeDefined();
  });

  it('falls back tool -> json_mode -> plain and remembers the step', async () => {
    const f = scriptedFetch((_u, body) => {
      if (body.tools) return { status: 400, json: { error: 'tools unsupported' } };
      if (body.response_format) return { status: 422, json: {} };
      return { status: 200, json: { choices: [{ message: { content: 'Sure! ```json\n{"speech":"Plain.","tone":"cold"}\n```' } }] } };
    });
    const adapter = createOpenAiAdapter(cfg('openai'), f.fn);
    const r = await completeStructured(adapter, input(), AngelModelOutputSchema);
    expect(r.value.speech).toBe('Plain.');
    expect(f.calls).toHaveLength(3);
    expect(adapter.step).toBe('plain');
    await completeStructured(adapter, input(), AngelModelOutputSchema);
    expect(f.calls).toHaveLength(4); // went straight to plain
  });

  it('classifies 401 as auth, 429 as quota, 500 as provider_error, network as provider_error', async () => {
    for (const [status, kind] of [
      [401, 'auth'],
      [429, 'quota'],
      [500, 'provider_error'],
    ] as const) {
      const f = scriptedFetch(() => ({ status, json: { error: { message: `bad key ${KEY}` } } }));
      const p = completeStructured(createOpenAiAdapter(cfg('openai'), f.fn), input(), AngelModelOutputSchema);
      expect(await kindOf(p)).toBe(kind);
    }
    const down = (async () => {
      throw new Error('ECONNREFUSED https://llm.example');
    }) as unknown as typeof fetch;
    expect(await kindOf(completeStructured(createOpenAiAdapter(cfg('openai'), down), input(), AngelModelOutputSchema))).toBe('provider_error');
  });

  it('error messages never contain the key or base URL', async () => {
    const f = scriptedFetch(() => ({ status: 401, json: { error: KEY } }));
    try {
      await completeStructured(createOpenAiAdapter(cfg('openai'), f.fn), input(), AngelModelOutputSchema);
    } catch (e) {
      const text = `${String(e)} ${JSON.stringify(e)} ${(e as Error).stack ?? ''}`;
      expect(text).not.toContain(KEY);
      expect(text).not.toContain('llm.example');
    }
  });

  it('maps content_filter to refused', async () => {
    const f = scriptedFetch(() => ({ status: 200, json: { choices: [{ finish_reason: 'content_filter', message: { content: '' } }] } }));
    expect(await kindOf(completeStructured(createOpenAiAdapter(cfg('openai'), f.fn), input(), AngelModelOutputSchema))).toBe('refused');
  });

  it('repairs once, then gives up with invalid', async () => {
    let n = 0;
    const good = scriptedFetch(() => (n++ === 0 ? openaiTool({ words: 1 }) : openaiTool(reply)));
    const r = await completeStructured(createOpenAiAdapter(cfg('openai'), good.fn), input(), AngelModelOutputSchema);
    expect(r.repaired).toBe(true);
    expect(r.usage.inputTokens).toBe(200);
    const bad = scriptedFetch(() => openaiTool({ words: 1 }));
    expect(await kindOf(completeStructured(createOpenAiAdapter(cfg('openai'), bad.fn), input(), AngelModelOutputSchema))).toBe('invalid');
    expect(bad.calls).toHaveLength(2);
  });

  it('times out at the deadline', async () => {
    const hang = ((_u: string, init: RequestInit) =>
      new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(new Error('aborted'))))) as unknown as typeof fetch;
    const p = completeStructured(createOpenAiAdapter(cfg('openai'), hang), input(), AngelModelOutputSchema, { timeoutMs: 50 });
    expect(await kindOf(p)).toBe('timeout');
  });
});

describe('anthropic adapter', () => {
  it('builds the messages URL with or without /v1', () => {
    expect(anthropicMessagesUrl('https://a.example')).toBe('https://a.example/v1/messages');
    expect(anthropicMessagesUrl('https://a.example/anthropic/v1/')).toBe('https://a.example/anthropic/v1/messages');
  });

  it('uses tool_use, then plain text', async () => {
    const f = scriptedFetch((_u, body) =>
      body.tools
        ? { status: 200, json: { content: [{ type: 'tool_use', name: 'angel_reply', input: reply }], usage: { input_tokens: 9, output_tokens: 3 } } }
        : { status: 500, json: {} },
    );
    const r = await completeStructured(createAnthropicAdapter(cfg('anthropic', 'https://a.example'), f.fn), input(), AngelModelOutputSchema);
    expect(r.value.speech).toBe('Hush, child.');
    expect(f.calls[0]!.headers['x-api-key']).toBe(KEY);
    expect(r.usage).toEqual({ inputTokens: 9, outputTokens: 3 });
    const plain = scriptedFetch((_u, body) =>
      body.tools ? { status: 400, json: {} } : { status: 200, json: { content: [{ type: 'text', text: '{"speech":"Text.","tone":"warm"}' }] } },
    );
    const r2 = await completeStructured(createAnthropicAdapter(cfg('anthropic'), plain.fn), input(), AngelModelOutputSchema);
    expect(r2.value.speech).toBe('Text.');
  });
});

describe('adapter factory and mock', () => {
  it('needs base URL, model and key for real protocols', () => {
    expect(createAdapterFromEnv({ LLM_PROTOCOL: 'openai', LLM_MODEL: 'm' })).toBeNull();
    expect(createAdapterFromEnv({ LLM_PROTOCOL: 'mock' })?.protocol).toBe('mock');
    expect(createAdapterFromEnv({})).toBeNull();
  });

  it('mock proposes a flicker on a listed target and obeys failure hooks', async () => {
    const mock = createMockAdapter();
    const p = buildAngelPrompt(chatRequest('make the lights flicker'));
    const r = await completeStructured(mock, { ...p, schema: {}, maxTokens: 250 }, AngelModelOutputSchema);
    expect(r.value.proposedActions).toEqual([{ type: 'flicker_lights', targetId: 'light.street.03' }]);
    const err = buildAngelPrompt(chatRequest('[[mock:error]]'));
    expect(await kindOf(completeStructured(mock, { ...err, schema: {}, maxTokens: 250 }, AngelModelOutputSchema))).toBe('provider_error');
  });

  it('extracts the first JSON object from chatter', () => {
    expect(extractJsonObject('x {"a":{"b":"}"}} y {"c":1}')).toEqual({ a: { b: '}' } });
    expect(extractJsonObject('no json')).toBeUndefined();
  });
});
