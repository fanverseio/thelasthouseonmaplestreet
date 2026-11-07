/**
 * Greybox of No. 12, Elena's home (level-manifest.md, zone `home`). Data only, metres.
 * The house sits on the south arc: footprint x -27..-13, z 34..43, front (street side) to the north.
 * Rooms west to east: Felix's bedroom, the hall (front door, drawer table), the kitchen.
 * Doorways between rooms are 3 m wide so the 1 m grid reachability tests can walk through them.
 */
import { aabb, type Collider } from '../../game/collision.ts';

export const HOME_BOUNDS = { minX: -27, maxX: -13, minZ: 34, maxZ: 43 } as const;
export const HOME_WALL_HEIGHT = 3.2;

/** Elena starts in the hall, just outside the bedroom doorway (facing west into the bedroom). */
export const HOME_START = { x: -22, z: 39, yaw: Math.PI / 2 } as const;
/** Just outside the front door, on the porch (cp_street respawn). */
export const HOME_PORCH = { x: -19.5, z: 32.5, yaw: 0 } as const;

export interface WallRect {
  id: string;
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

const w = (id: string, minX: number, minZ: number, maxX: number, maxZ: number): WallRect => ({ id, minX, minZ, maxX, maxZ });

/** Walls that are always there. The front doorway (x -21..-18 in the north wall) is left open here. */
export const HOME_WALLS: readonly WallRect[] = [
  w('home.wall.north_w', -27, 34, -21, 34.4),
  w('home.wall.north_e', -18, 34, -13, 34.4),
  w('home.wall.south', -27, 42.6, -13, 43),
  w('home.wall.west', -27, 34.4, -26.6, 42.6),
  w('home.wall.east', -13.4, 34.4, -13, 42.6),
  // Divider bedroom | hall, doorway z 37.5..40.5
  w('home.wall.div1_n', -23.2, 34.4, -22.8, 37.5),
  w('home.wall.div1_s', -23.2, 40.5, -22.8, 42.6),
  // Divider hall | kitchen, doorway z 37.5..40.5
  w('home.wall.div2_n', -17.2, 34.4, -16.8, 37.5),
  w('home.wall.div2_s', -17.2, 40.5, -16.8, 42.6),
];

/** The front door: fills the doorway while gate `door.home.front` is closed. */
export const HOME_FRONT_DOOR: WallRect = w('home.door.front', -21, 34, -18, 34.4);

export function homeColliders(doorOpen: boolean): Collider[] {
  const rects = doorOpen ? HOME_WALLS : [...HOME_WALLS, HOME_FRONT_DOOR];
  return rects.map((r) => aabb(r.minX, r.minZ, r.maxX, r.maxZ));
}
