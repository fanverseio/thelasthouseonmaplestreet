/**
 * Headless world registry: every interactive entity by stable ID, plus gate declarations.
 * Pure data and validation. No React, no Three. Content lives in `content/world/`.
 */
import {
  CAPABILITIES,
  ENCOUNTER_IDS,
  ENTITY_ID_MAX_LENGTH,
  ENTITY_ID_PATTERN,
  ENTITY_KINDS,
  PROGRESS_FLAGS,
  SEQUENCE_IDS,
  ZONE_IDS,
} from '@tlh/shared';
import type {
  Capability,
  EncounterId,
  EntityId,
  EntityKind,
  ProgressFlag,
  SequenceId,
  ZoneId,
} from '@tlh/shared';

/** Who owns an entity while it runs. Angel actions on it are blocked then. */
export type EntityOwner = SequenceId | EncounterId | 'finale' | 'side_quest';

export const ENTITY_OWNERS: readonly EntityOwner[] = [
  ...SEQUENCE_IDS,
  ...ENCOUNTER_IDS,
  'finale',
  'side_quest',
];

export interface EntityDef {
  id: EntityId;
  kind: EntityKind;
  zone: ZoneId;
  capabilities: readonly Capability[];
  critical: boolean;
  owner: EntityOwner | null;
}

/** A gate (diegetic veil or door). `opensOn` is the flag that opens it; null means never. */
export interface GateDef {
  id: EntityId;
  opensOn: ProgressFlag | null;
}

/**
 * ID prefix for each kind. Most prefixes equal the kind name. The level manifest writes
 * triggers as `trg.zone.name`, so `trigger` maps to `trg`.
 */
export const KIND_ID_PREFIX: Readonly<Record<EntityKind, string>> = {
  door: 'door',
  gate: 'gate',
  light: 'light',
  clue: 'clue',
  pickup: 'pickup',
  socket: 'socket',
  prop: 'prop',
  enemy: 'enemy',
  npc: 'npc',
  trigger: 'trg',
  spawn: 'spawn',
  node: 'node',
  puzzle: 'puzzle',
  rune: 'rune',
  mirror: 'mirror',
  anchor: 'anchor',
  seal: 'seal',
};

export interface WorldProblem {
  id: string;
  message: string;
}

const KINDS: readonly string[] = ENTITY_KINDS;
const ZONES: readonly string[] = ZONE_IDS;
const CAPS: readonly string[] = CAPABILITIES;
const FLAGS: readonly string[] = PROGRESS_FLAGS;
const OWNERS: readonly string[] = ENTITY_OWNERS;

/** Returns every problem found; an empty list means the content is valid. */
export function validateWorld(
  entities: readonly EntityDef[],
  gates: readonly GateDef[],
): WorldProblem[] {
  const problems: WorldProblem[] = [];
  const add = (id: string, message: string): void => {
    problems.push({ id, message });
  };

  const byId = new Map<string, EntityDef>();
  for (const e of entities) {
    if (byId.has(e.id)) add(e.id, 'duplicate id');
    byId.set(e.id, e);

    const parts = e.id.split('.');
    if (!ENTITY_ID_PATTERN.test(e.id) || e.id.length > ENTITY_ID_MAX_LENGTH) {
      add(e.id, `id does not match kind.zone.name (max ${ENTITY_ID_MAX_LENGTH} chars)`);
    }
    if (!KINDS.includes(e.kind)) {
      add(e.id, `unknown kind: ${String(e.kind)}`);
    } else if (parts[0] !== KIND_ID_PREFIX[e.kind]) {
      add(e.id, `id prefix "${parts[0] ?? ''}" does not match kind "${e.kind}"`);
    }
    if (!ZONES.includes(e.zone)) {
      add(e.id, `unknown zone: ${String(e.zone)}`);
    } else if (parts[1] !== e.zone) {
      add(e.id, `id zone "${parts[1] ?? ''}" does not match zone "${e.zone}"`);
    }
    const seenCaps = new Set<string>();
    for (const c of e.capabilities) {
      if (!CAPS.includes(c)) add(e.id, `unknown capability: ${String(c)}`);
      if (seenCaps.has(c)) add(e.id, `duplicate capability: ${c}`);
      seenCaps.add(c);
    }
    if (e.critical && e.capabilities.includes('angelUnlock')) {
      add(e.id, 'critical entity must not have angelUnlock');
    }
    if (e.owner !== null && !OWNERS.includes(e.owner)) {
      add(e.id, `unknown owner: ${String(e.owner)}`);
    }
  }

  const seenGates = new Set<string>();
  for (const g of gates) {
    if (seenGates.has(g.id)) add(g.id, 'duplicate gate');
    seenGates.add(g.id);
    const target = byId.get(g.id);
    if (!target) {
      add(g.id, 'gate references an entity that does not exist');
      continue;
    }
    if (target.kind !== 'gate' && target.kind !== 'door') {
      add(g.id, `gate entity must be a door or gate, got "${target.kind}"`);
    }
    if (target.capabilities.includes('angelUnlock')) add(g.id, 'gate must not have angelUnlock');
    if (g.opensOn !== null && !FLAGS.includes(g.opensOn)) {
      add(g.id, `gate opens on unknown flag: ${String(g.opensOn)}`);
    }
  }
  return problems;
}

export class WorldRegistry {
  private readonly byId = new Map<string, EntityDef>();
  private readonly gateById = new Map<string, GateDef>();
  readonly entities: readonly EntityDef[];
  readonly gates: readonly GateDef[];

  /** Throws with every problem listed if the content is invalid. */
  constructor(entities: readonly EntityDef[], gates: readonly GateDef[]) {
    this.entities = entities;
    this.gates = gates;
    const problems = validateWorld(entities, gates);
    if (problems.length > 0) {
      throw new Error(
        `Invalid world content:\n${problems.map((p) => `  ${p.id}: ${p.message}`).join('\n')}`,
      );
    }
    for (const e of entities) this.byId.set(e.id, e);
    for (const g of gates) this.gateById.set(g.id, g);
  }

  get(id: string): EntityDef | undefined {
    return this.byId.get(id);
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  gate(id: string): GateDef | undefined {
    return this.gateById.get(id);
  }

  inZone(zone: ZoneId): EntityDef[] {
    return this.entities.filter((e) => e.zone === zone);
  }

  ofKind(kind: EntityKind): EntityDef[] {
    return this.entities.filter((e) => e.kind === kind);
  }

  hasCapability(id: string, capability: Capability): boolean {
    return this.byId.get(id)?.capabilities.includes(capability) ?? false;
  }
}
