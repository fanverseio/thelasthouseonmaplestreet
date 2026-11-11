/**
 * The smoke wraith's body, as pure data: a child-height column of smoke puffs with a hood-like top that narrows
 * into a trailing tail, plus two faint ember points (style sheet 11: no face, no teeth, no claws). Built in three.js
 * from sprites, so it needs no model. smoke-wraith.tsx draws it; this file has no React or Three imports.
 */

export interface WraithPuff {
  /** 0 at the top of the hood, 1 at the tip of the tail. */
  u: number;
  /** Height above the hover point, metres. */
  y: number;
  /** Distance from the body axis, metres. */
  radius: number;
  /** Start angle round the axis, radians. */
  angle: number;
  /** Sprite size, metres. */
  size: number;
  /** Swirl speed round the axis, radians per second (sign = direction). */
  swirl: number;
  /** Phase for the bob and the sprite spin. */
  phase: number;
  /** Base opacity. */
  opacity: number;
}

export const WRAITH = {
  puffs: 28,
  /** Hood top above the ground while hovering. */
  top: 1.35,
  /** Tail tip above the ground. */
  tail: 0.25,
  hoverBob: 0.07,
  /** Ember points: half spacing, height and how far in front of the axis (metres). */
  ember: { half: 0.065, y: 1.12, forward: 0.2, size: 0.07 },
  /** How long the tail lags behind the hood when the wraith moves, seconds at the tip. */
  tailLagS: 0.35,
  /** Dissolve when destroyed (used when no combat feedback drives the fade). */
  dissolveS: 1.5,
} as const;

/** Small deterministic random (mulberry32), so every wraith looks the same and tests are stable. */
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

/** The puffs from hood to tail. The widest part is the hood; the tail thins to a wisp. */
export function wraithPuffs(seed = 7): WraithPuff[] {
  const r = rng(seed);
  const out: WraithPuff[] = [];
  const n = WRAITH.puffs;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    // Hood bulge near the top (u ~ 0.15), then a long taper.
    const bulge = Math.sin(Math.PI * Math.min(1, u * 1.5 + 0.1));
    const radius = (0.05 + 0.22 * bulge) * (1 - 0.7 * u) * (0.7 + 0.6 * r());
    out.push({
      u,
      y: WRAITH.top - (WRAITH.top - WRAITH.tail) * u,
      radius,
      angle: r() * Math.PI * 2,
      size: (0.62 - 0.4 * u) * (0.8 + 0.4 * r()),
      swirl: (0.4 + 0.8 * r()) * (r() < 0.5 ? -1 : 1),
      phase: r() * Math.PI * 2,
      opacity: (0.85 - 0.45 * u) * (0.8 + 0.2 * r()),
    });
  }
  return out;
}

/** 0..1 dissolve progress -> how far the puffs spread, rise and fade. */
export function dissolve(k: number): { spread: number; rise: number; alpha: number } {
  const t = Math.min(1, Math.max(0, k));
  return { spread: 1 + 2.5 * t, rise: 0.9 * t, alpha: (1 - t) * (1 - t) };
}
