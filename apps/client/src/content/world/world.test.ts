import { describe, expect, it } from 'vitest';
import { ENTITY_ID_PATTERN, PROGRESS_FLAGS, ZONE_IDS } from '@tlh/shared';
import type { ZoneId } from '@tlh/shared';
import type { EntityDef, GateDef } from '../../game/world-registry.ts';
import { validateWorld, WorldRegistry } from '../../game/world-registry.ts';
import { ALL_ENTITIES, createWorldRegistry, GATES } from './index.ts';

const messages = (e: readonly EntityDef[], g: readonly GateDef[] = GATES): string[] =>
  validateWorld(e, g).map((p) => `${p.id}: ${p.message}`);

const sample: EntityDef = {
  id: 'prop.street.swing',
  kind: 'prop',
  zone: 'street',
  capabilities: ['angelStir'],
  critical: false,
  owner: null,
};

describe('world content', () => {
  it('validates with no problems', () => {
    expect(validateWorld(ALL_ENTITIES, GATES)).toEqual([]);
    expect(() => createWorldRegistry()).not.toThrow();
  });

  it('contains every manifest entity (105) and gate (14), with per-zone counts', () => {
    expect(ALL_ENTITIES).toHaveLength(105);
    expect(GATES).toHaveLength(14);
    const expected: Record<ZoneId, number> = {
      home: 11,
      street: 30,
      garden: 8,
      hideout: 4,
      house66: 13,
      lane: 4,
      grounds: 13,
      interior: 9,
      ritual: 13,
    };
    const reg = createWorldRegistry();
    for (const z of ZONE_IDS) expect(reg.inZone(z), z).toHaveLength(expected[z]);
  });

  it('expands manifest ranges into separate IDs', () => {
    const reg = createWorldRegistry();
    for (const id of [
      'light.street.01',
      'light.street.06',
      'socket.street.candle_3',
      'node.house66.tp_6',
      'rune.grounds.r3',
      'spawn.ritual.wraith_4',
      'anchor.ritual.west',
      'door.ritual.east',
      'enemy.grounds.hound_2',
      'trg.street.fox',
      'enemy.street.fox',
    ]) {
      expect(reg.has(id), id).toBe(true);
    }
  });
});

describe('world validation failures', () => {
  it('rejects a bad ID', () => {
    expect(messages([{ ...sample, id: 'Prop.Street.Swing' }])).toContainEqual(
      expect.stringContaining('does not match kind.zone.name'),
    );
    expect(messages([{ ...sample, id: 'prop.street' }])).toContainEqual(
      expect.stringContaining('does not match kind.zone.name'),
    );
    expect(messages([{ ...sample, id: `prop.street.${'a'.repeat(60)}` }])).toContainEqual(
      expect.stringContaining('max 64'),
    );
  });

  it('rejects an ID prefix that does not match the kind, and a zone mismatch', () => {
    expect(messages([{ ...sample, kind: 'light' }])).toContainEqual(
      expect.stringContaining('does not match kind'),
    );
    expect(messages([{ ...sample, zone: 'lane' }])).toContainEqual(
      expect.stringContaining('does not match zone'),
    );
  });

  it('rejects an unknown kind, zone, capability and owner', () => {
    expect(messages([{ ...sample, kind: 'ghost' as never }])).toContainEqual(
      expect.stringContaining('unknown kind'),
    );
    expect(messages([{ ...sample, zone: 'attic' as never }])).toContainEqual(
      expect.stringContaining('unknown zone'),
    );
    expect(messages([{ ...sample, capabilities: ['angelFly' as never] }])).toContainEqual(
      expect.stringContaining('unknown capability: angelFly'),
    );
    expect(messages([{ ...sample, owner: 'seq9' as never }])).toContainEqual(
      expect.stringContaining('unknown owner'),
    );
  });

  it('rejects angelUnlock on a critical entity', () => {
    const bad: EntityDef = {
      id: 'door.street.no22_gate',
      kind: 'door',
      zone: 'street',
      capabilities: ['interactable', 'angelUnlock'],
      critical: true,
      owner: null,
    };
    expect(messages([bad], [])).toContainEqual(
      expect.stringContaining('critical entity must not have angelUnlock'),
    );
    expect(() => new WorldRegistry([bad], [])).toThrow(/angelUnlock/);
  });

  it('rejects duplicate IDs', () => {
    expect(messages([sample, sample], [])).toContainEqual(expect.stringContaining('duplicate id'));
  });

  it('rejects gates that reference a missing entity, a wrong kind or an unknown flag', () => {
    expect(messages([sample], [{ id: 'gate.street.nope', opensOn: 'seq1_done' }])).toContainEqual(
      expect.stringContaining('does not exist'),
    );
    expect(messages([sample], [{ id: sample.id, opensOn: 'seq1_done' }])).toContainEqual(
      expect.stringContaining('must be a door or gate'),
    );
    const g: EntityDef = { ...sample, id: 'gate.street.x', kind: 'gate', capabilities: [] };
    expect(messages([g], [{ id: g.id, opensOn: 'not_a_flag' as never }])).toContainEqual(
      expect.stringContaining('unknown flag'),
    );
  });
});

describe('level manifest section 5 checks', () => {
  const reg = createWorldRegistry();

  it('1. IDs are unique and match the pattern', () => {
    const ids = ALL_ENTITIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(ENTITY_ID_PATTERN.test(id), id).toBe(true);
  });

  it('2. every gate opens on a known progression flag (or never)', () => {
    for (const g of GATES) {
      if (g.opensOn !== null) expect(PROGRESS_FLAGS, g.id).toContain(g.opensOn);
    }
    expect(reg.gate('gate.street.last_house_road')?.opensOn).toBeNull();
    // Every gate entity (kind gate) is declared in section 3.
    for (const e of reg.ofKind('gate')) expect(reg.gate(e.id), e.id).toBeDefined();
  });

  it('3. no angelUnlock entity is a gate or critical', () => {
    for (const e of ALL_ENTITIES) {
      if (!e.capabilities.includes('angelUnlock')) continue;
      expect(e.critical, e.id).toBe(false);
      expect(reg.gate(e.id), e.id).toBeUndefined();
      expect(e.kind, e.id).not.toBe('gate');
    }
  });

  it('4. every gate on the main path is critical', () => {
    for (const g of GATES) expect(reg.get(g.id)?.critical, g.id).toBe(true);
  });

  it('5. angelSummon spawns exist only in zones that allow summons (street, lane)', () => {
    const summons = ALL_ENTITIES.filter((e) => e.capabilities.includes('angelSummon'));
    expect(summons.map((e) => e.id).sort()).toEqual([
      'spawn.lane.angel_1',
      'spawn.street.angel_1',
      'spawn.street.angel_2',
    ]);
    for (const e of summons) {
      expect(e.kind, e.id).toBe('spawn');
      expect(['street', 'lane'], e.id).toContain(e.zone);
    }
  });

  it('keeps Angel capabilities off critical entities except flicker', () => {
    for (const e of ALL_ENTITIES.filter((x) => x.critical)) {
      const angel = e.capabilities.filter((c) => c.startsWith('angel') && c !== 'angelFlicker');
      expect(angel, e.id).toEqual([]);
    }
  });
});
