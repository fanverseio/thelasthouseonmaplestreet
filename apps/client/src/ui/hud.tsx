import type { ItemId, SpellId } from '@tlh/shared';
import type { ActionOption } from '../game/world-runtime.ts';
import { showCarriedRow } from '../game/interaction.ts';
import { objectiveFor } from '../game/objectives.ts';
import { useGame } from '../store/index.ts';

/** Player-facing names. Spells are shown with a glyph and a name, so colour is never the only cue. */
export const SPELL_LABELS: Record<SpellId, { glyph: string; name: string }> = {
  arcane_bolt: { glyph: '✦', name: 'Arcane Bolt' },
  purify: { glyph: '❂', name: 'Purify' },
  ward: { glyph: '⛉', name: 'Ward' },
};

export const ITEM_LABELS: Record<ItemId, { glyph: string; name: string }> = {
  drawer_key: { glyph: '🗝', name: 'Drawer key' },
  fuse: { glyph: '⚡', name: 'Fuse' },
  fence_key: { glyph: '🗝', name: 'Fence key' },
  toy_rabbit: { glyph: '🐇', name: 'Toy rabbit' },
  photo: { glyph: '🖼', name: 'Photo' },
};

function Bar({ label, value, kind }: { label: string; value: number; kind: 'health' | 'magic' }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`hud-bar hud-bar-${kind}`} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="hud-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** HUD: health, magic, spell, objective, carried items, interaction prompt. Shows no hidden values. */
export function Hud({ actions = [], tutorial }: { actions?: readonly ActionOption[]; tutorial?: string | null }) {
  const hp = useGame((s) => s.player.hp);
  const magic = useGame((s) => s.player.magic);
  const selected = useGame((s) => s.player.selectedSpell);
  const flags = useGame((s) => s.progress.flags);
  const carried = useGame((s) => s.progress.carried);
  const spell = SPELL_LABELS[selected];

  return (
    <div className="hud" aria-live="polite">
      <div className="hud-objective">{objectiveFor(flags)}</div>
      {actions.length > 0 ? (
        <aside className="hud-actions" aria-label="Actions">
          <h2>Actions</h2>
          <ul>
            {actions.map((a) => (
              <li key={a.id} className={a.selected ? 'selected' : undefined} aria-current={a.selected ? 'true' : undefined}>
                <kbd>{a.selected ? 'E' : ' '}</kbd> {a.prompt}
              </li>
            ))}
          </ul>
          {actions.length > 1 ? <small>Q: switch action</small> : null}
        </aside>
      ) : null}
      {tutorial ? <div className="hud-tutorial">{tutorial}</div> : null}
      <div className="hud-bottom-left">
        <Bar label="Health" value={hp} kind="health" />
        <Bar label="Magic" value={magic} kind="magic" />
      </div>
      <div className="hud-spell">
        <span aria-hidden="true">{spell.glyph}</span> {spell.name}
      </div>
      {showCarriedRow(carried) ? (
        <ul className="hud-carried" aria-label="Carried items">
          {carried.map((id) => (
            <li key={id} title={ITEM_LABELS[id].name}>
              <span aria-hidden="true">{ITEM_LABELS[id].glyph}</span>
              <span className="sr-only">{ITEM_LABELS[id].name}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
