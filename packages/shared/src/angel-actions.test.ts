import { describe, expect, it } from 'vitest';
import {
  ActionLedgerSchema,
  emptyActionLedger,
  normaliseProposal,
  normaliseProposals,
} from './angel-actions.ts';

describe('normaliseProposal', () => {
  it.each([
    [{ type: 'flicker_lights', targetId: 'light.street.03' }, { type: 'flicker_lights', targetId: 'light.street.03' }],
    [{ type: 'unlock_door', targetId: 'door.street.no22_gate' }, { type: 'unlock_door', targetId: 'door.street.no22_gate' }],
    [{ type: 'reveal_clue', targetId: 'clue.street.no22_letter' }, { type: 'reveal_clue', targetId: 'clue.street.no22_letter' }],
    [{ type: 'restore_magic', params: { amount: 25 } }, { type: 'restore_magic', amount: 25 }],
    [{ type: 'stir_object', targetId: 'prop.street.swing' }, { type: 'stir_object', targetId: 'prop.street.swing' }],
    [{ type: 'summon_minor_cursed', targetId: 'spawn.street.angel_1' }, { type: 'summon_minor_cursed', spawnId: 'spawn.street.angel_1' }],
  ])('accepts %j', (raw, expected) => {
    expect(normaliseProposal(raw)).toEqual({ ok: true, action: expected });
  });

  it('rejects types outside the whitelist', () => {
    for (const type of ['force_ending', 'set_flag', 'delete_item', 'skip_quest', '']) {
      expect(normaliseProposal({ type, targetId: 'door.home.front' })).toEqual({ ok: false, reason: 'schema_invalid' });
    }
  });

  it('strips unknown keys, including __proto__', () => {
    const raw = JSON.parse('{"type":"flicker_lights","targetId":"light.street.03","extra":true,"__proto__":{"x":1}}');
    const result = normaliseProposal(raw);
    expect(result).toEqual({ ok: true, action: { type: 'flicker_lights', targetId: 'light.street.03' } });
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });

  it('rejects bad target IDs', () => {
    expect(normaliseProposal({ type: 'unlock_door' })).toEqual({ ok: false, reason: 'schema_invalid' });
    expect(normaliseProposal({ type: 'unlock_door', targetId: 42 })).toEqual({ ok: false, reason: 'schema_invalid' });
    expect(normaliseProposal({ type: 'unlock_door', targetId: '__proto__' })).toEqual({ ok: false, reason: 'schema_invalid' });
    expect(normaliseProposal({ type: 'unlock_door', targetId: `door.home.${'x'.repeat(70)}` })).toEqual({
      ok: false,
      reason: 'schema_invalid',
    });
  });

  it.each([0, 26, 1.5, -3, 1e9])('rejects restore_magic amount %d as out of range', (amount) => {
    expect(normaliseProposal({ type: 'restore_magic', params: { amount } })).toEqual({
      ok: false,
      reason: 'amount_out_of_range',
    });
  });

  it('rejects restore_magic with a missing or non-numeric amount', () => {
    expect(normaliseProposal({ type: 'restore_magic' })).toEqual({ ok: false, reason: 'schema_invalid' });
    expect(normaliseProposal({ type: 'restore_magic', params: { amount: '10' } })).toEqual({
      ok: false,
      reason: 'schema_invalid',
    });
    expect(normaliseProposal({ type: 'restore_magic', params: { amount: Number.NaN } })).toEqual({
      ok: false,
      reason: 'schema_invalid',
    });
  });

  it('rejects non-objects', () => {
    for (const raw of [null, undefined, 'flicker_lights', 7, []]) {
      expect(normaliseProposal(raw)).toEqual({ ok: false, reason: 'schema_invalid' });
    }
  });
});

describe('normaliseProposals', () => {
  it('considers only the first two proposals', () => {
    const raw = [
      { type: 'flicker_lights', targetId: 'light.street.01' },
      { type: 'flicker_lights', targetId: 'light.street.02' },
      { type: 'flicker_lights', targetId: 'light.street.03' },
    ];
    expect(normaliseProposals(raw)).toHaveLength(2);
  });

  it('returns nothing for a non-array', () => {
    expect(normaliseProposals({ type: 'flicker_lights' })).toEqual([]);
  });
});

describe('ActionLedgerSchema', () => {
  it('accepts the empty ledger and rejects unknown action keys', () => {
    expect(ActionLedgerSchema.safeParse(emptyActionLedger()).success).toBe(true);
    expect(
      ActionLedgerSchema.safeParse({ lastUsedSimTime: { force_ending: 3 }, useCount: {}, liveSummonedIds: [] }).success,
    ).toBe(false);
  });
});
