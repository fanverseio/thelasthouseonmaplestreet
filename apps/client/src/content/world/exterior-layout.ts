/**
 * Greybox layout of the exterior scene (level-manifest.md section 1). Data only.
 * Coordinates are metres: +X east, +Z south, the origin is the middle of the neighbourhood.
 * Positions are approximate and meant to be tuned by eye. The view draws `BOXES` and `VEILS`;
 * collision is derived here so headless tests can walk the same map.
 */
import type { EntityId, ProgressFlag } from '@tlh/shared';
import { aabb, type Collider } from '../../game/collision.ts';
import { isGateOpen } from '../../game/gates.ts';
import { GATES } from './gates.ts';
import { outbuildingColliders } from './grounds-layout.ts';
import { HOME_START, homeColliders } from './home-layout.ts';

export const MAP_HALF_X = 70;
export const MAP_HALF_Z = 45;
/** Colliders sit this far inside the fog wall. */
export const FOG_MARGIN = 2;

/** Elena starts in the hall of No. 12, by Felix's bedroom doorway (spawn.home.start). */
export const HOME_SPAWN = HOME_START;

export interface GreyBox {
  id: string;
  /** Centre. */
  x: number;
  z: number;
  /** Footprint size. */
  w: number;
  d: number;
  h: number;
  color: string;
  solid: boolean;
}

const box = (id: string, x: number, z: number, w: number, d: number, h: number, color: string, solid = true): GreyBox => ({
  id,
  x,
  z,
  w,
  d,
  h,
  color,
  solid,
});

/** Houses, the green, fences. Debug colours: homes warm grey, key places tinted. */
export const BOXES: readonly GreyBox[] = [
  // Middle block: Maple Green (old oak, bandstand, swing, lamp live inside it later).
  box('green', 0, 0, 100, 50, 0.6, '#1d2a1c'),
  // South arc, outer edge
  // No. 12 (house.home) is hollow: see home-layout.ts.
  box('house.south_a', 5, 41, 12, 8, 6, '#4f4a45'),
  box('house.south_b', 30, 41, 12, 8, 6, '#4f4a45'),
  // East side: No. 31 (Briggs) and garage
  box('house.no31', 66, 2, 8, 14, 6, '#5a3f3f'),
  box('garage.no31', 66, 16, 8, 8, 4, '#6a5a3a'),
  // North arc
  box('house.no40', 50, -41, 14, 8, 5, '#3f4a5a'),
  box('shed.no40', 62, -34, 3, 3, 2.4, '#5a4f3a'), // Gartner's hideout (its door faces south)
  box('house.north_a', 20, -41, 12, 8, 6, '#4f4a45'),
  box('house66', -60, -40, 14, 8, 6, '#4a3f5a'),
  box('fusebox.house66', -52, -36, 1, 1, 1.4, '#c9a227', false),
  box('yard.house66', -58, -29.5, 20, 12, 0.05, '#242a22', false), // the Watcher's yard, ground only
  // West: Elena's back garden fence and the Last House
  box('fence.back_garden', -66, 12, 0.4, 14, 1.4, '#5a5a4a'),
  box('house.last', -62, 40, 12, 8, 9, '#2a1f2f'),
  // The outbuilding is hollow: see grounds-layout.ts.
];

export interface Veil {
  gate: EntityId;
  opensOn: ProgressFlag | null;
  /** Centre and size of the smoke wall. */
  x: number;
  z: number;
  w: number;
  d: number;
}

/** Smoke veils and the chained iron gate. They block until their flag is set. */
export const VEILS: readonly Veil[] = [
  { gate: 'gate.street.veil_east' as EntityId, opensOn: 'seq1_done', x: 36, z: 32.5, w: 1.5, d: 23 },
  { gate: 'gate.street.veil_garden' as EntityId, opensOn: 'seq2_done', x: 59.5, z: 24, w: 21, d: 1.5 },
  { gate: 'gate.street.veil_north' as EntityId, opensOn: 'seq3_done', x: 59.5, z: -22, w: 21, d: 1.5 },
  { gate: 'gate.street.veil_house66' as EntityId, opensOn: 'seq4_done', x: -12, z: -32.5, w: 1.5, d: 23 },
  { gate: 'gate.house66.lane' as EntityId, opensOn: 'lane_open', x: -59.5, z: -22, w: 21, d: 1.5 },
  { gate: 'gate.street.last_house_road' as EntityId, opensOn: null, x: -46, z: 32.5, w: 1.5, d: 23 },
];

const OUTER_WALL = 0.5;

/** Fixed walls: the outer boundary 2 m inside the fog wall, and every solid box. */
export function staticColliders(): Collider[] {
  const x = MAP_HALF_X - FOG_MARGIN;
  const z = MAP_HALF_Z - FOG_MARGIN;
  const walls: Collider[] = [
    aabb(-x - OUTER_WALL, -z - OUTER_WALL, -x, z + OUTER_WALL),
    aabb(x, -z - OUTER_WALL, x + OUTER_WALL, z + OUTER_WALL),
    aabb(-x - OUTER_WALL, -z - OUTER_WALL, x + OUTER_WALL, -z),
    aabb(-x - OUTER_WALL, z, x + OUTER_WALL, z + OUTER_WALL),
  ];
  for (const b of BOXES) {
    if (b.solid) walls.push(aabb(b.x - b.w / 2, b.z - b.d / 2, b.x + b.w / 2, b.z + b.d / 2));
  }
  return walls;
}

/** The front door of No. 12 follows its gate in the manifest (locket_taken). */
export function homeDoorOpen(flags: readonly ProgressFlag[]): boolean {
  const gate = GATES.find((g) => g.id === 'door.home.front');
  return gate !== undefined && isGateOpen(gate, flags);
}

export function veilIsOpen(veil: Veil, flags: readonly ProgressFlag[]): boolean {
  return veil.opensOn !== null && flags.includes(veil.opensOn);
}

/** The outbuilding door follows its gate in the manifest (padlock_open). */
export function outbuildingDoorOpen(flags: readonly ProgressFlag[]): boolean {
  const gate = GATES.find((g) => g.id === 'door.grounds.outbuilding');
  return gate !== undefined && isGateOpen(gate, flags);
}

/** All colliders for the current flags: static walls plus every veil that is still closed. */
export function exteriorColliders(flags: readonly ProgressFlag[]): Collider[] {
  const list = [...staticColliders(), ...homeColliders(homeDoorOpen(flags)), ...outbuildingColliders(outbuildingDoorOpen(flags))];
  for (const v of VEILS) {
    if (!veilIsOpen(v, flags)) {
      list.push(aabb(v.x - v.w / 2, v.z - v.d / 2, v.x + v.w / 2, v.z + v.d / 2));
    }
  }
  return list;
}
