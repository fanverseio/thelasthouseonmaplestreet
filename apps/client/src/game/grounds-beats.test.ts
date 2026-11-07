import type { ProgressFlag } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { ENCOUNTER_BINDINGS } from '../content/encounters/index.ts';
import { getLine } from '../content/dialogue/index.ts';
import { ALL_INTERACTIONS } from '../content/interactions/index.ts';
import { P3_PADLOCK } from '../content/puzzles/index.ts';
import { ALL_SEQUENCES } from '../content/sequences/index.ts';
import { exteriorColliders, outbuildingDoorOpen } from '../content/world/exterior-layout.ts';
import { OUTBUILDING_DOOR } from '../content/world/grounds-layout.ts';
import { createWorldRegistry, GATES } from '../content/world/index.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import { createGameStore } from '../store/game-store.ts';
import { moveAndSlide } from './collision.ts';
import { applyDevStart } from './dev-start.ts';
import { createEncounterWorld } from './encounter-runtime.ts';
import { isGateOpen } from './gates.ts';
import { objectiveFor } from './objectives.ts';
import { PLAYER_RADIUS, SIM_DT } from './player.ts';
import { createNumberLock, createPuzzleController, lockGlow } from './puzzles.ts';
import { validateSequenceDef } from './sequences.ts';

/** A headless Elena at the lane gate right after Beat 6 (the real `lane` dev start), with real collision. */
function setup(start: 'lane' | 'grounds' = 'lane') {
  const store = createGameStore();
  store.getState().startNewGame('classic');
  expect(applyDevStart(store, start)).toEqual([]);
  const { world, encounters } = createEncounterWorld({ store });
  const [px, , pz] = store.getState().player.pos;
  const pos = { x: px, z: pz };
  const flags = () => store.getState().progress.flags;
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
  const route = (...pts: [number, number][]) => {
    for (const [x, z] of pts) expect(walkTo(x, z), `to ${x},${z}`).toBeLessThan(0.1);
  };
  const press = () => world.interact({ x: pos.x, z: pos.z });
  const morality = () => store.getState().progress.morality.value;
  const lock = createPuzzleController(store, createNumberLock(P3_PADLOCK), { say: (id) => world.say(id) });
  /** Set the four dials to `code` and try it (E). */
  const tryCode = (code: string) => {
    lock.input({ k: 'cursor', delta: -9 });
    for (const [i, c] of [...code].entries()) {
      if (i > 0) lock.input({ k: 'cursor', delta: 1 });
      lock.input({ k: 'dial', delta: -lock.state().dials[i]! + Number(c) });
    }
    return lock.input({ k: 'try' });
  };
  return { store, world, encounters, pos, flags, tick, walkTo, route, press, morality, lock, tryCode };
}
type Game = ReturnType<typeof setup>;

const GROUNDS_GATE: [number, number] = [-57, 21];
const HOUND_1_SPOT: [number, number] = [-58, 22.6];
const HOUND_2_SPOT: [number, number] = [-54, 22.1];
const PADLOCK_SPOT: [number, number] = [-52, 25.5];
const MIRROR_SPOT: [number, number] = [-52, 30.5];
const RUNE_SPOTS: Record<string, [number, number]> = {
  'rune.grounds.r1': [-54.5, 28.9],
  'rune.grounds.r2': [-49.5, 28.9],
  'rune.grounds.r3': [-49.6, 30.8],
};

/** Down the lane (past the back garden) to the grounds gate: both hounds wake. */
function enterGrounds(g: Game) {
  g.route([-58, -10], [-59, 6], [-58, 14], GROUNDS_GATE);
}

function fightHound(g: Game, n: 1 | 2, choice: 'purify' | 'destroy') {
  const id = `hound_${n}` as const;
  g.route(n === 1 ? HOUND_1_SPOT : HOUND_2_SPOT);
  expect(g.world.prompt).toBe('E  Face the hound');
  expect(g.press()).toMatchObject({ status: 'done', id: `enemy.grounds.hound_${n}` });
  expect(g.encounters.view(id).state).toBe('weakened');
  g.tick(1.7);
  expect(g.encounters.view(id).state).toBe('stunned');
  expect(g.encounters.choose(id, choice)).toEqual({ ok: true });
}

describe('Beat 7/8 content', () => {
  const registry = createWorldRegistry();

  it('references only existing entities, lines, sequences and placements', () => {
    const ids = [...ALL_INTERACTIONS.interactions.map((i) => i.id), ...ALL_INTERACTIONS.triggers.map((t) => t.id)];
    for (const id of [
      'clue.lane.journal_3', 'trg.lane.home_window', 'trg.grounds.enter', 'enemy.grounds.hound_1', 'enemy.grounds.hound_2',
      'puzzle.grounds.padlock', 'mirror.grounds.antique', 'rune.grounds.r1', 'rune.grounds.r2', 'rune.grounds.r3',
    ]) {
      expect(ids, id).toContain(id);
      expect(registry.has(id), id).toBe(true);
      expect(PLACEMENTS[id], id).toBeDefined();
    }
    for (const seq of ['atm_home_window', 'seq5_felix_mirror']) {
      const def = ALL_SEQUENCES.find((s) => s.id === seq)!;
      expect(validateSequenceDef(def), seq).toEqual([]);
      for (const st of def.steps) if (st.t === 'line') expect(getLine(st.lineId), st.lineId).toBeDefined();
      for (const o of def.owns) expect(registry.has(o), o).toBe(true);
    }
    for (const a of [...ALL_INTERACTIONS.interactions.flatMap((i) => [...i.actions, ...(i.onRefuse ?? [])]), ...ALL_INTERACTIONS.triggers.flatMap((t) => t.actions)]) {
      if (a.do === 'say') expect(getLine(a.line), a.line).toBeDefined();
    }
    for (const l of P3_PADLOCK.hintLines) expect(getLine(l), l).toBeDefined();
    for (const b of ENCOUNTER_BINDINGS.filter((e) => e.id.startsWith('hound_'))) {
      for (const l of b.startLines ?? []) expect(getLine(l), l).toBeDefined();
      expect(registry.has(b.entity), b.entity).toBe(true);
    }
  });

  it('seq5_felix_mirror is one skippable video step that sets only seq5_done', () => {
    const def = ALL_SEQUENCES.find((s) => s.id === 'seq5_felix_mirror')!;
    expect(def.steps).toEqual([{ t: 'video', clipId: 'seq5_felix_mirror', fallbackSeconds: 25 }]);
    expect(def.skippable).toBe(true);
    expect(def.setsOnComplete).toEqual(['seq5_done']);
    expect(def.policy).toEqual({ locket: 'blocked', angelActions: 'blocked', control: 'locked' });
    expect(def.maxForcedSeconds).toBeLessThanOrEqual(30);
  });

  it('the doors open from the critical-path flags and from nothing else', () => {
    const gate = (id: string) => GATES.find((g) => g.id === id)!;
    expect(isGateOpen(gate('door.grounds.outbuilding'), ['lane_open'])).toBe(false);
    expect(isGateOpen(gate('door.grounds.outbuilding'), ['padlock_open'])).toBe(true);
    expect(isGateOpen(gate('door.grounds.last_house_front'), ['padlock_open', 'seq5_done'])).toBe(false);
    expect(isGateOpen(gate('door.grounds.last_house_front'), ['runes_done'])).toBe(true);
  });

  it('every Beat 7/8 placement stands on free ground, with the outbuilding door shut and open', () => {
    for (const flags of [['lane_open'], ['lane_open', 'padlock_open', 'seq5_done']] as const) {
      const colliders = exteriorColliders(flags);
      for (const [id, p] of Object.entries(PLACEMENTS)) {
        if (!/^(clue\.lane|trg\.lane|trg\.grounds|enemy\.grounds|puzzle\.grounds|mirror\.grounds|rune\.grounds)/.test(id)) continue;
        const q = moveAndSlide({ x: p.x, z: p.z }, { x: 0, z: 0 }, PLAYER_RADIUS, colliders);
        expect(Math.hypot(q.x - p.x, q.z - p.z), id).toBeLessThan(1e-9);
      }
    }
  });
});

describe('Beat 7: the back lane', () => {
  it('the journal page is optional, dated 1966 and sets journal_3', () => {
    const g = setup();
    g.route([-58, -10], [-63.5, 10]);
    expect(g.world.prompt).toBe('E  Read the journal page');
    expect(g.press()).toMatchObject({ status: 'done', id: 'clue.lane.journal_3' });
    expect(g.flags()).toContain('journal_3');
    expect(g.world.spoken).toContain('vo_rosalind_j3');
    expect(getLine('vo_rosalind_j3')!.text).toMatch(/nineteen sixty-six/);
    expect(g.press().status).toBe('none'); // read once
  });

  it('atm_home_window: the window light is on for about 5 s, then off, and control is never lost', () => {
    const g = setup();
    g.route([-58, -10], [-59, 0]);
    expect(g.world.lights['light.home.felix_window']).toBeUndefined();
    g.route([-59, 3.5]);
    expect(g.world.sequences.active).toBe('atm_home_window');
    expect(g.world.sequences.policy.control).toBe('full');
    expect(g.world.lights['light.home.felix_window']?.effect).toBe('on');
    expect(g.world.spoken).toContain('vo_elena_b7_01');
    g.tick(3.5);
    expect(g.world.lights['light.home.felix_window']?.effect).toBe('on');
    g.tick(1.5);
    expect(g.world.lights['light.home.felix_window']?.effect).toBe('off');
    expect(g.world.sequences.active).toBeNull();
    // Elena could walk the whole time, and it does not fire a second time.
    g.route([-59, 0], [-59, 6]);
    expect(g.world.sequences.results.filter((r) => r.id === 'atm_home_window')).toHaveLength(1);
  });

  it('does not fire before the lane gate is open', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    const { world } = createEncounterWorld({ store });
    world.tick(SIM_DT, { x: -59, z: 6 });
    expect(world.sequences.active).toBeNull();
  });
});

describe.each([
  { a: 'purify' as const, b: 'purify' as const, delta: 20 },
  { a: 'destroy' as const, b: 'destroy' as const, delta: -20 },
  { a: 'purify' as const, b: 'destroy' as const, delta: 0 },
  { a: 'destroy' as const, b: 'purify' as const, delta: 0 },
])('Beat 7 headless playthrough: hound 1 $a, hound 2 $b', ({ a, b, delta }) => {
  it('reaches padlock_open through the hounds and the P3 overlay, in order', () => {
    const g = setup();
    const order: ProgressFlag[] = [];
    let seen = g.flags().length;
    g.store.subscribe((s) => {
      for (const f of s.progress.flags.slice(seen)) order.push(f);
      seen = s.progress.flags.length;
    });
    const before = g.morality();
    enterGrounds(g);
    // Both hounds wake together and Elena is not hurt.
    expect(g.encounters.view('hound_1')).toMatchObject({ engaged: true, hostile: true });
    expect(g.encounters.view('hound_2')).toMatchObject({ engaged: true, hostile: true });
    expect(g.world.spoken).toContain('vo_angel_b7_02');
    expect(g.world.canOpenLocket()).toBe(false); // combat_blocked while a hound is hostile

    // The padlock refuses while any hound lives.
    g.route(PADLOCK_SPOT);
    expect(g.press()).toMatchObject({ status: 'refused', id: 'puzzle.grounds.padlock' });
    expect(g.world.overlay).toBeNull();
    expect(g.world.spoken).toContain('vo_elena_b7_02');

    fightHound(g, 1, a);
    expect(g.flags()).not.toContain('enc_approach_resolved'); // one hound is not enough
    expect(g.world.canOpenLocket()).toBe(false);
    g.route(PADLOCK_SPOT);
    expect(g.press()).toMatchObject({ status: 'refused', id: 'puzzle.grounds.padlock' });
    fightHound(g, 2, b);
    expect(g.flags()).toContain('enc_approach_resolved');
    expect(g.morality() - before).toBe(delta);
    expect(g.world.canOpenLocket()).toBe(true);
    expect(objectiveFor(g.flags())).toBe('Open the outbuilding padlock.');

    // The door is still shut until the code is entered.
    g.route(PADLOCK_SPOT);
    expect(g.walkTo(-52, 30)).toBeGreaterThan(1);
    expect(g.press()).toMatchObject({ status: 'done', id: 'puzzle.grounds.padlock' });
    expect(g.world.overlay).toEqual({ puzzle: 'p3_padlock' });
    expect(g.store.getState().game.phase).toBe('overlay');
    expect(g.tryCode('1965')).toContainEqual({ t: 'rattle' });
    expect(g.flags()).not.toContain('padlock_open');
    expect(g.tryCode('1966')).toContainEqual({ t: 'solved' });
    g.world.closeOverlay();
    expect(g.flags()).toContain('padlock_open');
    expect(g.store.getState().game.checkpointId).toBe('cp_outbuilding');
    expect(objectiveFor(g.flags())).toBe('Look into the mirror.');
    expect(outbuildingDoorOpen(g.flags())).toBe(true);
    expect(g.walkTo(-52, 30)).toBeLessThan(0.1); // through the open door, into the room

    const interesting: ProgressFlag[] = ['lane_open', 'journal_3', 'enc_approach_resolved', 'padlock_open'];
    expect(order.filter((f) => interesting.includes(f))).toEqual(['enc_approach_resolved', 'padlock_open']);
  });
});

describe('Beat 7 rules', () => {
  it('the number lock never opens before the hounds are resolved and costs nothing when wrong', () => {
    const g = setup();
    const events = g.tryCode('1966');
    expect(events).toContainEqual({ t: 'refused', reason: 'prerequisite' });
    expect(g.flags()).not.toContain('padlock_open');
    expect(g.store.getState().player.hp).toBe(100);
  });

  it('P3 hints: Angel lines at the 1st, 3rd, 5th and 7th wrong try, then the answer', () => {
    const g = setup();
    const said = () => g.world.spoken.filter((l) => l.startsWith('vo_angel_p3_'));
    g.tryCode('0000');
    expect(said()).toEqual(['vo_angel_p3_h1']);
    g.tryCode('0001');
    g.tryCode('0002');
    expect(said()).toEqual(['vo_angel_p3_h1', 'vo_angel_p3_h2']);
    g.tryCode('0003');
    g.tryCode('0004');
    expect(said()).toHaveLength(3);
    g.tryCode('0005');
    g.tryCode('0006');
    expect(said()).toEqual(['vo_angel_p3_h1', 'vo_angel_p3_h2', 'vo_angel_p3_h3', 'vo_angel_p3_h4']);
    expect(lockGlow(P3_PADLOCK, 4).map((d) => d.digit)).toEqual([1, 9, 6, 6]); // all four dials glow with the answer
    // The answer is reachable: the page says 1966, the lock takes it, with the prerequisite set.
    g.store.getState().setFlag('enc_approach_resolved');
    expect(g.tryCode('1966')).toContainEqual({ t: 'solved' });
    expect(g.flags()).toContain('padlock_open');
  });

  it('closing the overlay keeps the dials; the puzzle can be resumed', () => {
    const g = setup('lane');
    g.store.getState().setFlag('enc_approach_resolved');
    g.route([-58, -10], PADLOCK_SPOT);
    g.press();
    g.tryCode('1234');
    g.world.closeOverlay();
    expect(g.store.getState().game.phase).toBe('paused');
    expect(g.lock.state().dials.join('')).toBe('1234');
    expect(g.press()).toMatchObject({ status: 'done', id: 'puzzle.grounds.padlock' });
  });

  it('death during the hounds respawns at the lane gate; resolved hounds stay resolved and the rest wake again', () => {
    const g = setup();
    enterGrounds(g);
    fightHound(g, 1, 'purify');
    g.store.setState((s) => ({ player: { ...s.player, hp: 0 } }));
    g.world.tick(SIM_DT, { x: g.pos.x, z: g.pos.z });
    expect(g.store.getState().player.hp).toBe(100);
    expect(g.store.getState().player.pos).toEqual([-58, 0, -20]);
    expect(g.encounters.view('hound_1').state).toBe('resolved');
    expect(g.encounters.view('hound_2')).toMatchObject({ state: 'idle', engaged: false });
    g.pos.x = -58;
    g.pos.z = -20;
    g.route([-58, 14], GROUNDS_GATE, [-54, 22.1]); // the trigger already fired; approach range wakes it
    expect(g.encounters.view('hound_2').engaged).toBe(true);
    fightHound(g, 2, 'destroy');
    expect(g.flags()).toContain('enc_approach_resolved');
  });
});

describe('Beat 8 headless playthrough', () => {
  /** In the room, facing the mirror, with the padlock open. */
  function atMirror() {
    const g = setup('grounds');
    g.route([-58, -10], [-58, 14], PADLOCK_SPOT, [-52, 26.2], MIRROR_SPOT);
    return g;
  }

  it('the mirror plays seq5 as a locked video clip, then the runes appear', () => {
    const g = atMirror();
    expect(g.world.prompt).toBe('E  Look into the antique mirror');
    expect(g.press()).toMatchObject({ status: 'done', id: 'mirror.grounds.antique' });
    expect(g.world.sequences.active).toBe('seq5_felix_mirror');
    expect(g.world.sequences.policy).toEqual({ locket: 'blocked', angelActions: 'blocked', control: 'locked' });
    expect(g.world.canOpenLocket()).toBe(false);
    expect(g.world.video).toEqual({ clipId: 'seq5_felix_mirror', fallbackSeconds: 25 });
    // The runes cannot be used yet.
    expect(g.world.visibleEntities().some((e) => e.id.startsWith('rune.'))).toBe(false);
    g.tick(24);
    expect(g.flags()).not.toContain('seq5_done');
    g.tick(2);
    expect(g.flags()).toContain('seq5_done');
    expect(g.world.video).toBeNull();
    expect(g.world.sequences.active).toBeNull();
    expect(g.world.canOpenLocket()).toBe(true);
    expect(g.world.visibleEntities().filter((e) => e.id.startsWith('rune.')).map((e) => e.id)).toEqual([
      'rune.grounds.r1', 'rune.grounds.r2', 'rune.grounds.r3',
    ]);
    expect(objectiveFor(g.flags())).toBe('Find the three runes in the mirror.');
    expect(g.press().status).toBe('none'); // the mirror plays once
  });

  it('a real clip ending early finishes the sequence; skip at every moment equals a full run', () => {
    const final = (skipAt: number | null) => {
      const g = atMirror();
      g.press();
      if (skipAt === null) g.tick(26);
      else {
        g.tick(skipAt);
        const r = g.world.sequences.skip();
        expect(r.skipped).toBe(true);
      }
      return { flags: [...g.flags()].sort(), active: g.world.sequences.active, video: g.world.video, morality: g.morality(), checkpoint: g.store.getState().game.checkpointId };
    };
    const full = final(null);
    expect(full.flags).toContain('seq5_done');
    for (const t of [0, 0.02, 1, 5, 12.5, 20, 24.9]) expect(final(t), `skip at ${t}s`).toEqual(full);
    // A video that ends on its own (the real clip) behaves the same as the fallback timer.
    const g = atMirror();
    g.press();
    g.world.signal({ videoPlaying: 'seq5_felix_mirror' });
    g.tick(40);
    expect(g.flags()).not.toContain('seq5_done');
    g.world.signal({ videoEnded: 'seq5_felix_mirror' });
    g.tick(0.1);
    expect([...g.flags()].sort()).toEqual(full.flags);
  });

  it('runes_done: purify each rune by interacting with its spot; the door gate opens only then', () => {
    const g = atMirror();
    g.press();
    g.tick(26);
    const gate = GATES.find((x) => x.id === 'door.grounds.last_house_front')!;
    let n = 0;
    for (const [id, spot] of Object.entries(RUNE_SPOTS)) {
      // Standing in the middle of the room, no rune is in reach; at the spot, exactly that one is.
      g.route(MIRROR_SPOT);
      expect(g.world.visibleEntities().find((e) => e.id === id)).toBeDefined();
      expect(g.press().status).toBe('none');
      g.route(spot);
      expect(g.world.prompt, id).toBe('E  Purify the rune');
      expect(g.press()).toMatchObject({ status: 'done', id });
      n++;
      g.world.tick(SIM_DT, { x: g.pos.x, z: g.pos.z }); // the next frame evaluates the "all three" rule
      expect(g.store.getState().world.entities[id]?.['purified']).toBe(true);
      expect(g.flags().includes('runes_done'), `after ${n}`).toBe(n === 3);
      expect(isGateOpen(gate, g.flags())).toBe(n === 3);
    }
    expect(g.flags()).toContain('runes_done');
    expect(objectiveFor(g.flags())).toBe('Enter the Last House.');
    expect(g.world.visibleEntities().some((e) => e.id.startsWith('rune.'))).toBe(false);
    expect(g.world.canOpenLocket()).toBe(true);
  });

  it('a rune cannot be purified twice and magic never matters', () => {
    const g = atMirror();
    g.press();
    g.tick(26);
    g.store.setState((s) => ({ player: { ...s.player, magic: 0 } }));
    g.route(RUNE_SPOTS['rune.grounds.r1']!);
    expect(g.press()).toMatchObject({ status: 'done', id: 'rune.grounds.r1' });
    expect(g.press().status).toBe('none');
    expect(g.flags()).not.toContain('runes_done');
  });

  it('P4 hints: Felix at 30 s, the mirror at 60 s, the real-room pulse at 90 s, only near the mirror', () => {
    const away = setup('lane');
    for (const f of ['enc_approach_resolved', 'padlock_open', 'seq5_done'] as const) away.store.getState().setFlag(f);
    away.tick(100);
    expect(away.world.spoken.some((l) => l.includes('_p4_'))).toBe(false);

    const g = atMirror();
    g.press();
    g.tick(26);
    g.tick(25);
    expect(g.world.spoken).not.toContain('vo_felix_p4_h1');
    g.tick(8);
    expect(g.world.spoken).toContain('vo_felix_p4_h1');
    g.tick(30);
    expect(g.world.spoken).toContain('vo_angel_p4_h2');
    expect(g.world.highlights).toContain('mirror.grounds.antique');
    expect(g.world.highlights).not.toContain('rune.grounds.r1');
    g.tick(30);
    expect(g.world.spoken).toContain('vo_angel_p4_h3');
    expect(g.world.highlights).toEqual(expect.arrayContaining(['rune.grounds.r1', 'rune.grounds.r2', 'rune.grounds.r3']));
  });

  it('the dev start "grounds" lands on cp_outbuilding with the mirror next', () => {
    const g = setup('grounds');
    expect(g.store.getState().game.checkpointId).toBe('cp_outbuilding');
    expect(g.store.getState().player.pos).toEqual([-52, 0, 25.5]);
    expect(g.walkTo(-52, 30)).toBeLessThan(0.1);
  });
});

describe('outbuilding layout', () => {
  it('the door is a collider only while shut', () => {
    const d = OUTBUILDING_DOOR;
    const mid = { x: (d.minX + d.maxX) / 2, z: (d.minZ + d.maxZ) / 2 };
    const free = (flags: ProgressFlag[]) => {
      const q = moveAndSlide(mid, { x: 0, z: 0 }, PLAYER_RADIUS, exteriorColliders(flags));
      return Math.hypot(q.x - mid.x, q.z - mid.z) < 1e-9;
    };
    expect(free(['lane_open'])).toBe(false);
    expect(free(['lane_open', 'padlock_open'])).toBe(true);
  });
});
