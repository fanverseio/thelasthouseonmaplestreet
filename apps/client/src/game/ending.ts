/**
 * Final choice and ending runtime (Beat 12, task 4.10). Headless: no React, no Three.
 *
 * Flow: interact with the seal in state `choice` -> the `finale` action calls `open()` -> overlay (phase
 * 'overlay', no timer): the Angel's last line, then the two options, then "This cannot be undone." ->
 * `confirm()` sets the ending flag through the store's `setFlag`, plays the ending clip as a sequence ->
 * the sequence sets `game_finished` -> the save is marked finished (Continue disappears) -> phase 'credits'.
 *
 * Canon: the ending is decided ONLY by the choice. `endingFlagFor` is the single mapping and takes nothing
 * else; the hidden score only picks which authored Angel line is spoken before the overlay.
 */
import { moralityBand, type MoralityBand, type ProgressFlag, type SequenceId } from '@tlh/shared';
import { getLine } from '../content/dialogue/index.ts';
import { ALL_SEQUENCES } from '../content/sequences/index.ts';
import type { SaveStorage } from '../services/save-storage.ts';
import type { GameStore } from '../store/game-store.ts';
import { markFinished } from './save.ts';
import type { SequenceDef } from './sequences.ts';
import type { WorldRuntime } from './world-runtime.ts';

export type EndingChoice = 'keeper' | 'broken';
export const ENDING_CHOICES: readonly EndingChoice[] = ['keeper', 'broken'];

/** The one mapping from choice to ending. Nothing but the choice goes in. */
export function endingFlagFor(choice: EndingChoice): ProgressFlag {
  return choice === 'keeper' ? 'ending_keeper' : 'ending_broken';
}

export function endingSequenceFor(choice: EndingChoice): SequenceId {
  return choice === 'keeper' ? 'cin_ending_keeper' : 'cin_ending_broken';
}

/** The ending already chosen, read back from the flags (null before the choice). */
export function endingOfFlags(flags: readonly ProgressFlag[]): EndingChoice | null {
  if (flags.includes('ending_keeper')) return 'keeper';
  if (flags.includes('ending_broken')) return 'broken';
  return null;
}

/** Authored line id of the Angel's last word, by band. Placeholder-flagged in content if the script lacks one. */
export function angelFinalLineId(band: MoralityBand): string {
  return `vo_angel_b12_${band}`;
}

/** Player-facing text (not voiced). */
export const ENDING_TEXT = {
  options: {
    keeper: 'Restore the seal and take Felix\'s place as its keeper',
    broken: 'Break the seal and pull Felix free',
  },
  confirm: 'This cannot be undone.',
  endCards: {
    keeper: {
      title: 'The Bloodline Keeper',
      text: 'Every Halloween after, Elena walks to the end of Maple Street and checks the lock. Felix walks with her.',
    },
    broken: { title: 'The Broken Seal', text: 'By morning, the fog had reached the next town.' },
  },
} as const;

export type EndingStage = 'angel' | 'choose' | 'confirm';

/** What the overlay may see: text and options only. It never carries the hidden score. */
export interface EndingView {
  stage: EndingStage;
  angel: { speaker: string; text: string; placeholder: boolean };
  options: readonly { id: EndingChoice; label: string }[];
  /** The option awaiting confirmation (stage 'confirm'). */
  selected: EndingChoice | null;
  confirmText: string;
}

export type ConfirmResult = { ok: true } | { ok: false; reason: 'not_confirming' | 'flag_rejected'; detail?: string };

export interface EndingRuntime {
  attach(world: WorldRuntime): void;
  /** The `finale` action: open the overlay. Returns a failure reason, or null. */
  open(): string | null;
  view(): EndingView | null;
  /** Angel line read: show the two options. */
  advance(): void;
  /** Pick an option: ask for confirmation. */
  select(choice: EndingChoice): void;
  /** Esc: back out of the confirm step only. No effect at any other stage. */
  back(): void;
  /** Yes: set the ending flag and play the ending clip. */
  confirm(): ConfirmResult;
  /** Advance by one sim step: finishes the game once the ending clip has set `game_finished`. */
  tick(dt: number): void;
  /** True once the save was marked finished and the phase moved to 'credits'. */
  readonly finished: boolean;
  readonly version: number;
  subscribe(listener: () => void): () => void;
}

export interface EndingRuntimeOptions {
  store: GameStore;
  /** Where the finished save is written. Omit in tests that do not look at the save. */
  storage?: SaveStorage;
  sequences?: readonly SequenceDef[];
}

export function createEndingRuntime(options: EndingRuntimeOptions): EndingRuntime {
  const { store, storage } = options;
  const sequences = options.sequences ?? ALL_SEQUENCES;
  let world: WorldRuntime | null = null;
  let stage: EndingStage | null = null;
  let selected: EndingChoice | null = null;
  let angelLineId = '';
  let finished = false;
  let version = 0;
  const listeners = new Set<() => void>();
  const bump = () => {
    version++;
    for (const l of listeners) l();
  };
  const flags = () => store.getState().progress.flags;

  function playEnding(choice: EndingChoice): void {
    const def = sequences.find((s) => s.id === endingSequenceFor(choice));
    if (def && world) world.sequences.trigger(def);
  }

  return {
    attach(w) {
      world = w;
    },
    open() {
      if (!flags().includes('anchors_all')) return 'anchors_missing';
      if (endingOfFlags(flags()) !== null) return 'already_chosen';
      if (stage !== null) return null;
      angelLineId = angelFinalLineId(moralityBand(store.getState().progress.morality.value));
      stage = 'angel';
      selected = null;
      store.getState().setPhase('overlay'); // freezes the sim; the view releases pointer lock
      bump();
      return null;
    },
    view() {
      if (stage === null) return null;
      const line = getLine(angelLineId);
      return {
        stage,
        angel: { speaker: line?.speaker ?? 'Angel', text: line?.text ?? '', placeholder: line?.placeholder === true },
        options: ENDING_CHOICES.map((id) => ({ id, label: ENDING_TEXT.options[id] })),
        selected,
        confirmText: ENDING_TEXT.confirm,
      };
    },
    advance() {
      if (stage !== 'angel') return;
      stage = 'choose';
      bump();
    },
    select(choice) {
      if (stage !== 'choose') return;
      selected = choice;
      stage = 'confirm';
      bump();
    },
    back() {
      if (stage !== 'confirm') return;
      selected = null;
      stage = 'choose';
      bump();
    },
    confirm() {
      if (stage !== 'confirm' || selected === null) return { ok: false, reason: 'not_confirming' };
      const choice = selected;
      const set = store.getState().setFlag(endingFlagFor(choice));
      if (!set.ok) return { ok: false, reason: 'flag_rejected', detail: set.detail };
      stage = null;
      selected = null;
      store.getState().setPhase('playing'); // the sim runs again so the ending clip can play
      playEnding(choice);
      bump();
      return { ok: true };
    },
    tick() {
      if (finished || stage !== null) return;
      const choice = endingOfFlags(flags());
      if (choice === null) return;
      if (flags().includes('game_finished')) {
        finished = true;
        if (storage) markFinished(store, storage);
        store.getState().setPhase('credits');
        bump();
        return;
      }
      // Chosen but the clip is not running (e.g. the game was reloaded mid-ending): play it again.
      if (world && world.sequences.active === null && world.video === null) playEnding(choice);
    },
    get finished() {
      return finished;
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
