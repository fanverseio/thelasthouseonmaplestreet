import type { EntityId, ProgressFlag } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { getLine } from '../content/dialogue/index.ts';
import { ENCOUNTER_BINDINGS } from '../content/encounters/index.ts';
import { BEAT10 } from '../content/interactions/beat10.ts';
import { BEAT9 } from '../content/interactions/beat9.ts';
import type { Cond, InteractionDef } from '../content/interactions/types.ts';
import { P5_BOARD } from '../content/puzzles/index.ts';
import { ALL_SEQUENCES } from '../content/sequences/index.ts';
import { SEQ6_TWO_KEYS } from '../content/sequences/beat10.ts';
import { interiorColliders } from '../content/world/interior-layout.ts';
import { createWorldRegistry } from '../content/world/index.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import { createGameStore } from '../store/game-store.ts';
import { moveAndSlide } from './collision.ts';
import { createEncounterWorld } from './encounter-runtime.ts';
import { createCombat, createFighter } from './test-helpers.ts';
import { DEV_STARTS } from './dev-start.ts';
import { PLAYER_RADIUS, SIM_DT } from './player.ts';
import { sealState } from './progression.ts';
import { createPuzzleController, createTalkingBoard } from './puzzles.ts';
import { validateSequenceDef } from './sequences.ts';

const DOOR = 'door.grounds.last_house_front';
const CAT = 'enemy.interior.cat';
const BOARD = 'puzzle.interior.board';
const SEAL = 'seal.ritual.central';

/** Post-runes_done state, Elena at the Last House front door, real flags in real order. */
function setup(options: { loadScene?: (scene: string) => Promise<unknown> | null } = {}) {
  const store = createGameStore();
  store.getState().startNewGame('classic');
  for (const f of DEV_STARTS.interior) expect(store.getState().setFlag(f).ok, f).toBe(true);
  const combat = createCombat(store);
  const { world, encounters } = createEncounterWorld({ store, enemies: combat.enemies, ...(options.loadScene && { loadScene: options.loadScene }) });
  const pos = { x: PLACEMENTS[DOOR as EntityId]!.x, z: PLACEMENTS[DOOR as EntityId]!.z };
  const flags = () => store.getState().progress.flags;
  const tick = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / SIM_DT); i++) world.tick(SIM_DT, { x: pos.x, z: pos.z });
  };
  /** Straight-line walk with the interior walls and the doors that are closed right now. */
  const walkTo = (x: number, z: number) => {
    for (let i = 0; i < 60 * 40; i++) {
      const dx = x - pos.x;
      const dz = z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) break;
      const step = Math.min(d, 4 * SIM_DT);
      const next = moveAndSlide(pos, { x: (dx / d) * step, z: (dz / d) * step }, PLAYER_RADIUS, interiorColliders(flags()));
      const moved = Math.hypot(next.x - pos.x, next.z - pos.z);
      pos.x = next.x;
      pos.z = next.z;
      world.tick(SIM_DT, { x: pos.x, z: pos.z });
      if (moved < 1e-6) break;
    }
    return Math.hypot(x - pos.x, z - pos.z);
  };
  const press = () => world.interact({ x: pos.x, z: pos.z });
  /** Enter through the front door (synchronous loader) and stand at the entry. */
  const enter = () => {
    expect(press()).toEqual({ status: 'done', id: DOOR });
    const p = store.getState().player.pos;
    pos.x = p[0];
    pos.z = p[2];
  };
  /** The real fight through the SpellSystem (test-helpers.ts). */
  const fight = createFighter({ store, ...combat, encounters, world, pos });
  return { store, world, encounters, pos, flags, tick, walkTo, press, enter, fight, enemies: combat.enemies };
}

type Game = ReturnType<typeof setup>;

/** Face the cat, fight it for real (bolts to the stun, then Purify or a charged Bolt), resolve it. */
function resolveCat(g: Game, choice: 'purify' | 'destroy') {
  expect(g.walkTo(0, -1)).toBeLessThan(0.1);
  expect(g.encounters.view('interior_cat').engaged).toBe(true);
  expect(g.world.prompt).toBe('E  Face the cat');
  expect(g.press()).toMatchObject({ status: 'done', id: CAT }); // nothing to weaken: the spells do it
  g.fight.stun('interior_cat');
  expect(g.encounters.view('interior_cat').state).toBe('stunned');
  g.fight.defeat('interior_cat', choice);
  expect(g.encounters.view('interior_cat')).toMatchObject({ state: 'resolved', outcome: choice });
}

/** Solve the board through the P5 machine (what the overlay drives). */
function solveBoard(g: Game) {
  g.walkTo(6, 4.5);
  expect(g.press()).toEqual({ status: 'done', id: BOARD });
  expect(g.store.getState().game.phase).toBe('overlay');
  expect(g.world.overlay).toEqual({ puzzle: 'p5_board' });
  const board = createPuzzleController(g.store, createTalkingBoard(P5_BOARD), { say: (l) => g.world.say(l) });
  for (const letter of 'KEEPR') board.input({ k: 'letter', letter });
  expect(board.solved).toBe(true);
  g.world.closeOverlay();
  g.store.getState().setPhase('playing');
}

describe('Beat 9-10 content', () => {
  const registry = createWorldRegistry();

  it('references only existing entities, lines, sequences and placements', () => {
    for (const d of [...BEAT9.interactions, ...BEAT10.interactions]) {
      expect(registry.has(d.id), d.id).toBe(true);
      expect(PLACEMENTS[d.id], d.id).toBeDefined();
      for (const a of [...d.actions, ...(d.onRefuse ?? [])]) {
        if (a.do === 'say') expect(getLine(a.line), a.line).toBeDefined();
        if (a.do === 'startSequence') expect(ALL_SEQUENCES.some((s) => s.id === a.sequence), a.sequence).toBe(true);
      }
    }
    for (const id of ['spawn.interior.entry', 'door.interior.ritual', 'seal.ritual.central']) expect(PLACEMENTS[id as EntityId], id).toBeDefined();
    const cat = ENCOUNTER_BINDINGS.find((b) => b.id === 'interior_cat')!;
    expect(cat.entity).toBe(CAT);
    for (const l of cat.startLines ?? []) expect(getLine(l), l).toBeDefined();
    for (const f of BEAT9.onFlag ?? []) for (const a of f.actions) if (a.do === 'say') expect(getLine(a.line)).toBeDefined();
  });

  it('seq6_two_keys is one skippable video step that sets seq6_done', () => {
    expect(validateSequenceDef(SEQ6_TWO_KEYS)).toEqual([]);
    expect(SEQ6_TWO_KEYS.steps).toEqual([{ t: 'video', clipId: 'seq6_two_keys', fallbackSeconds: 40 }]);
    expect(SEQ6_TWO_KEYS).toMatchObject({ skippable: true, setsOnComplete: ['seq6_done'], requires: ['board_solved'] });
    expect(SEQ6_TWO_KEYS.policy).toEqual({ locket: 'blocked', angelActions: 'blocked', control: 'locked' });
  });
});

/** Does this show condition hold for the flags? (flags and notFlags only, which is all the seal defs use) */
function shows(c: Cond | undefined, flags: readonly ProgressFlag[]): boolean {
  return (c?.flags ?? []).every((f) => flags.includes(f)) && !(c?.notFlags ?? []).some((f) => flags.includes(f));
}

describe('central seal: the reveal state (task 4.8)', () => {
  const STATES: [string, ProgressFlag[]][] = [
    ['locked', []],
    ['reveal', ['board_solved']],
    ['activate', ['board_solved', 'seq6_done']],
    ['inert', ['board_solved', 'seq6_done', 'ritual_active']],
    ['choice', ['board_solved', 'seq6_done', 'ritual_active', 'anchors_all']],
    ['done', ['board_solved', 'seq6_done', 'ritual_active', 'anchors_all', 'ending_keeper']],
  ];

  it('the seal state table matches sealState()', () => {
    for (const [name, flags] of STATES) expect(sealState(flags), name).toBe(name);
  });

  it('the Beat 10 def is shown in the reveal state only and starts Sequence 6', () => {
    const seal = BEAT10.interactions.filter((d: InteractionDef) => d.id === SEAL);
    expect(seal).toHaveLength(1);
    expect(seal[0]!.actions).toEqual([{ do: 'startSequence', sequence: 'seq6_two_keys' }]);
    for (const [name, flags] of STATES) expect(shows(seal[0]!.show, flags), name).toBe(name === 'reveal');
  });
});

describe('Beat 9 headless playthrough', () => {
  it('the front door refuses before runes_done and does not switch scene', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    const { world } = createEncounterWorld({ store });
    const door = PLACEMENTS[DOOR as EntityId]!;
    world.tick(SIM_DT, { x: door.x, z: door.z });
    expect(world.interact({ x: door.x, z: door.z })).toMatchObject({ status: 'refused', id: DOOR, reason: 'requires' });
    expect(store.getState().game.scene).toBe('exterior');
  });

  it('entering switches the scene, writes cp_interior and stands Elena at the entry', () => {
    const g = setup();
    expect(g.world.prompt).toBeNull();
    g.tick(SIM_DT);
    expect(g.world.prompt).toBe('E  Enter the Last House');
    g.enter();
    const s = g.store.getState();
    expect(s.game.scene).toBe('last_house');
    expect(s.game.checkpointId).toBe('cp_interior');
    expect(s.player.pos).toEqual([0, 0, 20]);
    g.tick(2.1);
    expect(g.world.spoken).toContain('vo_elena_b9_01');
    // The exterior door is no longer offered from inside.
    expect(g.world.nearest({ x: -62, z: 34.6 })).toBeNull();
  });

  it('waits for the scene loader promise: no switch while it is pending, one switch only, retry after a failure', async () => {
    let release: () => void = () => {};
    const g = setup({ loadScene: () => new Promise((resolve) => { release = () => resolve(undefined); }) });
    expect(g.press()).toEqual({ status: 'done', id: DOOR });
    expect(g.world.sceneLoading).toBe('last_house');
    expect(g.store.getState().game.scene).toBe('exterior');
    expect(g.store.getState().game.checkpointId).not.toBe('cp_interior');
    expect(g.press()).toMatchObject({ status: 'refused', id: DOOR, reason: 'scene_loading' });

    release();
    await Promise.resolve();
    await Promise.resolve();
    expect(g.world.sceneLoading).toBeNull();
    expect(g.store.getState().game.scene).toBe('last_house');
    expect(g.store.getState().game.checkpointId).toBe('cp_interior');

    // A failed load leaves Elena outside; pressing the door again retries.
    let fail: () => void = () => {};
    let ready = false;
    const h = setup({ loadScene: () => (ready ? null : new Promise((_, reject) => { fail = () => reject(new Error('chunk failed')); })) });
    h.press();
    fail();
    await Promise.resolve();
    await Promise.resolve();
    expect(h.world.sceneLoading).toBeNull();
    expect(h.store.getState().game.scene).toBe('exterior');
    ready = true;
    expect(h.press()).toEqual({ status: 'done', id: DOOR });
    expect(h.store.getState().game.scene).toBe('last_house');
  });

  it.each([
    { choice: 'purify' as const, delta: 10 },
    { choice: 'destroy' as const, delta: -10 },
  ])('the cat ($choice) sets enc_interior_resolved and the board then opens', ({ choice, delta }) => {
    const g = setup();
    g.enter();
    const before = g.store.getState().progress.morality.value;
    const hp = g.store.getState().player.hp;

    // The board refuses until the cat is resolved.
    g.walkTo(6, 4.5);
    expect(g.world.prompt).toBe('E  Look at the talking board');
    expect(g.press()).toMatchObject({ status: 'refused', id: BOARD, reason: 'requires' });
    expect(g.store.getState().game.phase).not.toBe('overlay');
    // The cellar door is shut too.
    expect(g.walkTo(0, -12)).toBeGreaterThan(5);

    resolveCat(g, choice);
    expect(g.flags()).toContain('enc_interior_resolved');
    expect(g.store.getState().progress.morality.value - before).toBe(delta);
    expect(g.store.getState().player.hp).toBe(hp); // the stub cat never hurts
    expect(g.world.spoken).toContain('vo_angel_b9_01');
    expect(g.world.nearest({ x: 0, z: -1 })).toBeNull(); // the cat's interaction is gone
  });

  it('solves the board with wrong letters first (hp untouched), writes cp_ritual and opens the cellar door', () => {
    const g = setup();
    g.enter();
    resolveCat(g, 'purify');
    const hp = g.store.getState().player.hp;
    g.walkTo(6, 4.5);
    expect(g.press()).toEqual({ status: 'done', id: BOARD });
    const board = createPuzzleController(g.store, createTalkingBoard(P5_BOARD), { say: (l) => g.world.say(l) });
    for (const letter of 'ZXQJWVBNMLZ') board.input({ k: 'letter', letter }); // eleven wrong letters, two scares and a reset
    expect(g.store.getState().player.hp).toBe(hp);
    expect(g.flags()).not.toContain('board_solved');
    g.world.closeOverlay();
    g.store.getState().setPhase('playing');
    // Reopening keeps the state; finish it.
    expect(g.press()).toEqual({ status: 'done', id: BOARD });
    for (const letter of 'KEEPR') board.input({ k: 'letter', letter });
    expect(board.solved).toBe(true);
    expect(g.flags()).toContain('board_solved');
    expect(g.store.getState().game.checkpointId).toBe('cp_ritual');
    expect(g.store.getState().player.hp).toBe(hp);
    g.world.closeOverlay();
    g.store.getState().setPhase('playing');
    g.tick(0.1);
    expect(g.world.spoken).toContain('vo_elena_b9_03');
    g.walkTo(0, 0); // back to the stairs (the landing walls are in the way of a diagonal)
    expect(g.walkTo(0, -12)).toBeLessThan(0.1); // through the cellar door
    expect(g.flags()).not.toContain('seq6_done');
  });
});

/** From the post-runes state to standing at the seal, board solved. */
function toSeal(): Game {
  const g = setup();
  g.enter();
  resolveCat(g, 'purify');
  solveBoard(g);
  g.walkTo(0, 0);
  g.walkTo(0, -13.5);
  return g;
}

describe('Beat 10 headless playthrough', () => {
  it('the seal in the reveal state starts the clip; a full run sets seq6_done and opens the anchor doors', () => {
    const g = toSeal();
    expect(g.world.prompt).toBe('E  Lay your hand on the seal');
    // Anchor doors are shut before seq6_done.
    expect(moveCheck(g.flags(), 0, -36)).toBe(false);
    expect(g.press()).toEqual({ status: 'done', id: SEAL });
    expect(g.world.video).toEqual({ clipId: 'seq6_two_keys', fallbackSeconds: 40 });
    expect(g.world.sequences.active).toBe('seq6_two_keys');
    expect(g.flags()).not.toContain('seq6_done');
    expect(g.press()).toMatchObject({ status: 'refused', id: SEAL }); // no second start
    g.tick(39);
    expect(g.flags()).not.toContain('seq6_done');
    g.tick(1.5);
    expect(g.flags()).toContain('seq6_done');
    expect(g.world.video).toBeNull();
    expect(g.world.sequences.active).toBeNull();
    expectAnchorDoorsOpen(g);
  });

  it('a skip ends in the same state as the full run', () => {
    const full = toSeal();
    full.press();
    full.tick(41);
    const skipped = toSeal();
    skipped.press();
    skipped.tick(3);
    expect(skipped.world.sequences.skip().skipped).toBe(true);
    expect(skipped.flags()).toContain('seq6_done');
    expect(skipped.world.video).toBeNull();
    expect(skipped.flags()).toEqual(full.flags());
    const a = full.store.getState();
    const b = skipped.store.getState();
    expect(b.game.checkpointId).toBe(a.game.checkpointId);
    expect(b.game.scene).toBe(a.game.scene);
    expect(b.progress.morality.value).toBe(a.progress.morality.value);
    expectAnchorDoorsOpen(skipped);
  });

  it('after seq6_done the reveal def is gone (the activate state belongs to Beat 11)', () => {
    const g = toSeal();
    g.press();
    g.tick(41);
    expect(g.world.actions.some((a) => a.id === SEAL && a.prompt === 'Lay your hand on the seal')).toBe(false);
  });
});

/** Waypoints from the chamber centre to each anchor room (the seal stands in the middle). */
const VIA: Record<string, [number, number][]> = {
  '0,-36': [[5, -12], [5, -24], [0, -26], [0, -36]],
  '18,-18': [[5, -12], [8, -18], [18, -18]],
  '-18,-18': [[-5, -12], [-8, -18], [-18, -18]],
};

/** Can Elena walk from the chamber centre to the target through the doors as they are for these flags? */
function moveCheck(flags: readonly ProgressFlag[], x: number, z: number): boolean {
  const pos = { x: 0, z: -12 };
  for (const [wx, wz] of VIA[`${x},${z}`]!) {
    for (let i = 0; i < 60 * 20; i++) {
      const dx = wx - pos.x;
      const dz = wz - pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) break;
      const step = Math.min(d, 4 * SIM_DT);
      const next = moveAndSlide(pos, { x: (dx / d) * step, z: (dz / d) * step }, PLAYER_RADIUS, interiorColliders(flags));
      if (Math.hypot(next.x - pos.x, next.z - pos.z) < 1e-6) return false;
      pos.x = next.x;
      pos.z = next.z;
    }
  }
  return true;
}

function expectAnchorDoorsOpen(g: Game): void {
  for (const [x, z] of [[0, -36], [18, -18], [-18, -18]] as const) expect(moveCheck(g.flags(), x, z), `${x},${z}`).toBe(true);
}