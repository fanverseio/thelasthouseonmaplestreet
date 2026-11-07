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
  // Beats 2-3: Maple Street south arc, then the intersection (east of the veil at x 36)
  'trg.street.seq1': { x: -9, z: 30, r: 8 },
  'trg.street.seq1_end': { x: 31.5, z: 30, r: 6 },
  'light.street.01': { x: -4, z: 27, r: 0.3 },
  'light.street.02': { x: 6, z: 27, r: 0.3 },
  'light.street.03': { x: 16, z: 27, r: 0.3 },
  'light.street.04': { x: 24, z: 27, r: 0.3 },
  'light.street.05': { x: 30, z: 27, r: 0.3 },
  'light.street.06': { x: 46, z: 27, r: 0.3 },
  'prop.street.window_14': { x: 5, z: 35.8, r: 0.3 },
  'trg.street.streetlight': { x: 57, z: 29.5, r: 3.5 },
  'light.street.intersection': { x: 58, z: 27, r: 0.3 },
  'clue.street.candy_bag': { x: 62, z: 32, r: 0.3 },
  'trg.street.fox': { x: 42, z: 28, r: 4 },
  // Beat 4: No. 31, Mr Briggs' garden (house x 62-70, z -5..9; garage x 62-70, z 12..20)
  'trg.garden.enter': { x: 58, z: 20, r: 2.5 },
  'enemy.garden.briggs': { x: 57, z: 6, r: 0.5 },
  'clue.garden.walkie': { x: 55.5, z: 4.5, r: 0.3 },
  'door.garden.garage': { x: 60.9, z: 14, r: 0.5 },
  'pickup.garden.fuse': { x: 60.9, z: 17, r: 0.2 },
  'light.garden.porch': { x: 60.9, z: 2, r: 0.3 },
  // Beat 5: Gartner's shed behind No. 40 (shed box x 60.5-63.5, z -35.5..-32.5; cp_house66 is at 50, -35)
  'door.hideout.shed': { x: 62, z: -31.9, r: 0.5 },
  'npc.hideout.gartner': { x: 64.2, z: -32, r: 0.3 },
  'clue.hideout.journal_2': { x: 63, z: -31, r: 0.2 },
  'light.hideout.shed_bulb': { x: 61.2, z: -31.7, r: 0.3 },
  // Beat 6: House 66 yard (house x -67..-53, z -44..-36; lane veil at z -22)
  'socket.house66.fusebox': { x: -52, z: -35, r: 0.5 },
  'enemy.house66.watcher': { x: -58, z: -28, r: 0.5 },
  'pickup.house66.fence_key': { x: -56.5, z: -28, r: 0.2 },
  'gate.house66.lane': { x: -59.5, z: -23.6, r: 0.75 },
};

export function placementOf(id: EntityId): Placement | undefined {
  return PLACEMENTS[id];
}
