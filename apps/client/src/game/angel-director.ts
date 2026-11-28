/**
 * Angel Director (AI mode). Headless: sends chat requests through an injected transport, maps errors to
 * aiStatus (docs/contracts.md section 3), falls back to authored Classic lines on any failure, queues validated
 * world actions and applies them through the restricted AngelEffectApi when the locket closes.
 * Nothing here writes a progression flag, morality, items or gates.
 */
import {
  MAX_EVENT_LOG,
  type AiStatus,
  type AngelChatRequest,
  type AngelChatResponse,
  type AngelWorldAction,
  type Credits,
  type ErrorCode,
  type RejectionReason,
} from '@tlh/shared';
import type { GameStore } from '../store/game-store.ts';
import { buildSummary, pushTurns } from './angel-memory.ts';
import { describeActions, recordUse, validateAction, validateProposal, type ValidationContext } from './angel-validator.ts';
import type { AngelEffectApi } from './world-effects.ts';

export type ChatResult = { ok: true; body: AngelChatResponse } | { ok: false; error: ErrorCode | 'network'; retryAfterSec?: number; status?: number };
export type ChatTransport = (request: AngelChatRequest) => Promise<ChatResult>;

/** Stock lines (angel-persona.md section 6). */
export const STOCK_LINES = {
  refuse: 'Some things I won\'t say, even to you.',
  timeout: 'The silver\'s gone cold for a moment. Ask me again.',
  degraded: 'Something is crowding my voice. I\'ll speak plainly for now.',
  budget: 'I\'ve spent too much of myself tonight. I\'ll still whisper, but only what I already know.',
  invalid: 'Hm. I lost the thread. Try me again.',
  busy: 'One question at a time, child. I\'m old.',
  restored: 'Ah. Warm again. Where were we?',
  locked: 'The silver will not answer a stranger. Say the words first.',
} as const;

/** Backoff after a degraded failure: 5 s, 15 s, 45 s, then every 2 minutes. */
export const BACKOFF_MS = [5000, 15000, 45000, 120000] as const;

export interface AngelReply {
  speech: string;
  /** ai = the model spoke; stock = an in-character stock line; classic = an authored Classic line (locket dims). */
  source: 'ai' | 'stock' | 'classic';
  status: AiStatus;
  queued: AngelWorldAction[];
  rejected: RejectionReason[];
}

export interface DirectorOptions {
  store: GameStore;
  effects: AngelEffectApi;
  transport: ChatTransport;
  /** Live context for validation (zone, position, sim time, owner, registry, placements). */
  context: () => Omit<ValidationContext, 'mode' | 'ledger' | 'flags' | 'entities' | 'magic'>;
  /** Snapshot builder for the request. */
  snapshot: () => AngelChatRequest['snapshot'];
  /** Next authored Classic locket line text, or null. */
  classicLine: () => string | null;
  now?: () => number;
}

export interface AngelDirector {
  send(text: string): Promise<AngelReply>;
  /** Locket closed: re-validate queued actions and apply the ones still valid. Returns what was applied. */
  closeLocket(): AngelWorldAction[];
  /** Credits from /api/config/status or a chat response. */
  setCredits(credits: Credits | null): void;
  readonly credits: Credits | null;
  readonly status: AiStatus;
  /** True after access_invalid / session_expired: the next locket open should offer the login again. */
  readonly needsLogin: boolean;
  setStatus(status: AiStatus): void;
  /** Ask for the login again on the next locket open (or clear that). */
  setNeedsLogin(value: boolean): void;
  readonly pending: readonly AngelWorldAction[];
  /** Last rejections (ring buffer, memory only; for tests). */
  readonly rejections: readonly RejectionReason[];
  subscribe(listener: () => void): () => void;
}

export function createAngelDirector(options: DirectorOptions): AngelDirector {
  const { store, effects, transport } = options;
  const now = options.now ?? Date.now;
  let credits: Credits | null = null;
  let needsLogin = false;
  let failures = 0;
  let retryAt = 0;
  let wasDegraded = false;
  let pending: AngelWorldAction[] = [];
  let rejections: RejectionReason[] = [];
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  const status = (): AiStatus => store.getState().game.aiStatus;
  const setStatus = (s: AiStatus) => {
    if (s === status()) return;
    store.setState((st) => ({ game: { ...st.game, aiStatus: s } }));
    if (s === 'degraded') pending = []; // pending effects are discarded on degrade
    emit();
  };

  const fullContext = (): ValidationContext => {
    const s = store.getState();
    return { ...options.context(), mode: s.game.activeMode, ledger: s.angel.actionLedger, flags: s.progress.flags, entities: s.world.entities, magic: s.player.magic };
  };

  const reject = (reason: RejectionReason) => {
    rejections = [...rejections, reason].slice(-50);
  };

  const classic = (st: AiStatus): AngelReply => ({ speech: options.classicLine() ?? STOCK_LINES.degraded, source: 'classic', status: st, queued: [], rejected: [] });
  const stock = (speech: string): AngelReply => ({ speech, source: 'stock', status: status(), queued: [], rejected: [] });

  function degrade(): AngelReply {
    failures++;
    retryAt = now() + BACKOFF_MS[Math.min(failures - 1, BACKOFF_MS.length - 1)]!;
    wasDegraded = true;
    setStatus('degraded');
    return classic('degraded');
  }

  async function send(text: string): Promise<AngelReply> {
    const playerText = text.trim().slice(0, 300);
    const st = status();
    if (!playerText) return stock(STOCK_LINES.invalid);
    if (st === 'budget_exhausted' || st === 'unavailable') return classic(st);
    if (st === 'degraded' && now() < retryAt) return classic('degraded');

    const s = store.getState();
    const ctx = fullContext();
    const angelActions = s.angel.eventLog.filter((e) => e.t === 'angel_action').map((e) => (e.t === 'angel_action' ? e.type : ''));
    const request: AngelChatRequest = {
      playerText,
      snapshot: options.snapshot(),
      summary: buildSummary(s.progress.flags, angelActions),
      recent: s.angel.recent,
      actions: describeActions(ctx),
      ...(wasDegraded ? { systemNote: 'connection_restored' as const } : {}),
    };
    let result: ChatResult;
    try {
      result = await transport(request);
    } catch {
      result = { ok: false, error: 'network' };
    }

    if (!result.ok) {
      switch (result.error) {
        case 'quota_exhausted':
        case 'ceiling_reached':
          setStatus('budget_exhausted');
          if (result.error === 'ceiling_reached' && credits) credits = { ...credits, remainingPct: 0, remainingUsd: 0 };
          emit();
          return classic('budget_exhausted');
        case 'access_invalid':
        case 'session_expired':
        case 'not_configured':
        case 'auth':
          needsLogin = result.error === 'access_invalid' || result.error === 'session_expired';
          setStatus('unavailable');
          return classic('unavailable');
        case 'rate_limited':
        case 'concurrency_limited':
          return stock(STOCK_LINES.busy);
        case 'refused':
          return stock(STOCK_LINES.refuse);
        case 'invalid':
        case 'bad_request':
          return stock(STOCK_LINES.invalid);
        default:
          return degrade(); // timeout, provider_error, quota (provider), network
      }
    }

    // Success: recovered if we were degraded.
    failures = 0;
    wasDegraded = false;
    setStatus('ready');
    if (result.body.usage.credits) credits = result.body.usage.credits;
    const queued: AngelWorldAction[] = [];
    const rejected: RejectionReason[] = [];
    for (const raw of (result.body.proposedActions ?? []).slice(0, 2)) {
      const v = validateProposal(raw, ctx);
      if (v.ok) queued.push(v.action);
      else {
        rejected.push(v.reason);
        reject(v.reason);
      }
    }
    pending = [...pending, ...queued].slice(-2);
    store.setState((st2) => ({
      angel: {
        ...st2.angel,
        recent: pushTurns(st2.angel.recent, { role: 'player', text: playerText }, { role: 'angel', text: result.body.speech }),
        summary: buildSummary(st2.progress.flags, angelActions),
      },
    }));
    emit();
    return { speech: result.body.speech, source: 'ai', status: 'ready', queued, rejected };
  }

  function closeLocket(): AngelWorldAction[] {
    const applied: AngelWorldAction[] = [];
    const todo = pending;
    pending = [];
    if (status() === 'degraded') return applied;
    for (const action of todo) {
      const ctx = fullContext(); // fresh each time: an applied action updates the ledger
      const v = validateAction(action, ctx);
      if (!v.ok) {
        reject(v.reason);
        continue;
      }
      if (action.type === 'flicker_lights') effects.flickerLights(action.targetId);
      else if (action.type === 'reveal_clue') effects.revealClue(action.targetId);
      else if (action.type === 'restore_magic') effects.restoreMagic(action.amount);
      else {
        reject('schema_invalid');
        continue;
      }
      const at = ctx.simTime;
      store.setState((st) => ({
        angel: {
          ...st.angel,
          actionLedger: recordUse(st.angel.actionLedger, action.type, at),
          eventLog: [...st.angel.eventLog, { at, t: 'angel_action' as const, type: action.type, ...('targetId' in action ? { targetId: action.targetId } : {}) }].slice(-MAX_EVENT_LOG),
        },
      }));
      applied.push(action);
    }
    emit();
    return applied;
  }

  return {
    send,
    closeLocket,
    setCredits(c) {
      credits = c;
      emit();
    },
    get credits() {
      return credits;
    },
    get status() {
      return status();
    },
    get needsLogin() {
      return needsLogin;
    },
    setStatus(s) {
      if (s === 'ready') needsLogin = false;
      setStatus(s);
    },
    setNeedsLogin(value) {
      needsLogin = value;
      emit();
    },
    get pending() {
      return pending;
    },
    get rejections() {
      return rejections;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
