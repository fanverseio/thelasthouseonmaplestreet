import { useEffect, useSyncExternalStore } from 'react';
import type { EncounterRuntime } from '../game/encounter-runtime.ts';
import { sfx } from '../services/sfx.ts';

/** Seconds Enter must be held to destroy (a tap must not end a life by accident). */
const DESTROY_HOLD_MS = 700;

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
 * Greybox stand-in for combat (task 3.8/3.9): "Weaken" while hostile, then Purify or Destroy once
 * the enemy is stunned. Keyboard: 3 = Ward during the wind-up, 2 = Purify, hold Enter = Destroy.
 * Shows no score; it only drives the encounter runtime.
 */
export function EncounterPanel({ encounters }: { encounters: EncounterRuntime }) {
  useSyncExternalStore(encounters.subscribe, () => encounters.version);
  const active = encounters.active();
  const id = active?.id;

  useEffect(() => {
    if (!id) return;
    let hold: ReturnType<typeof setTimeout> | null = null;
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Digit3') {
        if (encounters.castWard()) sfx.play('sfx_spell_ward');
      } else if (e.code === 'Digit2') {
        if (encounters.choose(id, 'purify').ok) sfx.play('sfx_spell_purify');
      }
      else if (e.code === 'Enter' && hold === null) hold = setTimeout(() => encounters.choose(id, 'destroy'), DESTROY_HOLD_MS);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Enter' && hold !== null) {
        clearTimeout(hold);
        hold = null;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      if (hold !== null) clearTimeout(hold);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [encounters, id]);

  if (!active) return null;
  return (
    <div style={panelStyle} role="group" aria-label="Encounter" data-testid="encounter-panel">
      {active.telegraphing && (
        <button type="button" onClick={() => encounters.castWard()}>
          Ward (3)
        </button>
      )}
      {active.canWeaken && (
        <button type="button" onClick={() => encounters.interact(active.id)}>
          Weaken (E)
        </button>
      )}
      {active.canChoose && (
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
