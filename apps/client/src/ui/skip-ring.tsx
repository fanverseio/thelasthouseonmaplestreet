import { useSyncExternalStore } from 'react';
import type { SkipHold } from '../game/skip-hold.ts';

const R = 18;
const C = 2 * Math.PI * R;

/** "Hold E to skip" ring, shown while a skippable cinematic plays. Plain keys only: no wording about the story. */
export function SkipRing({ skip }: { skip: SkipHold }) {
  useSyncExternalStore(skip.subscribe, () => skip.version);
  if (!skip.available) return null;
  return (
    <div
      role="progressbar"
      aria-label="Hold E to skip"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(skip.progress * 100)}
      data-testid="skip-ring"
      style={{
        position: 'absolute',
        right: '2rem',
        bottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        color: '#eee',
        zIndex: 20,
        pointerEvents: 'none',
      }}
    >
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r={R} fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
        <circle
          cx="22"
          cy="22"
          r={R}
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - skip.progress)}
          transform="rotate(-90 22 22)"
        />
      </svg>
      <span>Hold E to skip</span>
    </div>
  );
}
