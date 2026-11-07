import { useSyncExternalStore } from 'react';
import type { RitualRuntime } from '../game/ritual.ts';
import type { WorldRuntime } from '../game/world-runtime.ts';

const barStyle = {
  position: 'absolute',
  left: '50%',
  bottom: '28%',
  transform: 'translateX(-50%)',
  width: '14rem',
  padding: '0.4rem 0.6rem',
  background: 'rgba(8, 8, 12, 0.78)',
  color: '#eee',
  borderRadius: '6px',
  textAlign: 'center',
  zIndex: 6,
} as const;

/**
 * Progress of a hold-E interaction (the anchors): a bar that fills over the hold's sim seconds. It is gone the
 * moment E is released or Elena steps away. Role `progressbar` so assistive tech reads the percentage.
 */
export function HoldBar({ runtime }: { runtime: WorldRuntime }) {
  useSyncExternalStore(runtime.subscribe, () => runtime.version);
  const hold = runtime.hold;
  if (!hold) return null;
  const pct = Math.round(hold.progress * 100);
  return (
    <div style={barStyle} role="progressbar" aria-label="Holding" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} data-testid="hold-bar">
      <small>Keep holding E</small>
      <div style={{ height: '0.5rem', background: '#333', borderRadius: '3px', marginTop: '0.25rem' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#9ad1ff', borderRadius: '3px' }} />
      </div>
    </div>
  );
}

/** The smoke's harmless placeholder strike during the final ritual: a text and glyph cue, never colour alone. */
export function SmokeStrike({ ritual }: { ritual: RitualRuntime }) {
  useSyncExternalStore(ritual.subscribe, () => ritual.version);
  const { strike } = ritual.view();
  if (strike === 'idle') return null;
  return (
    <div
      style={{ ...barStyle, bottom: '70%', background: strike === 'warning' ? 'rgba(60, 20, 20, 0.85)' : 'rgba(20, 20, 20, 0.85)' }}
      role="status"
      data-testid="smoke-strike"
    >
      {strike === 'warning' ? '≈ The smoke gathers…' : '≈ The smoke strikes, and passes'}
    </div>
  );
}
