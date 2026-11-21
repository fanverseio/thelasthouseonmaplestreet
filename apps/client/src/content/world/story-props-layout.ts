/**
 * Layout data for the small story props drawn by scene/story-props.tsx (view only): Gartner's shed, the "66" door of
 * House 66, the outbuilding padlock and the front door of the Last House. Metres, same frame
 * as exterior-layout.ts. Colliders are unchanged (the shed stays a solid box; Elena sees inside through the open door).
 * The state helpers are pure functions of flags, so tests can check them headless.
 */
import type { ProgressFlag } from '@tlh/shared';
import { isGateOpen } from '../../game/gates.ts';
import { GATES } from './gates.ts';

/** shed.no40 in exterior-layout.ts: x 60.5-63.5, z -35.5..-32.5. The front (door side) faces +z, the street. */
export const SHED = {
  minX: 60.5,
  maxX: 63.5,
  minZ: -35.5,
  maxZ: -32.5,
  height: 2.4,
  /** The doorway: hinge on the west jamb, 1 m wide. */
  doorMinX: 61.5,
  doorMaxX: 62.5,
  doorHeight: 2,
  /** Gartner sits inside, a step behind the doorway (placements.ts `npc.hideout.gartner`). */
  gartner: { x: 62, z: -33.8 },
  /** The bulb hangs from the roof (placements.ts `light.hideout.shed_bulb`). */
  bulb: { x: 62, y: 2.15, z: -34 },
} as const;

export const SHED_SEQUENCE = 'seq4_gartner_confession';

/** The shed door is shut until Elena knocks (the confession starts), and stays open afterwards. */
export function shedDoorOpen(flags: readonly ProgressFlag[], activeSequence: string | null): boolean {
  return flags.includes('seq4_done') || activeSequence === SHED_SEQUENCE;
}

/** House 66: house66 box x -67..-53, z -44..-36; its front (yard side) faces +z. */
export const HOUSE66_DOOR = { x: -60, z: -36, width: 1.2, height: 2.2, plaqueY: 1.7 } as const;

/** The padlock hangs on the outbuilding door (north wall z 27..27.4), on the outside face. */
export const PADLOCK = { x: -52, y: 1.15, z: 26.9 } as const;

/**
 * The Last House front door: house.last box x -68..-56, z 36..44; the door faces -z (the grounds). It fills the pointed
 * opening of the stone surround in last_house_ext.glb (build_last_house_v2.py: width 1.2, porch top 0.34, spring line
 * 2.3, a lancet head of radius 1.25 x width, so the apex is 1.2 m above the spring line); the leaf is drawn by the game
 * so it can swing. `height` is sill to apex.
 */
export const LAST_HOUSE_DOOR = { x: -62, z: 36, width: 1.2, sill: 0.34, spring: 2.3, archK: 1.25, height: 3.16, hingeX: -62.6, ajarRad: 0.6 } as const;

/** The outline of the pointed door, in leaf space (x from the hinge, 0..width; y from the sill), bottom-left first. */
export function lastHouseDoorOutline(steps = 8): [number, number][] {
  const { width: w, spring, sill, archK } = LAST_HOUSE_DOOR;
  const r = archK * w;
  const s = spring - sill;
  const aEnd = Math.asin(Math.sqrt(r * r - (r - w / 2) ** 2) / r);
  const pts: [number, number][] = [[0, 0], [w, 0], [w, s]];
  for (let i = 1; i <= steps; i++) {
    const a = (aEnd * i) / steps;
    pts.push([w - r + r * Math.cos(a), s + r * Math.sin(a)]);
  }
  for (let i = steps - 1; i >= 0; i--) {
    const a = (aEnd * i) / steps;
    pts.push([r - r * Math.cos(a), s + r * Math.sin(a)]);
  }
  return pts;
}

/** Once runes_done opens the front door gate, the door stands ajar with a glow in the crack. Gate-driven, never set by view code. */
export function lastHouseDoorAjar(flags: readonly ProgressFlag[]): boolean {
  const gate = GATES.find((g) => g.id === 'door.grounds.last_house_front');
  return gate !== undefined && isGateOpen(gate, flags);
}
