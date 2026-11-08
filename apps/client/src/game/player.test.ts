import { describe, expect, it } from 'vitest';
import { aabb } from './collision.ts';
import { createInputState } from './input.ts';
import { createPlayerBody, faceFront, FixedStepper, PITCH_LIMIT, SIM_DT, stepPlayer } from './player.ts';

function run(frameRate: number, seconds: number, forward = 1, sprint = false) {
  const body = createPlayerBody();
  const input = createInputState();
  input.moveZ = forward;
  input.sprint = sprint;
  const stepper = new FixedStepper();
  const frames = Math.round(frameRate * seconds);
  for (let i = 0; i < frames; i++) stepper.advance(1 / frameRate, (dt) => stepPlayer(body, input, dt));
  return body;
}

describe('stepPlayer', () => {
  it('walks at 4 m/s and sprints at 7 m/s (facing -Z)', () => {
    expect(run(60, 1).z).toBeCloseTo(-4, 1);
    expect(run(60, 1, 1, true).z).toBeCloseTo(-7, 1);
  });

  it('gives the same position at different frame rates', () => {
    const a = run(30, 2);
    const b = run(60, 2);
    const c = run(144, 2);
    expect(a.z).toBeCloseTo(b.z, 1);
    expect(c.z).toBeCloseTo(b.z, 1);
  });

  it('normalises diagonal movement', () => {
    const body = createPlayerBody();
    const input = createInputState();
    input.moveX = 1;
    input.moveZ = 1;
    stepPlayer(body, input, 1);
    expect(Math.hypot(body.x, body.z)).toBeCloseTo(4, 5);
  });

  it('clamps pitch', () => {
    const body = createPlayerBody();
    const input = createInputState();
    input.lookDY = -1e6;
    stepPlayer(body, input, SIM_DT);
    expect(body.pitch).toBe(PITCH_LIMIT);
    input.lookDY = 1e6;
    stepPlayer(body, input, SIM_DT);
    expect(body.pitch).toBe(-PITCH_LIMIT);
  });

  it('moves relative to yaw', () => {
    const body = createPlayerBody(0, 0, Math.PI / 2);
    const input = createInputState();
    input.moveZ = 1;
    stepPlayer(body, input, 1);
    expect(body.x).toBeCloseTo(-4, 5);
    expect(body.z).toBeCloseTo(0, 5);
  });

  it('is blocked by colliders', () => {
    const body = createPlayerBody();
    const input = createInputState();
    input.moveZ = 1;
    input.sprint = true;
    const colliders = [aabb(-5, -3.1, 5, -3)];
    for (let i = 0; i < 120; i++) stepPlayer(body, input, SIM_DT, { colliders });
    expect(body.z).toBeGreaterThan(-3);
  });
});

describe('FixedStepper', () => {
  it('runs the right number of steps and caps stalls', () => {
    const s = new FixedStepper();
    let n = 0;
    s.advance(1, () => n++);
    expect(n).toBe(15);
    n = 0;
    s.advance(SIM_DT * 3, () => n++);
    expect(n).toBe(3);
  });
});

describe('faceFront', () => {
  it('levels the view and snaps to the nearest of 8 directions', () => {
    const body = createPlayerBody(3, 4, 0.3); // a bit left of north
    body.pitch = 0.9;
    faceFront(body);
    expect(body.pitch).toBe(0);
    expect(body.yaw).toBeCloseTo(0, 9);
    body.yaw = Math.PI / 4 + 0.3; // nearer NW than W
    faceFront(body);
    expect(body.yaw).toBeCloseTo(Math.PI / 4, 9);
    body.yaw = -2.9; // near south, the other way round
    faceFront(body);
    expect(body.yaw).toBeCloseTo(-Math.PI, 9);
    expect([body.x, body.z]).toEqual([3, 4]); // position never changes
  });
});
