/**
 * Placeholder hand animation (task 5.11), a pure function of the spell state so it can be tested without a canvas.
 * Positions and rotations are relative to the hand group that hangs in front of the camera (scene/hands.tsx).
 *  - Arcane Bolt: a quick flick of the right hand (pitch up and forward, then back).
 *  - Purify: both palms open and forward while the channel runs.
 *  - Ward: the left forearm raised across the view while the Ward is up.
 */

export type Vec3Tuple = [number, number, number];

export interface HandTransform {
  pos: Vec3Tuple;
  rot: Vec3Tuple;
  /** 1 = relaxed, above 1 = fingers spread (the box widens). */
  spread: number;
}

export interface HandPose {
  left: HandTransform;
  right: HandTransform;
}

export interface HandPoseInput {
  /** 0..1 progress of the bolt flick, or null when none is running. */
  flick: number | null;
  /** 0..1 charge of a held Arcane Bolt. */
  charge: number;
  channeling: boolean;
  wardUp: boolean;
  /** Seconds, for the idle sway. */
  t: number;
}

export const FLICK_SECONDS = 0.28;

const IDLE_LEFT: HandTransform = { pos: [-0.22, 0, 0], rot: [0.2, 0.15, 0], spread: 1 };
const IDLE_RIGHT: HandTransform = { pos: [0.22, 0, 0], rot: [0.2, -0.15, 0], spread: 1 };

/** Ease out then back: 0 -> 1 -> 0 over p in 0..1. */
const pulse = (p: number): number => Math.sin(Math.PI * Math.min(1, Math.max(0, p)));

export function handPose(i: HandPoseInput): HandPose {
  const sway = Math.sin(i.t * 1.6) * 0.004;
  const left: HandTransform = { pos: [...IDLE_LEFT.pos], rot: [...IDLE_LEFT.rot], spread: 1 };
  const right: HandTransform = { pos: [...IDLE_RIGHT.pos], rot: [...IDLE_RIGHT.rot], spread: 1 };
  left.pos[1] += sway;
  right.pos[1] += sway;

  // Bolt: a held charge pulls the right hand back, the flick throws it forward.
  if (i.charge > 0) {
    right.pos[2] += 0.05 * i.charge;
    right.rot[0] = 0.2 + 0.5 * i.charge;
  }
  if (i.flick !== null) {
    const f = pulse(i.flick);
    right.pos[1] += 0.06 * f;
    right.pos[2] -= 0.1 * f;
    right.rot[0] = 0.2 - 0.95 * f;
  }

  // Purify: both palms open, turned to face forward, held out a little.
  if (i.channeling) {
    left.pos = [-0.28, 0.07, -0.08];
    left.rot = [-1.2, 0.35, -0.3];
    left.spread = 1.6;
    right.pos = [0.28, 0.07, -0.08];
    right.rot = [-1.2, -0.35, 0.3];
    right.spread = 1.6;
  }

  // Ward: the left forearm raised across the view (wins over the Purify pose for that hand).
  if (i.wardUp) {
    left.pos = [-0.1, 0.2, -0.1];
    left.rot = [-1.35, -0.1, 0.25];
    left.spread = 1.2;
  }
  return { left, right };
}
