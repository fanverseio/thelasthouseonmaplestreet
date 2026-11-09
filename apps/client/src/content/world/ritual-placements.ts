/**
 * Placements for the three ritual anchors (Beat 11), in the interior-layout.ts frame (scene `last_house`).
 * Each stands in the middle of its anchor room, behind the door that opens on `seq6_done`:
 * north room x -4..4, z -44..-30; east room x 12..24, z -22..-14; west room x -24..-12, z -22..-14.
 * Spread into PLACEMENTS (placements.ts) after the Last House rows.
 */
import type { EntityId } from '@tlh/shared';
import type { Placement } from './placements.ts';

export const RITUAL_PLACEMENTS: Readonly<Record<EntityId, Placement>> = {
  'anchor.ritual.north': { x: 0, z: -40, r: 0.6 },
  'anchor.ritual.east': { x: 20, z: -18, r: 0.6 },
  'anchor.ritual.west': { x: -20, z: -18, r: 0.6 },
  // Smoke-wraith spawn points in the ritual chamber corners (x -12..12, z -30..-6); the director picks one (task 5.10).
  'spawn.ritual.wraith_1': { x: -9, z: -26, r: 0.5 },
  'spawn.ritual.wraith_2': { x: 9, z: -26, r: 0.5 },
  'spawn.ritual.wraith_3': { x: -9, z: -9, r: 0.5 },
  'spawn.ritual.wraith_4': { x: 9, z: -9, r: 0.5 },
};
