/**
 * Player controller and the fixed 60 Hz step accumulator. Headless: no React or Three imports.
 */
import { moveAndSlide, type Collider } from './collision.ts';
import type { InputState } from './input.ts';

export const SIM_HZ = 60;
export const SIM_DT = 1 / SIM_HZ;
export const WALK_SPEED = 4;
export const SPRINT_SPEED = 7;
export const PLAYER_RADIUS = 0.35;
export const EYE_HEIGHT = 1.65;
export const PITCH_LIMIT = (85 * Math.PI) / 180;
export const MOUSE_SENSITIVITY = 0.0022;
/** Max real time folded into one frame; avoids a spiral of death after a tab stall. */
export const MAX_FRAME_S = 0.25;

export interface PlayerBody {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
}

export function createPlayerBody(x = 0, z = 0, yaw = 0): PlayerBody {
  return { x, z, yaw, pitch: 0 };
}

export interface StepOptions {
  sensitivity?: number;
  colliders?: readonly Collider[];
}

/** Advance the player by one fixed step. Mutates `body`. */
export function stepPlayer(body: PlayerBody, input: InputState, dt: number, opts: StepOptions = {}): void {
  const sens = opts.sensitivity ?? MOUSE_SENSITIVITY;
  body.yaw -= input.lookDX * sens;
  body.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, body.pitch - input.lookDY * sens));

  let mx = input.moveX;
  let mz = input.moveZ;
  const len = Math.hypot(mx, mz);
  if (len > 0) {
    mx /= len;
    mz /= len;
    const speed = input.sprint ? SPRINT_SPEED : WALK_SPEED;
    // yaw 0 faces -Z (Three.js convention); forward = (-sin yaw, -cos yaw), right = (cos yaw, -sin yaw)
    const sin = Math.sin(body.yaw);
    const cos = Math.cos(body.yaw);
    const dx = (-sin * mz + cos * mx) * speed * dt;
    const dz = (-cos * mz - sin * mx) * speed * dt;
    const next = moveAndSlide({ x: body.x, z: body.z }, { x: dx, z: dz }, PLAYER_RADIUS, opts.colliders ?? []);
    body.x = next.x;
    body.z = next.z;
  }
}

/** R key: look level and face the nearest of the 8 compass directions. Mutates `body`. */
export function faceFront(body: PlayerBody): void {
  const step = Math.PI / 4;
  body.yaw = Math.round(body.yaw / step) * step;
  body.pitch = 0;
}

/**
 * Fixed-step accumulator. Feed real frame time; `onStep` runs 0..n times at exactly SIM_DT.
 * Returns the interpolation alpha (0..1) for rendering.
 */
export class FixedStepper {
  private acc = 0;

  advance(frameSeconds: number, onStep: (dt: number) => void): number {
    this.acc += Math.min(Math.max(frameSeconds, 0), MAX_FRAME_S);
    while (this.acc >= SIM_DT - 1e-9) {
      onStep(SIM_DT);
      this.acc -= SIM_DT;
    }
    return Math.max(0, this.acc / SIM_DT);
  }

  reset(): void {
    this.acc = 0;
  }
}
