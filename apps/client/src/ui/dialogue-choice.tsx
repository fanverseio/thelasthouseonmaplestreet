import { useEffect, useSyncExternalStore } from 'react';
import type { ChoiceRuntime } from '../game/dialogue-choice.ts';

const panelStyle = {
  position: 'absolute',
  bottom: '22%',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: '0.75rem',
  padding: '0.75rem 1rem',
  background: 'rgba(8, 8, 12, 0.78)',
  color: '#eee',
  borderRadius: '6px',
  zIndex: 6,
} as const;

/**
 * Greybox panel for a dialogue choice inside a sequence (Gartner, Beat 5). Keys 1 and 2 pick an option.
 * It shows only the option labels from content; it never sees what the choice changes behind the scenes.
 */
export function DialogueChoicePanel({ choices }: { choices: ChoiceRuntime }) {
  useSyncExternalStore(choices.subscribe, () => choices.version);
  const view = choices.view();
  const key = view?.id;

  useEffect(() => {
    if (!key) return;
    const down = (e: KeyboardEvent) => {
      const i = e.code === 'Digit1' ? 0 : e.code === 'Digit2' ? 1 : -1;
      const option = i >= 0 ? choices.view()?.options[i] : undefined;
      if (option && !e.repeat) choices.choose(option.id);
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [choices, key]);

  if (!view) return null;
  return (
    <div style={panelStyle} role="group" aria-label="Choose what to say" data-testid="dialogue-choice-panel">
      {view.options.map((o, i) => (
        <button key={o.id} type="button" onClick={() => choices.choose(o.id)}>
          {o.label} ({i + 1})
        </button>
      ))}
    </div>
  );
}
