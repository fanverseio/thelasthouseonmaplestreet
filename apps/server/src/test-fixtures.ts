import type { AngelChatRequest } from '@tlh/shared';
import { loadServerConfig } from './config.ts';
import type { HandlerContext } from './handlers/types.ts';
import { createServices, type LogEntry } from './services.ts';

/** Shared test helpers (imported by *.test.ts only). */
export function chatRequest(playerText: string, extra: Partial<AngelChatRequest> = {}): AngelChatRequest {
  return {
    playerText,
    snapshot: {
      zone: 'street',
      beat: 3,
      objective: 'Find Felix',
      knowledgeLevel: 1,
      flags: ['locket_taken', 'angel_awake', 'home_done', 'seq1_done', 'seq2_done', 'spell_bolt'],
      cluesFound: [],
      moralityBand: 'neutral',
      hp: 100,
      magic: 40,
      spellsUnlocked: ['arcane_bolt'],
      carried: [],
      nearby: [],
      sideQuest: { active: null, offered: 0 },
      inEncounter: false,
    },
    summary: 'Elena left home and saw Felix beneath the streetlight.',
    recent: [],
    actions: [
      { type: 'flicker_lights', validTargets: ['light.street.03'], note: 'street lamps' },
      { type: 'restore_magic', validTargets: [], note: 'magic is low' },
    ],
    ...extra,
  };
}

export const offlineFetch = (async () => {
  throw new Error('offline');
}) as unknown as typeof fetch;

export function makeCtx(env: Record<string, string>, opts: { fetchFn?: typeof fetch; now?: () => number } = {}) {
  const logs: LogEntry[] = [];
  const config = loadServerConfig(env);
  const services = createServices(env, config, opts.fetchFn ?? offlineFetch, (e) => logs.push(e));
  const ctx: HandlerContext = { config, services, now: opts.now ?? Date.now, startedAt: 0 };
  return { ctx, logs };
}

export const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://127.0.0.1:3000${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

export const get = (path: string, headers: Record<string, string> = {}) => new Request(`http://127.0.0.1:3000${path}`, { headers });

/** A fetch that answers from a function of (url, parsed body); records every call. */
export function scriptedFetch(answer: (url: string, body: Record<string, unknown>, headers: Record<string, string>) => { status: number; json: unknown }) {
  const calls: { url: string; body: Record<string, unknown>; headers: Record<string, string> }[] = [];
  const fn = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    const headers = Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>));
    calls.push({ url, body, headers });
    const r = answer(url, body, headers);
    return new Response(JSON.stringify(r.json), { status: r.status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
  return { fn, calls };
}
