import type { Capability, EntityKind, ZoneId } from '@tlh/shared';
import type { EntityDef, EntityOwner } from '../../game/world-registry.ts';
import { KIND_ID_PREFIX } from '../../game/world-registry.ts';

interface Opts {
  caps?: readonly Capability[];
  crit: boolean;
  owner?: EntityOwner;
}

/** Build an entity whose ID is derived from kind, zone and name, so they cannot drift apart. */
export function ent(kind: EntityKind, zone: ZoneId, name: string, o: Opts): EntityDef {
  return {
    id: `${KIND_ID_PREFIX[kind]}.${zone}.${name}`,
    kind,
    zone,
    capabilities: o.caps ?? [],
    critical: o.crit,
    owner: o.owner ?? null,
  };
}

/** Expand a numbered range such as light.street.01..06 into separate entities. */
export function range(
  kind: EntityKind,
  zone: ZoneId,
  names: readonly string[],
  o: Opts,
): EntityDef[] {
  return names.map((n) => ent(kind, zone, n, o));
}
