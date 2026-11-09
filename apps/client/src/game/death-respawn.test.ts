import { describe, expect, it } from 'vitest';
import { BRIGGS_BINDING, HOUND_BINDINGS } from '../content/encounters/index.ts';
import { BRIGGS, HOUND, SHADOW_DECOY } from '../content/enemies/index.ts';
import { createGameStore } from '../store/game-store.ts';
import { getCheckpoint } from './checkpoints.ts';
import { applyDevStart, devKillPlayer } from './dev-start.ts';
import { createEncounterWorld, type EncounterBinding } from './encounter-runtime.ts';
import { EnemySystem } from './enemies.ts';
import { SIM_DT } from './player.ts';
import { SpellSystem, type SpellEvent, type SpellHit } from './spells.ts';

function inject(spells: SpellSystem, hit: Partial<SpellHit> & Pick<SpellHit, 'targetId'>): void {
  const full: SpellHit = { type: 'hit', targetKind: 'enemy', spell: 'arcane_bolt', charged: false, damage: 20, stunned: false, destroys: false, ...hit };
  (spells as unknown as { emit(e: SpellEvent): void }).emit(full);
}

/** Enemy system only (5.5 rules of the FSM side). */
function fsmRig() {
  const store = createGameStore();
  store.getState().startNewGame('classic');
  const spells = new SpellSystem({ store });
  const enemies = new EnemySystem({ store, spells, seed: 5 });
  return { store, spells, enemies };
}

describe('death resets the enemies (5.5)', () => {
  it('an engaged mini-boss resets to full HP, idle, back at its spawn', () => {
    const { spells, enemies } = fsmRig();
    const b = enemies.spawn(BRIGGS, { x: 5, z: 5 });
    b.wake();
    enemies.step(SIM_DT, { x: 9, z: 5 });
    inject(spells, { targetId: 'briggs', damage: 45, charged: true });
    inject(spells, { targetId: 'briggs', damage: 45, charged: true });
    expect(b.hp).toBe(210);
    for (let i = 0; i < 120; i++) enemies.step(SIM_DT, { x: 9, z: 5 });
    expect(b.x).not.toBe(5);
    enemies.handlePlayerDeath();
    expect(b.hp).toBe(300);
    expect(b.state).toBe('idle');
    expect(b.engaged).toBe(false);
    expect([b.x, b.z]).toEqual([5, 5]);
    expect(b.position.x).toBe(5);
  });

  it('a mini-boss mid wind-up loses the wind-up', () => {
    const { enemies } = fsmRig();
    const b = enemies.spawn(BRIGGS, { x: 0, z: 0 });
    b.wake();
    enemies.step(SIM_DT, { x: 1.5, z: 0 });
    expect(b.state).toBe('attack');
    enemies.handlePlayerDeath();
    expect(b.attack).toBeNull();
    expect(b.state).toBe('idle');
    expect(b.cooldownOf(BRIGGS.abilities[0]!)).toBe(0);
  });

  it('a stunned mini-boss also resets to full HP (an open question for the author)', () => {
    const { spells, enemies } = fsmRig();
    const b = enemies.spawn(BRIGGS, { x: 0, z: 0 });
    for (let i = 0; i < 6; i++) inject(spells, { targetId: 'briggs', damage: 45, charged: true });
    expect(b.state).toBe('stunned');
    enemies.handlePlayerDeath();
    expect(b.state).toBe('idle');
    expect(b.hp).toBe(300);
  });

  it('an ordinary enemy returns to its spawn at full HP and idle', () => {
    const { spells, enemies } = fsmRig();
    const h = enemies.spawn(HOUND, { x: 20, z: 20 });
    inject(spells, { targetId: 'hound', damage: 20 });
    for (let i = 0; i < 180; i++) enemies.step(SIM_DT, { x: 14, z: 20 });
    expect(h.x).toBeLessThan(20);
    enemies.handlePlayerDeath();
    expect([h.x, h.z]).toEqual([20, 20]);
    expect(h.hp).toBe(80);
    expect(h.state).toBe('idle');
    expect(h.engaged).toBe(false);
  });

  it('a stunned ordinary enemy keeps its (persistent) stun but goes back to its spawn', () => {
    const { spells, enemies } = fsmRig();
    const h = enemies.spawn(HOUND, { x: 20, z: 20 });
    for (let i = 0; i < 3; i++) inject(spells, { targetId: 'hound', damage: 20 });
    h.x = 24;
    enemies.handlePlayerDeath();
    expect(h.state).toBe('stunned');
    expect(h.hp).toBe(24);
    expect([h.x, h.z]).toEqual([20, 20]);
  });

  it('resolved enemies stay resolved and are not brought back', () => {
    const { spells, enemies, } = fsmRig();
    const a = enemies.spawn(HOUND, { x: 0, z: 0 }, { id: 'a' });
    const b = enemies.spawn(HOUND, { x: 5, z: 5 }, { id: 'b' });
    for (const id of ['a', 'b']) for (let i = 0; i < 3; i++) inject(spells, { targetId: id, damage: 20 });
    inject(spells, { targetId: 'a', charged: true, damage: 45, stunned: true, destroys: true });
    inject(spells, { targetId: 'b', spell: 'purify', damage: 0, stunned: true });
    const events: string[] = [];
    enemies.on((e) => events.push(e.type));
    enemies.handlePlayerDeath();
    expect(a.state).toBe('destroyed');
    expect(b.state).toBe('purified');
    expect(events).toEqual([]);
    expect(spells.targetPosition('a')).toBeNull();
    expect(spells.targetPosition('b')).toBeNull();
  });

  it('transient enemies (decoys, wraiths) disappear on death', () => {
    const { enemies } = fsmRig();
    enemies.spawn(SHADOW_DECOY, { x: 1, z: 1 }, { id: 'decoy_1', transient: true });
    enemies.spawn(HOUND, { x: 5, z: 5 });
    enemies.handlePlayerDeath();
    expect(enemies.get('decoy_1')).toBeUndefined();
    expect(enemies.all()).toHaveLength(1);
  });

  it('the invulnerability window is cleared so the first hit after respawn counts', () => {
    const { store, enemies } = fsmRig();
    const h = enemies.spawn(HOUND, { x: 0, z: -1.2 });
    for (let i = 0; i < 40; i++) enemies.step(SIM_DT, { x: 0, z: 0 });
    expect(store.getState().player.hp).toBe(90);
    enemies.handlePlayerDeath();
    store.setState((s) => ({ player: { ...s.player, hp: 100 } }));
    h.x = 0;
    h.z = -1.2;
    for (let i = 0; i < 40; i++) enemies.step(SIM_DT, { x: 0, z: 0 });
    expect(store.getState().player.hp).toBe(90);
  });
});

/** The full path: an fsm binding, a real world runtime, death from enemy damage and from F9. */
function worldRig(bindings: readonly EncounterBinding[], start: 'garden' | 'lane') {
  const store = createGameStore();
  store.getState().startNewGame('classic');
  expect(applyDevStart(store, start)).toEqual([]);
  store.setState((s) => ({ player: { ...s.player, respawns: 0 } })); // the dev start itself respawns once
  const spells = new SpellSystem({ store });
  const enemies = new EnemySystem({ store, spells, seed: 9 });
  const { world, encounters } = createEncounterWorld({ store, bindings, enemies });
  const pose = { x: 0, z: 0 };
  const tick = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / SIM_DT); i++) world.tick(SIM_DT, { x: pose.x, z: pose.z });
  };
  const state = () => store.getState();
  return { store, spells, enemies, world, encounters, pose, tick, state };
}

describe('death and respawn through the world runtime', () => {
  const fsmHounds = HOUND_BINDINGS.map((b) => ({ ...b, mode: 'fsm' as const }));

  it('F9 (hp 0) respawns at the last checkpoint with full HP and magic; flags are kept', () => {
    const g = worldRig(fsmHounds, 'lane');
    const flagsBefore = [...g.state().progress.flags];
    const cp = getCheckpoint(g.state().game.checkpointId);
    const respawns = g.state().player.respawns;
    g.store.setState((s) => ({ player: { ...s.player, hp: 40, magic: 3, pos: [1, 0, 1] } }));
    devKillPlayer(g.store);
    expect(g.state().player.hp).toBe(0);
    g.pose.x = -56;
    g.pose.z = 24;
    g.tick(0.05);
    expect(g.state().player.hp).toBe(100);
    expect(g.state().player.magic).toBe(100);
    expect(g.state().player.respawns).toBe(respawns + 1);
    expect(g.state().player.pos).toEqual([cp.spawn.x, 0, cp.spawn.z]);
    expect(g.state().progress.flags).toEqual(flagsBefore);
  });

  it('dying to an enemy: the bite that takes the last HP leads to a respawn on the next tick', () => {
    const g = worldRig(fsmHounds, 'lane');
    g.pose.x = -56;
    g.pose.z = 24;
    g.store.setState((s) => ({ player: { ...s.player, hp: 5 } }));
    // A hound winds up for 0.5 s and bites for 10; stop the moment the death is handled.
    for (let i = 0; i < 120 && g.state().player.respawns === 0; i++) g.tick(SIM_DT);
    expect(g.state().player.respawns).toBe(1);
    g.pose.x = 500; // Elena is now at the checkpoint, far from the hounds
    g.pose.z = 500;
    g.tick(0.05);
    expect(g.state().player.hp).toBe(100);
    // Both hounds are back at their spawn, idle, and the encounters were reset.
    for (const id of ['hound_1', 'hound_2'] as const) {
      const e = g.encounters.fsmEnemy(id)!;
      expect(e.state).toBe('idle');
      expect(g.encounters.view(id).engaged).toBe(false);
      expect([e.x, e.z]).toEqual([e.spawnPoint.x, e.spawnPoint.z]);
    }
  });

  it('a resolved hound stays resolved across a death; the other one resets', () => {
    const g = worldRig(fsmHounds, 'lane');
    g.pose.x = -56;
    g.pose.z = 24;
    g.tick(0.05);
    const h1 = 'enemy.grounds.hound_1';
    for (let i = 0; i < 3; i++) inject(g.spells, { targetId: h1, damage: 20 });
    inject(g.spells, { targetId: h1, charged: true, damage: 45, stunned: true, destroys: true });
    expect(g.encounters.view('hound_1').state).toBe('resolved');
    const morality = g.state().progress.morality.value;
    devKillPlayer(g.store);
    g.tick(0.05);
    expect(g.state().player.respawns).toBe(1);
    expect(g.encounters.view('hound_1')).toMatchObject({ state: 'resolved', outcome: 'destroy' });
    expect(g.encounters.fsmEnemy('hound_1')!.state).toBe('destroyed');
    expect(g.encounters.view('hound_2').state).toBe('idle');
    expect(g.state().progress.morality.value).toBe(morality); // dying changes no morality
  });

  it('an active FSM mini-boss resets to full HP and idle; the encounter is disengaged', () => {
    const briggs: EncounterBinding = { ...BRIGGS_BINDING, mode: 'fsm' };
    const g = worldRig([briggs], 'garden');
    g.pose.x = 57;
    g.pose.z = 8;
    g.tick(0.5); // the 4 m approach engages him (and starts the transformation sequence)
    const e = g.encounters.fsmEnemy('briggs')!;
    expect(g.encounters.view('briggs').engaged).toBe(true);
    inject(g.spells, { targetId: 'enemy.garden.briggs', charged: true, damage: 45 });
    expect(e.hp).toBe(255);
    devKillPlayer(g.store);
    g.pose.x = 500; // the respawned Elena is far from the garden
    g.pose.z = 500;
    g.tick(0.05);
    expect(g.state().player.respawns).toBe(1);
    expect(e.hp).toBe(300);
    expect(e.state).toBe('idle');
    expect(g.encounters.view('briggs')).toMatchObject({ engaged: false, state: 'idle' });
  });

  it('a stunned ordinary FSM enemy stays stunned (and choosable again once Elena is back) after a death', () => {
    const g = worldRig(fsmHounds, 'lane');
    g.pose.x = -56;
    g.pose.z = 24;
    g.tick(0.05);
    for (let i = 0; i < 3; i++) inject(g.spells, { targetId: 'enemy.grounds.hound_1', damage: 20 });
    devKillPlayer(g.store);
    g.tick(0.05);
    expect(g.encounters.fsmEnemy('hound_1')!.state).toBe('stunned');
    expect(g.encounters.view('hound_1').state).toBe('stunned');
    g.pose.x = -56;
    g.pose.z = 24;
    g.tick(0.05);
    expect(g.encounters.view('hound_1')).toMatchObject({ state: 'stunned', engaged: true, canChoose: true });
  });
});
