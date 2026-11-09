import { useEffect, useSyncExternalStore } from 'react';
import type { EncounterRuntime } from '../game/encounter-runtime.ts';
import { SPELL_CONFIG } from '../game/spells.ts';
import { sfx } from '../services/sfx.ts';

/** Seconds Enter must be held to destroy (a tap must not end a life by accident). */
const DESTROY_HOLD_MS = 700;
/** Keyboard fallback for Purify on an FSM enemy: hold 2 for the channel time (a tap only selects the spell). */
const PURIFY_HOLD_MS = SPELL_CONFIG.purify.channelS * 1000;

export const WARD_HINT = 'Ward: press 3, then click';
export const STUNNED_HINT = 'Stunned: 2 + hold LMB to Purify · 1 + hold LMB to Destroy';
/** Before Purify is taught only the destroy half is true. */
export const STUNNED_HINT_NO_PURIFY = 'Stunned: 1 + hold LMB to Destroy';

const panelStyle = {
  position: 'absolute',
  bottom: '18%',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.75rem 1rem',
  background: 'rgba(8, 8, 12, 0.72)',
  color: '#eee',
  borderRadius: '6px',
  zIndex: 5,
} as const;

/**
 * The encounter hints (tasks 3.8, 5.6-5.9). Enemies fought by the real FSM (`active.fsm`) are settled by the spells
 * (Ward: 3 + LMB during the wind-up; Purify: 2 + hold LMB; destroy: 1 + hold LMB), so the panel only shows one short
 * hint line. The buttons remain for the encounter stub (kept for tests). Keyboard fallbacks for players who cannot
 * use the mouse: hold 2 to Purify, hold Enter to Destroy (for the stub a tap on 2 purifies).
 * Shows no score; it only drives the encounter runtime.
 */
export function EncounterPanel({ encounters }: { encounters: EncounterRuntime }) {
  useSyncExternalStore(encounters.subscribe, () => encounters.version);
  const active = encounters.active();
  const id = active?.id;
  const fsm = active?.fsm === true;

  useEffect(() => {
    if (!id) return;
    let hold: ReturnType<typeof setTimeout> | null = null;
    let purifyHold: ReturnType<typeof setTimeout> | null = null;
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Digit3') {
        if (encounters.castWard()) sfx.play('sfx_spell_ward');
      } else if (e.code === 'Digit2') {
        if (!fsm) {
          if (encounters.choose(id, 'purify').ok) sfx.play('sfx_spell_purify');
        } else if (purifyHold === null) {
          purifyHold = setTimeout(() => {
            if (encounters.choose(id, 'purify').ok) sfx.play('sfx_spell_purify');
          }, PURIFY_HOLD_MS);
        }
      } else if (e.code === 'Enter' && hold === null) hold = setTimeout(() => encounters.choose(id, 'destroy'), DESTROY_HOLD_MS);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Enter' && hold !== null) {
        clearTimeout(hold);
        hold = null;
      }
      if (e.code === 'Digit2' && purifyHold !== null) {
        clearTimeout(purifyHold);
        purifyHold = null;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      if (hold !== null) clearTimeout(hold);
      if (purifyHold !== null) clearTimeout(purifyHold);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [encounters, id, fsm]);

  if (!active) return null;
  return (
    <div style={panelStyle} role="group" aria-label="Encounter" data-testid="encounter-panel">
      {active.telegraphing &&
        (fsm ? (
          <strong data-testid="ward-hint">{WARD_HINT}</strong>
        ) : (
          <button type="button" onClick={() => encounters.castWard()}>
            Ward (3)
          </button>
        ))}
      {active.canWeaken && (
        <button type="button" onClick={() => encounters.interact(active.id)}>
          Weaken (E)
        </button>
      )}
      {active.canChoose && fsm && <small data-testid="stun-hint">{active.canPurify ? STUNNED_HINT : STUNNED_HINT_NO_PURIFY}</small>}
      {active.canChoose && !fsm && (
        <>
          <div>
            {active.canPurify && (
              <>
                <button type="button" onClick={() => encounters.choose(active.id, 'purify')}>
                  Purify (2)
                </button>{' '}
              </>
            )}
            <button type="button" onClick={() => encounters.choose(active.id, 'destroy')}>
              Destroy (hold Enter)
            </button>
          </div>
          <small>{active.canPurify ? '2: Purify · hold Enter: Destroy' : 'hold Enter: Destroy'}</small>
        </>
      )}
    </div>
  );
}
