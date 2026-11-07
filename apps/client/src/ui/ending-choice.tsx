import { useEffect, useSyncExternalStore } from 'react';
import type { EndingRuntime } from '../game/ending.ts';

const backdrop = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1rem',
  padding: '2rem',
  background: 'rgba(4, 4, 8, 0.88)',
  color: '#eee',
  textAlign: 'center',
  zIndex: 8,
} as const;

const column = { display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '36rem', width: '100%' } as const;

/**
 * The final choice (Beat 12): the Angel's last line, then the two options, then "This cannot be undone."
 * There is no timer. Esc backs out of the confirm step only. It shows only text from content and never a
 * number about the player's earlier choices.
 */
export function EndingChoicePanel({ ending }: { ending: EndingRuntime }) {
  useSyncExternalStore(ending.subscribe, () => ending.version);
  const view = ending.view();
  const stage = view?.stage;

  useEffect(() => {
    if (!stage) return;
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        ending.back(); // a no-op outside the confirm step
      } else if (stage === 'choose' && (e.code === 'Digit1' || e.code === 'Digit2')) {
        ending.select(e.code === 'Digit1' ? 'keeper' : 'broken');
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [ending, stage]);

  if (!view) return null;
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation(); // a click here must not re-lock the pointer
  return (
    <div style={backdrop} role="dialog" aria-modal="true" aria-label="The final choice" data-testid="ending-choice" onClick={stop}>
      {view.stage === 'angel' && (
        <div style={column}>
          <p data-testid="ending-angel-line">
            <strong>{view.angel.speaker}:</strong> {view.angel.text}
          </p>
          <button type="button" onClick={() => ending.advance()} autoFocus>
            Continue
          </button>
        </div>
      )}
      {view.stage === 'choose' && (
        <div style={column} role="group" aria-label="Choose">
          {view.options.map((o, i) => (
            <button key={o.id} type="button" onClick={() => ending.select(o.id)} data-testid={`ending-option-${o.id}`}>
              {o.label} ({i + 1})
            </button>
          ))}
        </div>
      )}
      {view.stage === 'confirm' && (
        <div style={column} role="group" aria-label="Confirm">
          <p>{view.options.find((o) => o.id === view.selected)?.label}</p>
          <p data-testid="ending-confirm-text">{view.confirmText}</p>
          <button type="button" onClick={() => ending.confirm()} data-testid="ending-confirm" autoFocus>
            Yes, I am sure
          </button>
          <button type="button" className="secondary" onClick={() => ending.back()} data-testid="ending-back">
            Back (Esc)
          </button>
        </div>
      )}
    </div>
  );
}
