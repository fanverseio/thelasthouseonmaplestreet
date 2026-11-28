import { extractJsonObject, failFor, isOk, joinUrl, num, postJson } from './http.ts';
import { isShapeRejection, LlmError, type LlmAdapter, type LlmConfig, type LlmRequest, type LlmResult, type OutputStep } from './types.ts';

const TOOL_NAME = 'angel_reply';

interface ContentBlock {
  type?: string;
  text?: string;
  name?: string;
  input?: unknown;
}

/** `{base}/v1/messages`, or `{base}/messages` when the base already ends in /v1. */
export function anthropicMessagesUrl(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return /\/v1$/.test(base) ? joinUrl(base, 'messages') : joinUrl(base, 'v1/messages');
}

/** Anthropic Messages format. Chain: tool use -> plain text with a JSON object in it. */
export function createAnthropicAdapter(config: LlmConfig, fetchFn: typeof fetch = fetch): LlmAdapter & { readonly step: OutputStep } {
  const steps: OutputStep[] = ['tool', 'plain'];
  let first = 0;
  const url = anthropicMessagesUrl(config.baseUrl);
  const headers = { 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' };

  async function attempt(step: OutputStep, req: LlmRequest): Promise<{ status: number; result?: LlmResult }> {
    const payload: Record<string, unknown> = {
      model: config.model,
      max_tokens: req.maxTokens,
      system: req.system,
      messages: req.messages,
    };
    if (step === 'tool') {
      payload.tools = [{ name: TOOL_NAME, description: 'Reply as the Angel.', input_schema: req.schema }];
      payload.tool_choice = { type: 'tool', name: TOOL_NAME };
    }
    const { status, body } = await postJson(fetchFn, url, headers, payload, req.signal);
    if (!isOk(status)) return { status };
    const b = (body ?? {}) as { content?: ContentBlock[]; stop_reason?: string; usage?: { input_tokens?: unknown; output_tokens?: unknown } };
    const usage = { inputTokens: num(b.usage?.input_tokens), outputTokens: num(b.usage?.output_tokens) };
    if (b.stop_reason === 'refusal') throw new LlmError('refused', undefined, usage);
    const blocks = Array.isArray(b.content) ? b.content : [];
    const tool = blocks.find((c) => c.type === 'tool_use');
    let output: unknown = tool?.input;
    const text = blocks.filter((c) => c.type === 'text' && typeof c.text === 'string').map((c) => c.text).join('\n');
    if (output === undefined && text) output = extractJsonObject(text);
    if (output === undefined) {
      if (!text) throw new LlmError('refused', undefined, usage);
      output = { unparsed: text.slice(0, 600) }; // the caller's repair retry sees it
    }
    return { status, result: { output, usage } };
  }

  return {
    protocol: 'anthropic',
    model: config.model,
    get step() {
      return steps[first]!;
    },
    async complete(req) {
      let lastStatus = 400;
      for (let i = first; i < steps.length; i++) {
        const { status, result } = await attempt(steps[i]!, req);
        if (result) {
          first = i;
          return result;
        }
        lastStatus = status;
        if (!isShapeRejection(status)) failFor(status);
      }
      failFor(lastStatus);
    },
  };
}
