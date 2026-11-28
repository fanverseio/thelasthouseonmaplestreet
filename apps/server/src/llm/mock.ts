import { LlmError, type LlmAdapter, type LlmRequest } from './types.ts';

/** Pull the untrusted player text back out of the prompt (between the tags the prompt builder writes). */
function playerText(req: LlmRequest): string {
  const all = req.messages.map((m) => m.content).join('\n');
  const found = [...all.matchAll(/<player_message>([\s\S]*?)<\/player_message>/g)];
  return (found.at(-1)?.[1] ?? req.messages.at(-1)?.content ?? '').trim();
}

function targets(req: LlmRequest, type: string): string[] {
  const all = req.messages.map((m) => m.content).join('\n');
  const m = /<actions>([\s\S]*?)<\/actions>/.exec(all);
  try {
    const list = JSON.parse(m?.[1] ?? '[]') as { type: string; validTargets: string[] }[];
    return list.find((a) => a.type === type)?.validTargets ?? [];
  } catch {
    return [];
  }
}

const waitForAbort = (signal: AbortSignal) =>
  new Promise<never>((_, reject) => {
    if (signal.aborted) reject(new LlmError('timeout'));
    signal.addEventListener('abort', () => reject(new LlmError('timeout')), { once: true });
  });

/**
 * Deterministic scripted provider: no network, no key. Used by tests and by anyone without a provider.
 * Test hooks in the player text: [[mock:timeout]], [[mock:error]], [[mock:refuse]], [[mock:garbage]], [[mock:canon]], [[mock:auth]].
 */
export function createMockAdapter(): LlmAdapter {
  return {
    protocol: 'mock',
    model: 'mock',
    async complete(req) {
      const text = playerText(req);
      const lower = text.toLowerCase();
      const usage = { inputTokens: Math.ceil((req.system.length + text.length) / 4), outputTokens: 40 };
      if (lower.includes('[[mock:timeout]]')) return waitForAbort(req.signal);
      if (lower.includes('[[mock:error]]')) throw new LlmError('provider_error', 500);
      if (lower.includes('[[mock:auth]]')) throw new LlmError('auth', 401);
      if (lower.includes('[[mock:refuse]]')) throw new LlmError('refused', undefined, usage);
      if (lower.includes('[[mock:garbage]]')) return { output: { nonsense: true }, usage };
      if (lower.includes('[[mock:canon]]')) {
        return { output: { speech: 'Gartner is guilty. He works for the smoke, child.', tone: 'cold', proposedActions: [] }, usage };
      }
      const actions: unknown[] = [];
      let speech = 'Ask, child. The silver is listening.';
      if (/ignore|set flag|end the game|system/.test(lower)) {
        speech = 'Clever words. They do nothing to me. The night still has its rules.';
        actions.push({ type: 'set_flag', targetId: 'seal.ritual.central' }, { type: 'unlock_door', targetId: 'door.interior.ritual' });
      } else if (/flicker|light|lamp/.test(lower)) {
        const t = targets(req, 'flicker_lights')[0];
        speech = 'Watch the lamps. Something passes between them.';
        if (t) actions.push({ type: 'flicker_lights', targetId: t });
      } else if (/magic|tired|weak/.test(lower)) {
        speech = 'Take a little of my warmth. Only a little.';
        actions.push({ type: 'restore_magic', params: { amount: 10 } });
      } else if (/clue|show|hint/.test(lower)) {
        const t = targets(req, 'reveal_clue')[0];
        speech = 'Look closer. Some things only want to be seen.';
        if (t) actions.push({ type: 'reveal_clue', targetId: t });
      } else if (/felix|son/.test(lower)) {
        speech = 'Your boy is not lost to you yet. Keep walking, child.';
      }
      return { output: { speech, tone: 'wry', proposedActions: actions }, usage };
    },
  };
}
