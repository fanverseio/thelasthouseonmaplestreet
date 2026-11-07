import type { ApiError, ErrorCode } from '@tlh/shared';

const BASE_HEADERS: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, ...headers } });
}

export function errorResponse(
  error: ErrorCode,
  status: number,
  fallback: ApiError['fallback'] = 'none',
  retryAfterSec?: number,
): Response {
  const body: ApiError = retryAfterSec === undefined ? { error, fallback } : { error, fallback, retryAfterSec };
  const headers: Record<string, string> = retryAfterSec === undefined ? {} : { 'retry-after': String(retryAfterSec) };
  return jsonResponse(body, status, headers);
}
