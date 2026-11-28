import { emptyActionLedger, PROGRESS_FLAGS, type EntityId, type ProgressFlag, type ZoneId } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { createWorldRegistry } from '../content/world/index.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import { createGameStore } from '../store/game-store.ts';
import { ACTION_RULES, describeActions, isStorySafe, recordUse, validateProposal, type ValidationContext } from './angel-validator.ts';
import { MAX_MAGIC } from './spells.ts';
import { createAngelEffectApi } from './world-effects.ts';
import { WorldRegistry, type EntityDef } from './world-registry.ts';

const ent = (id: string, kind: EntityDef['kind'], caps: EntityDef['capabilities'], critical = false, owner: EntityDef['owner'] = null): EntityDef => ({
  id: id as EntityId,
  kind,
  zone: id.split('.')[1] as ZoneId,
  capabilities: caps,
  critical,
  owner,
});

const registry = new WorldRegistry(
  [
    ent('light.street.lamp', 'light', ['angelFlicker']),
    ent('light.street.crit', 'light', ['angelFlicker'], true),
    ent('light.street.plain', 'light', []),
    ent('light.street.owned', 'light', ['angelFlicker'], false, 'seq1_empty_street'),
    ent('light.garden.porch', 'light', ['angelFlicker']),
    ent('light.ritual.brazier', 'light', ['angelFlicker']),
    ent('clue.street.note', 'clue', ['inspectable', 'angelReveal']),
    ent('clue.street.far', 'clue', ['inspectable', 'angelReveal']),
    ent('clue.street.key', 'clue', ['inspectable', 'angelReveal'], true),
    ent('door.street.shed', 'door', ['interactable', 'angelUnlock']),
  ],
  [],
);

function ctx(over: Partial<ValidationContext> = {}): ValidationContext {
  return {
    mode: 'ai',
    registry,
    placements: { 'clue.street.note': { x: 2, z: 0 }, 'clue.street.far': { x: 40, z: 0 } },
    zone: 'street',
    pos: { x: 0, z: 0 },
    simTime: 1000,
    ledger: emptyActionLedger(),
    flags: ['locket_taken', 'seq2_done'],
    magic: 40,
    maxMagic: 100,
    activeOwner: null,
    entities: {},
    ...over,
  };
}

const reason = (raw: unknown, c = ctx()) => {
  const v = validateProposal(raw, c);
  return v.ok ? 'ok' : v.reason;
};

describe('Angel validator: every rejection reason', () => {
  it('accepts the three enabled types on valid targets', () => {
    expect(reason({ type: 'flicker_lights', targetId: 'light.street.lamp' })).toBe('ok');
    expect(reason({ type: 'flicker_lights', targetId: 'light.street.crit' })).toBe('ok'); // critical lights may flicker
    expect(reason({ type: 'reveal_clue', targetId: 'clue.street.note' })).toBe('ok');
    expect(reason({ type: 'restore_magic', params: { amount: 10 } })).toBe('ok');
  });

  it('schema_invalid: unknown, malformed or disabled types', () => {
    expect(reason({ type: 'set_flag', targetId: 'seal.ritual.central' })).toBe('schema_invalid');
    expect(reason({ type: 'flicker_lights', targetId: 'NOT AN ID' })).toBe('schema_invalid');
    expect(reason('flicker everything')).toBe('schema_invalid');
    expect(reason({ type: 'unlock_door', targetId: 'door.street.shed' })).toBe('schema_invalid'); // parses, disabled here
    expect(reason({ type: 'summon_minor_cursed', targetId: 'spawn.lane.angel_1' })).toBe('schema_invalid');
    expect(ACTION_RULES.unlock_door.enabled).toBe(false);
  });

  it('amount_out_of_range', () => expect(reason({ type: 'restore_magic', params: { amount: 99 } })).toBe('amount_out_of_range'));
  it('wrong_mode', () => expect(reason({ type: 'flicker_lights', targetId: 'light.street.lamp' }, ctx({ mode: 'classic' }))).toBe('wrong_mode'));
  it('target_not_found', () => expect(reason({ type: 'flicker_lights', targetId: 'light.street.nope' })).toBe('target_not_found'));
  it('target_kind_mismatch', () => expect(reason({ type: 'flicker_lights', targetId: 'clue.street.note' })).toBe('target_kind_mismatch'));
  it('capability_missing', () => expect(reason({ type: 'flicker_lights', targetId: 'light.street.plain' })).toBe('capability_missing'));
  it('entity_critical', () => expect(reason({ type: 'reveal_clue', targetId: 'clue.street.key' })).toBe('entity_critical'));
  it('zone_blocked', () => {
    expect(reason({ type: 'flicker_lights', targetId: 'light.ritual.brazier' }, ctx({ zone: 'ritual' }))).toBe('zone_blocked');
    expect(reason({ type: 'restore_magic', params: { amount: 5 } }, ctx({ zone: 'ritual' }))).toBe('zone_blocked');
  });
  it('wrong_zone', () => expect(reason({ type: 'flicker_lights', targetId: 'light.garden.porch' })).toBe('wrong_zone'));
  it('out_of_range', () => expect(reason({ type: 'reveal_clue', targetId: 'clue.street.far' })).toBe('out_of_range'));
  it('scripted_lock: owner running, any sequence or encounter, or the finale', () => {
    expect(reason({ type: 'flicker_lights', targetId: 'light.street.owned' }, ctx({ activeOwner: 'seq1_empty_street' }))).toBe('scripted_lock');
    expect(reason({ type: 'restore_magic', params: { amount: 5 } }, ctx({ activeOwner: 'encounter' }))).toBe('scripted_lock');
    expect(reason({ type: 'flicker_lights', targetId: 'light.street.lamp' }, ctx({ flags: ['ritual_active'] }))).toBe('scripted_lock');
  });
  it('cooldown_active and budget_exhausted', () => {
    const used = recordUse(emptyActionLedger(), 'flicker_lights', 995);
    expect(reason({ type: 'flicker_lights', targetId: 'light.street.lamp' }, ctx({ ledger: used }))).toBe('cooldown_active');
    const many = { ...emptyActionLedger(), useCount: { flicker_lights: 20 } };
    expect(reason({ type: 'flicker_lights', targetId: 'light.street.lamp' }, ctx({ ledger: many }))).toBe('budget_exhausted');
  });
  it('already_applied: revealed clue, full magic', () => {
    expect(reason({ type: 'reveal_clue', targetId: 'clue.street.note' }, ctx({ entities: { 'clue.street.note': { revealed: true } } }))).toBe('already_applied');
    expect(reason({ type: 'restore_magic', params: { amount: 5 } }, ctx({ magic: 100 }))).toBe('already_applied');
  });
  it('story_safety_violation guard: never critical (except flicker), never gates/anchors/seals', () => {
    expect(isStorySafe({ type: 'reveal_clue', targetId: 'clue.street.key' as EntityId }, registry)).toBe(false);
    expect(isStorySafe({ type: 'flicker_lights', targetId: 'light.street.crit' as EntityId }, registry)).toBe(true);
    expect(isStorySafe({ type: 'unlock_door', targetId: 'door.street.nope' as EntityId }, registry)).toBe(false);
  });
  it('describes only targets that would pass now', () => {
    const d = describeActions(ctx());
    expect(d.find((a) => a.type === 'flicker_lights')?.validTargets).toEqual(['light.street.lamp', 'light.street.crit', 'light.street.owned']);
    expect(d.find((a) => a.type === 'reveal_clue')?.validTargets).toEqual(['clue.street.note']);
    expect(d.map((a) => a.type)).not.toContain('unlock_door');
  });
  it('the real content has Angel-flickerable lights and no critical angelReveal clue', () => {
    const real = createWorldRegistry();
    expect(real.entities.filter((e) => e.capabilities.includes('angelFlicker')).length).toBeGreaterThan(3);
    expect(real.entities.filter((e) => e.critical && e.capabilities.includes('angelReveal'))).toEqual([]);
  });
});

/** Small seeded PRNG (mulberry32): the property test is repeatable. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('property: random Angel actions never make the good ending unreachable (1,000 seeded runs)', () => {
  const real = createWorldRegistry();
  const ids = real.entities.map((e) => e.id);
  const types = ['flicker_lights', 'unlock_door', 'reveal_clue', 'restore_magic', 'stir_object', 'summon_minor_cursed', 'set_flag', 'end_game', 'open_gate'];
  const zones: ZoneId[] = ['home', 'street', 'garden', 'hideout', 'house66', 'lane', 'grounds', 'interior', 'ritual'];
  const critical = real.entities.filter((e) => e.critical).map((e) => e.id);

  it('keeps flags, items, morality and every critical entity untouched', () => {
    let accepted = 0;
    for (let run = 0; run < 1000; run++) {
      const r = rng(run + 1);
      const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)]!;
      const store = createGameStore();
      store.getState().startNewGame('ai');
      const flagCount = Math.floor(r() * 20);
      for (const f of PROGRESS_FLAGS.slice(0, flagCount)) store.getState().setFlag(f as ProgressFlag);
      store.setState((s) => ({ player: { ...s.player, magic: Math.floor(r() * 100) } }));
      const before = structuredClone({ flags: store.getState().progress.flags, carried: store.getState().progress.carried, morality: store.getState().progress.morality, world: store.getState().world.entities });
      const lights: string[] = [];
      const api = createAngelEffectApi(store, { setLight: (id) => lights.push(id) });
      let ledger = emptyActionLedger();
      for (let i = 0; i < 8; i++) {
        const raw = { type: pick(types), targetId: r() < 0.9 ? pick(ids) : 'junk', params: { amount: Math.floor(r() * 40) - 5 } };
        const s = store.getState();
        const c: ValidationContext = {
          mode: r() < 0.9 ? 'ai' : 'classic',
          registry: real,
          placements: PLACEMENTS,
          zone: pick(zones),
          pos: { x: r() * 140 - 40, z: r() * 100 - 50 },
          simTime: run * 10 + i * 40,
          ledger,
          flags: s.progress.flags,
          magic: s.player.magic,
          maxMagic: MAX_MAGIC,
          activeOwner: r() < 0.2 ? 'seq1_empty_street' : null,
          entities: s.world.entities,
        };
        const v = validateProposal(raw, c);
        if (!v.ok) continue;
        expect(isStorySafe(v.action, real)).toBe(true);
        if (v.action.type === 'flicker_lights') api.flickerLights(v.action.targetId);
        else if (v.action.type === 'reveal_clue') api.revealClue(v.action.targetId);
        else if (v.action.type === 'restore_magic') api.restoreMagic(v.action.amount);
        else throw new Error(`disabled type accepted: ${v.action.type}`);
        ledger = recordUse(ledger, v.action.type, c.simTime);
        accepted++;
      }
      const after = store.getState();
      expect(after.progress.flags).toEqual(before.flags);
      expect(after.progress.carried).toEqual(before.carried);
      expect(after.progress.morality).toEqual(before.morality);
      for (const id of critical) expect(after.world.entities[id]).toEqual(before.world[id]);
      expect(after.player.magic).toBeLessThanOrEqual(MAX_MAGIC);
    }
    expect(accepted).toBeGreaterThan(100); // the runs really exercise accepted actions, not only rejections
  });
});
