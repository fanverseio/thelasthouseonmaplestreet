/**
 * Where the drifting ground-mist puffs sit (scene/atmosphere.tsx). Pure and seeded so it can be tested headless.
 * Puffs fill the walkable exterior at knee-to-chest height and keep out of solid buildings, No. 12 and the outbuilding
 * (mist must never float inside a room).
 */
import { BOXES, FOG_MARGIN, MAP_HALF_X, MAP_HALF_Z } from '../content/world/exterior-layout.ts';
import { OUTBUILDING_BOUNDS } from '../content/world/grounds-layout.ts';
import { HOME_BOUNDS } from '../content/world/home-layout.ts';
import type { GraphicsPreset } from '../store/settings-store.ts';

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface MistPuff {
  x: number;
  y: number;
  z: number;
}

/** Puffs per graphics preset. */
export const MIST_COUNT: Record<GraphicsPreset, number> = { low: 110, medium: 240, high: 380 };
export const MIST_Y = { min: 0.25, max: 1.5 } as const;
/** Clearance around indoor and solid footprints, metres. */
const CLEAR = 1.2;

/** Footprints the mist keeps out of: solid boxes, No. 12, the outbuilding. */
export function mistExclusions(): Rect[] {
  const rects: Rect[] = BOXES.filter((b) => b.solid && b.h > 1).map((b) => ({
    minX: b.x - b.w / 2,
    maxX: b.x + b.w / 2,
    minZ: b.z - b.d / 2,
    maxZ: b.z + b.d / 2,
  }));
  rects.push({ ...HOME_BOUNDS }, { ...OUTBUILDING_BOUNDS });
  return rects;
}

export function insideAny(x: number, z: number, rects: readonly Rect[], pad = CLEAR): boolean {
  return rects.some((r) => x > r.minX - pad && x < r.maxX + pad && z > r.minZ - pad && z < r.maxZ + pad);
}

/** Small seeded PRNG (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mistPuffs(count: number, seed = 31): MistPuff[] {
  const rand = rng(seed);
  const ex = mistExclusions();
  const hx = MAP_HALF_X - FOG_MARGIN;
  const hz = MAP_HALF_Z - FOG_MARGIN;
  const out: MistPuff[] = [];
  for (let tries = 0; out.length < count && tries < count * 50; tries++) {
    const x = (rand() * 2 - 1) * hx;
    const z = (rand() * 2 - 1) * hz;
    if (insideAny(x, z, ex)) continue;
    out.push({ x, y: MIST_Y.min + rand() * (MIST_Y.max - MIST_Y.min), z });
  }
  return out;
}
