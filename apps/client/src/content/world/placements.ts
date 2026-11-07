/**
 * Where each entity stands in the exterior scene (metres, same frame as exterior-layout.ts).
 * `r` is the entity's footprint: the trigger radius for `trg.*`, half the greybox size otherwise.
 * Later beats only add rows here. Tests check every ID exists in the registry and stands on free ground.
 */
import type { EntityId } from '@tlh/shared';

export interface Placement {
  x: number;
  z: number;
  r: number;
}

export const PLACEMENTS: Readonly<Record<EntityId, Placement>> = {
  // Beat 1: No. 12 (home-layout.ts has the walls)
  'spawn.home.start': { x: -22, z: 39, r: 0.5 },
  'trg.home.bedroom': { x: -25, z: 39, r: 1.8 },
  'clue.home.drawing': { x: -26, z: 37.6, r: 0.4 },
  'clue.home.costume': { x: -25.6, z: 41.4, r: 0.4 },
  'prop.home.pumpkin_jar': { x: -14.2, z: 36.5, r: 0.4 },
  'pickup.home.drawer_key': { x: -14.2, z: 36.5, r: 0.15 },
  'socket.home.drawer': { x: -17.8, z: 37, r: 0.45 },
  'clue.home.journal_1': { x: -17.8, z: 37, r: 0.2 },
  'door.home.front': { x: -19.5, z: 34.8, r: 0.5 },
  'light.home.felix_window': { x: -26, z: 40.5, r: 0.3 },
};

export function placementOf(id: EntityId): Placement | undefined {
  return PLACEMENTS[id];
}
