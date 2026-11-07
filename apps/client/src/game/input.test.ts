import { describe, expect, it } from 'vitest';
import { InputController, stepPointerLock } from './input.ts';

describe('InputController', () => {
  it('maps keys by code to axes and sprint', () => {
    const i = new InputController();
    i.keyDown('KeyW');
    i.keyDown('KeyD');
    i.keyDown('ShiftLeft');
    expect(i.state).toMatchObject({ moveZ: 1, moveX: 1, sprint: true });
    i.keyUp('KeyW');
    expect(i.state.moveZ).toBe(0);
  });

  it('opposite keys cancel', () => {
    const i = new InputController();
    i.keyDown('KeyA');
    i.keyDown('KeyD');
    expect(i.state.moveX).toBe(0);
  });

  it('edges last one frame and ignore key repeat', () => {
    const i = new InputController();
    i.keyDown('KeyE');
    i.keyDown('KeyE', true);
    expect(i.state.interactPressed).toBe(true);
    i.endFrame();
    expect(i.state.interactPressed).toBe(false);
  });

  it('distinguishes LMB tap from hold', () => {
    const i = new InputController();
    i.mouseDown(0);
    i.tick(100);
    i.mouseUp(0);
    expect(i.state.lmbTap).toBe(true);
    i.endFrame();
    i.mouseDown(0);
    i.tick(400);
    i.mouseUp(0);
    expect(i.state.lmbTap).toBe(false);
    expect(i.state.lmbReleased).toBe(true);
  });

  it('tracks E hold and resets on release', () => {
    const i = new InputController();
    i.keyDown('KeyE');
    i.tick(500);
    expect(i.state.interactHeldMs).toBe(500);
    i.keyUp('KeyE');
    i.tick(16);
    expect(i.state.interactHeldMs).toBe(0);
  });

  it('releaseAll clears held input', () => {
    const i = new InputController();
    i.keyDown('KeyW');
    i.mouseDown(0);
    i.releaseAll();
    expect(i.state).toMatchObject({ moveZ: 0, lmbDown: false });
  });
});

describe('stepPointerLock', () => {
  it('pauses on loss, blur and hidden tab while locked', () => {
    for (const ev of ['lock_released', 'window_blur', 'tab_hidden'] as const) {
      expect(stepPointerLock('locked', ev)).toEqual({ state: 'lost', pause: true, requestLock: false });
    }
  });

  it('requests lock only on user click', () => {
    expect(stepPointerLock('lost', 'user_click').requestLock).toBe(true);
    expect(stepPointerLock('unlocked', 'user_click').requestLock).toBe(true);
    expect(stepPointerLock('locked', 'user_click').requestLock).toBe(false);
    for (const ev of ['lock_released', 'window_blur', 'tab_hidden', 'lock_acquired'] as const) {
      expect(stepPointerLock('lost', ev).requestLock).toBe(false);
    }
  });

  it('resumes when lock is acquired', () => {
    expect(stepPointerLock('lost', 'lock_acquired')).toEqual({ state: 'locked', pause: false, requestLock: false });
  });

  it('stays paused while lost', () => {
    expect(stepPointerLock('lost', 'window_blur').pause).toBe(true);
  });
});
