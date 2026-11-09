import { useEffect, useRef, useState } from 'react';
import { CLUSTER_BUFFER_PX, CLUSTER_CSS_PX, createMotes, rgbCss, type Rgb } from '../game/angel-look.ts';
import { useAngelAwake, useAngelRgb } from '../store/angel-colour.ts';
import { useSettings } from '../store/index.ts';
import type { SubtitleLine } from './subtitles.tsx';

const SPRITE_PX = 64;

/** A soft round glow in one colour, drawn once; every mote and the haze are scaled copies of it. */
function makeSprite([r, g, b]: Rgb): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = SPRITE_PX;
  const ctx = c.getContext('2d');
  if (ctx) {
    const h = SPRITE_PX / 2;
    const grad = ctx.createRadialGradient(h, h, 0, h, h, h);
    grad.addColorStop(0, `rgba(255, 255, 255, 0.95)`);
    grad.addColorStop(0.18, `rgba(${r}, ${g}, ${b}, 0.85)`);
    grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.22)`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SPRITE_PX, SPRITE_PX);
  }
  return c;
}

const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * The Angel's presence: ~18 small lights drifting round a centre on a canvas (additive blending, soft haze,
 * no solid body). Speaking = brighter and wider; silent = dimmer and tighter. Draws with requestAnimationFrame
 * and allocates nothing per frame; with reduced motion it draws one static frame per state change.
 */
function Cluster({ rgb, speaking, calm }: { rgb: Rgb; speaking: boolean; calm: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;
  const redrawKey = prefersReducedMotion() ? speaking : false; // static frame: redraw when the state flips; animated: the loop reads speakingRef

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const motes = createMotes();
    const sprite = makeSprite(rgb);
    const mid = CLUSTER_BUFFER_PX / 2;
    const still = prefersReducedMotion();
    const twinkleDepth = calm ? 0.15 : 0.5; // reduce flashing: gentle shimmer only
    const twinkleSpeed = calm ? 0.4 : 1;
    let energy = speakingRef.current ? 1 : 0;
    let raf = 0;
    let last = 0;

    const draw = (t: number) => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, CLUSTER_BUFFER_PX, CLUSTER_BUFFER_PX);
      ctx.globalCompositeOperation = 'lighter';
      // Haze: one big faint glow behind the lights.
      const haze = CLUSTER_BUFFER_PX * (0.7 + 0.3 * energy);
      ctx.globalAlpha = 0.12 + 0.2 * energy;
      ctx.drawImage(sprite, mid - haze / 2, mid - haze / 2, haze, haze);
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i]!;
        const a = m.angle + m.speed * t * (0.5 + 0.5 * energy);
        const r = m.radius * (0.55 + 0.45 * energy) * (1 + 0.08 * Math.sin(m.wobble + m.wobbleRate * t));
        const flicker = 1 - twinkleDepth * (0.5 + 0.5 * Math.sin(m.twinkle + m.twinkleRate * twinkleSpeed * t));
        const size = m.size * (0.9 + 0.3 * energy) * 3.2;
        ctx.globalAlpha = Math.min(1, (0.3 + 0.6 * energy) * flicker);
        ctx.drawImage(sprite, mid + Math.cos(a) * r - size / 2, mid + Math.sin(a) * r * 0.9 - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    };

    if (still) {
      draw(0);
      return;
    }
    const frame = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      energy += ((speakingRef.current ? 1 : 0) - energy) * Math.min(1, dt * 3);
      draw(now / 1000);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [rgb, calm, redrawKey]);

  return <canvas ref={ref} width={CLUSTER_BUFFER_PX} height={CLUSTER_BUFFER_PX} className="angel-cluster" style={{ width: CLUSTER_CSS_PX, height: CLUSTER_CSS_PX }} aria-hidden="true" />;
}

/**
 * Bottom-left, above the HUD bars. The cluster is always there (dim) once the Angel is awake; while the Angel
 * speaks, its name and line show beneath it, and fade out over 0.4 s afterwards. Subtitles stay on: this panel
 * is where Angel lines are shown instead of the bottom-centre subtitle.
 */
export function AngelPanel({ line }: { line: SubtitleLine | null }) {
  const awake = useAngelAwake();
  const rgb = useAngelRgb();
  const calm = useSettings((s) => s.reduceFlashing);
  const size = useSettings((s) => s.subtitleSize);
  const [shown, setShown] = useState<SubtitleLine | null>(line);
  useEffect(() => {
    if (line) setShown(line);
  }, [line]);
  if (!awake) return null;
  const speaking = line !== null;
  const colour = rgbCss(rgb);
  return (
    <div className="angel-panel" data-speaking={speaking ? 'true' : 'false'} role="status" aria-live="polite">
      <Cluster rgb={rgb} speaking={speaking} calm={calm} />
      <div
        className="angel-text"
        style={{ opacity: speaking ? 1 : 0, fontSize: size === 'large' ? '1.45rem' : '1.05rem' }}
        aria-hidden={speaking ? undefined : 'true'}
      >
        <div className="angel-name" style={{ color: colour }}>
          The Angel
        </div>
        <div className="angel-line">{shown?.text ?? ''}</div>
      </div>
    </div>
  );
}
