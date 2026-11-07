import type { EntityDef } from '../../game/world-registry.ts';
import { WorldRegistry } from '../../game/world-registry.ts';
import { GARDEN_ENTITIES } from './garden.ts';
import { GATES } from './gates.ts';
import { GROUNDS_ENTITIES } from './grounds.ts';
import { HIDEOUT_ENTITIES } from './hideout.ts';
import { HOME_ENTITIES } from './home.ts';
import { HOUSE66_ENTITIES } from './house66.ts';
import { INTERIOR_ENTITIES } from './interior.ts';
import { LANE_ENTITIES } from './lane.ts';
import { RITUAL_ENTITIES } from './ritual.ts';
import { STREET_ENTITIES } from './street.ts';

export { GATES };

export const ALL_ENTITIES: readonly EntityDef[] = [
  ...HOME_ENTITIES,
  ...STREET_ENTITIES,
  ...GARDEN_ENTITIES,
  ...HIDEOUT_ENTITIES,
  ...HOUSE66_ENTITIES,
  ...LANE_ENTITIES,
  ...GROUNDS_ENTITIES,
  ...INTERIOR_ENTITIES,
  ...RITUAL_ENTITIES,
];

/** Builds and validates the registry. Throws with every problem if the content is invalid. */
export function createWorldRegistry(): WorldRegistry {
  return new WorldRegistry(ALL_ENTITIES, GATES);
}
