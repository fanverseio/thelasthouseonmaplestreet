/**
 * Greybox of Rosalind's outbuilding ("Gran's old carriage house") in the Last House grounds
 * (level-manifest.md, zone `grounds`). Data only, metres, same frame as exterior-layout.ts.
 * Hollow: x -56..-48, z 27..33, walls 0.4 thick, a 3 m doorway in the north wall that is filled
 * while gate `door.grounds.outbuilding` is closed (padlock_open). The antique mirror hangs on the
 * south wall; the three mirror runes sit on the inside walls.
 */
import { aabb, type Collider } from '../../game/collision.ts';
import type { WallRect } from './home-layout.ts';

export const OUTBUILDING_BOUNDS = { minX: -56, maxX: -48, minZ: 27, maxZ: 33 } as const;
export const OUTBUILDING_WALL_HEIGHT = 3;
/** Just outside the door (cp_outbuilding respawn). */
export const OUTBUILDING_PORCH = { x: -52, z: 25.5, yaw: Math.PI } as const;
/** The mirror plane: centre, width, height and bottom edge. It faces north (into the room). Wide enough that all three runes show from the middle of the room (note 17). */
export const MIRROR_PLANE = { x: -52, z: 32.58, width: 6, height: 2.2, bottom: 0.3 } as const;

/** Each rune is drawn flat on the inside wall nearest its spot: [x, z, rotation about Y]. View data. */
export const RUNE_WALL = {
  'rune.grounds.r1': { x: -54.5, z: 27.42, ry: 0 },
  'rune.grounds.r2': { x: -49.5, z: 27.42, ry: 0 },
  'rune.grounds.r3': { x: -48.42, z: 31.5, ry: -Math.PI / 2 },
} as const;

/** True when a viewer at (x, z) sees the rune's reflection inside the mirror's width (flat mirror, image behind it). */
export function runeVisibleInMirror(viewer: { x: number; z: number }, rune: { x: number; z: number }): boolean {
  const imageZ = 2 * MIRROR_PLANE.z - rune.z;
  if (viewer.z >= MIRROR_PLANE.z) return false; // behind the mirror
  const t = (MIRROR_PLANE.z - viewer.z) / (imageZ - viewer.z);
  const hitX = viewer.x + (rune.x - viewer.x) * t;
  return Math.abs(hitX - MIRROR_PLANE.x) <= MIRROR_PLANE.width / 2;
}

const w = (id: string, minX: number, minZ: number, maxX: number, maxZ: number): WallRect => ({ id, minX, minZ, maxX, maxZ });

export const OUTBUILDING_WALLS: readonly WallRect[] = [
  w('outbuilding.wall.north_w', -56, 27, -53.5, 27.4),
  w('outbuilding.wall.north_e', -50.5, 27, -48, 27.4),
  w('outbuilding.wall.south', -56, 32.6, -48, 33),
  w('outbuilding.wall.west', -56, 27.4, -55.6, 32.6),
  w('outbuilding.wall.east', -48.4, 27.4, -48, 32.6),
];

/** The door: fills the doorway while gate `door.grounds.outbuilding` is closed. */
export const OUTBUILDING_DOOR: WallRect = w('outbuilding.door', -53.5, 27, -50.5, 27.4);

export function outbuildingColliders(doorOpen: boolean): Collider[] {
  const rects = doorOpen ? OUTBUILDING_WALLS : [...OUTBUILDING_WALLS, OUTBUILDING_DOOR];
  return rects.map((r) => aabb(r.minX, r.minZ, r.maxX, r.maxZ));
}
