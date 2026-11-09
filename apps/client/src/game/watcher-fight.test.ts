import { describe, expect, it } from 'vitest';
import { getLine } from '../content/dialogue/index.ts';
import { WATCHER_BINDING } from '../content/encounters/index.ts';
import { SHADOW_DECOY, WATCHER } from '../content/enemies/index.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import { createWorldRegistry } from '../content/world/index.ts';
import { exteriorColliders } from '../content/world/exterior-layout.ts';
import { createGameStore } from '../store/game-store.ts';
import { moveAndSlide } from './collision.ts';
import { EnemySystem, type EnemyDef, type EnemyEvent } from './enemies.ts';
import { PLAYER_RADIUS, SIM_DT } from './player.ts';
import { SpellSystem } from './spells.ts';
import { createFightRig, injectSpellHit } from './test-helpers.ts';

const W = 'enemy.house66.watcher';
const NODES = [1, 2, 3, 4, 5, 6].map((n) => `node.house66.tp_${n}`);

type Ev<T extends EnemyEvent['type']> = Extract<EnemyEvent, { type: T }>;
const ofType = <T extends EnemyEvent['type']>(events: EnemyEvent[], type: T): Ev<T>[] => events.filter((e): e is Ev<T> => e.type === type);

/** The enemy system alone, with a Watcher at the yard spawn and Elena wherever the test puts her. */
function bare(elena = { x: -58, z: -34 }, def: EnemyDef = WATCHER) {
  const store = createGameStore();
  store.getState().startNewGame('classic');
  store.setState((s) => ({ player: { ...s.player, spellsUnlocked: ['arcane_bolt', 'ward', 'purify'], magic: 100, hp: 100 } }));
  const spells = new SpellSystem({ store });
  const enemies = new EnemySystem({ store, spells, seed: 4 });
  const events: EnemyEvent[] = [];
  enemies.on((e) => events.push(e));
  const spawn = PLACEMENTS['enemy.house66.watcher' as keyof typeof PLACEMENTS]!;
  const w = enemies.spawn(def, { x: spawn.x, z: spawn.z }, { id: W });
  w.wake();
  const player = { ...elena };
  /** `keepAway`: Elena is moved to stay 12 m from the Watcher, so he never reaches her. */
  const run = (seconds: number, keepAway = false) => {
    for (let i = 0; i < Math.round(seconds / SIM_DT); i++) {
      if (keepAway) {
        player.x = w.x + 12;
        player.z = w.z;
      }
      store.setState((s) => ({ player: { ...s.player, hp: 100 } }));
      enemies.step(SIM_DT, player);
    }
  };
  return { store, spells, enemies, events, w, player, run };
}

describe('Watcher content (5.8)', () => {
  it('runs on the FSM; the teleport nodes are placed in the yard on free ground', () => {
    expect(WATCHER_BINDING.mode).toBe('fsm');
    const registry = createWorldRegistry();
    const colliders = exteriorColliders(['fuse_placed']);
    for (const id of NODES) {
      const p = PLACEMENTS[id as keyof typeof PLACEMENTS];
      expect(registry.has(id), id).toBe(true);
      expect(p, id).toBeDefined();
      // the yard is x -68..-48, z -35.5..-23.5 (exterior-layout.ts)
      expect(p!.x).toBeGreaterThan(-68);
      expect(p!.x).toBeLessThan(-48);
      expect(p!.z).toBeGreaterThan(-35.5);
      expect(p!.z).toBeLessThan(-23.5);
      for (const radius of [PLAYER_RADIUS, WATCHER.bodyRadius]) {
        const q = moveAndSlide({ x: p!.x, z: p!.z }, { x: 0, z: 0 }, radius, colliders);
        expect(Math.hypot(q.x - p!.x, q.z - p!.z), id).toBeLessThan(1e-9);
      }
    }
  });

  it('the teleport spec names exactly those six nodes: 6-9 s, 0.8 s telegraph, 2 m', () => {
    expect(WATCHER.abilities.find((a) => a.kind === 'teleport')).toMatchObject({ nodes: NODES, intervalS: [6, 9], telegraphS: 0.8, minPlayerDistance: 2 });
  });

  it('the voice lines are the authored vo_watcher_b6_03 / 04 / 05', () => {
    const v = WATCHER.abilities.find((a) => a.kind === 'voiceAtHp');
    expect(v).toMatchObject({ thresholds: [0.9, 0.5, 0.3], lines: ['vo_watcher_b6_03', 'vo_watcher_b6_04', 'vo_watcher_b6_05'] });
    for (const l of v && v.kind === 'voiceAtHp' ? v.lines : []) expect(getLine(l), l).toBeDefined();
  });
});

describe('teleport: only to authored nodes', () => {
  it('every arrival is exactly one of tp_1..tp_6, announced 0.8 s earlier, every 6-9 s', () => {
    const t = bare();
    t.run(180, true);
    const marks = ofType(t.events, 'teleport_telegraph');
    const arrivals = ofType(t.events, 'teleported');
    expect(arrivals.length).toBeGreaterThanOrEqual(15);
    expect(arrivals.length).toBeLessThanOrEqual(marks.length);
    const spots = NODES.map((id) => PLACEMENTS[id as keyof typeof PLACEMENTS]!);
    for (const a of arrivals) {
      expect(NODES).toContain(a.node);
      expect(spots.some((p) => p.x === a.x && p.z === a.z), a.node).toBe(true);
    }
    for (const m of marks) expect(m.seconds).toBe(0.8);
    expect(new Set(arrivals.map((a) => a.node)).size).toBeGreaterThanOrEqual(4); // not stuck on one node
    // He is at a node position after each arrival (he is never anywhere else but where he walked).
    expect(NODES.some((n) => n === arrivals.at(-1)!.node)).toBe(true);
  });

  it('timing: the mark appears 6-9 s after the previous arrival and the arrival follows 0.8 s later', () => {
    const t = bare();
    const times: { kind: string; at: number }[] = [];
    let now = 0;
    t.enemies.on((e) => {
      if (e.type === 'teleport_telegraph') times.push({ kind: 'mark', at: now });
      if (e.type === 'teleported') times.push({ kind: 'arrive', at: now });
    });
    for (let i = 0; i < 60 * 120; i++) {
      now += SIM_DT;
      t.player.x = t.w.x + 12;
      t.player.z = t.w.z;
      t.enemies.step(SIM_DT, t.player);
    }
    const marks = times.filter((x) => x.kind === 'mark');
    const arrives = times.filter((x) => x.kind === 'arrive');
    expect(arrives.length).toBeGreaterThan(8);
    marks.slice(0, arrives.length).forEach((m, i) => expect(arrives[i]!.at - m.at).toBeGreaterThanOrEqual(0.8 - 1e-6));
    marks.slice(0, arrives.length).forEach((m, i) => expect(arrives[i]!.at - m.at).toBeLessThan(0.9));
    for (let i = 1; i < marks.length; i++) {
      const gap = marks[i]!.at - arrives[i - 1]!.at;
      expect(gap).toBeGreaterThanOrEqual(6 - 0.05);
      expect(gap).toBeLessThanOrEqual(9 + 0.05);
    }
  });

  it('the destination mark is visible in the view during the telegraph', () => {
    const t = bare();
    let seen = false;
    for (let i = 0; i < 60 * 20 && !seen; i++) {
      t.player.x = t.w.x + 12;
      t.player.z = t.w.z;
      t.enemies.step(SIM_DT, t.player);
      const mark = t.w.view().mark;
      if (mark) {
        seen = true;
        const spots = NODES.map((id) => PLACEMENTS[id as keyof typeof PLACEMENTS]!);
        expect(spots.some((p) => p.x === mark.x && p.z === mark.z)).toBe(true);
        expect(mark.t).toBeGreaterThanOrEqual(0);
        expect(mark.t).toBeLessThanOrEqual(1);
      }
    }
    expect(seen).toBe(true);
  });

  it('never onto a node within 2 m of Elena (and he does hop around her)', () => {
    // A Watcher who cannot walk, so Elena can stand on tp_2 for the whole test.
    const t = bare({ x: -59, z: -33.5 }, { ...WATCHER, speed: 0.001 });
    t.run(300, false);
    const arrivals = ofType(t.events, 'teleported');
    expect(arrivals.length).toBeGreaterThan(10);
    for (const a of arrivals) {
      expect(a.node).not.toBe('node.house66.tp_2');
      expect(Math.hypot(a.x - t.player.x, a.z - t.player.z)).toBeGreaterThanOrEqual(2);
    }
  });

  it('never teleports while Elena is within 2 m of him', () => {
    const t = bare({ x: -58, z: -27 }); // right next to him: he fights in melee
    t.run(60);
    expect(ofType(t.events, 'teleport_telegraph')).toHaveLength(0);
    expect(ofType(t.events, 'teleported')).toHaveLength(0);
  });

  it('never while stunned: a stun drops a pending mark and ends all teleports', () => {
    const t = bare();
    // reach a pending mark
    for (let i = 0; i < 60 * 20 && t.w.view().mark === null; i++) {
      t.player.x = t.w.x + 12;
      t.player.z = t.w.z;
      t.enemies.step(SIM_DT, t.player);
    }
    expect(t.w.view().mark).not.toBeNull();
    for (let i = 0; i < 8; i++) injectSpellHit(t.spells, { targetId: W, damage: 45, charged: true });
    expect(t.w.state).toBe('stunned');
    expect(t.w.view().mark).toBeNull();
    const before = ofType(t.events, 'teleported').length;
    const at = { x: t.w.x, z: t.w.z };
    t.run(60, true);
    expect(ofType(t.events, 'teleported')).toHaveLength(before);
    expect({ x: t.w.x, z: t.w.z }).toEqual(at);
  });

  it('a death resets the Watcher to his spawn and drops the mark', () => {
    const t = bare();
    t.run(40, true);
    expect(ofType(t.events, 'teleported').length).toBeGreaterThan(0);
    t.enemies.handlePlayerDeath();
    expect(t.w.view().mark).toBeNull();
    expect([t.w.x, t.w.z]).toEqual([t.w.spawnPoint.x, t.w.spawnPoint.z]);
    expect(t.w.hp).toBe(280);
  });
});

describe('decoys at 60% and 40% HP', () => {
  const decoys = (t: ReturnType<typeof bare>) => t.enemies.all().filter((e) => e.def.id === 'shadow_decoy');

  it('data: 2 decoys at 0.6 and 0.4; the decoy is the one-hit shadow_decoy (6 damage touch)', () => {
    expect(WATCHER.abilities.find((a) => a.kind === 'spawnDecoys')).toMatchObject({ thresholds: [0.6, 0.4], count: 2, decoy: 'shadow_decoy' });
    expect(SHADOW_DECOY).toMatchObject({ maxHp: 1, purifiable: false });
    expect(SHADOW_DECOY.abilities[0]).toMatchObject({ damage: 6, telegraphS: 0 });
  });

  it('nothing above 60%; two decoys at the first crossing; two more at 40%; each threshold fires exactly once', () => {
    const t = bare();
    injectSpellHit(t.spells, { targetId: W, damage: 20 }); // 260 = 93%
    injectSpellHit(t.spells, { targetId: W, damage: 40 }); // 220 = 79%
    expect(decoys(t)).toHaveLength(0);
    injectSpellHit(t.spells, { targetId: W, damage: 45 }); // 175 = 62.5%, still above 60%
    expect(decoys(t)).toHaveLength(0);
    injectSpellHit(t.spells, { targetId: W, damage: 20 }); // 155 = 55%: crosses 60%
    expect(ofType(t.events, 'decoys')).toEqual([{ type: 'decoys', id: W, threshold: 0.6, count: 2 }]);
    expect(decoys(t)).toHaveLength(2);
    injectSpellHit(t.spells, { targetId: W, damage: 20 }); // 135 = 48%
    injectSpellHit(t.spells, { targetId: W, damage: 20 }); // 115 = 41%
    expect(decoys(t)).toHaveLength(2); // 60% does not fire again
    injectSpellHit(t.spells, { targetId: W, damage: 20 }); // 95 = 34%: crosses 40%
    expect(ofType(t.events, 'decoys').map((e) => e.threshold)).toEqual([0.6, 0.4]);
    expect(decoys(t)).toHaveLength(4);
    // Once fired, even a lot more damage spawns nothing more.
    injectSpellHit(t.spells, { targetId: W, damage: 8 });
    expect(ofType(t.events, 'decoys')).toHaveLength(2);
  });

  it('one big hit across both thresholds still gives two groups, once', () => {
    const t = bare();
    injectSpellHit(t.spells, { targetId: W, damage: 45, charged: true });
    injectSpellHit(t.spells, { targetId: W, damage: 45, charged: true });
    injectSpellHit(t.spells, { targetId: W, damage: 45, charged: true });
    injectSpellHit(t.spells, { targetId: W, damage: 45, charged: true }); // 100 -> 35%
    expect(ofType(t.events, 'decoys').map((e) => e.threshold)).toEqual([0.6, 0.4]);
  });

  it('decoys are transient, look like him (chase Elena) and die in one hit; killing one changes no progress', () => {
    const t = bare({ x: -40, z: -30 });
    injectSpellHit(t.spells, { targetId: W, damage: 130 }); // 150 = 53%
    const [a, b] = decoys(t);
    expect(a!.transient).toBe(true);
    expect(a!.summoned).toBe(true);
    expect(a!.parentId).toBe(W);
    expect(a!.id).not.toBe(b!.id);
    t.run(1);
    expect(a!.hostile || a!.state === 'chase').toBe(true);
    injectSpellHit(t.spells, { targetId: a!.id, damage: 20 });
    expect(decoys(t)).toHaveLength(1);
    expect(t.spells.targetPosition(a!.id)).toBeNull();
    expect(ofType(t.events, 'resolved').find((e) => e.id === a!.id)).toMatchObject({ summoned: true, outcome: 'destroy' });
  });

  it('a decoy touch deals 6 damage', () => {
    const t = bare({ x: -58, z: -23 });
    injectSpellHit(t.spells, { targetId: W, damage: 130 });
    const d = decoys(t)[0]!;
    d.x = -58;
    d.z = -23.5;
    d.sync();
    t.store.setState((s) => ({ player: { ...s.player, hp: 100 } }));
    for (let i = 0; i < 20; i++) t.enemies.step(SIM_DT, t.player);
    const touch = ofType(t.events, 'attack').find((e) => e.id === d.id);
    expect(touch).toMatchObject({ ability: 'touch', damage: 6 });
  });

  it('the stun makes the decoys vanish; a death removes them and re-arms the thresholds', () => {
    const t = bare();
    injectSpellHit(t.spells, { targetId: W, damage: 130 });
    expect(decoys(t)).toHaveLength(2);
    for (let i = 0; i < 8; i++) injectSpellHit(t.spells, { targetId: W, damage: 45, charged: true });
    expect(t.w.state).toBe('stunned');
    expect(decoys(t)).toHaveLength(0);

    const u = bare();
    injectSpellHit(u.spells, { targetId: W, damage: 130 });
    expect(decoys(u)).toHaveLength(2);
    u.enemies.handlePlayerDeath();
    expect(decoys(u)).toHaveLength(0);
    expect(u.w.hp).toBe(280);
    injectSpellHit(u.spells, { targetId: W, damage: 130 }); // the second try spawns them again
    expect(decoys(u)).toHaveLength(2);
  });
});

describe('Felix\'s name at 90 / 50 / 30% HP', () => {
  const voices = (events: EnemyEvent[]) => ofType(events, 'voice');

  it('each line fires once, in order, at its threshold', () => {
    const t = bare();
    injectSpellHit(t.spells, { targetId: W, damage: 20 }); // 260 = 92.9%
    expect(voices(t.events)).toHaveLength(0);
    injectSpellHit(t.spells, { targetId: W, damage: 20 }); // 240 = 85.7%: 90%
    expect(voices(t.events).map((v) => v.line)).toEqual(['vo_watcher_b6_03']);
    injectSpellHit(t.spells, { targetId: W, damage: 20 }); // 220
    expect(voices(t.events)).toHaveLength(1);
    injectSpellHit(t.spells, { targetId: W, damage: 45, charged: true }); // 175
    injectSpellHit(t.spells, { targetId: W, damage: 45, charged: true }); // 130 = 46%: 50%
    expect(voices(t.events).map((v) => v.line)).toEqual(['vo_watcher_b6_03', 'vo_watcher_b6_04']);
    injectSpellHit(t.spells, { targetId: W, damage: 45, charged: true }); // 85 = 30.4%
    expect(voices(t.events)).toHaveLength(2);
    injectSpellHit(t.spells, { targetId: W, damage: 45, charged: true }); // floor 84 = 30%: 30% and the stun
    expect(voices(t.events).map((v) => v.line)).toEqual(['vo_watcher_b6_03', 'vo_watcher_b6_04', 'vo_watcher_b6_05']);
    expect(t.w.state).toBe('stunned');
    injectSpellHit(t.spells, { targetId: W, damage: 45, charged: true });
    expect(voices(t.events)).toHaveLength(3);
  });

  it('one hit across several thresholds spaces the lines out', () => {
    const t = bare();
    injectSpellHit(t.spells, { targetId: W, damage: 200 }); // 80 -> clamped to the floor 84: all three
    expect(voices(t.events).map((v) => [v.line, v.delayS])).toEqual([
      ['vo_watcher_b6_03', 0],
      ['vo_watcher_b6_04', 3.5],
      ['vo_watcher_b6_05', 7],
    ]);
  });

  it('a death re-arms the lines for the next try', () => {
    const t = bare();
    injectSpellHit(t.spells, { targetId: W, damage: 40 });
    expect(voices(t.events)).toHaveLength(1);
    t.enemies.handlePlayerDeath();
    injectSpellHit(t.spells, { targetId: W, damage: 40 });
    expect(voices(t.events)).toHaveLength(2);
  });
});

describe('the Watcher encounter in the world (real spells)', () => {
  it('the world says his lines, spawns decoys, stuns him and settles progress like before', () => {
    const r = createFightRig('house66', { keepAlive: true });
    // place the fuse: the real flow is covered in house66-beats.test.ts; here the flags are set directly
    for (const f of ['fuse_taken', 'fuse_placed']) expect(r.store.getState().setFlag(f).ok, f).toBe(true);
    r.goTo(-58, -26);
    const e = r.encounters.fsmEnemy('watcher')!;
    expect(r.encounters.view('watcher').engaged).toBe(true);
    expect(r.flags()).toContain('watcher_started');
    expect(r.store.getState().game.scene).toBe('exterior');
    r.fight.stun('watcher');
    expect(e.state).toBe('stunned');
    expect(r.flags()).not.toContain('watcher_purified');
    r.fight.purify('watcher');
    expect(r.flags()).toEqual(expect.arrayContaining(['watcher_purified']));
    expect(r.store.getState().progress.morality.value).toBe(30);
    expect(r.flags()).not.toContain('fence_key_taken'); // the key is a pickup
    // lines
    const spoken = r.world.spoken;
    for (const l of ['vo_watcher_b6_02', 'vo_watcher_b6_03', 'vo_watcher_b6_04', 'vo_watcher_b6_05']) expect(spoken, l).toContain(l);
    expect(spoken.filter((l) => l === 'vo_watcher_b6_05')).toHaveLength(1);
    expect(ofType(r.events, 'decoys').map((d) => d.threshold)).toEqual([0.6, 0.4]);
    // decoys are gone after the stun
    expect(r.enemies.all().filter((x) => x.def.id === 'shadow_decoy')).toHaveLength(0);
  });
});
