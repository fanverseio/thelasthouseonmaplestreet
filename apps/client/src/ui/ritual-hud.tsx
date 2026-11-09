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

const SPELL_NAME = { arcane_bolt: 'Arcane Bolt (1)', ward: 'Ward (3)', purify: 'Purify (2)' } as const;

/**
 * The anchor tasks (task 5.10): the spell the nearest unrestored anchor needs (a text "rune icon"), the smoke shell's
 * strength, the progress of the task, and short hints. Role `progressbar` so assistive tech reads the percentage.
 */
export function AnchorHud({ ritual }: { ritual: RitualRuntime }) {
  useSyncExternalStore(ritual.subscribe, () => ritual.version);
  const v = ritual.view();
  if (!v.active) return null;
  const channel = v.channel;
  const dir = channel?.dir ?? v.near?.dir ?? null;
  const pct = dir ? Math.round(v.progress[dir] * 100) : 0;
  const shown = channel !== null || (v.near !== null && pct > 0);
  return (
    <div style={{ ...barStyle, bottom: '18%', width: '17rem' }} data-testid="anchor-hud">
      {v.near && (
        <div data-testid="anchor-rune">
          ✦ {v.near.dir} anchor: {SPELL_NAME[v.near.spell]}
        </div>
      )}
      {v.near?.dir === 'north' && v.shell && (
        <small data-testid="shell-state">{v.shell.broken ? 'Smoke shell broken' : `Smoke shell ${v.shell.hp}/${v.shell.maxHp}`}</small>
      )}
      {shown && dir && (
        <div role="progressbar" aria-label={`${dir} anchor`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} data-testid="anchor-bar">
          <small>{channel?.paused ? 'The smoke strikes. Keep holding.' : v.eastWarning ? 'A strike is coming: Ward!' : dir === 'west' ? 'Purifying' : 'Keep holding E'}</small>
          <div style={{ height: '0.5rem', background: '#333', borderRadius: '3px', marginTop: '0.25rem' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#9ad1ff', borderRadius: '3px' }} />
          </div>
        </div>
      )}
      {v.hint && <small data-testid="anchor-hint">{v.hint}</small>}
    </div>
  );
}

/** The smoke's ring telegraph during the final ritual: a text and glyph cue, never colour alone. */
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
      {strike === 'warning' ? '≈ The smoke gathers…' : '≈ The smoke strikes'}
    </div>
  );
}
