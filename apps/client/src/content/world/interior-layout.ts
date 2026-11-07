/**
 * Greybox layout of the `last_house` scene (zones `interior` and `ritual`). Data only.
 * Local coordinates: the player enters at `INTERIOR_SPAWN` and the ritual chamber lies to the -Z side.
 * Rooms: entrance hall and cellar-stair room (+Z), ritual chamber with the central seal,
 * and three anchor rooms (north, east, west) behind doors that open from flags.
 */
import type { EntityId, ProgressFlag } from '@tlh/shared';
import { aabb, cylinder, type Collider } from '../../game/collision.ts';

export const INTERIOR_SPAWN = { x: 0, z: 20, yaw: 0 } as const;
export const SEAL_POSITION = { x: 0, z: -18 } as const;
export const WALL_HEIGHT = 3.2;
const T = 0.4; // wall thickness

export interface Wall {
  id: string;
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

const wallX = (id: string, x: number, z1: number, z2: number): Wall => ({ id, minX: x - T / 2, maxX: x + T / 2, minZ: Math.min(z1, z2), maxZ: Math.max(z1, z2) });
const wallZ = (id: string, z: number, x1: number, x2: number): Wall => ({ id, minX: Math.min(x1, x2), maxX: Math.max(x1, x2), minZ: z - T / 2, maxZ: z + T / 2 });

export const WALLS: readonly Wall[] = [
  // Entrance hall and cat room (x -8..8, z -6..24)
  wallZ('hall.south', 24, -8, 8),
  wallX('hall.west', -8, -6, 24),
  wallX('hall.east', 8, -6, 24),
  // Cellar stair landing in front of the ritual door (x -3..3, z -6..-1.5); the cat guards it
  wallX('stair.west', -3, -6, -1.5),
  wallX('stair.east', 3, -6, -1.5),
  // Ritual chamber (x -12..12, z -30..-6); door gaps are 3 m wide
  wallZ('chamber.south_w', -6, -12, -1.5),
  wallZ('chamber.south_e', -6, 1.5, 12),
  wallX('chamber.west_a', -12, -30, -19.5),
  wallX('chamber.west_b', -12, -16.5, -6),
  wallX('chamber.east_a', 12, -30, -19.5),
  wallX('chamber.east_b', 12, -16.5, -6),
  wallZ('chamber.north_w', -30, -12, -1.5),
  wallZ('chamber.north_e', -30, 1.5, 12),
  // North anchor room (x -4..4, z -44..-30)
  wallX('north.west', -4, -44, -30),
  wallX('north.east', 4, -44, -30),
  wallZ('north.end', -44, -4, 4),
  // East anchor room (x 12..24, z -22..-14)
  wallZ('east.north', -22, 12, 24),
  wallZ('east.south', -14, 12, 24),
  wallX('east.end', 24, -22, -14),
  // West anchor room (x -24..-12, z -22..-14)
  wallZ('west.north', -22, -24, -12),
  wallZ('west.south', -14, -24, -12),
  wallX('west.end', -24, -22, -14),
];

/** Greybox cellar steps on the landing (visual only, no collision): z from the hall edge down to the door. */
export const STAIR_STEPS: readonly { z: number; shade: string }[] = [
  { z: -2.3, shade: '#4a3f36' },
  { z: -3.1, shade: '#3d342d' },
  { z: -3.9, shade: '#302923' },
  { z: -4.7, shade: '#241f1a' },
];

/** Greybox furniture, visual only (the usable props are drawn from the placements by scene/interactables.tsx). */
export const HALL_FURNITURE: readonly { id: string; x: number; z: number; w: number; d: number; h: number; color: string }[] = [
  { id: 'rug.hall', x: 0, z: 10, w: 6, d: 14, h: 0.03, color: '#3a1f24' },
  { id: 'piano', x: -6, z: 20, w: 1.6, d: 0.9, h: 1.1, color: '#1d1a1a' },
];

export interface InteriorDoor {
  gate: EntityId;
  opensOn: ProgressFlag;
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export const DOORS: readonly InteriorDoor[] = [
  { gate: 'door.interior.ritual' as EntityId, opensOn: 'board_solved', minX: -1.5, maxX: 1.5, minZ: -6 - T / 2, maxZ: -6 + T / 2 },
  { gate: 'door.ritual.north' as EntityId, opensOn: 'seq6_done', minX: -1.5, maxX: 1.5, minZ: -30 - T / 2, maxZ: -30 + T / 2 },
  { gate: 'door.ritual.east' as EntityId, opensOn: 'seq6_done', minX: 12 - T / 2, maxX: 12 + T / 2, minZ: -19.5, maxZ: -16.5 },
  { gate: 'door.ritual.west' as EntityId, opensOn: 'seq6_done', minX: -12 - T / 2, maxX: -12 + T / 2, minZ: -19.5, maxZ: -16.5 },
];

export function doorIsOpen(door: InteriorDoor, flags: readonly ProgressFlag[]): boolean {
  return flags.includes(door.opensOn);
}

/** Static walls, the central seal, and every door that is still closed. */
export function interiorColliders(flags: readonly ProgressFlag[]): Collider[] {
  const list: Collider[] = WALLS.map((w) => aabb(w.minX, w.minZ, w.maxX, w.maxZ));
  list.push(cylinder(SEAL_POSITION.x, SEAL_POSITION.z, 1.5));
  for (const d of DOORS) if (!doorIsOpen(d, flags)) list.push(aabb(d.minX, d.minZ, d.maxX, d.maxZ));
  return list;
}
