import type { ProgressFlag } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { CHOICES } from '../content/choices/index.ts';
import { ENCOUNTER_BINDINGS } from '../content/encounters/index.ts';
import { getLine } from '../content/dialogue/index.ts';
import { ALL_INTERACTIONS } from '../content/interactions/index.ts';
import { ALL_SEQUENCES } from '../content/sequences/index.ts';
import { exteriorColliders } from '../content/world/exterior-layout.ts';
import { createWorldRegistry } from '../content/world/index.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import { createGameStore } from '../store/game-store.ts';
import { moveAndSlide } from './collision.ts';
import { createEncounterWorld } from './encounter-runtime.ts';
import { PLAYER_RADIUS, SIM_DT } from './player.ts';
import { objectiveFor } from './objectives.ts';
import { validateSequenceDef } from './sequences.ts';

const POST_SEQ3: ProgressFlag[] = [
  'locket_taken', 'angel_awake', 'home_done', 'seq1_done', 'seq2_done', 'spell_bolt', 'seq3_started',
  'spell_ward', 'spell_purify', 'briggs_purified', 'walkie_found', 'seq3_done',
];

/** A headless Elena in Mr Briggs' garden right after Beat 4, with real collision. */
function setup(extra: ProgressFlag[] = []) {
  const store = createGameStore();
  store.getState().startNewGame('classic');
  for (const f of [...POST_SEQ3, ...extra]) expect(store.getState().setFlag(f).ok, f).toBe(true);
  const { world, encounters, choices } = createEncounterWorld({ store });
  const pos = { x: 58, z: 5 };
  const flags = () => store.getState().progress.flags;
  const carried = () => store.getState().progress.carried;
  const tick = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / SIM_DT); i++) world.tick(SIM_DT, { x: pos.x, z: pos.z });
  };
  const walkTo = (x: number, z: number) => {
    for (let i = 0; i < 60 * 60; i++) {
      const dx = x - pos.x;
      const dz = z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) break;
      const step = Math.min(d, 4 * SIM_DT);
      const next = moveAndSlide(pos, { x: (dx / d) * step, z: (dz / d) * step }, PLAYER_RADIUS, exteriorColliders(flags()));
      const moved = Math.hypot(next.x - pos.x, next.z - pos.z);
      pos.x = next.x;
      pos.z = next.z;
      world.tick(SIM_DT, { x: pos.x, z: pos.z });
      if (moved < 1e-6) break;
    }
    return Math.hypot(x - pos.x, z - pos.z);
  };
  /** Walk through waypoints that keep clear of the green; each leg must arrive. */
  const route = (...pts: [number, number][]) => {
    for (const [x, z] of pts) expect(walkTo(x, z), `to ${x},${z}`).toBeLessThan(0.1);
  };
  const press = () => world.interact({ x: pos.x, z: pos.z });
  const morality = () => store.getState().progress.morality.value;
  return { store, world, encounters, choices, pos, flags, carried, tick, walkTo, route, press, morality };
}
type Game = ReturnType<typeof setup>;

const SHED_DOOR: [number, number] = [62, -30.9];
const NORTH_ARC_EAST: [number, number] = [55, -31];
const FUSEBOX_SPOT: [number, number] = [-52, -33.5];

/** Beat 5 from the garden to seq4_done, picking `choice`. */
function playGartner(g: Game, choice: 'comfort' | 'press') {
  g.route([59, -10], [58, -28], SHED_DOOR);
  expect(g.press()).toMatchObject({ status: 'done', id: 'door.hideout.shed' });
  expect(g.world.sequences.active).toBe('seq4_gartner_confession');
  expect(g.world.sequences.policy.control).toBe('limited');
  expect(g.world.canOpenLocket()).toBe(false);
  // The panel is not open yet, and pressing E again does not restart or break the scene.
  expect(g.choices.view()).toBeNull();
  expect(g.press().status).toBe('refused');
  g.tick(30);
  const view = g.choices.view();
  expect(view?.options.map((o) => o.id)).toEqual(['comfort', 'press']);
  expect(JSON.stringify(view)).not.toMatch(/morality|delta|score|-?\d/);
  expect(g.flags()).not.toContain('seq4_done');
  expect(g.choices.choose(choice)).toEqual({ ok: true });
  expect(g.choices.view()).toBeNull();
  g.tick(31);
}

describe('Beat 5/6 content', () => {
  const registry = createWorldRegistry();

  it('references only existing entities, lines and placements', () => {
    const seq = ALL_SEQUENCES.find((s) => s.id === 'seq4_gartner_confession')!;
    expect(validateSequenceDef(seq)).toEqual([]);
    for (const st of seq.steps) if (st.t === 'line') expect(getLine(st.lineId), st.lineId).toBeDefined();
    for (const id of [
      'door.hideout.shed', 'npc.hideout.gartner', 'clue.hideout.journal_2', 'light.hideout.shed_bulb',
      'socket.house66.fusebox', 'enemy.house66.watcher', 'pickup.house66.fence_key', 'gate.house66.lane',
    ]) {
      expect(registry.has(id), id).toBe(true);
      expect(PLACEMENTS[id], id).toBeDefined();
    }
    for (const c of CHOICES) {
      for (const o of c.options) for (const l of o.lines) expect(getLine(l.line), l.line).toBeDefined();
    }
    for (const b of ENCOUNTER_BINDINGS) {
      for (const l of [...(b.stunLines ?? []), ...(b.startLines ?? []).map((line) => ({ line }))]) expect(getLine(l.line), l.line).toBeDefined();
    }
    for (const h of ALL_INTERACTIONS.hints) {
      for (const s of h.steps) {
        if (s.say) expect(getLine(s.say), s.say).toBeDefined();
        if (s.flicker) expect(registry.has(s.flicker), s.flicker).toBe(true);
      }
    }
  });

  it('the fuse and the fence key are used by exactly one socket each, and nothing drops items', () => {
    const uses = ALL_INTERACTIONS.interactions.flatMap((i) => i.actions.flatMap((a) => (a.do === 'useSocket' ? [[i.id, a.item]] : [])));
    expect(uses.filter(([, item]) => item === 'fuse')).toEqual([['socket.house66.fusebox', 'fuse']]);
    expect(uses.filter(([, item]) => item === 'fence_key')).toEqual([['gate.house66.lane', 'fence_key']]);
    const kinds = new Set(ALL_INTERACTIONS.interactions.flatMap((i) => i.actions.map((a) => a.do)));
    expect([...kinds].filter((k) => /drop|discard/i.test(k))).toEqual([]);
  });
});

describe.each([
  { choice: 'comfort' as const, flag: 'gartner_comforted' as const, delta: 5 },
  { choice: 'press' as const, flag: 'gartner_pressed' as const, delta: -5 },
])('Beat 5 headless playthrough: $choice', ({ choice, flag, delta }) => {
  it('reaches seq4_done, opens the veil and writes cp_house66', () => {
    const g = setup();
    const before = g.morality();
    playGartner(g, choice);
    expect(g.flags()).toEqual(expect.arrayContaining([flag, 'seq4_done']));
    expect(g.flags()).not.toContain(choice === 'comfort' ? 'gartner_pressed' : 'gartner_comforted');
    expect(g.morality() - before).toBe(delta);
    expect(g.store.getState().game.checkpointId).toBe('cp_house66');
    expect(g.world.sequences.active).toBeNull();
    expect(g.world.canOpenLocket()).toBe(true);
    // Same information either way; only the two choice lines differ.
    const gartnerLines = g.world.spoken.filter((l) => l.startsWith('vo_gartner_b5_'));
    expect(gartnerLines).toEqual(
      ['01', '02', '03', '04', '05', choice === 'comfort' ? '06a' : '06b', '07', '08', '09', '10'].map((n) => `vo_gartner_b5_${n}`),
    );
    expect(g.world.spoken).toEqual(expect.arrayContaining([choice === 'comfort' ? 'vo_elena_b5_c1' : 'vo_elena_b5_p1']));
    expect(objectiveFor(g.flags())).toBe('Find a fuse for House 66.');

    // The optional journal page, then the veil is open for good.
    g.route([63, -30.2]);
    expect(g.press()).toMatchObject({ status: 'done', id: 'clue.hideout.journal_2' });
    expect(g.flags()).toContain('journal_2');
    expect(g.walkTo(-30, -31)).toBeLessThan(0.1);
  });

  it('the House 66 veil holds until the scene is done', () => {
    const g = setup();
    g.route([59, -10], NORTH_ARC_EAST);
    expect(g.walkTo(-30, -31)).toBeGreaterThan(1);
  });

  it('the choice cannot be made outside the scene', () => {
    const g = setup();
    expect(g.choices.choose(choice)).toMatchObject({ ok: false, reason: 'no_choice' });
    expect(g.flags()).not.toContain(flag);
  });
});

/** Beats 5 and 6 from the garden to a stunned Watcher. */
function toStunnedWatcher(g: Game) {
  playGartner(g, 'comfort');
  g.route([59, -10], [59, 14], [60.9, 16.5]);
  expect(g.press()).toMatchObject({ status: 'done', id: 'pickup.garden.fuse' });
  expect(g.carried()).toEqual(['fuse']);
  expect(objectiveFor(g.flags())).toBe('Bring the fuse to House 66.');
  g.route([59, 5], [59, -10], [55, -31], FUSEBOX_SPOT);
  expect(g.press()).toMatchObject({ status: 'done', id: 'socket.house66.fusebox' });
  expect(g.flags()).toContain('fuse_placed');
  expect(g.carried()).toEqual([]);
  expect(g.store.getState().game.checkpointId).toBe('cp_watcher');
  g.tick(3.2);
  expect(g.world.spoken).toEqual(expect.arrayContaining(['vo_elena_b6_02', 'vo_watcher_b6_01']));
  // He engages when Elena comes within 4 m; E weakens him, the stub stuns him a moment later.
  g.route([-58, -31.5]);
  expect(g.flags()).toContain('watcher_started');
  expect(g.encounters.view('watcher').hostile).toBe(true);
  g.route([-58, -30]);
  expect(g.world.prompt).toBe('E  Face the Watcher');
  expect(g.press()).toMatchObject({ status: 'done', id: 'enemy.house66.watcher' });
  expect(g.encounters.view('watcher').state).toBe('weakened');
  g.tick(2.6);
  expect(g.encounters.view('watcher').state).toBe('stunned');
  expect(g.world.spoken).toContain('vo_watcher_b6_05');
}

describe.each([
  { choice: 'purify' as const, flag: 'watcher_purified' as const, delta: 30 },
  { choice: 'destroy' as const, flag: 'watcher_destroyed' as const, delta: -30 },
])('Beat 6 headless playthrough: $choice', ({ choice, flag, delta }) => {
  it('reaches lane_open with every flag in order and the key used only on the lane gate', () => {
    const g = setup();
    const order: ProgressFlag[] = [];
    let seen = g.flags().length;
    g.store.subscribe((s) => {
      for (const f of s.progress.flags.slice(seen)) order.push(f);
      seen = s.progress.flags.length;
    });
    toStunnedWatcher(g);
    const before = g.morality();
    expect(g.encounters.choose('watcher', choice)).toEqual({ ok: true });
    expect(g.morality() - before).toBe(delta);
    expect(g.flags()).toContain(flag);
    expect(g.flags()).not.toContain('fence_key_taken'); // the key is a pickup
    expect(g.world.canOpenLocket()).toBe(true);
    expect(objectiveFor(g.flags())).toBe('Take the fence key.');

    // The gate stays shut without the key, and the veil holds.
    g.route([-59.5, -24.2]);
    expect(g.press()).toMatchObject({ status: 'refused', id: 'gate.house66.lane' });
    expect(g.flags()).not.toContain('lane_open');
    expect(g.walkTo(-59.5, -19)).toBeGreaterThan(1);

    g.route([-57, -29]);
    expect(g.press()).toMatchObject({ status: 'done', id: 'pickup.house66.fence_key' });
    expect(g.carried()).toEqual(['fence_key']);
    expect(g.flags()).toContain('fence_key_taken');
    expect(objectiveFor(g.flags())).toBe('Unlock the lane gate.');
    g.route([-59.5, -24.2]);
    expect(g.walkTo(-59.5, -19)).toBeGreaterThan(1); // the key alone opens nothing
    expect(g.press()).toMatchObject({ status: 'done', id: 'gate.house66.lane' });
    expect(g.carried()).toEqual([]);
    expect(g.flags()).toContain('lane_open');
    expect(g.store.getState().game.checkpointId).toBe('cp_lane');
    expect(g.walkTo(-58, -19)).toBeLessThan(0.1); // through the open gate
    expect(objectiveFor(g.flags())).toBe('Follow the back lane to the Last House.');

    expect(order.filter((f) => ['seq4_done', 'fuse_taken', 'fuse_placed', 'watcher_started', flag, 'fence_key_taken', 'lane_open'].includes(f))).toEqual([
      'seq4_done', 'fuse_taken', 'fuse_placed', 'watcher_started', flag, 'fence_key_taken', 'lane_open',
    ]);
  });
});

describe('Beat 6 rules', () => {
  it('the fuse box refuses Elena without the fuse, and she keeps the fuse across a death', () => {
    const g = setup(['seq4_done']);
    g.route([59, 14], [60.9, 16.5]);
    g.press();
    expect(g.carried()).toEqual(['fuse']);
    g.store.setState((s) => ({ player: { ...s.player, hp: 0 } }));
    g.tick(0.05);
    expect(g.carried()).toEqual(['fuse']);
    expect(g.store.getState().player.hp).toBe(100);
    g.route([59, 5], [59, -10], [55, -31], FUSEBOX_SPOT);
    expect(g.press()).toMatchObject({ status: 'done', id: 'socket.house66.fusebox' });
  });

  it('refuses the empty fuse box with a line, and takes nothing else', () => {
    const g = setup(['seq4_done']);
    g.route([59, -10], [55, -31], FUSEBOX_SPOT);
    expect(g.press()).toMatchObject({ status: 'refused', id: 'socket.house66.fusebox' });
    expect(g.world.spoken).toContain('vo_elena_b6_01');
    expect(g.flags()).not.toContain('fuse_placed');
  });

  it('death respawns at cp_watcher: the fuse stays placed and the Watcher resets', () => {
    const g = setup();
    toStunnedWatcher(g);
    g.store.setState((s) => ({ player: { ...s.player, hp: 0 } }));
    g.world.tick(SIM_DT, { x: g.pos.x, z: g.pos.z });
    const s = g.store.getState();
    expect(s.player.pos).toEqual([-56, 0, -32]);
    expect(s.player.hp).toBe(100);
    expect(s.progress.flags).toEqual(expect.arrayContaining(['fuse_placed', 'watcher_started']));
    expect(g.encounters.view('watcher')).toMatchObject({ state: 'idle', engaged: false, hostile: false });
    // Elena can start over from the respawn point and finish.
    g.pos.x = -56;
    g.pos.z = -32;
    g.route([-58, -31.5], [-58, -30]);
    expect(g.press()).toMatchObject({ status: 'done', id: 'enemy.house66.watcher' });
    g.tick(2.6);
    expect(g.encounters.view('watcher').state).toBe('stunned');
    expect(g.encounters.choose('watcher', 'purify')).toEqual({ ok: true });
  });

  it('P2 hints: the Angel at 60 s near House 66, the garage light at 120 s, nothing far away', () => {
    const away = setup(['seq4_done']);
    away.tick(130);
    expect(away.world.spoken).not.toContain('vo_angel_b6_hint1');

    const g = setup(['seq4_done']);
    g.route([59, -10], [55, -31], [-50, -31]);
    g.tick(50);
    expect(g.world.spoken).not.toContain('vo_angel_b6_hint1');
    g.tick(15);
    expect(g.world.spoken).toContain('vo_angel_b6_hint1');
    expect(g.world.lights['light.garden.porch']).toBeUndefined();
    g.tick(58);
    expect(g.world.lights['light.garden.porch']?.effect).toBe('flicker');
  });

  it('P2 hints stop once the fuse is taken', () => {
    const g = setup(['seq4_done', 'fuse_taken']);
    g.route([59, -10], [55, -31], [-50, -31]);
    g.tick(130);
    expect(g.world.spoken).not.toContain('vo_angel_b6_hint1');
  });
});
