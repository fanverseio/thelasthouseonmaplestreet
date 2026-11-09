import { moralityBand, type MoralityBand } from '@tlh/shared';

/**
 * How the Angel looks in the HUD. Colour follows the hidden morality band, computed here (not in a
 * ui file) so the UI never names or shows it. Pure; the cluster geometry is generated here too.
 */
export type Rgb = readonly [number, number, number];

/** kind = blue, neutral = pale violet, dark = red. */
export const ANGEL_RGB: Readonly<Record<MoralityBand, Rgb>> = {
  kind: [127, 200, 255],
  neutral: [214, 200, 255],
  dark: [255, 96, 80],
};

export function angelRgb(band: MoralityBand): Rgb {
  return ANGEL_RGB[band];
}

/** The colour for a raw hidden value (band edges come from the shared helper). */
export function angelRgbFor(value: number): Rgb {
  return ANGEL_RGB[moralityBand(value)];
}

export function rgbCss([r, g, b]: Rgb, alpha = 1): string {
  return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** The cluster is 20% smaller than the approved mockup (70 px CSS, radii 10..44, sizes 2..6). */
export const CLUSTER_SCALE = 0.8;
export const CLUSTER_CSS_PX = 56;
/** Internal canvas buffer: 2x the CSS size, so it stays crisp on high-DPR screens. */
export const CLUSTER_BUFFER_PX = CLUSTER_CSS_PX * 2;
export const MOTE_COUNT = 18;
export const MOTE_RADIUS = { min: 10 * CLUSTER_SCALE, max: 44 * CLUSTER_SCALE } as const;
export const MOTE_SIZE = { min: 2 * CLUSTER_SCALE, max: 6 * CLUSTER_SCALE } as const;

export interface Mote {
  /** Start angle (rad) and angular speed (rad/s, signed). */
  angle: number;
  speed: number;
  /** Orbit radius (buffer px) when fully spread. */
  radius: number;
  /** Radius wobble phase / rate. */
  wobble: number;
  wobbleRate: number;
  /** Core size (buffer px). */
  size: number;
  /** Twinkle phase / rate (rad/s). */
  twinkle: number;
  twinkleRate: number;
}

/** Deterministic small PRNG so the cluster looks the same on every run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createMotes(count = MOTE_COUNT, seed = 66): Mote[] {
  const rnd = mulberry32(seed);
  const between = (lo: number, hi: number) => lo + rnd() * (hi - lo);
  return Array.from({ length: count }, () => ({
    angle: between(0, Math.PI * 2),
    speed: (rnd() < 0.5 ? -1 : 1) * between(0.15, 0.6),
    radius: between(MOTE_RADIUS.min, MOTE_RADIUS.max),
    wobble: between(0, Math.PI * 2),
    wobbleRate: between(0.4, 1.1),
    size: between(MOTE_SIZE.min, MOTE_SIZE.max),
    twinkle: between(0, Math.PI * 2),
    twinkleRate: between(1.2, 3.2),
  }));
}
