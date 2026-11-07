/**
 * Dialogue choice runtime (task 4.3): a small, generic two-way choice inside an interactive sequence.
 * No React, no Three. A sequence opens it with a `prompt` step whose textId names a `ChoiceDef`
 * (content/choices/); the choice sets the option's flag through the store's `setFlag` (the sequence's
 * `prompt` step ends on any of the option flags), applies the option's hidden score change with the same
 * helper the encounters use, and speaks the option's lines. The score never reaches the view.
 */
import type { ProgressFlag } from '@tlh/shared';
import { CHOICES } from '../content/choices/index.ts';
import type { GameStore } from '../store/game-store.ts';
import { applyMoralityDelta } from './encounter-stub.ts';
import type { SequenceEffect } from './sequences.ts';
import type { WorldRuntime } from './world-runtime.ts';

export interface ChoiceOption {
  id: string;
  /** Button text. */
  label: string;
  /** Set when chosen. Mutually exclusive flags (shared flags.ts) keep it to one. */
  flag: ProgressFlag;
  /** Hidden score change, applied with applyMoralityDelta. */
  delta: number;
  lines: readonly { line: string; after?: number }[];
}

export interface ChoiceDef {
  /** The `prompt` step textId that opens it. */
  id: string;
  options: readonly ChoiceOption[];
}

/** What the UI may see: ids and labels only. */
export interface ChoiceView {
  id: string;
  options: readonly { id: string; label: string }[];
}

export type ChoiceResult = { ok: true } | { ok: false; reason: 'no_choice' | 'unknown_option' | 'flag_rejected'; detail?: string };

export interface ChoiceRuntime {
  attach(world: WorldRuntime): void;
  /** Feed every sequence effect here (createEncounterWorld does). */
  handleEffect(effect: SequenceEffect): void;
  /** The open choice, or null. */
  view(): ChoiceView | null;
  choose(optionId: string): ChoiceResult;
  readonly version: number;
  subscribe(listener: () => void): () => void;
}

export function createChoiceRuntime(options: { store: GameStore; choices?: readonly ChoiceDef[] }): ChoiceRuntime {
  const { store } = options;
  const choices = options.choices ?? CHOICES;
  let world: WorldRuntime | null = null;
  let open: ChoiceDef | null = null;
  let version = 0;
  const listeners = new Set<() => void>();
  const bump = () => {
    version++;
    for (const l of listeners) l();
  };

  return {
    attach(w) {
      world = w;
    },
    handleEffect(e) {
      if (e.k === 'prompt') {
        const def = choices.find((c) => c.id === e.textId);
        if (def) {
          open = def;
          bump();
        }
      } else if ((e.k === 'promptEnd' && open?.id === e.textId) || e.k === 'sequenceEnd' || e.k === 'rollback') {
        if (open) {
          open = null;
          bump();
        }
      }
    },
    view: () => (open ? { id: open.id, options: open.options.map((o) => ({ id: o.id, label: o.label })) } : null),
    choose(optionId) {
      if (!open) return { ok: false, reason: 'no_choice' };
      const opt = open.options.find((o) => o.id === optionId);
      if (!opt) return { ok: false, reason: 'unknown_option' };
      const w = world;
      if (!w) throw new Error('ChoiceRuntime: attach(world) first');
      const set = store.getState().setFlag(opt.flag);
      if (!set.ok) return { ok: false, reason: 'flag_rejected', detail: set.detail };
      const at = w.simTime;
      store.setState((s) => ({
        progress: { ...s.progress, morality: applyMoralityDelta(s.progress.morality, opt.delta, `${open!.id}:${opt.id}`, at) },
      }));
      for (const l of opt.lines) w.say(l.line, l.after);
      open = null;
      bump();
      return { ok: true };
    },
    get version() {
      return version;
    },
    subscribe(l) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}
