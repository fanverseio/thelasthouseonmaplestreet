import type { ProgressFlag } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { ALL_INTERACTIONS } from '../content/interactions/index.ts';
import { getLine } from '../content/dialogue/index.ts';
import { ALL_SEQUENCES } from '../content/sequences/index.ts';
import { exteriorColliders } from '../content/world/exterior-layout.ts';
import { createWorldRegistry } from '../content/world/index.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import { createGameStore } from '../store/game-store.ts';
import { moveAndSlide } from './collision.ts';
import { PLAYER_RADIUS, SIM_DT } from './player.ts';
import { createWorldRuntime, zoneAt } from './world-runtime.ts';
import { validateSequenceDef } from './sequences.ts';

/** A headless Elena: real collision, a speed cap, the runtime ticked every step. */
function setup() {
  const store = createGameStore();
  store.getState().startNewGame('classic');
  const rt = createWorldRuntime({ store });
  const order: ProgressFlag[] = [];
  let seen = 0;
  store.subscribe((s) => {
    for (const f of s.progress.flags.slice(seen)) order.push(f);
    seen = s.progress.flags.length;
  });
  const pos = { x: -22, z: 39 }; // spawn.home.start
  const flags = () => store.getState().progress.flags;
  const tick = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / SIM_DT); i++) rt.tick(SIM_DT, { x: pos.x, z: pos.z });
  };
  const walkStraight = (x: number, z: number) => {
    for (let i = 0; i < 60 * 30; i++) {
      const dx = x - pos.x;
      const dz = z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) break;
      const step = Math.min(d, 4 * SIM_DT);
      const next = moveAndSlide(pos, { x: (dx / d) * step, z: (dz / d) * step }, PLAYER_RADIUS, exteriorColliders(flags()));
      const moved = Math.hypot(next.x - pos.x, next.z - pos.z);
      pos.x = next.x;
      pos.z = next.z;
      rt.tick(SIM_DT, { x: pos.x, z: pos.z });
      if (moved < 1e-6) break; // blocked
    }
    return Math.hypot(x - pos.x, z - pos.z);
  };
  /** Walk at walking speed, colliding with the world, through the room doorways (z 39) between rooms. */
  const walkTo = (x: number, z: number) => {
    if (pos.z > 34.5 && z > 34.5) {
      for (const wall of pos.x < x ? [-23, -17] : [-17, -23]) {
        if ((pos.x - wall) * (x - wall) < 0) {
          const dir = Math.sign(x - pos.x);
          walkStraight(wall - dir, 39);
          walkStraight(wall + dir, 39);
        }
      }
    }
    return walkStraight(x, z);
  };  const press = () => rt.interact({ x: pos.x, z: pos.z });
  return { store, rt, order, pos, flags, tick, walkTo, press };
}

describe('Beat 1 content', () => {
  const registry = createWorldRegistry();

  it('references only existing entities, lines, sequences and placements', () => {
    const ids = [...ALL_INTERACTIONS.interactions.map((i) => i.id), ...ALL_INTERACTIONS.triggers.map((t) => t.id)];
    for (const id of ids) {
      expect(registry.has(id), id).toBe(true);
      expect(PLACEMENTS[id], id).toBeDefined();
    }
    const actions = [
      ...ALL_INTERACTIONS.interactions.flatMap((i) => [...i.actions, ...(i.onRefuse ?? [])]),
      ...ALL_INTERACTIONS.triggers.flatMap((t) => t.actions),
    ];
    for (const a of actions) {
      if (a.do === 'say') expect(getLine(a.line), a.line).toBeDefined();
      if (a.do === 'startSequence') expect(ALL_SEQUENCES.some((s) => s.id === a.sequence), a.sequence).toBe(true);
    }
    for (const s of ALL_SEQUENCES) {
      expect(validateSequenceDef(s), s.id).toEqual([]);
      for (const st of s.steps) if (st.t === 'line') expect(getLine(st.lineId), st.lineId).toBeDefined();
    }
  });
});

describe('Beat 1 headless playthrough: New Game to home_done', () => {
  it('plays the whole beat in order, with no skipping', () => {
    const { store, rt, order, flags, tick, walkTo, press, pos } = setup();
    expect(store.getState().game.checkpointId).toBe('cp_home_start');

    // Nothing to use at the spawn point, and the jar/journal are not offered yet.
    expect(press().status).toBe('none');

    // 1. Bedroom trigger
    expect(walkTo(-25, 39)).toBeLessThan(0.1);
    expect(flags()).toContain('bed_seen');
    expect(rt.spoken).toContain('vo_elena_b1_01');
    tick(3.1);
    expect(rt.spoken).toContain('vo_elena_b1_02');

    // The drawer is locked (no key): refused, nothing changes. Elena cannot leave through the front door either.
    walkTo(-18.2, 37.8);
    expect(rt.prompt).toBe('E  Drawer (locked)');
    expect(press()).toMatchObject({ status: 'refused', id: 'socket.home.drawer' });
    expect(flags()).not.toContain('locket_taken');
    walkTo(-19.5, 36);
    expect(press()).toMatchObject({ status: 'refused', id: 'door.home.front', reason: 'requires' });
    expect(rt.spoken).toContain('vo_elena_b1_09');
    expect(walkTo(-19.5, 31)).toBeGreaterThan(2); // the shut door stops her
    expect(pos.z).toBeGreaterThan(34.4);
    expect(flags()).not.toContain('home_done');

    // The pumpkin jar is not offered until the drawing has been seen.
    walkTo(-14.5, 37.5);
    expect(press().status).toBe('none');

    // 2. Drawing
    walkTo(-25.5, 38);
    expect(press()).toMatchObject({ status: 'done', id: 'clue.home.drawing' });
    expect(flags()).toContain('drawing_seen');

    // 3. Pumpkin jar -> key
    walkTo(-14.5, 37.5);
    expect(rt.prompt).toBe('E  Look inside the pumpkin jar');
    expect(press()).toMatchObject({ status: 'done', id: 'prop.home.pumpkin_jar' });
    expect(store.getState().progress.carried).toEqual(['drawer_key']);
    expect(flags()).toContain('drawer_key_taken');
    expect(rt.highlights).toEqual([]);
    expect(press().status).toBe('none'); // the jar is empty now

    // 4. Key on the drawer -> locket
    walkTo(-18.2, 37.8);
    expect(rt.prompt).toBe('E  Unlock the drawer');
    expect(press()).toMatchObject({ status: 'done', id: 'socket.home.drawer' });
    expect(store.getState().progress.carried).toEqual([]);
    expect(flags()).toContain('locket_taken');
    expect(flags()).not.toContain('angel_awake');

    // 5. The Angel introduces itself (lines only, Elena keeps control). Locket stays closed meanwhile.
    expect(rt.sequences.active).toBe('angel_intro');
    expect(rt.canOpenLocket()).toBe(false);
    tick(10);
    expect(rt.spoken).toContain('vo_angel_b1_01');
    expect(rt.canOpenLocket()).toBe(false);
    // The door is open to walk through, but the interaction refuses until the intro is over.
    walkTo(-19.5, 36);
    expect(press()).toMatchObject({ status: 'refused', id: 'door.home.front' });
    expect(flags()).not.toContain('home_done');
    tick(30);
    expect(rt.sequences.active).toBeNull();
    expect(flags()).toContain('angel_awake');
    expect(rt.spoken).toEqual(expect.arrayContaining(['vo_felix_b1_01', 'vo_angel_b1_04']));
    expect(rt.canOpenLocket()).toBe(true);

    // Optional journal page
    walkTo(-18.2, 37.8);
    expect(press()).toMatchObject({ status: 'done', id: 'clue.home.journal_1' });

    // 7. Front door -> home_done, checkpoint cp_street, then the street
    walkTo(-19.5, 36);
    expect(press()).toMatchObject({ status: 'done', id: 'door.home.front' });
    expect(store.getState().game.checkpointId).toBe('cp_street');
    expect(walkTo(-19.5, 31)).toBeLessThan(0.1);

    expect(order).toEqual([
      'bed_seen',
      'drawing_seen',
      'drawer_key_taken',
      'locket_taken',
      'angel_awake',
      'journal_1',
      'home_done',
    ]);
  });

  it('opens the front door gate only with locket_taken', () => {
    const { flags, walkTo, press, store } = setup();
    walkTo(-19.5, 36);
    expect(press().status).toBe('refused');
    expect(store.getState().setFlag('locket_taken').ok).toBe(true);
    // the gate is open (collision) but home_done still needs angel_awake
    expect(walkTo(-19.5, 33)).toBeLessThan(0.1);
    expect(flags()).not.toContain('home_done');
  });

  it('refuses a full inventory without losing the jar', () => {
    const { store, walkTo, press, flags } = setup();
    store.setState((s) => ({ progress: { ...s.progress, carried: ['fuse', 'fence_key', 'toy_rabbit', 'photo'] } }));
    walkTo(-25.5, 38);
    press();
    walkTo(-14.5, 37.5);
    expect(press()).toMatchObject({ status: 'refused', reason: 'pickup_full' });
    expect(flags()).not.toContain('drawer_key_taken');
  });

  it('only advances while ticked: no ticks, no timers', () => {
    const { rt, walkTo, press } = setup();
    walkTo(-25.5, 38);
    press();
    const elapsed = () => rt.getState().hints.p1_hints!.elapsed;
    expect(elapsed()).toBe(0);
    const t = rt.simTime;
    // The view stops ticking outside the playing phase (locket, overlay, pause): time does not move.
    expect(rt.simTime).toBe(t);
    expect(elapsed()).toBe(0);
    for (let i = 0; i < 60; i++) rt.tick(SIM_DT, { x: -25.5, z: 38 });
    expect(elapsed()).toBeCloseTo(1, 5);
  });
});

describe('generic runtime: later beats are data only', () => {
  it('runs a video sequence and a new interaction from extra content', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    const rt = createWorldRuntime({
      store,
      content: {
        placements: { ...PLACEMENTS, 'trg.street.seq1': { x: 0, z: 0, r: 2 } },
        sequences: [
          {
            id: 'seq1_empty_street',
            kind: 'horror',
            trigger: { entity: 'trg.street.seq1' },
            requires: [],
            owns: [],
            policy: { locket: 'allowed', angelActions: 'blocked', control: 'full' },
            maxForcedSeconds: 5,
            skippable: true,
            setsOnComplete: [],
            steps: [{ t: 'video', clipId: 'clip_seq1', fallbackSeconds: 2 }],
          },
        ],
        interactions: {
          interactions: [],
          hints: [],
          triggers: [{ id: 'trg.street.seq1', actions: [{ do: 'startSequence', sequence: 'seq1_empty_street' }] }],
        },
      },
    });
    rt.tick(SIM_DT, { x: 0, z: 0 });
    expect(rt.video).toEqual({ clipId: 'clip_seq1', fallbackSeconds: 2 });
    rt.signal({ videoEnded: 'clip_seq1' });
    rt.tick(SIM_DT, { x: 0, z: 0 });
    expect(rt.video).toBeNull();
    expect(rt.sequences.active).toBeNull();
  });
});
describe('P1 hints through the runtime', () => {
  it('speaks at 45 s, highlights the jar at 90 s, and stops once the key is taken', () => {
    const { rt, tick, walkTo, press, flags } = setup();
    walkTo(-25.5, 38);
    press();
    expect(flags()).toContain('drawing_seen');
    tick(44);
    expect(rt.spoken).not.toContain('vo_elena_b1_h1');
    tick(1.5);
    expect(rt.spoken).toContain('vo_elena_b1_h1');
    expect(rt.highlights).toEqual([]);
    tick(44);
    expect(rt.highlights).toEqual([]);
    tick(1);
    expect(rt.highlights).toEqual(['prop.home.pumpkin_jar']);
    expect(rt.visibleEntities().find((e) => e.id === 'prop.home.pumpkin_jar')?.highlighted).toBe(true);
    walkTo(-14.5, 37.5);
    press();
    expect(rt.highlights).toEqual([]);
    expect(rt.visibleEntities().some((e) => e.id === 'prop.home.pumpkin_jar')).toBe(false);
  });

  it('serialises: state survives a JSON round trip', () => {
    const a = setup();
    a.walkTo(-25.5, 38);
    a.press();
    a.tick(44);
    const saved = JSON.parse(JSON.stringify(a.rt.getState())) as ReturnType<typeof a.rt.getState>;
    const b = createWorldRuntime({ store: a.store });
    b.restore(saved);
    for (let i = 0; i < 90; i++) b.tick(SIM_DT, { x: a.pos.x, z: a.pos.z });
    expect(b.spoken).toContain('vo_elena_b1_h1');
  });
});

describe('Classic locket', () => {
  it('stays shut until angel_awake, then plays authored lines', () => {
    const { store, rt } = setup();
    expect(rt.canOpenLocket()).toBe(false);
    store.getState().setFlag('locket_taken');
    store.getState().setFlag('angel_awake');
    expect(rt.canOpenLocket()).toBe(true);
    const first = rt.locketLine();
    expect(first?.line.speaker).toBe('Angel');
    expect(first?.line.lineId).toBe('vo_angel_b1_c1');
  });
});

/** The critical path in a valid order (every prerequisite before its flag). */
const PATH: ProgressFlag[] = [
  'bed_seen', 'drawing_seen', 'drawer_key_taken', 'locket_taken', 'angel_awake', 'home_done', 'seq1_done', 'seq2_done',
  'spell_bolt', 'seq3_started', 'spell_ward', 'spell_purify', 'briggs_purified', 'walkie_found', 'seq3_done', 'seq4_done',
  'fuse_taken', 'fuse_placed', 'watcher_started', 'watcher_purified', 'fence_key_taken', 'lane_open',
  'enc_approach_resolved', 'padlock_open', 'seq5_done', 'runes_done', 'enc_interior_resolved', 'board_solved', 'seq6_done',
  'ritual_active',
];

describe('Classic locket in later beats', () => {
  it('zoneAt reads the nearest placement of the loaded scene', () => {
    expect(zoneAt(-57, 20, 'exterior', [])).toBe('grounds');
    expect(zoneAt(-22, 39, 'exterior', [])).toBe('home');
  });

  it('beat 7 in the grounds plays the hounds line, then band lines at the right knowledge', () => {
    const { store, rt } = setup();
    for (const f of PATH.slice(0, PATH.indexOf('lane_open') + 1)) expect(store.getState().setFlag(f).ok, f).toBe(true);
    rt.tick(SIM_DT, { x: -57, z: 20 });
    expect(rt.locketLine()?.line.lineId).toBe('vo_angel_b7_02');
    expect(rt.locketLine()?.line.lineId).toBe('vo_angel_b7_neutral_c1');
  });

  it('the ritual hint names the first unrestored anchor', () => {
    const { store, rt } = setup();
    for (const f of PATH) expect(store.getState().setFlag(f).ok, f).toBe(true);
    expect(rt.locketLine()?.line.lineId).toBe('vo_angel_p6_h_north');
  });
});