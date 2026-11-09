import { useEffect, useState } from 'react';
import type { InputController } from '../game/input.ts';
import { type SpellSystem, type SpellView } from '../game/spells.ts';

const POLL_MS = 50;

function key(v: SpellView): string {
  return [v.selected, v.unlocked, v.cooldownLeft.toFixed(2), v.charging, v.charge.toFixed(2), v.channeling, v.channel.toFixed(2), v.wardLeft.toFixed(1), v.hint].join('|');
}

/**
 * Spell feedback (tasks 5.1/5.2): cooldown, bolt charge, Purify channel, Ward time and short hints.
 * Polls the headless SpellSystem a few times a second; it never renders values the player should not see.
 * Every state has a text label as well as a bar, so colour is never the only cue.
 */
export function SpellHud({ spells, input }: { spells: SpellSystem; input: InputController }) {
  const [view, setView] = useState<SpellView>(() => spells.view(input.state));
  useEffect(() => {
    let last = '';
    const id = setInterval(() => {
      const next = spells.view(input.state);
      const k = key(next);
      if (k !== last) {
        last = k;
        setView(next);
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [spells, input]);

  const cooling = view.cooldownLeft > 0 && view.cooldownTotal > 0;
  return (
    <div className="hud-spellfx" data-testid="spell-hud">
      {!view.unlocked ? <div className="hud-spell-note">Not learned yet</div> : null}
      {cooling ? (
        <div
          className="hud-cooldown"
          role="progressbar"
          aria-label="Cooldown"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((1 - view.cooldownLeft / view.cooldownTotal) * 100)}
        >
          <div className="hud-cooldown-fill" style={{ width: `${(1 - view.cooldownLeft / view.cooldownTotal) * 100}%` }} />
        </div>
      ) : null}
      {view.charging ? (
        <div className="hud-charge" role="progressbar" aria-label="Charge" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(view.charge * 100)}>
          <div className="hud-charge-fill" style={{ width: `${view.charge * 100}%` }} />
          <span>{view.charge >= 1 ? 'Charged: release' : 'Charging'}</span>
        </div>
      ) : null}
      {view.channeling ? (
        <div className="hud-charge" role="progressbar" aria-label="Channel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(view.channel * 100)}>
          <div className="hud-charge-fill" style={{ width: `${view.channel * 100}%` }} />
          <span>Channeling: hold</span>
        </div>
      ) : null}
      {view.wardLeft > 0 ? <div className="hud-ward">Ward {view.wardLeft.toFixed(1)}s</div> : null}
      {view.hint ? <div className="hud-hint">{view.hint}</div> : null}
    </div>
  );
}
