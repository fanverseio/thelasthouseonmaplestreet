import { LlmProtocolSchema } from '@tlh/shared';
import type { z } from 'zod';
import { createAnthropicAdapter } from './anthropic.ts';
import { createMockAdapter } from './mock.ts';
import { createOpenAiAdapter } from './openai.ts';
import { LlmError, type LlmAdapter, type LlmMessage, type LlmUsage } from './types.ts';

export { LlmError, type LlmAdapter } from './types.ts';

export const LLM_TIMEOUT_MS = 8000;
/** A repair retry only starts if at least this much of the 8 s budget is left. */
const REPAIR_MIN_MS = 2500;

type Env = Record<string, string | undefined>;

/**
 * Build the provider adapter from LLM_* env vars. The key lives only inside the adapter's closure.
 * Returns null when no usable provider is configured.
 */
export function createAdapterFromEnv(env: Env, fetchFn: typeof fetch = fetch): LlmAdapter | null {
  const protocol = LlmProtocolSchema.safeParse(env.LLM_PROTOCOL?.trim());
  if (!protocol.success) return null;
  if (protocol.data === 'mock') return createMockAdapter();
  const baseUrl = env.LLM_BASE_URL?.trim() ?? '';
  const model = env.LLM_MODEL?.trim() ?? '';
  const apiKey = env.LLM_API_KEY?.trim() ?? '';
  if (!baseUrl || !model || !apiKey) return null;
  const config = { protocol: protocol.data, baseUrl, model, apiKey };
  return protocol.data === 'openai' ? createOpenAiAdapter(config, fetchFn) : createAnthropicAdapter(config, fetchFn);
}

export interface StructuredResult<T> {
  value: T;
  usage: LlmUsage;
  repaired: boolean;
}

const addUsage = (a: LlmUsage, b: LlmUsage): LlmUsage => ({
  inputTokens: a.inputTokens + b.inputTokens,
  outputTokens: a.outputTokens + b.outputTokens,
});

/**
 * One completion validated with zod, with one repair retry if time allows. Total time is capped at 8 s.
 * Throws LlmError (kind invalid after a failed repair). `usage` on the error holds what was spent.
 */
export async function completeStructured<S extends z.ZodType>(
  adapter: LlmAdapter,
  input: { system: string; messages: LlmMessage[]; schema: Record<string, unknown>; maxTokens: number },
  outputSchema: S,
  options: { timeoutMs?: number; now?: () => number } = {},
): Promise<StructuredResult<z.infer<S>>> {
  const timeoutMs = options.timeoutMs ?? LLM_TIMEOUT_MS;
  const now = options.now ?? Date.now;
  const started = now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let usage: LlmUsage = { inputTokens: 0, outputTokens: 0 };
  try {
    const first = await adapter.complete({ ...input, signal: controller.signal });
    usage = first.usage;
    const parsed = outputSchema.safeParse(first.output);
    if (parsed.success) return { value: parsed.data, usage, repaired: false };
    if (timeoutMs - (now() - started) < REPAIR_MIN_MS) throw new LlmError('invalid', undefined, usage);
    const issues = parsed.error.issues.slice(0, 4).map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
    const repair = await adapter.complete({
      ...input,
      messages: [
        ...input.messages,
        { role: 'assistant', content: JSON.stringify(first.output ?? null).slice(0, 1500) },
        { role: 'user', content: `That JSON did not match the schema (${issues}). Reply with corrected JSON only.` },
      ],
      signal: controller.signal,
    });
    usage = addUsage(usage, repair.usage);
    const again = outputSchema.safeParse(repair.output);
    if (again.success) return { value: again.data, usage, repaired: true };
    throw new LlmError('invalid', undefined, usage);
  } catch (error) {
    if (error instanceof LlmError) {
      if (error.usage.inputTokens + error.usage.outputTokens < usage.inputTokens + usage.outputTokens) error.usage = usage;
      throw error;
    }
    throw new LlmError(controller.signal.aborted ? 'timeout' : 'provider_error', undefined, usage);
  } finally {
    clearTimeout(timer);
  }
}
