import type { LlmProtocol } from '@tlh/shared';

/** Provider settings. Built from env (or local server memory) only; never from a client request. */
export interface LlmConfig {
  protocol: LlmProtocol;
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  /** JSON Schema of the wanted output (used for tool calling). */
  schema: Record<string, unknown>;
  maxTokens: number;
  signal: AbortSignal;
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LlmResult {
  /** Parsed JSON value (not yet validated against the app schema). */
  output: unknown;
  usage: LlmUsage;
}

/** Structured-output step that worked: tool call, JSON mode (openai only) or plain JSON in text. */
export type OutputStep = 'tool' | 'json_mode' | 'plain';

export interface LlmAdapter {
  readonly protocol: LlmProtocol;
  readonly model: string;
  complete(request: LlmRequest): Promise<LlmResult>;
}

export const LLM_ERROR_KINDS = ['auth', 'quota', 'timeout', 'refused', 'invalid', 'provider_error'] as const;
export type LlmErrorKind = (typeof LLM_ERROR_KINDS)[number];

/** A classified provider failure. The message never contains the key, base URL or response body. */
export class LlmError extends Error {
  override name = 'LlmError';
  readonly kind: LlmErrorKind;
  /** HTTP status from the provider, when there was one. */
  readonly status: number | undefined;
  /** Partial usage, when the provider reported it before failing. */
  usage: LlmUsage;
  constructor(kind: LlmErrorKind, status?: number, usage: LlmUsage = { inputTokens: 0, outputTokens: 0 }) {
    super(status === undefined ? kind : `${kind} (HTTP ${status})`);
    this.kind = kind;
    this.status = status;
    this.usage = usage;
  }
}

/** Map a provider HTTP status to an error kind. 400/404/422 mean "this request shape is not supported". */
export function classifyStatus(status: number): LlmErrorKind {
  if (status === 401 || status === 403) return 'auth';
  if (status === 402 || status === 429) return 'quota';
  if (status === 408 || status === 504) return 'timeout';
  return 'provider_error';
}

/** True for statuses where trying the next structured-output step makes sense. */
export function isShapeRejection(status: number): boolean {
  return status === 400 || status === 404 || status === 415 || status === 422;
}
