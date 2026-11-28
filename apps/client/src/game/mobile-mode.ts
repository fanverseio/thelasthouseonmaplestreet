/**
 * Mobile browser mode: detection, the Settings override, and the touch control maths.
 * Headless: no DOM, React or Three. The view reads the browser facts and passes them in.
 */

export const MOBILE_PREFS = ['auto', 'on', 'off'] as const;
export type MobilePref = (typeof MOBILE_PREFS)[number];

export interface MobileEnv {
  /** `(pointer: coarse)`: the primary pointer is a finger. */
  coarsePointer: boolean;
  /** `navigator.maxTouchPoints`. */
  maxTouchPoints: number;
  userAgent: string;
  /** `(any-pointer: fine)`: a mouse or trackpad is present. */
  hasFinePointer: boolean;
}

const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i;

/**
 * True for a phone or tablet. A touch laptop has a fine pointer as well, so it stays desktop
 * (the Settings switch or `?mobile=1` can still force mobile). iPadOS asks for the desktop site with a
 * Mac user agent, so a "Macintosh" with several touch points and no fine pointer counts as a tablet.
 */
export function detectMobile(env: MobileEnv): boolean {
  if (env.hasFinePointer) return false;
  if (env.maxTouchPoints <= 0) return false;
  if (MOBILE_UA.test(env.userAgent)) return true;
  if (/Macintosh/.test(env.userAgent) && env.maxTouchPoints > 1) return true;
  return env.coarsePointer;
}

/** `?mobile=1` forces mobile mode, `?mobile=0` forces desktop. Anything else: no override. */
export function mobileOverride(search: string): 'on' | 'off' | null {
  const v = new URLSearchParams(search).get('mobile');
  if (v === '1') return 'on';
  if (v === '0') return 'off';
  return null;
}

/** The URL wins, then the Settings switch, then detection. */
export function resolveMobile(detected: boolean, pref: MobilePref, override: 'on' | 'off' | null): boolean {
  const choice = override ?? pref;
  if (choice === 'on') return true;
  if (choice === 'off') return false;
  return detected;
}

/* ---------------- Move stick ---------------- */

/** Fraction of the stick radius that counts as no input. */
export const STICK_DEADZONE = 0.15;

/**
 * Thumb offset from the stick centre (px, screen axes: +y down) -> movement axes in -1..1
 * (x: right, z: forward). The length is clamped to the radius, the dead zone is removed and the rest
 * is rescaled so the output starts at 0 just past the dead zone and reaches 1 at the rim.
 */
export function stickAxes(dx: number, dy: number, radius: number, deadzone = STICK_DEADZONE): { x: number; z: number } {
  const len = Math.hypot(dx, dy);
  if (radius <= 0 || len === 0) return { x: 0, z: 0 };
  const n = Math.min(1, len / radius);
  if (n <= deadzone) return { x: 0, z: 0 };
  const scaled = (n - deadzone) / (1 - deadzone);
  return { x: (dx / len) * scaled, z: (-dy / len) * scaled };
}

/** Knob position for drawing: the thumb offset clamped to the stick radius. */
export function stickKnob(dx: number, dy: number, radius: number): { x: number; y: number } {
  const len = Math.hypot(dx, dy);
  if (len <= radius || len === 0) return { x: dx, y: dy };
  return { x: (dx / len) * radius, y: (dy / len) * radius };
}

/* ---------------- Look drag ---------------- */

/** Touch drag pixels -> mouse-equivalent pixels at sensitivity 1 (a finger covers less ground than a mouse). */
export const TOUCH_LOOK_SCALE = 1.6;
/** A single touch move larger than this (px) is a dropped frame or a finger swap: ignored. */
export const MAX_TOUCH_JUMP = 120;

/**
 * One touch move -> look delta in mouse pixels, or null to ignore it. The pitch clamp stays in
 * game/player.ts (stepPlayer), so a long drag can never flip the view.
 */
export function touchLookDelta(dx: number, dy: number, sensitivity: number): { dx: number; dy: number } | null {
  if (Math.abs(dx) > MAX_TOUCH_JUMP || Math.abs(dy) > MAX_TOUCH_JUMP) return null;
  const k = TOUCH_LOOK_SCALE * sensitivity;
  return { dx: dx * k, dy: dy * k };
}
