import { CanvasTexture, LinearFilter } from 'three';
import type { RuneId } from '../game/runes.ts';

/**
 * Rosalind's three rune sigils (note 17): curved, brush-like strokes drawn into a canvas. Alpha is the paint; the green
 * channel is how far along the drawing order that pixel lies (0..1), which the rune shader uses to let the paint flow
 * in stroke by stroke and to run light along it. Coordinates are -1..1, y up. View only.
 */

type P = readonly [number, number];
export interface Stroke {
  /** Point on the stroke at t in 0..1. */
  at: (t: number) => P;
  /** Brush width in glyph units (the canvas is 2 units across). */
  width: number;
  /** Samples along the stroke (smoothness). */
  steps?: number;
}

const arc = (cx: number, cy: number, r: number, a0: number, a1: number, width = 0.05): Stroke => ({
  at: (t) => [cx + r * Math.cos(a0 + (a1 - a0) * t), cy + r * Math.sin(a0 + (a1 - a0) * t)],
  width,
});

const spiral = (cx: number, cy: number, r0: number, r1: number, a0: number, turns: number, width = 0.045): Stroke => ({
  at: (t) => {
    const a = a0 + turns * Math.PI * 2 * t;
    const r = r0 + (r1 - r0) * t;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  },
  width,
  steps: 120,
});

const bezier = (p0: P, p1: P, p2: P, p3: P, width = 0.05): Stroke => ({
  at: (t) => {
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ];
  },
  width,
});

const dot = (x: number, y: number, r = 0.035): Stroke => ({ at: () => [x, y], width: r * 2, steps: 1 });

const TAU = Math.PI * 2;

/** Three distinct sigils: a warding knot, the keeper's eye, the bloodline triquetra. */
export const RUNE_GLYPHS: Record<RuneId, readonly Stroke[]> = {
  // r1: the ward knot. A broken outer ring, an inward spiral, three petal loops and a crescent-crowned stem.
  'rune.grounds.r1': [
    arc(0, 0, 0.86, 0.2, TAU / 3 - 0.2, 0.05),
    arc(0, 0, 0.86, TAU / 3 + 0.2, (2 * TAU) / 3 - 0.2, 0.05),
    arc(0, 0, 0.86, (2 * TAU) / 3 + 0.2, TAU - 0.2, 0.05),
    spiral(0, 0, 0.5, 0.06, Math.PI / 2, 1.6),
    ...[0, 1, 2].map((k) => {
      const a = Math.PI / 2 + (k * TAU) / 3;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const rot = (x: number, y: number): P => [x * c - y * s, x * s + y * c];
      return bezier(rot(0.5, -0.12), rot(0.92, -0.42), rot(0.92, 0.42), rot(0.5, 0.12), 0.04);
    }),
    bezier([0, -0.98], [0.02, -0.7], [-0.02, -0.55], [0, -0.52], 0.04),
    arc(0, -1.0, 0.16, Math.PI * 0.15, Math.PI * 0.85, 0.035),
    dot(0.6, 0.6), dot(-0.6, 0.6), dot(0, -0.25, 0.03),
  ],
  // r2: the keeper's eye. A vesica of two arcs, a pupil ring, curling lashes above and below, a hooked crossbar.
  'rune.grounds.r2': [
    arc(0, -0.55, 0.95, Math.PI * 0.18, Math.PI * 0.82, 0.055),
    arc(0, 0.55, 0.95, -Math.PI * 0.18, -Math.PI * 0.82, 0.055),
    arc(0, 0, 0.22, 0, TAU, 0.045),
    dot(0, 0, 0.06),
    ...[-0.5, -0.17, 0.17, 0.5].map((x) => bezier([x, 0.4], [x * 1.1, 0.62], [x * 1.5 + 0.08, 0.72], [x * 1.3 + 0.16, 0.6], 0.03)),
    ...[-0.5, -0.17, 0.17, 0.5].map((x) => bezier([x, -0.4], [x * 1.1, -0.62], [x * 1.5 - 0.08, -0.72], [x * 1.3 - 0.16, -0.6], 0.03)),
    bezier([-0.95, 0], [-0.6, 0.05], [0.6, -0.05], [0.95, 0], 0.035),
    arc(-0.95, 0.12, 0.12, -Math.PI / 2, -Math.PI * 1.4, 0.03),
    arc(0.95, -0.12, 0.12, Math.PI / 2, Math.PI * 1.4, 0.03),
  ],
  // r3: the bloodline. Three interlaced arcs (a triquetra) in a dotted ring, with a spiral tail that drips down.
  'rune.grounds.r3': [
    ...[0, 1, 2].map((k) => {
      const a = Math.PI / 2 + (k * TAU) / 3;
      return arc(0.3 * Math.cos(a), 0.3 * Math.sin(a), 0.42, a + Math.PI * 0.62, a + Math.PI * 1.38, 0.05);
    }),
    arc(0, 0, 0.82, Math.PI * 0.6, Math.PI * 2.4, 0.04),
    ...Array.from({ length: 9 }, (_, i) => {
      const a = Math.PI * 0.62 + (i * Math.PI * 1.76) / 8;
      return dot(0.95 * Math.cos(a), 0.95 * Math.sin(a), 0.028);
    }),
    bezier([0, -0.82], [0.05, -0.92], [-0.12, -0.98], [-0.05, -1.0], 0.035),
    spiral(0.16, 0.0, 0.1, 0.02, 0, 1.2, 0.03),
  ],
};

/** Paint one sigil into a 512 px canvas texture (alpha = paint, green = drawing order). */
export function paintGlyph(strokes: readonly Stroke[], size = 512): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d')!;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const px = (p: P): [number, number] => [(p[0] * 0.46 + 0.5) * size, (0.5 - p[1] * 0.46) * size];
  const n = strokes.length;
  strokes.forEach((s, i) => {
    const steps = s.steps ?? 60;
    if (steps <= 1) {
      const [x, y] = px(s.at(0));
      g.fillStyle = `rgb(255, ${Math.round((i / n) * 255)}, 0)`;
      g.beginPath();
      g.arc(x, y, (s.width / 2) * 0.46 * size, 0, TAU);
      g.fill();
      return;
    }
    let prev = px(s.at(0));
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      const p = px(s.at(t));
      // a brush stroke: thinner at both ends, a little uneven in the middle
      const taper = 0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, t * 1.05));
      g.lineWidth = s.width * 0.46 * size * 1.35 * taper * (0.92 + 0.08 * Math.sin(t * 37 + i));
      g.strokeStyle = `rgb(255, ${Math.round(((i + t) / n) * 255)}, 0)`;
      g.beginPath();
      g.moveTo(prev[0], prev[1]);
      g.lineTo(p[0], p[1]);
      g.stroke();
      prev = p;
    }
  });
  const t = new CanvasTexture(c);
  t.minFilter = LinearFilter;
  t.generateMipmaps = false;
  return t;
}
