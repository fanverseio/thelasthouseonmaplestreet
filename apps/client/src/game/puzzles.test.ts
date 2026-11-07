import type { EntityId } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { getLine } from '../content/dialogue/index.ts';
import type { InteractionContent } from '../content/interactions/types.ts';
import { P3_PADLOCK, P5_BOARD } from '../content/puzzles/index.ts';
import { createGameStore } from '../store/game-store.ts';
import { boardMask, createNumberLock, createPuzzleController, createTalkingBoard, lockGlow } from './puzzles.ts';
import { createWorldRuntime } from './world-runtime.ts';

const lock = createNumberLock(P3_PADLOCK);
const board = createTalkingBoard(P5_BOARD);

function setup() {
  const store = createGameStore();
  store.getState().startNewGame('classic');
  const said: string[] = [];
  const p3 = createPuzzleController(store, lock, { say: (l) => said.push(l) });
  const p5 = createPuzzleController(store, board, { say: (l) => said.push(l) });
  return { store, said, p3, p5, flags: () => store.getState().progress.flags as readonly string[] };
}

/** Set the dials to a 4-digit string and press E. */
function tryCode(p3: ReturnType<typeof setup>['p3'], code: string) {
  const cur = p3.state().dials;
  for (let d = 0; d < 4; d++) {
    p3.input({ k: 'cursor', delta: -9 });
    p3.input({ k: 'cursor', delta: d });
    p3.input({ k: 'dial', delta: Number(code[d]) - cur[d]! });
  }
  return p3.input({ k: 'try' });
}

describe('P3 number lock', () => {
  it('hints come at the 1st, 3rd, 5th and 7th wrong attempt', () => {
    const { p3, said } = setup();
    const levels: number[] = [];
    for (let i = 1; i <= 8; i++) {
      tryCode(p3, '0000');
      levels.push(p3.hintLevel);
    }
    expect(levels).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
    expect(said).toEqual(P3_PADLOCK.hintLines);
    for (const l of said) expect(getLine(l)).toBeDefined();
    expect(lockGlow(P3_PADLOCK, 2)).toEqual([]);
    expect(lockGlow(P3_PADLOCK, 3).map((g) => g.digit)).toEqual([1, 9]);
    expect(lockGlow(P3_PADLOCK, 4).map((g) => g.digit)).toEqual([1, 9, 6, 6]);
  });

  it('allows unlimited tries and keeps the state', () => {
    const { p3, store } = setup();
    for (let i = 0; i < 40; i++) tryCode(p3, '1234');
    expect(p3.state().wrong).toBe(40);
    expect(p3.solved).toBe(false);
    // "Closed and reopened": a fresh controller over the same store sees the same dials.
    const again = createPuzzleController(store, lock);
    expect(again.state().dials).toEqual([1, 2, 3, 4]);
    expect(again.state().wrong).toBe(40);
  });

  it('refuses a correct code without the prerequisite flag, and solves with it', () => {
    const { p3, store, flags } = setup();
    expect(tryCode(p3, '1966')).toEqual([{ t: 'refused', reason: 'prerequisite' }]);
    expect(p3.solved).toBe(false);
    expect(flags()).not.toContain('padlock_open');
    expect(p3.state().wrong).toBe(0); // a correct code is never a wrong attempt
    store.getState().setFlag('enc_approach_resolved');
    expect(p3.input({ k: 'try' }).map((e) => e.t)).toEqual(['solved']);
    expect(p3.solved).toBe(true);
    expect(flags()).toContain('padlock_open');
  });

  it('wraps dials and clamps the cursor', () => {
    const { p3 } = setup();
    p3.input({ k: 'dial', delta: -1 });
    expect(p3.state().dials[0]).toBe(9);
    p3.input({ k: 'cursor', delta: -5 });
    expect(p3.state().cursor).toBe(0);
    p3.input({ k: 'cursor', delta: 9 });
    expect(p3.state().cursor).toBe(3);
  });
});

describe('P5 talking board', () => {
  const wrongLetters = 'BCDFGHIJLMNOQSTUVWXYZ';

  it('wrong letters scare in order and never reduce hp', () => {
    const { p5, store } = setup();
    const hp = store.getState().player.hp;
    const scares: string[] = [];
    for (const l of wrongLetters.slice(0, 6)) {
      for (const e of p5.input({ k: 'letter', letter: l })) if (e.t === 'scare') scares.push(e.scare);
    }
    expect(scares).toEqual(P5_BOARD.scares);
    expect(store.getState().player.hp).toBe(hp);
  });

  it('resets after 6 wrong letters with the next letter revealed and a hint', () => {
    const { p5, said } = setup();
    for (const l of wrongLetters.slice(0, 6)) p5.input({ k: 'letter', letter: l });
    expect(p5.state().round).toBe(1);
    expect(p5.state().guessed).toEqual([]);
    expect(boardMask(P5_BOARD, p5.state())).toEqual(['K', null, null, null, null, null]);
    expect(said).toEqual(['vo_angel_p5_h1']);
    for (const l of wrongLetters.slice(6, 12)) p5.input({ k: 'letter', letter: l });
    for (const l of wrongLetters.slice(12, 18)) p5.input({ k: 'letter', letter: l });
    expect(said).toEqual(P5_BOARD.hintLines);
    expect(boardMask(P5_BOARD, p5.state())).toEqual(['K', 'E', 'E', 'P', 'E', null]);
    for (const l of said) expect(getLine(l)).toBeDefined();
  });

  it('a manual reset clears the round but keeps revealed letters', () => {
    const { p5 } = setup();
    p5.input({ k: 'letter', letter: 'E' });
    p5.input({ k: 'letter', letter: 'Z' });
    p5.input({ k: 'reset' });
    expect(p5.state().guessed).toEqual([]);
    expect(p5.state().wrongRound).toBe(0);
    expect(p5.state().wrong).toBe(1);
  });

  it('solving sets board_solved only with the prerequisite flag; reopening re-checks', () => {
    const { p5, store, flags } = setup();
    for (const l of 'KEPR') p5.input({ k: 'letter', letter: l });
    expect(p5.solved).toBe(false);
    expect(flags()).not.toContain('board_solved');
    expect(p5.open()).toEqual([{ t: 'refused', reason: 'prerequisite' }]);
    store.getState().setFlag('enc_interior_resolved');
    expect(p5.open().map((e) => e.t)).toEqual(['solved']);
    expect(p5.solved).toBe(true);
    expect(flags()).toContain('board_solved');
  });

  it('repeated or invalid letters change nothing', () => {
    const { p5 } = setup();
    p5.input({ k: 'letter', letter: 'Z' });
    expect(p5.input({ k: 'letter', letter: 'z' })).toEqual([]);
    expect(p5.input({ k: 'letter', letter: '1' })).toEqual([]);
    expect(p5.state().wrong).toBe(1);
  });
});

describe('puzzle state', () => {
  it('survives a JSON round trip', () => {
    const { p3, p5, store } = setup();
    tryCode(p3, '1234');
    p5.input({ k: 'letter', letter: 'K' });
    p5.input({ k: 'letter', letter: 'Z' });
    const saved = JSON.parse(JSON.stringify(store.getState().progress.puzzles)) as ReturnType<typeof store.getState>['progress']['puzzles'];
    const fresh = createGameStore();
    fresh.setState((s) => ({ progress: { ...s.progress, puzzles: saved } }));
    expect(createPuzzleController(fresh, lock).state()).toEqual(p3.state());
    expect(createPuzzleController(fresh, board).state()).toEqual(p5.state());
  });

  it('idle sim time can raise the hint level', () => {
    const { store } = setup();
    const idle = createNumberLock({ ...P3_PADLOCK, idleHintSeconds: [30, 60] });
    const c = createPuzzleController(store, idle);
    expect(c.tick(29)).toEqual([]);
    expect(c.tick(2).map((e) => e.t)).toEqual(['hint']);
    expect(c.hintLevel).toBe(1);
  });
});

describe('overlay fixture (test-only)', () => {
  const ID = 'puzzle.test.padlock' as EntityId;
  const content: InteractionContent = {
    interactions: [{ id: ID, prompt: 'Try the padlock', actions: [{ do: 'openPuzzle', puzzle: 'p3_padlock' }] }],
    triggers: [],
    hints: [],
  };

  it('open -> wrong attempts -> hints -> close -> reopen -> solve', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    const rt = createWorldRuntime({ store, content: { interactions: content, sequences: [], placements: { [ID]: { x: 0, z: 0, r: 1 } } } });
    rt.tick(1 / 60, { x: 0, z: 0 });
    expect(rt.interact({ x: 0, z: 0 })).toEqual({ status: 'done', id: ID });
    expect(store.getState().game.phase).toBe('overlay');
    expect(rt.overlay).toEqual({ puzzle: 'p3_padlock' });

    const p3 = createPuzzleController(store, lock, { say: (l) => rt.say(l) });
    for (let i = 0; i < 3; i++) tryCode(p3, '2000');
    expect(rt.subtitle?.text).toBe('The page in the lane. The year.');

    rt.closeOverlay();
    expect(rt.overlay).toBeNull();
    expect(store.getState().game.phase).toBe('paused');

    rt.openOverlay('p3_padlock');
    expect(store.getState().game.phase).toBe('overlay');
    const reopened = createPuzzleController(store, lock);
    expect(reopened.state().wrong).toBe(3);
    expect(reopened.state().dials).toEqual([2, 0, 0, 0]);

    store.getState().setFlag('enc_approach_resolved');
    tryCode(reopened, '1966');
    expect(reopened.solved).toBe(true);
    expect(store.getState().progress.flags).toContain('padlock_open');
  });
});
