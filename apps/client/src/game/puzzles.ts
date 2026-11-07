/**
 * Generic headless puzzle framework (docs/puzzles.md, task 4.2). No React, no Three.
 *
 * A PuzzleMachine is a pure transition function over plain, serialisable state. A controller keeps
 * that state in the store (`progress.puzzles[id].data`), so closing and reopening an overlay never
 * loses anything. Tries are unlimited, wrong answers cost nothing, and the grant flag is only ever
 * written through the store's `setFlag` once the prerequisite flag is set.
 */
import type { ProgressFlag, PuzzleId } from '@tlh/shared';
import type { NumberLockConfig, TalkingBoardConfig } from '../content/puzzles/types.ts';
import type { GameStore, PuzzleState } from '../store/game-store.ts';

export type PuzzleEvent =
  | { t: 'wrong'; attempts: number }
  | { t: 'rattle' }
  | { t: 'correct'; letter: string }
  | { t: 'scare'; index: number; scare: string }
  | { t: 'reset'; round: number; revealed: string[] }
  | { t: 'hint'; level: number; line: string | undefined }
  | { t: 'refused'; reason: 'prerequisite' | 'flag_rejected' }
  | { t: 'solved' };

export type PuzzleInput =
  | { k: 'dial'; delta: number }
  | { k: 'cursor'; delta: number }
  | { k: 'try' }
  | { k: 'letter'; letter: string }
  | { k: 'reset' };

export interface MachineStep<S> {
  state: S;
  events: PuzzleEvent[];
}

export interface PuzzleMachine<S extends object = object> {
  id: PuzzleId;
  requires: ProgressFlag;
  grants: ProgressFlag;
  /** Idle sim seconds that raise the hint level (optional; wrong attempts are the main source). */
  idleHintSeconds: readonly number[];
  initial(): S;
  input(state: S, input: PuzzleInput): MachineStep<S>;
  /** The puzzle's own win condition holds (the prerequisite flag is checked by the controller). */
  complete(state: S): boolean;
  wrongAttempts(state: S): number;
  hintLevel(state: S): number;
  hintLine(level: number): string | undefined;
}

/* ---------------- P3: number lock ---------------- */

export interface NumberLockState {
  dials: number[];
  cursor: number;
  wrong: number;
  complete: boolean;
}

export function createNumberLock(cfg: NumberLockConfig): PuzzleMachine<NumberLockState> {
  const n = cfg.code.length;
  const levelOf = (wrong: number) => cfg.hintAtWrong.filter((w) => wrong >= w).length;
  return {
    id: cfg.id,
    requires: cfg.requires,
    grants: cfg.grants,
    idleHintSeconds: cfg.idleHintSeconds ?? [],
    initial: () => ({ dials: Array.from({ length: n }, () => 0), cursor: 0, wrong: 0, complete: false }),
    input(s, i) {
      switch (i.k) {
        case 'dial': {
          const dials = s.dials.slice();
          dials[s.cursor] = (((dials[s.cursor]! + i.delta) % 10) + 10) % 10;
          return { state: { ...s, dials, complete: false }, events: [] };
        }
        case 'cursor':
          return { state: { ...s, cursor: Math.min(n - 1, Math.max(0, s.cursor + i.delta)) }, events: [] };
        case 'try': {
          if (s.dials.join('') === cfg.code) return { state: { ...s, complete: true }, events: [] };
          const wrong = s.wrong + 1;
          return { state: { ...s, wrong, complete: false }, events: [{ t: 'rattle' }, { t: 'wrong', attempts: wrong }] };
        }
        default:
          return { state: s, events: [] };
      }
    },
    complete: (s) => s.complete,
    wrongAttempts: (s) => s.wrong,
    hintLevel: (s) => levelOf(s.wrong),
    hintLine: (level) => cfg.hintLines[level - 1],
  };
}

/** Dials that glow at the current hint level: leading digits of the code, in order. */
export function lockGlow(cfg: NumberLockConfig, level: number): { index: number; digit: number }[] {
  const digits = cfg.glowFromLevel.filter((g) => level >= g.level).reduce((m, g) => Math.max(m, g.digits), 0);
  return Array.from(cfg.code.slice(0, digits), (c, index) => ({ index, digit: Number(c) }));
}

/* ---------------- P5: talking board ---------------- */

export interface TalkingBoardState {
  /** Letters tried this round. */
  guessed: string[];
  /** Resets so far; each reveals one more bonus letter. */
  round: number;
  wrongRound: number;
  wrong: number;
  /** Letters revealed by resets (persist across rounds). */
  revealed: string[];
  scares: number;
  complete: boolean;
}

export function createTalkingBoard(cfg: TalkingBoardConfig): PuzzleMachine<TalkingBoardState> {
  const letters = new Set(cfg.word.split(''));
  const done = (s: Pick<TalkingBoardState, 'guessed' | 'revealed'>) =>
    [...letters].every((l) => s.guessed.includes(l) || s.revealed.includes(l));
  return {
    id: cfg.id,
    requires: cfg.requires,
    grants: cfg.grants,
    idleHintSeconds: cfg.idleHintSeconds ?? [],
    initial: () => ({ guessed: [], round: 0, wrongRound: 0, wrong: 0, revealed: [], scares: 0, complete: false }),
    input(s, i) {
      if (i.k === 'reset') {
        // A voluntary reset: clears this round's guesses; revealed letters and round stay.
        return { state: { ...s, guessed: [], wrongRound: 0, complete: done({ guessed: [], revealed: s.revealed }) }, events: [] };
      }
      if (i.k !== 'letter') return { state: s, events: [] };
      const letter = i.letter.toUpperCase();
      if (!/^[A-Z]$/.test(letter) || s.guessed.includes(letter) || s.revealed.includes(letter)) return { state: s, events: [] };
      const guessed = [...s.guessed, letter];
      if (letters.has(letter)) {
        return { state: { ...s, guessed, complete: done({ guessed, revealed: s.revealed }) }, events: [{ t: 'correct', letter }] };
      }
      const wrong = s.wrong + 1;
      const wrongRound = s.wrongRound + 1;
      const scares = s.scares + 1;
      const events: PuzzleEvent[] = [
        { t: 'wrong', attempts: wrong },
        { t: 'scare', index: scares, scare: cfg.scares[(scares - 1) % cfg.scares.length]! },
      ];
      if (wrongRound >= cfg.maxWrong) {
        const round = s.round + 1;
        const revealed = [...new Set([...s.revealed, ...cfg.bonusLetters.slice(0, round)])];
        events.push({ t: 'reset', round, revealed });
        return { state: { ...s, guessed: [], wrongRound: 0, wrong, scares, round, revealed, complete: done({ guessed: [], revealed }) }, events };
      }
      return { state: { ...s, guessed, wrongRound, wrong, scares }, events };
    },
    complete: (s) => s.complete,
    wrongAttempts: (s) => s.wrong,
    hintLevel: (s) => Math.min(cfg.hintLines.length, s.round),
    hintLine: (level) => cfg.hintLines[level - 1],
  };
}

/** The board as shown: one entry per letter of the word, `null` while hidden. */
export function boardMask(cfg: TalkingBoardConfig, s: TalkingBoardState): (string | null)[] {
  return cfg.word.split('').map((l) => (s.guessed.includes(l) || s.revealed.includes(l) ? l : null));
}

/* ---------------- Controller (store-backed) ---------------- */

export interface PuzzleControllerOptions {
  /** Speak a hint line (the world runtime's `say`). */
  say?: (lineId: string) => void;
}

export interface PuzzleController<S extends object> {
  readonly id: PuzzleId;
  readonly solved: boolean;
  readonly hintLevel: number;
  /** Current machine state (a copy; the store holds the truth). */
  state(): S;
  input(input: PuzzleInput): PuzzleEvent[];
  /** Advance idle time (sim seconds). The sim is frozen while an overlay is open, so views call this only if they want idle hints. */
  tick(dt: number): PuzzleEvent[];
  /** Re-check the win condition, e.g. after reopening once the prerequisite flag is set. */
  open(): PuzzleEvent[];
}

type Stored<S> = S & { _idle?: number };

export function createPuzzleController<S extends object>(
  store: GameStore,
  machine: PuzzleMachine<S>,
  options: PuzzleControllerOptions = {},
): PuzzleController<S> {
  const read = (): PuzzleState | undefined => store.getState().progress.puzzles[machine.id];
  const readData = (): Stored<S> => ({ ...machine.initial(), ...((read()?.data ?? {}) as Partial<Stored<S>>) });
  const idleLevel = (idle: number) => machine.idleHintSeconds.filter((s) => idle >= s).length;
  const levelOf = (data: Stored<S>) => Math.max(machine.hintLevel(data), idleLevel(data._idle ?? 0));

  function write(data: Stored<S>, solved: boolean): void {
    const hintLevel = levelOf(data);
    store.setState((s) => ({
      progress: { ...s.progress, puzzles: { ...s.progress.puzzles, [machine.id]: { solved, hintLevel, data: data as Record<string, unknown> } } },
    }));
  }

  /** Raise the hint level event when it went up. */
  function hintEvents(before: number, after: number): PuzzleEvent[] {
    const out: PuzzleEvent[] = [];
    for (let level = before + 1; level <= after; level++) {
      const line = machine.hintLine(level);
      out.push({ t: 'hint', level, line });
      if (line) options.say?.(line);
    }
    return out;
  }

  /** Win condition met: grant the flag only when the prerequisite flag is set. */
  function finish(data: Stored<S>): { solved: boolean; events: PuzzleEvent[] } {
    if (!machine.complete(data)) return { solved: false, events: [] };
    if (!store.getState().progress.flags.includes(machine.requires)) return { solved: false, events: [{ t: 'refused', reason: 'prerequisite' }] };
    const r = store.getState().setFlag(machine.grants);
    if (!r.ok) return { solved: false, events: [{ t: 'refused', reason: 'flag_rejected' }] };
    return { solved: true, events: [{ t: 'solved' }] };
  }

  function apply(next: Stored<S>, before: number, events: PuzzleEvent[]): PuzzleEvent[] {
    const out = [...events, ...hintEvents(before, levelOf(next))];
    const f = finish(next);
    write(next, f.solved);
    return [...out, ...f.events];
  }

  return {
    id: machine.id,
    get solved() {
      return read()?.solved ?? false;
    },
    get hintLevel() {
      return read()?.hintLevel ?? 0;
    },
    state: () => {
      const { _idle: _unused, ...rest } = readData();
      void _unused;
      return rest as unknown as S;
    },
    input(input) {
      if (read()?.solved) return [];
      const data = readData();
      const before = levelOf(data);
      const step = machine.input(data, input);
      return apply({ ...step.state, _idle: 0 } as Stored<S>, before, step.events);
    },
    tick(dt) {
      if (read()?.solved || machine.idleHintSeconds.length === 0) return [];
      const data = readData();
      const before = levelOf(data);
      const next = { ...data, _idle: (data._idle ?? 0) + dt } as Stored<S>;
      const events = hintEvents(before, levelOf(next));
      write(next, false);
      return events;
    },
    open() {
      if (read()?.solved) return [];
      const data = readData();
      const f = finish(data);
      write(data, f.solved);
      return f.events;
    },
  };
}

/** Machines for the two overlay puzzles, keyed by puzzle id. */
export type OverlayPuzzleId = 'p3_padlock' | 'p5_board';
