import { extractJsonObject, failFor, isOk, joinUrl, num, parseArgs, postJson } from './http.ts';
import { isShapeRejection, LlmError, type LlmAdapter, type LlmConfig, type LlmRequest, type LlmResult, type OutputStep } from './types.ts';

const TOOL_NAME = 'angel_reply';

interface ChatChoice {
  finish_reason?: string;
  message?: { content?: string | null; refusal?: string | null; tool_calls?: { function?: { name?: string; arguments?: unknown } }[] };
}

/**
 * OpenAI Chat Completions format (works with DeepSeek, xAI, MiniMax and other compatible APIs).
 * Chain: tool call -> response_format json_object -> plain text with a JSON object in it.
 * The step that worked is remembered per adapter (one per process), so failing steps are skipped next time.
 */
export function createOpenAiAdapter(config: LlmConfig, fetchFn: typeof fetch = fetch): LlmAdapter & { readonly step: OutputStep } {
  const steps: OutputStep[] = ['tool', 'json_mode', 'plain'];
  let first = 0;
  const url = joinUrl(config.baseUrl, 'chat/completions');
  const headers = { authorization: `Bearer ${config.apiKey}` };

  async function attempt(step: OutputStep, req: LlmRequest): Promise<{ status: number; result?: LlmResult }> {
    const payload: Record<string, unknown> = {
      model: config.model,
      max_tokens: req.maxTokens,
      temperature: 0.8,
      messages: [{ role: 'system', content: req.system }, ...req.messages],
    };
    if (step === 'tool') {
      payload.tools = [{ type: 'function', function: { name: TOOL_NAME, description: 'Reply as the Angel.', parameters: req.schema } }];
      payload.tool_choice = { type: 'function', function: { name: TOOL_NAME } };
    } else if (step === 'json_mode') {
      payload.response_format = { type: 'json_object' };
    }
    const { status, body } = await postJson(fetchFn, url, headers, payload, req.signal);
    if (!isOk(status)) return { status };
    const b = (body ?? {}) as { choices?: ChatChoice[]; usage?: { prompt_tokens?: unknown; completion_tokens?: unknown } };
    const usage = { inputTokens: num(b.usage?.prompt_tokens), outputTokens: num(b.usage?.completion_tokens) };
    const choice = b.choices?.[0];
    const message = choice?.message;
    if (choice?.finish_reason === 'content_filter' || message?.refusal) throw new LlmError('refused', undefined, usage);
    const call = message?.tool_calls?.find((c) => c.function?.name === TOOL_NAME) ?? message?.tool_calls?.[0];
    let output = call?.function ? parseArgs(call.function.arguments) : undefined;
    if (output === undefined && typeof message?.content === 'string') output = extractJsonObject(message.content);
    if (output === undefined) {
      if (!message?.content && !call) throw new LlmError('refused', undefined, usage);
      // Unparseable (often cut off at max_tokens): let the caller's repair retry see it.
      output = { unparsed: String(message?.content ?? '').slice(0, 600) };
    }
    return { status, result: { output, usage } };
  }

  return {
    protocol: 'openai',
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
