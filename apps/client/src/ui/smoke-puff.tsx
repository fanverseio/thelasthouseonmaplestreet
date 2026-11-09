import { useEffect, useState } from 'react';
import type { EnemySystem } from '../game/enemies.ts';

/**
 * Briggs' smoke puff (task 5.7): a dark haze over the screen edges for the length the enemy system reports.
 * Greybox, harmless, and never full black (the middle of the screen stays readable). View only.
 */
export function SmokePuffOverlay({ enemies }: { enemies: EnemySystem }) {
  const [until, setUntil] = useState(0);
  useEffect(
    () =>
      enemies.on((e) => {
        if (e.type === 'smoke_puff') setUntil(Date.now() + e.seconds * 1000);
      }),
    [enemies],
  );
  useEffect(() => {
    if (until === 0) return;
    const t = setTimeout(() => setUntil(0), Math.max(0, until - Date.now()));
    return () => clearTimeout(t);
  }, [until]);
  if (until === 0) return null;
  return (
    <div
      data-testid="smoke-puff"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 4,
        background: 'radial-gradient(circle at center, rgba(20,20,26,0.35) 0%, rgba(10,10,14,0.85) 75%)',
      }}
    />
  );
}
