import { useEffect, useRef } from 'react';
import { deathFadeOpacity, hurtVignetteOpacity, type CombatFeedback } from '../game/combat-feedback.ts';
import type { EncounterRuntime } from '../game/encounter-runtime.ts';
import { settingsStore } from '../store/index.ts';

/**
 * Combat screen feedback (task 5.11): a red screen-edge vignette when Elena is hurt, and the black fade of a death
 * (1.5 s to black, then the respawn, then a short fade back in). Both are driven from a frame loop that writes the
 * style directly, so no React render happens per frame. With "reduce flashing" on the vignette is softer and
 * fades in and out gently instead of flashing; the death fade is a slow ramp either way.
 */
export function CombatOverlays({ feedback, encounters }: { feedback: CombatFeedback; encounters: EncounterRuntime }) {
  const vignette = useRef<HTMLDivElement>(null);
  const fade = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const reduce = settingsStore.getState().reduceFlashing;
      const v = vignette.current;
      if (v) {
        const o = hurtVignetteOpacity(feedback.hurt, reduce);
        v.style.opacity = String(o);
        v.style.transition = reduce ? 'opacity 0.3s ease-out' : 'none';
      }
      const f = fade.current;
      if (f) f.style.opacity = String(deathFadeOpacity(encounters.deathProgress(), feedback.wakeProgress));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [feedback, encounters]);

  return (
    <>
      <div
        ref={vignette}
        data-testid="hurt-vignette"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 5,
          opacity: 0,
          background: 'radial-gradient(ellipse at center, rgba(120,0,0,0) 55%, rgba(150,10,10,1) 100%)',
        }}
      />
      <div
        ref={fade}
        data-testid="death-fade"
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20, opacity: 0, background: '#000' }}
      />
    </>
  );
}
