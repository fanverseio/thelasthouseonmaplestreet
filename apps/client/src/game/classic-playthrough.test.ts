/**
 * Task 4.12: headless Classic playthroughs, with the network disabled (P13).
 *  - New Game to BOTH endings, with kind, dark and crossed choices.
 *  - EVERY checkpoint (cp_home_start .. cp_ritual) to BOTH endings, the state rebuilt from flags like a dev start.
 *  - Flags in critical-path order, gates opening only from their flag, premature actions refused,
 *    save marked finished, Continue hidden.
 *  - Content: every line id referenced exists, every video clip is in the manifest content/video/clips.ts.
 * Elena is teleported next to each entity (collision and walking are covered by the per-beat tests).
 */
import type { CheckpointId, ProgressFlag } from '@tlh/shared';
import { clampMorality, moralityBand } from '@tlh/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CHOICES } from '../content/choices/index.ts';
import { getLine } from '../content/dialogue/index.ts';
import { ENCOUNTER_BINDINGS } from '../content/encounters/index.ts';
import { ALL_INTERACTIONS } from '../content/interactions/index.ts';
import type { Action } from '../content/interactions/types.ts';
import { JOURNAL_PAGES } from '../content/journal/pages.ts';
import { P3_PADLOCK, P5_BOARD } from '../content/puzzles/index.ts';
import { ALL_SEQUENCES } from '../content/sequences/index.ts';
import { getVideoClip, VIDEO_CLIPS } from '../content/video/clips.ts';
import { GATES } from '../content/world/gates.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import { createGameStore } from '../store/game-store.ts';
import { CHECKPOINTS } from './checkpoints.ts';
import { angelFinalLineId, endingFlagFor, type EndingChoice } from './ending.ts';
import { STUB_ENCOUNTERS } from './encounter-stub.ts';
import {
  createNumberLock,
  createPuzzleController,
  createTalkingBoard,
  type NumberLockState,
  type PuzzleController,
} from './puzzles.ts';
import { canContinue, saveNow } from './save.ts';
import type { SequenceDef, SequenceStep } from './sequences.ts';
import {
  buildStateFromFlags,
  createAnchorDriver,
  createHeadlessGame,
  disableNetwork,
  type HeadlessGame,
  type StartEvent,
} from './test-helpers.ts';

type Dir = 'north' | 'east' | 'west';
type Choice = 'purify' | 'destroy';

/** One scripted playthrough: every player decision, and whether the clips are watched or skipped. */
interface Plan {
  name: string;
  briggs: Choice;
  gartner: 'comfort' | 'press';
  watcher: Choice;
  hounds: [Choice, Choice];
  cat: Choice;
  /** Destroy the optional street fox (it cannot be purified before Beat 4). */
  fox: boolean;
  anchors: [Dir, Dir, Dir];
  /** Hold E to skip every clip, instead of watching the placeholder timers. */
  skipClips: boolean;
  ending: EndingChoice;
}

const KIND: Plan = {
  name: 'kind, watch clips',
  briggs: 'purify', gartner: 'comfort', watcher: 'purify', hounds: ['purify', 'purify'], cat: 'purify', fox: false,
  anchors: ['north', 'east', 'west'], skipClips: false, ending: 'keeper',
};
const DARK: Plan = {
  name: 'dark, skip clips',
  briggs: 'destroy', gartner: 'press', watcher: 'destroy', hounds: ['destroy', 'destroy'], cat: 'destroy', fox: true,
  anchors: ['west', 'north', 'east'], skipClips: true, ending: 'broken',
};
/** The ending is decided only by the final choice: a kind run can break the seal, a dark run can keep it. */
const KIND_BROKEN: Plan = { ...KIND, name: 'kind, broken ending', ending: 'broken', anchors: ['east', 'west', 'north'] };
const DARK_KEEPER: Plan = { ...DARK, name: 'dark, keeper ending', ending: 'keeper', skipClips: false, anchors: ['east', 'north', 'west'] };

const OUTCOME = {
  briggs: { purify: 'briggs_purified', destroy: 'briggs_destroyed' },
  watcher: { purify: 'watcher_purified', destroy: 'watcher_destroyed' },
} as const;
const DELTA: Record<Choice, number> = { purify: 1, destroy: -1 };


interface Step {
  id: string;
  /** Flags this step sets, in the order they must appear. */
  flags: ProgressFlag[];
  /** Entry event whose checkpoint this step writes (replayed when the state is rebuilt). */
  event?: StartEvent;
  /** Hidden score change this step makes. */
  morality?: number;
  /** Clips this step plays, in order. */
  clips?: string[];
  run(g: HeadlessGame): void;
}

/** Watch (tick past the placeholder length) or skip (hold E) the clip that just started. */
function playClip(g: HeadlessGame, plan: Plan, clipId: string): void {
  const clip = getVideoClip(clipId)!;
  expect(g.world.video?.clipId).toBe(clipId);
  expect(g.world.canOpenLocket()).toBe(false);
  if (plan.skipClips) {
    expect(g.world.sequences.skip().skipped).toBe(true);
  } else {
    g.tick(clip.targetSeconds - 1);
    expect(g.world.video?.clipId, 'still playing before its length').toBe(clipId);
    g.tick(2);
  }
  expect(g.world.video).toBeNull();
}

/** Set the four dials to `code` and try (what the overlay's keys do). */
function tryCode(lock: PuzzleController<NumberLockState>, code: string) {
  lock.input({ k: 'cursor', delta: -9 });
  for (const [i, c] of [...code].entries()) {
    if (i > 0) lock.input({ k: 'cursor', delta: 1 });
    lock.input({ k: 'dial', delta: -lock.state().dials[i]! + Number(c) });
  }
  return lock.input({ k: 'try' });
}

/** A real fight (task 5.6-5.9): Bolt taps to the persistent stun, then a Purify channel or a charged Bolt. */
function fightEnemy(g: HeadlessGame, id: 'hound_1' | 'hound_2' | 'interior_cat' | 'watcher' | 'street_fox', entity: string, choice: Choice) {
  g.goTo(entity);
  expect(g.encounters.view(id).engaged, `${id} engaged`).toBe(true);
  expect(g.press()).toMatchObject({ status: 'done', id: entity }); // nothing to weaken: the spells do it
  g.fight.stun(id);
  expect(g.encounters.view(id).state).toBe('stunned');
  g.fight.defeat(id, choice);
  expect(g.encounters.view(id).outcome).toBe(choice);
}

/** The whole Classic story as steps. Flag lists are the critical-path order; the run must match them exactly. */
function buildSteps(plan: Plan): Step[] {
  const steps: Step[] = [
    {
      id: 'home',
      flags: ['bed_seen', 'drawing_seen', 'drawer_key_taken', 'locket_taken', 'angel_awake', 'journal_1', 'home_done'],
      run(g) {
        // The front door does not open before the locket is taken.
        g.goTo('door.home.front');
        expect(g.press()).toMatchObject({ status: 'refused', id: 'door.home.front', reason: 'requires' });
        g.goTo('trg.home.bedroom');
        g.goTo('clue.home.drawing');
        expect(g.press()).toMatchObject({ status: 'done', id: 'clue.home.drawing' });
        g.goTo('prop.home.pumpkin_jar');
        expect(g.press()).toMatchObject({ status: 'done', id: 'prop.home.pumpkin_jar' });
        expect(g.store.getState().progress.carried).toEqual(['drawer_key']);
        g.goTo('socket.home.drawer');
        expect(g.press()).toMatchObject({ status: 'done', id: 'socket.home.drawer' });
        expect(g.store.getState().progress.carried).toEqual([]);
        expect(g.world.sequences.active).toBe('angel_intro');
        g.tick(45);
        expect(g.world.canOpenLocket()).toBe(true);
        g.goTo('clue.home.journal_1');
        expect(g.press()).toMatchObject({ status: 'done', id: 'clue.home.journal_1' });
        g.goTo('door.home.front');
        expect(g.press()).toMatchObject({ status: 'done', id: 'door.home.front' });
      },
    },
    {
      id: 'seq1',
      flags: ['seq1_done'],
      run(g) {
        g.goTo('trg.street.seq1');
        expect(g.world.sequences.active).toBe('seq1_empty_street');
        g.tick(25);
        expect(g.flags()).not.toContain('seq1_done'); // it waits for Elena to reach the end of the street
        g.goTo('trg.street.seq1_end');
        g.tick(5);
        expect(g.world.sequences.active).toBeNull();
      },
    },
    {
      id: 'streetlight',
      flags: ['seq2_done', 'spell_bolt'],
      clips: ['seq2_felix_streetlight'],
      run(g) {
        g.goTo('trg.street.streetlight');
        expect(g.world.sequences.active).toBe('seq2_felix_streetlight');
        playClip(g, plan, 'seq2_felix_streetlight');
        expect(g.store.getState().player.spellsUnlocked).toContain('arcane_bolt');
      },
    },
  ];
  if (plan.fox) {
    steps.push({
      id: 'fox',
      flags: ['enc_street_resolved'],
      morality: -10,
      run(g) {
        g.goTo('trg.street.fox');
        fightEnemy(g, 'street_fox', 'enemy.street.fox', 'destroy');
      },
    });
  }
  steps.push(
    {
      id: 'garden_enter',
      flags: [],
      event: 'garden',
      run(g) {
        g.goTo('trg.garden.enter');
        expect(g.store.getState().game.checkpointId).toBe('cp_garden');
      },
    },
    {
      id: 'briggs',
      flags: ['seq3_started', 'spell_ward', 'spell_purify', OUTCOME.briggs[plan.briggs], 'walkie_found', 'seq3_done'],
      morality: 30 * DELTA[plan.briggs],
      run(g) {
        g.goTo('enemy.garden.briggs', 3); // within 4 m: he turns
        expect(g.flags()).toContain('seq3_started');
        g.goTo('enemy.garden.briggs');
        g.tick(6.2);
        expect(g.encounters.view('briggs').telegraphing).toBe(true);
        expect(g.flags()).toContain('spell_ward'); // Ward is taught the moment the wind-up starts (requirement 5.2)
        if (plan.briggs === 'purify') g.fight.ward(); // LMB with spell 3; the dark run takes the hit instead
        g.tick(2.6); // the wind-up is 2.5 s (Q31)
        expect(g.encounters.view('briggs').telegraphing).toBe(false);
        expect(g.press()).toMatchObject({ status: 'done', id: 'enemy.garden.briggs' }); // nothing to weaken: the spells do it
        g.fight.stun('briggs');
        expect(g.encounters.view('briggs').state).toBe('stunned');
        g.fight.defeat('briggs', plan.briggs);
        expect(g.encounters.view('briggs').outcome).toBe(plan.briggs);
        g.goTo('clue.garden.walkie');
        expect(g.press()).toMatchObject({ status: 'done', id: 'clue.garden.walkie' });
        g.tick(1);
        expect(g.world.sequences.active).toBeNull();
      },
    },
    {
      id: 'gartner',
      flags: [plan.gartner === 'comfort' ? 'gartner_comforted' : 'gartner_pressed', 'seq4_done'],
      morality: plan.gartner === 'comfort' ? 5 : -5,
      run(g) {
        g.goTo('door.hideout.shed');
        expect(g.press()).toMatchObject({ status: 'done', id: 'door.hideout.shed' });
        g.tick(30);
        expect(g.choices.view()?.options.map((o) => o.id)).toEqual(['comfort', 'press']);
        expect(g.choices.choose(plan.gartner)).toEqual({ ok: true });
        g.tick(31);
        expect(g.world.sequences.active).toBeNull();
      },
    },
    {
      id: 'gartner_journal',
      flags: ['journal_2'],
      run(g) {
        g.goTo('clue.hideout.journal_2');
        expect(g.press()).toMatchObject({ status: 'done', id: 'clue.hideout.journal_2' });
      },
    },
    {
      id: 'fuse',
      flags: ['fuse_taken', 'fuse_placed'],
      run(g) {
        g.goTo('pickup.garden.fuse');
        expect(g.press()).toMatchObject({ status: 'done', id: 'pickup.garden.fuse' });
        expect(g.store.getState().progress.carried).toEqual(['fuse']);
        g.goTo('socket.house66.fusebox');
        expect(g.press()).toMatchObject({ status: 'done', id: 'socket.house66.fusebox' });
        expect(g.store.getState().progress.carried).toEqual([]);
        expect(g.store.getState().game.checkpointId).toBe('cp_watcher');
      },
    },
    {
      id: 'watcher',
      flags: ['watcher_started', OUTCOME.watcher[plan.watcher], 'fence_key_taken', 'lane_open'],
      morality: 30 * DELTA[plan.watcher],
      run(g) {
        g.tick(3.2);
        g.goTo('enemy.house66.watcher', 3);
        expect(g.flags()).toContain('watcher_started');
        fightEnemy(g, 'watcher', 'enemy.house66.watcher', plan.watcher);
        g.goTo('pickup.house66.fence_key');
        expect(g.press()).toMatchObject({ status: 'done', id: 'pickup.house66.fence_key' });
        expect(g.store.getState().progress.carried).toEqual(['fence_key']);
        g.goTo('gate.house66.lane');
        expect(g.press()).toMatchObject({ status: 'done', id: 'gate.house66.lane' });
        expect(g.store.getState().progress.carried).toEqual([]);
        expect(g.store.getState().game.checkpointId).toBe('cp_lane');
      },
    },
    {
      id: 'lane',
      flags: ['journal_3'],
      run(g) {
        g.goTo('trg.lane.home_window');
        g.tick(6);
        g.goTo('clue.lane.journal_3');
        expect(g.press()).toMatchObject({ status: 'done', id: 'clue.lane.journal_3' });
      },
    },
    {
      id: 'grounds_enter',
      flags: [],
      event: 'grounds',
      run(g) {
        g.goTo('trg.grounds.enter');
        g.tick(0.1);
        expect(g.store.getState().game.checkpointId).toBe('cp_grounds');
      },
    },
    {
      id: 'hounds',
      flags: ['enc_approach_resolved'],
      morality: 10 * (DELTA[plan.hounds[0]] + DELTA[plan.hounds[1]]),
      run(g) {
        g.goTo('trg.grounds.enter');
        fightEnemy(g, 'hound_1', 'enemy.grounds.hound_1', plan.hounds[0]);
        expect(g.flags()).not.toContain('enc_approach_resolved'); // both hounds are needed
        fightEnemy(g, 'hound_2', 'enemy.grounds.hound_2', plan.hounds[1]);
      },
    },
    {
      id: 'padlock',
      flags: ['padlock_open'],
      run(g) {
        g.goTo('puzzle.grounds.padlock');
        expect(g.press()).toMatchObject({ status: 'done', id: 'puzzle.grounds.padlock' });
        expect(g.world.overlay).toEqual({ puzzle: 'p3_padlock' });
        const lock = createPuzzleController(g.store, createNumberLock(P3_PADLOCK), { say: (id) => g.world.say(id) });
        expect(tryCode(lock, '1965')).toContainEqual({ t: 'rattle' }); // a wrong try costs nothing
        expect(g.flags()).not.toContain('padlock_open');
        expect(tryCode(lock, '1966')).toContainEqual({ t: 'solved' });
        g.world.closeOverlay();
        g.store.getState().setPhase('playing');
        expect(g.store.getState().game.checkpointId).toBe('cp_outbuilding');
      },
    },
    {
      id: 'mirror',
      flags: ['seq5_done'],
      clips: ['seq5_felix_mirror'],
      run(g) {
        g.goTo('mirror.grounds.antique');
        expect(g.press()).toMatchObject({ status: 'done', id: 'mirror.grounds.antique' });
        playClip(g, plan, 'seq5_felix_mirror');
      },
    },
    {
      id: 'runes',
      flags: ['runes_done'],
      run(g) {
        for (const rune of ['rune.grounds.r1', 'rune.grounds.r2', 'rune.grounds.r3']) {
          expect(g.flags()).not.toContain('runes_done');
          g.goTo(rune);
          expect(g.press()).toMatchObject({ status: 'done', id: rune });
          g.tick(0.1);
        }
      },
    },
    {
      id: 'enter_house',
      flags: [],
      event: 'interior',
      run(g) {
        g.goTo('door.grounds.last_house_front');
        expect(g.press()).toMatchObject({ status: 'done', id: 'door.grounds.last_house_front' });
        g.syncPos();
        expect(g.store.getState().game.scene).toBe('last_house');
        expect(g.store.getState().game.checkpointId).toBe('cp_interior');
      },
    },
    {
      id: 'cat',
      flags: ['journal_4', 'enc_interior_resolved'],
      morality: 10 * DELTA[plan.cat],
      run(g) {
        g.goTo('clue.interior.journal_4');
        expect(g.press()).toMatchObject({ status: 'done', id: 'clue.interior.journal_4' });
        g.goTo('enemy.interior.cat', 3);
        // The talking board waits for the cat.
        g.goTo('puzzle.interior.board');
        expect(g.press()).toMatchObject({ status: 'refused', id: 'puzzle.interior.board', reason: 'requires' });
        fightEnemy(g, 'interior_cat', 'enemy.interior.cat', plan.cat);
      },
    },
    {
      id: 'board',
      flags: ['board_solved'],
      run(g) {
        g.goTo('puzzle.interior.board');
        expect(g.press()).toMatchObject({ status: 'done', id: 'puzzle.interior.board' });
        expect(g.world.overlay).toEqual({ puzzle: 'p5_board' });
        const board = createPuzzleController(g.store, createTalkingBoard(P5_BOARD), { say: (id) => g.world.say(id) });
        for (const letter of 'ZXQ') board.input({ k: 'letter', letter }); // wrong letters cost nothing
        expect(g.flags()).not.toContain('board_solved');
        for (const letter of 'KEEPR') board.input({ k: 'letter', letter });
        expect(board.solved).toBe(true);
        g.world.closeOverlay();
        g.store.getState().setPhase('playing');
        expect(g.store.getState().game.checkpointId).toBe('cp_ritual');
      },
    },
    {
      id: 'seal_reveal',
      flags: ['journal_5', 'seq6_done'],
      clips: ['seq6_two_keys'],
      run(g) {
        g.syncPos();
        g.goTo('clue.ritual.journal_5');
        expect(g.press()).toMatchObject({ status: 'done', id: 'clue.ritual.journal_5' });
        g.goTo('seal.ritual.central');
        expect(g.press()).toMatchObject({ status: 'done', id: 'seal.ritual.central' });
        playClip(g, plan, 'seq6_two_keys');
      },
    },
    {
      id: 'wake',
      flags: ['ritual_active'],
      run(g) {
        // The anchors do nothing before the seal is woken.
        g.goTo('anchor.ritual.north');
        expect(g.press().status).toBe('none');
        g.goTo('seal.ritual.central');
        expect(g.press()).toMatchObject({ status: 'done', id: 'seal.ritual.central' });
        g.tick(3.5);
        // Mid-game save: Continue is offered.
        expect(saveNow(g.store, g.storage)).toBe(true);
        expect(canContinue(g.storage.load())).toBe(true);
      },
    },
    {
      id: 'anchors',
      flags: [`anchor_${plan.anchors[0]}`, 'felix3_done', `anchor_${plan.anchors[1]}`, `anchor_${plan.anchors[2]}`, 'anchors_all'],
      clips: ['cin_felix_anchor'],
      run(g) {
        // The real anchor mechanics (task 5.10): shell + Arcane Bolt + E, E + Ward, Purify channel.
        const driver = createAnchorDriver(g);
        for (const [i, dir] of plan.anchors.entries()) {
          expect(g.flags()).not.toContain(`anchor_${dir}`);
          driver.restore(dir);
          g.world.setHeld(false);
          expect(g.flags()).toContain(`anchor_${dir}`);
          if (i === 0) playClip(g, plan, 'cin_felix_anchor');
        }
        g.tick(1);
        expect(g.world.spoken).toContain('vo_elena_b11_02');
      },
    },
    {
      id: 'ending',
      flags: [endingFlagFor(plan.ending), 'game_finished'],
      clips: [plan.ending === 'keeper' ? 'cin_ending_keeper' : 'cin_ending_broken'],
      run(g) {
        g.goTo('seal.ritual.central');
        expect(g.press()).toMatchObject({ status: 'done', id: 'seal.ritual.central' });
        expect(g.store.getState().game.phase).toBe('overlay');
        expect(g.ending.view()?.stage).toBe('angel');
        expect(g.ending.view()?.angel.text).toBe(getLine(angelFinalLineId(moralityBand(g.morality())))!.text);
        g.ending.advance();
        g.ending.select(plan.ending === 'keeper' ? 'broken' : 'keeper');
        g.ending.back(); // Esc backs out of the confirm step without choosing
        expect(g.flags()).not.toContain('ending_keeper');
        expect(g.flags()).not.toContain('ending_broken');
        g.ending.select(plan.ending);
        expect(g.ending.confirm()).toEqual({ ok: true });
        playClip(g, plan, plan.ending === 'keeper' ? 'cin_ending_keeper' : 'cin_ending_broken');
        g.tick(1);
      },
    },
  );
  return steps;
}

/** The story position each checkpoint stands for: after which step the checkpoint exists. */
const CHECKPOINT_AFTER: Record<CheckpointId, string | null> = {
  cp_home_start: null,
  cp_street: 'home',
  cp_intersection: 'streetlight',
  cp_garden: 'garden_enter',
  cp_garden_after: 'briggs',
  cp_house66: 'gartner',
  cp_watcher: 'fuse',
  cp_lane: 'watcher',
  cp_grounds: 'grounds_enter',
  cp_outbuilding: 'padlock',
  cp_interior: 'enter_house',
  cp_ritual: 'board',
};

/** Run `steps` on `g`, checking after each one that its flags are set. */
function play(g: HeadlessGame, steps: readonly Step[]): void {
  for (const step of steps) {
    step.run(g);
    for (const f of step.flags) expect(g.flags(), `${step.id} sets ${f}`).toContain(f);
  }
}

/** What must hold when the game is over, whichever way it was played. `ran` are the steps that were played. */
function assertEnded(g: HeadlessGame, plan: Plan, ran: readonly Step[]): void {
  // 1. Flags appeared in critical-path order, nothing more, nothing less, nothing twice.
  expect(g.order).toEqual(ran.flatMap((s) => s.flags));
  expect(new Set(g.order).size).toBe(g.order.length);

  // 2. Exactly the chosen ending, the finished flag, credits, a finished save and no Continue.
  const flags = g.flags();
  expect(flags).toContain(endingFlagFor(plan.ending));
  expect(flags).not.toContain(endingFlagFor(plan.ending === 'keeper' ? 'broken' : 'keeper'));
  expect(flags).toContain('game_finished');
  expect(g.ending.finished).toBe(true);
  expect(g.store.getState().game.phase).toBe('credits');
  const saved = g.storage.load();
  expect(saved.status).toBe('finished');
  expect(canContinue(saved)).toBe(false);

  // 3. The clips the story plays, in order, each listed in the manifest. The hidden score is what the choices made.
  expect(g.clips).toEqual(ran.flatMap((s) => s.clips ?? []));
  for (const id of g.clips) expect(getVideoClip(id), id).toBeDefined();
  expect(g.morality()).toBe(ran.reduce((sum, s) => clampMorality(sum + (s.morality ?? 0)), 0));

  // 4. Gates open from their flag and from nothing else: each opens once, with the flag that opens it.
  const openedAt = new Map<string, ProgressFlag>();
  for (const change of g.changes) {
    for (const id of change.opened) {
      expect(openedAt.has(id), `${id} opened twice`).toBe(false);
      openedAt.set(id, change.flag);
    }
  }
  for (const gate of GATES) {
    if (gate.opensOn === null) expect(openedAt.has(gate.id), `${gate.id} must never open`).toBe(false);
    else if (g.order.includes(gate.opensOn)) expect(openedAt.get(gate.id), gate.id).toBe(gate.opensOn);
    else expect(openedAt.has(gate.id), `${gate.id} opened without ${gate.opensOn}`).toBe(false);
  }

  // 5. No network call was attempted.
  expect(net.calls()).toBe(0);
}

let net: ReturnType<typeof disableNetwork>;
beforeEach(() => {
  net = disableNetwork();
});
afterEach(() => {
  net.restore();
});

describe('network is disabled for the playthroughs', () => {
  it('fetch, XMLHttpRequest and WebSocket throw if anything calls them', () => {
    expect(() => fetch('https://example.invalid/')).toThrow(/network disabled/);
    expect(net.calls()).toBe(1);
  });
});

describe('Classic playthrough from New Game to both endings', () => {
  for (const plan of [KIND, DARK, KIND_BROKEN, DARK_KEEPER]) {
    it(`${plan.name}: ${plan.ending} ending`, () => {
      const g = createHeadlessGame();
      expect(g.store.getState().game.checkpointId).toBe('cp_home_start');
      expect(g.store.getState().progress.flags).toEqual([]);
      expect(canContinue(g.storage.load())).toBe(false);
      const steps = buildSteps(plan);
      play(g, steps);
      assertEnded(g, plan, steps);
    }, 60_000);
  }
});

describe('Classic playthrough from every checkpoint to both endings', () => {
  it('covers every checkpoint in the game', () => {
    expect(Object.keys(CHECKPOINT_AFTER).sort()).toEqual(CHECKPOINTS.map((c) => c.id).sort());
  });

  for (const cp of CHECKPOINTS) {
    for (const plan of [KIND, DARK]) {
      it(`${cp.id} -> ${plan.ending} ending (${plan.name})`, () => {
        const steps = buildSteps(plan);
        const after = CHECKPOINT_AFTER[cp.id];
        const cut = after === null ? 0 : steps.findIndex((s) => s.id === after) + 1;
        if (after !== null) expect(cut, `step ${after}`).toBeGreaterThan(0);
        const done = steps.slice(0, cut);
        const todo = steps.slice(cut);

        // Rebuild the state at the checkpoint from flags, like a dev start, and land on its spawn point.
        const store = createGameStore();
        const failed = buildStateFromFlags(store, done.flatMap((s) => s.flags), done[done.length - 1]?.event);
        expect(failed).toEqual([]);
        expect(store.getState().game.checkpointId).toBe(cp.id);
        expect(store.getState().game.scene).toBe(cp.scene);
        expect(store.getState().player.pos[0]).toBe(cp.spawn.x);
        expect(store.getState().player.pos[2]).toBe(cp.spawn.z);
        expect(store.getState().game.phase).toBe('playing');

        const g = createHeadlessGame({ store });
        play(g, todo);
        assertEnded(g, plan, todo);
      }, 60_000);
    }
  }
});

describe('gates and actions stay shut until their flag', () => {
  /** A game rebuilt from the plan's flags that come before `flag` (and not including it). */
  function before(flag: ProgressFlag, event?: StartEvent): HeadlessGame {
    const all = buildSteps(KIND).flatMap((s) => s.flags);
    const i = all.indexOf(flag);
    expect(i, flag).toBeGreaterThan(-1);
    const store = createGameStore();
    expect(buildStateFromFlags(store, all.slice(0, i), event)).toEqual([]);
    return createHeadlessGame({ store });
  }

  const refused: [string, ProgressFlag, StartEvent | undefined, ProgressFlag][] = [
    // [entity, state is just before this flag, entry event, the flag the action would set]
    ['door.home.front', 'locket_taken', undefined, 'home_done'],
    ['door.hideout.shed', 'walkie_found', undefined, 'seq4_done'],
    ['socket.house66.fusebox', 'fuse_taken', undefined, 'fuse_placed'],
    ['gate.house66.lane', 'fence_key_taken', undefined, 'lane_open'],
    ['puzzle.grounds.padlock', 'enc_approach_resolved', undefined, 'padlock_open'],
    ['mirror.grounds.antique', 'padlock_open', undefined, 'seq5_done'],
    ['door.grounds.last_house_front', 'runes_done', undefined, 'enc_interior_resolved'],
    ['puzzle.interior.board', 'enc_interior_resolved', 'interior', 'board_solved'],
    ['door.interior.ritual', 'board_solved', 'interior', 'seq6_done'],
  ];
  it.each(refused)('%s is refused just before %s', (entity, flag, event, never) => {
    const g = before(flag, event);
    const flagsBefore = [...g.flags()];
    g.goTo(entity);
    expect(g.press().status).toMatch(/refused|none/);
    expect(g.flags()).toEqual(flagsBefore);
    expect(g.flags()).not.toContain(never);
    expect(g.store.getState().game.scene).toBe(event ? 'last_house' : 'exterior');
  });

  it('the padlock puzzle refuses a correct code before the hounds are resolved', () => {
    const g = before('enc_approach_resolved');
    const lock = createPuzzleController(g.store, createNumberLock(P3_PADLOCK));
    expect(tryCode(lock, '1966')).toContainEqual({ t: 'refused', reason: 'prerequisite' });
    expect(g.flags()).not.toContain('padlock_open');
  });

  it('the seal shows nothing before the board, and the anchors nothing before the seal is woken', () => {
    const early = before('board_solved', 'interior');
    early.goTo('seal.ritual.central');
    expect(early.press().status).toBe('none');
    const late = before('ritual_active');
    late.goTo('anchor.ritual.north');
    expect(late.press().status).toBe('none');
    late.goTo('anchor.ritual.east');
    expect(late.press().status).toBe('none');
  });

  it('the ending overlay is refused before the anchors are all restored', () => {
    const g = before('anchors_all');
    expect(g.ending.open()).toBe('anchors_missing');
    expect(g.store.getState().game.phase).not.toBe('overlay');
  });

  it('the road to the Last House never opens', () => {
    expect(GATES.find((x) => x.id === 'gate.street.last_house_road')?.opensOn).toBeNull();
  });
});

describe('content: every referenced line id exists', () => {
  const lineIds = new Map<string, string>(); // line id -> where it is referenced
  const add = (id: string | undefined, where: string) => {
    if (id !== undefined && !lineIds.has(id)) lineIds.set(id, where);
  };
  const addActions = (actions: readonly Action[], where: string) => {
    for (const a of actions) {
      if (a.do === 'say') add(a.line, where);
      if (a.do === 'readPage') add(JOURNAL_PAGES[a.page]?.line, where); // a page is read aloud
    }
  };
  const walk = (steps: readonly SequenceStep[], visit: (s: SequenceStep) => void) => {
    for (const s of steps) {
      visit(s);
      if (s.t === 'parallel') walk(s.steps, visit);
    }
  };

  for (const i of ALL_INTERACTIONS.interactions) addActions([...i.actions, ...(i.onRefuse ?? [])], `interaction ${i.id}`);
  for (const t of ALL_INTERACTIONS.triggers) addActions(t.actions, `trigger ${t.id}`);
  for (const r of ALL_INTERACTIONS.onFlag ?? []) addActions(r.actions, `onFlag ${r.flag}`);
  for (const r of ALL_INTERACTIONS.onCond ?? []) addActions(r.actions, `onCond ${r.id}`);
  for (const h of ALL_INTERACTIONS.hints) for (const s of h.steps) add(s.say, `hint ${h.id}`);
  for (const s of ALL_SEQUENCES) walk(s.steps, (st) => st.t === 'line' && add(st.lineId, `sequence ${s.id}`));
  for (const b of ENCOUNTER_BINDINGS) {
    for (const l of b.startLines ?? []) add(l, `encounter ${b.id} start`);
    for (const l of b.stunLines ?? []) add(l.line, `encounter ${b.id} stun`);
    for (const o of Object.values(b.outcomeLines ?? {})) for (const l of o) add(l.line, `encounter ${b.id} outcome`);
  }
  for (const c of CHOICES) for (const o of c.options) for (const l of o.lines) add(l.line, `choice ${c.id}/${o.id}`);
  for (const l of [...P3_PADLOCK.hintLines, ...P5_BOARD.hintLines]) add(l, 'puzzle hint');
  for (const band of ['dark', 'neutral', 'kind'] as const) add(angelFinalLineId(band), `final line ${band}`);
  add('vo_smoke_b11_01', 'ritual strike taunt');
  add('vo_smoke_b11_02', 'ritual strike taunt');

  it('collects a meaningful number of references', () => {
    expect(lineIds.size).toBeGreaterThan(80);
  });

  it.each([...lineIds.entries()])('%s (%s)', (id) => {
    const line = getLine(id);
    expect(line, id).toBeDefined();
    expect(line?.text.trim().length, id).toBeGreaterThan(0);
  });

  it('every sequence, encounter and entity an interaction names exists and is placed', () => {
    const sequenceIds = new Set<string>(ALL_SEQUENCES.map((s) => s.id));
    const actions = [
      ...ALL_INTERACTIONS.interactions.flatMap((i) => [...i.actions, ...(i.onRefuse ?? [])]),
      ...ALL_INTERACTIONS.triggers.flatMap((t) => t.actions),
      ...(ALL_INTERACTIONS.onFlag ?? []).flatMap((r) => r.actions),
      ...(ALL_INTERACTIONS.onCond ?? []).flatMap((r) => r.actions),
    ];
    for (const a of actions) {
      if (a.do === 'startSequence') expect(sequenceIds.has(a.sequence), a.sequence).toBe(true);
      if (a.do === 'encounter') expect(a.id in STUB_ENCOUNTERS, a.id).toBe(true);
    }
    for (const i of ALL_INTERACTIONS.interactions) expect(PLACEMENTS[i.id], i.id).toBeDefined();
    for (const t of ALL_INTERACTIONS.triggers) expect(PLACEMENTS[t.id], t.id).toBeDefined();
  });
});

describe('content: every video clip is in the manifest', () => {
  const videoSteps: { sequence: SequenceDef; clipId: string; fallbackSeconds: number }[] = [];
  const walk = (def: SequenceDef, steps: readonly SequenceStep[]) => {
    for (const s of steps) {
      if (s.t === 'video') videoSteps.push({ sequence: def, clipId: s.clipId, fallbackSeconds: s.fallbackSeconds });
      if (s.t === 'parallel') walk(def, s.steps);
    }
  };
  for (const def of ALL_SEQUENCES) walk(def, def.steps);

  it('finds the six clips the story plays', () => {
    expect(videoSteps.map((v) => v.clipId).sort()).toEqual(VIDEO_CLIPS.map((c) => c.id).sort());
    expect(VIDEO_CLIPS).toHaveLength(6);
  });

  it.each(videoSteps.map((v) => [v.clipId, v] as const))('%s is listed with matching length', (clipId, v) => {
    const clip = getVideoClip(clipId);
    expect(clip, `${clipId} missing from content/video/clips.ts`).toBeDefined();
    expect(clip?.id).toBe(v.sequence.id); // clip id = sequence id
    expect(clip?.targetSeconds).toBe(v.fallbackSeconds);
    expect(clip?.targetSeconds).toBeLessThanOrEqual(clip!.maxSeconds);
    expect(v.sequence.maxForcedSeconds).toBeGreaterThanOrEqual(clip!.targetSeconds);
    expect(v.sequence.skippable).toBe(true);
  });

  it('every manifest row has a beat, a purpose, a prompt and the canon rules in its text', () => {
    const ids = new Set<string>();
    for (const c of VIDEO_CLIPS) {
      expect(ids.has(c.id), `duplicate ${c.id}`).toBe(false);
      ids.add(c.id);
      expect(c.beat).toBeGreaterThanOrEqual(1);
      expect(c.beat).toBeLessThanOrEqual(12);
      expect(c.purpose.length).toBeGreaterThan(20);
      expect(c.prompt.length, c.id).toBeGreaterThan(200);
      expect(c.prompt.length, c.id).toBeLessThan(1500);
      expect(c.format).toEqual({ aspect: '16:9', fps: 24 });
      // Canon: no gore, Felix is never harmed, the smoke has no face.
      expect(c.prompt, c.id).not.toMatch(/\b(gore|gory|blood|bloody|wound|wounded|corpse|dead|dying|stab|bleed|injur\w*|hurt|suffer\w*)\b/i);
      expect(c.negativePrompt, c.id).toMatch(/gore/);
      if (/smoke/i.test(c.prompt)) expect(c.prompt, c.id).toMatch(/faceless/i);
      if (/boy|Felix/i.test(c.prompt)) expect(c.prompt, c.id).toMatch(/eight-year-old|boy of eight/);
      expect(c.voiceLines.length).toBeGreaterThan(0);
    }
  });
});
