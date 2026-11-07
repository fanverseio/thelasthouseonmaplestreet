import { describe, expect, it } from 'vitest';
import {
  AngelChatRequestSchema,
  AngelChatResponseSchema,
  ApiErrorSchema,
  ConfigLlmRequestSchema,
  isAllowedLlmBaseUrl,
  type StateSnapshot,
} from './api.ts';

const snapshot: StateSnapshot = {
  zone: 'street',
  beat: 3,
  objective: 'Follow the lights',
  knowledgeLevel: 1,
  flags: ['locket_taken', 'angel_awake', 'home_done', 'seq1_done', 'seq2_done', 'spell_bolt'],
  cluesFound: ['clue.home.drawing'],
  moralityBand: 'neutral',
  hp: 100,
  magic: 80,
  spellsUnlocked: ['arcane_bolt'],
  carried: [],
  nearby: [{ id: 'light.street.03', kind: 'light', capabilities: ['angelFlicker'] }],
  sideQuest: { active: null, offered: 0 },
  inEncounter: false,
};

describe('AngelChatRequestSchema', () => {
  it('accepts a well-formed request', () => {
    const request = { playerText: 'Where is Felix?', snapshot, summary: '', recent: [], actions: [] };
    expect(AngelChatRequestSchema.safeParse(request).success).toBe(true);
  });

  it('rejects empty and oversized player text', () => {
    const base = { snapshot, summary: '', recent: [], actions: [] };
    expect(AngelChatRequestSchema.safeParse({ ...base, playerText: '' }).success).toBe(false);
    expect(AngelChatRequestSchema.safeParse({ ...base, playerText: 'a'.repeat(301) }).success).toBe(false);
  });

  it('rejects more than 12 nearby entities', () => {
    const nearby = Array.from({ length: 13 }, (_, i) => ({
      id: `light.street.l${i}`,
      kind: 'light' as const,
      capabilities: [],
    }));
    const request = { playerText: 'hi', snapshot: { ...snapshot, nearby }, summary: '', recent: [], actions: [] };
    expect(AngelChatRequestSchema.safeParse(request).success).toBe(false);
  });
});

describe('AngelChatResponseSchema', () => {
  it('accepts at most two proposals', () => {
    const base = { speech: 'Listen.', tone: 'wry', usage: {} };
    const one = { type: 'flicker_lights', targetId: 'light.street.03' };
    expect(AngelChatResponseSchema.safeParse({ ...base, proposedActions: [one, one] }).success).toBe(true);
    expect(AngelChatResponseSchema.safeParse({ ...base, proposedActions: [one, one, one] }).success).toBe(false);
  });
});

describe('isAllowedLlmBaseUrl', () => {
  it.each(['https://api.deepseek.com', 'https://api.x.ai/v1', 'http://localhost:11434/v1', 'http://127.0.0.1:8080'])(
    'allows %s',
    (url) => {
      expect(isAllowedLlmBaseUrl(url)).toBe(true);
    },
  );

  it.each(['http://api.deepseek.com', 'ftp://example.com', 'file:///etc/passwd', 'https://user:pw@example.com', 'not a url'])(
    'refuses %s',
    (url) => {
      expect(isAllowedLlmBaseUrl(url)).toBe(false);
    },
  );

  it('is enforced by ConfigLlmRequestSchema', () => {
    expect(ConfigLlmRequestSchema.safeParse({ protocol: 'openai', baseUrl: 'http://10.0.0.5' }).success).toBe(false);
    expect(ConfigLlmRequestSchema.safeParse({ protocol: 'mock' }).success).toBe(true);
  });
});

describe('ApiErrorSchema', () => {
  it('accepts documented errors and rejects unknown codes', () => {
    expect(ApiErrorSchema.safeParse({ error: 'rate_limited', fallback: 'none', retryAfterSec: 5 }).success).toBe(true);
    expect(ApiErrorSchema.safeParse({ error: 'teapot', fallback: 'none' }).success).toBe(false);
  });
});
