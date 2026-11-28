import { describe, expect, it } from 'vitest';
import { InputController } from './input.ts';
import {
  MAX_TOUCH_JUMP,
  STICK_DEADZONE,
  TOUCH_LOOK_SCALE,
  detectMobile,
  mobileOverride,
  resolveMobile,
  stickAxes,
  stickKnob,
  touchLookDelta,
  type MobileEnv,
} from './mobile-mode.ts';
import { PITCH_LIMIT, WALK_SPEED, createPlayerBody, stepPlayer } from './player.ts';

const UA = {
  chromeAndroidPhone: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  chromeAndroidTablet: 'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  samsungInternet: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  iPhoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  iPhoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
  iPadOld: 'Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Mobile/15E148 Safari/604.1',
  iPadDesktopSite: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  winChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  linuxFirefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0',
};

const touchOnly = (userAgent: string, maxTouchPoints = 5): MobileEnv => ({ userAgent, maxTouchPoints, coarsePointer: true, hasFinePointer: false });
const mouse = (userAgent: string, maxTouchPoints = 0): MobileEnv => ({ userAgent, maxTouchPoints, coarsePointer: false, hasFinePointer: true });

describe('detectMobile', () => {
  it.each([
    ['Chrome Android phone', touchOnly(UA.chromeAndroidPhone)],
    ['Chrome Android tablet', touchOnly(UA.chromeAndroidTablet)],
    ['Samsung Internet', touchOnly(UA.samsungInternet)],
    ['iPhone Safari', touchOnly(UA.iPhoneSafari)],
    ['iPhone Chrome', touchOnly(UA.iPhoneChrome)],
    ['old iPad UA', touchOnly(UA.iPadOld)],
    ['iPadOS desktop-site UA (Macintosh + touch points)', touchOnly(UA.iPadDesktopSite)],
    ['unknown UA but coarse pointer with touch', touchOnly('SomeBrowser/1.0')],
  ])('%s is mobile', (_, env) => {
    expect(detectMobile(env)).toBe(true);
  });

  it.each([
    ['Windows desktop', mouse(UA.winChrome)],
    ['Mac desktop', mouse(UA.macChrome)],
    ['Linux Firefox', mouse(UA.linuxFirefox)],
    ['Windows touch laptop (touch + fine pointer)', { userAgent: UA.winChrome, maxTouchPoints: 10, coarsePointer: false, hasFinePointer: true }],
    ['touch laptop that reports coarse primary pointer but has a mouse', { userAgent: UA.winChrome, maxTouchPoints: 10, coarsePointer: true, hasFinePointer: true }],
    ['iPad with a trackpad attached', { userAgent: UA.iPadDesktopSite, maxTouchPoints: 5, coarsePointer: false, hasFinePointer: true }],
    ['Android UA with no touch points (desktop emulation)', { userAgent: UA.chromeAndroidPhone, maxTouchPoints: 0, coarsePointer: false, hasFinePointer: false }],
    ['real Mac with no touch', { userAgent: UA.macChrome, maxTouchPoints: 0, coarsePointer: false, hasFinePointer: false }],
    ['desktop UA, one touch point, no coarse pointer', { userAgent: UA.winChrome, maxTouchPoints: 1, coarsePointer: false, hasFinePointer: false }],
  ])('%s stays desktop', (_, env) => {
    expect(detectMobile(env)).toBe(false);
  });
});

describe('override and Settings', () => {
  it('reads ?mobile=1 and ?mobile=0 only', () => {
    expect(mobileOverride('?mobile=1')).toBe('on');
    expect(mobileOverride('?start=street&mobile=0')).toBe('off');
    expect(mobileOverride('?mobile=yes')).toBeNull();
    expect(mobileOverride('')).toBeNull();
  });

  it('URL beats Settings beats detection', () => {
    expect(resolveMobile(false, 'auto', null)).toBe(false);
    expect(resolveMobile(true, 'auto', null)).toBe(true);
    expect(resolveMobile(false, 'on', null)).toBe(true);
    expect(resolveMobile(true, 'off', null)).toBe(false);
    expect(resolveMobile(false, 'off', 'on')).toBe(true);
    expect(resolveMobile(true, 'on', 'off')).toBe(false);
  });

  it('a touch laptop becomes mobile only when forced', () => {
    const laptop = detectMobile({ userAgent: UA.winChrome, maxTouchPoints: 10, coarsePointer: false, hasFinePointer: true });
    expect(resolveMobile(laptop, 'auto', null)).toBe(false);
    expect(resolveMobile(laptop, 'on', null)).toBe(true);
    expect(resolveMobile(laptop, 'auto', 'on')).toBe(true);
  });
});

describe('stick maths', () => {
  const R = 56;
  it('is zero at rest and inside the dead zone', () => {
    expect(stickAxes(0, 0, R)).toEqual({ x: 0, z: 0 });
    expect(stickAxes(R * STICK_DEADZONE * 0.9, 0, R)).toEqual({ x: 0, z: 0 });
  });

  it('up is forward, right is right, and the rim is full speed', () => {
    const up = stickAxes(0, -R, R);
    expect(up.x).toBeCloseTo(0);
    expect(up.z).toBeCloseTo(1);
    const right = stickAxes(R, 0, R);
    expect(right.x).toBeCloseTo(1);
    expect(right.z).toBeCloseTo(0);
  });

  it('clamps past the rim and keeps the output length <= 1 in every direction', () => {
    for (let a = 0; a < Math.PI * 2; a += 0.1) {
      for (const len of [R * 0.3, R * 0.7, R, R * 3]) {
        const v = stickAxes(Math.cos(a) * len, Math.sin(a) * len, R);
        expect(Math.hypot(v.x, v.z)).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
    const far = stickAxes(0, -R * 5, R);
    expect(far.z).toBeCloseTo(1);
  });

  it('rises smoothly from 0 just past the dead zone (no jump)', () => {
    const just = stickAxes(0, -R * (STICK_DEADZONE + 0.01), R);
    expect(just.z).toBeGreaterThan(0);
    expect(just.z).toBeLessThan(0.05);
    expect(stickAxes(0, -R * 0.5, R).z).toBeCloseTo((0.5 - STICK_DEADZONE) / (1 - STICK_DEADZONE));
  });

  it('the knob never leaves the base', () => {
    expect(stickKnob(10, 0, R)).toEqual({ x: 10, y: 0 });
    const k = stickKnob(300, 400, R);
    expect(Math.hypot(k.x, k.y)).toBeCloseTo(R);
  });

  it('half stick walks at half speed; keys still walk at full speed', () => {
    const input = new InputController();
    input.setStick(0, 0.5);
    const body = createPlayerBody(0, 0, 0);
    stepPlayer(body, input.state, 1);
    expect(-body.z).toBeCloseTo(WALK_SPEED * 0.5);

    const keys = new InputController();
    keys.keyDown('KeyW');
    keys.keyDown('KeyD');
    const b2 = createPlayerBody(0, 0, 0);
    stepPlayer(b2, keys.state, 1);
    expect(Math.hypot(b2.x, b2.z)).toBeCloseTo(WALK_SPEED); // the diagonal is still normalised
  });
});

describe('touch input mapping', () => {
  it('the stick replaces WASD while it is off centre, and releaseAll centres it', () => {
    const input = new InputController();
    input.keyDown('KeyW');
    input.setStick(0.3, -0.4);
    expect(input.state.moveX).toBeCloseTo(0.3);
    expect(input.state.moveZ).toBeCloseTo(-0.4);
    input.setStick(0, 0);
    expect(input.state.moveZ).toBe(1); // back to the held key
    input.setStick(1, 0);
    input.releaseAll();
    expect(input.state.moveX).toBe(0);
    expect(input.state.moveZ).toBe(0);
  });

  it('the sprint toggle holds sprint until switched off', () => {
    const input = new InputController();
    input.setSprintLatch(true);
    expect(input.state.sprint).toBe(true);
    input.keyUp('ShiftLeft');
    expect(input.state.sprint).toBe(true);
    input.setSprintLatch(false);
    expect(input.state.sprint).toBe(false);
  });

  it('touch buttons reuse the key edges: E press and hold, T, spells, cast tap and hold', () => {
    const input = new InputController();
    input.keyDown('KeyE');
    expect(input.state.interactPressed).toBe(true);
    input.tick(500);
    input.tick(600);
    expect(input.state.interactHeldMs).toBe(1100); // the same hold the skip logic reads
    input.keyUp('KeyE');
    input.keyDown('KeyT');
    expect(input.state.locketPressed).toBe(true);
    input.keyDown('Digit2');
    expect(input.state.spellPressed).toBe(2);
    input.mouseDown(0);
    input.mouseUp(0);
    expect(input.state.lmbTap).toBe(true);
    input.endFrame();
    input.mouseDown(0);
    input.tick(800);
    input.mouseUp(0);
    expect(input.state.lmbTap).toBe(false);
    expect(input.state.lmbReleased).toBe(true);
  });
});

describe('look drag', () => {
  it('scales by the touch sensitivity and drops jumps', () => {
    expect(touchLookDelta(10, -5, 1)).toEqual({ dx: 10 * TOUCH_LOOK_SCALE, dy: -5 * TOUCH_LOOK_SCALE });
    expect(touchLookDelta(10, 0, 2)!.dx).toBeCloseTo(20 * TOUCH_LOOK_SCALE);
    expect(touchLookDelta(MAX_TOUCH_JUMP + 1, 0, 1)).toBeNull();
    expect(touchLookDelta(0, -(MAX_TOUCH_JUMP + 1), 1)).toBeNull();
  });

  it('a long drag changes yaw but the pitch stays inside the look clamp', () => {
    const input = new InputController();
    const body = createPlayerBody();
    for (let i = 0; i < 200; i++) {
      const d = touchLookDelta(30, -40, 3)!;
      input.touchLook(d.dx, d.dy);
      stepPlayer(body, input.state, 1 / 60);
      input.endFrame();
    }
    expect(body.yaw).not.toBe(0);
    expect(body.pitch).toBeCloseTo(PITCH_LIMIT);
    for (let i = 0; i < 400; i++) {
      input.touchLook(0, 100);
      stepPlayer(body, input.state, 1 / 60);
      input.endFrame();
    }
    expect(body.pitch).toBeCloseTo(-PITCH_LIMIT);
  });

  it('touch look is not cut by the mouse glitch filter (scaled moves can exceed 300 px)', () => {
    const input = new InputController();
    input.touchLook(500, 0);
    expect(input.state.lookDX).toBe(500);
  });
});
