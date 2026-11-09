import { describe, expect, it } from 'vitest';
import { ENCOUNTER_BINDINGS, HOUND_BINDINGS } from '../content/encounters/index.ts';
import { TRAINING_HOUND } from '../content/enemies/index.ts';
import { createGameStore } from '../store/game-store.ts';
import { applyDevStart } from './dev-start.ts';
import { shouldSpawnTraining, spawnTrainingEnemy, TRAINING_ENEMY_ID, TRAINING_RESPAWN_S, TRAINING_SPAWN } from './dev-training.ts';
import { createEncounterWorld, type EncounterBinding } from './encounter-runtime.ts';
import { EnemySystem, STUN_THRESHOLD } from './enemies.ts';
import { SIM_DT } from './player.ts';
import { SpellSystem, type SpellEvent, type SpellHit } from './spells.ts';

const H1 = 'enemy.grounds.hound_1';
const H2 = 'enemy.grounds.hound_2';
/** Between the two hounds on the grounds path (hound_1 at -58,24; hound_2 at -54,23.5). */
const AT_HOUNDS = { x: -56, z: 24 };

const fsmHounds: readonly EncounterBinding[] = HOUND_BINDINGS.map((b) => ({ ...b, mode: 'fsm' as const }));

function inject(spells: SpellSystem, hit: Partial<SpellHit> & Pick<SpellHit, 'targetId'>): void {
  const full: SpellHit = { type: 'hit', targetKind: 'enemy', spell: 'arcane_bolt', charged: false, damage: 20, stunned: false, destroys: false, ...hit };
  (spells as unknown as { emit(e: SpellEvent): void }).emit(full);
}

/** The grounds start (lane open, all spells) with a real world runtime and an optional enemy system. */
function setup(opts: { bindings?: readonly EncounterBinding[]; withEnemies?: boolean; start?: 'lane' | 'garden' } = {}) {
  const store = createGameStore();
  store.getState().startNewGame('classic');
  expect(applyDevStart(store, opts.start ?? 'lane')).toEqual([]);
  const spells = new SpellSystem({ store });
  const enemies = opts.withEnemies === false ? undefined : new EnemySystem({ store, spells, seed: 3 });
  const { world, encounters } = createEncounterWorld({ store, ...(opts.bindings && { bindings: opts.bindings }), ...(enemies && { enemies }) });
  const pose = { ...AT_HOUNDS };
  /** Run the sim; Elena is kept alive so the fight can be inspected. */
  const tick = (seconds: number, keepAlive = true) => {
    for (let i = 0; i < Math.round(seconds / SIM_DT); i++) {
      if (keepAlive) store.setState((s) => ({ player: { ...s.player, hp: 100 } }));
      world.tick(SIM_DT, { x: pose.x, z: pose.z });
    }
  };
  const flags = () => store.getState().progress.flags;
  const morality = () => store.getState().progress.morality;
  const entity = (id: string) => store.getState().world.entities[id];
  return { store, spells, enemies, world, encounters, pose, tick, flags, morality, entity };
}

/** Bring a hound to the stun floor with injected bolts (the real spell path is covered in enemies.test.ts). */
function stunHound(g: ReturnType<typeof setup>, id: string) {
  inject(g.spells, { targetId: id, damage: 20 });
  inject(g.spells, { targetId: id, damage: 20 });
  inject(g.spells, { targetId: id, damage: 20 });
}

describe('binding.mode: the adapter between the stub encounters and the FSM', () => {
  it('no shipped binding opts in yet: every encounter still runs on the stub (5.6-5.9 switch them)', () => {
    for (const b of ENCOUNTER_BINDINGS) expect(b.mode ?? 'stub', b.id).toBe('stub');
  });

  it('stub bindings spawn no FSM enemy even when an enemy system is present', () => {
    const g = setup({ bindings: HOUND_BINDINGS });
    g.tick(1);
    expect(g.enemies!.all()).toHaveLength(0);
    expect(g.encounters.fsmEnemy('hound_1')).toBeUndefined();
  });

  it('an fsm binding without an enemy system falls back to the stub flow', () => {
    const g = setup({ bindings: fsmHounds, withEnemies: false });
    g.tick(0.1);
    expect(g.encounters.view('hound_1').engaged).toBe(true);
    expect(g.encounters.view('hound_1').canWeaken).toBe(true);
    expect(g.encounters.interact('hound_1')).toBeNull();
    expect(g.entity(H1)?.['state']).toBe('weakened');
  });

  it('an fsm binding spawns its enemy at the placement, engages on approach and wakes it', () => {
    const g = setup({ bindings: fsmHounds });
    g.tick(0.05);
    const e = g.encounters.fsmEnemy('hound_1')!;
    expect(e).toBeDefined();
    expect(e.id).toBe(H1);
    expect(e.stubId).toBe('hound_1');
    expect(g.encounters.view('hound_1')).toMatchObject({ engaged: true, canWeaken: false, hostile: true });
    g.tick(1);
    expect(e.hostile).toBe(true);
    expect(g.encounters.hostileActive()).toBe(true);
  });

  it('the FSM stun is mirrored into the encounter (stunned, choosable) and persists', () => {
    const g = setup({ bindings: fsmHounds });
    g.tick(0.05);
    stunHound(g, H1);
    expect(g.encounters.fsmEnemy('hound_1')!.state).toBe('stunned');
    expect(g.encounters.view('hound_1')).toMatchObject({ state: 'stunned', canChoose: true, hostile: false });
    expect(g.entity(H1)?.['state']).toBe('stunned');
    g.tick(30);
    expect(g.encounters.view('hound_1').state).toBe('stunned');
    expect(g.encounters.fsmEnemy('hound_1')!.hp).toBe(80 * STUN_THRESHOLD);
  });

  it('destroying then purifying the hounds sets exactly the flags and morality the stub did', () => {
    const fsm = setup({ bindings: fsmHounds });
    fsm.tick(0.05);
    stunHound(fsm, H1);
    stunHound(fsm, H2);
    inject(fsm.spells, { targetId: H1, charged: true, damage: 45, stunned: true, destroys: true });
    expect(fsm.encounters.view('hound_1')).toMatchObject({ state: 'resolved', outcome: 'destroy' });
    expect(fsm.flags()).not.toContain('enc_approach_resolved'); // only one of the pair
    expect(fsm.morality().value).toBe(-10);
    inject(fsm.spells, { targetId: H2, spell: 'purify', damage: 0, stunned: true });
    expect(fsm.encounters.view('hound_2')).toMatchObject({ state: 'resolved', outcome: 'purify' });
    expect(fsm.flags()).toContain('enc_approach_resolved');
    expect(fsm.morality().value).toBe(0);
    expect(fsm.morality().history.map((h) => h.delta)).toEqual([-10, 10]);

    // The same two choices through the stub panel path.
    const stub = setup({ bindings: HOUND_BINDINGS, withEnemies: false });
    stub.tick(0.05);
    for (const id of ['hound_1', 'hound_2'] as const) {
      stub.encounters.interact(id);
      stub.tick(2);
    }
    expect(stub.encounters.choose('hound_1', 'destroy')).toEqual({ ok: true });
    expect(stub.encounters.choose('hound_2', 'purify')).toEqual({ ok: true });
    expect(fsm.flags()).toEqual(stub.flags());
    expect(fsm.morality().value).toBe(stub.morality().value);
    expect(fsm.morality().history.map((h) => [h.delta, h.reason])).toEqual(stub.morality().history.map((h) => [h.delta, h.reason]));
  });

  it('a resolved FSM enemy no longer takes hits or acts', () => {
    const g = setup({ bindings: fsmHounds });
    g.tick(0.05);
    stunHound(g, H1);
    inject(g.spells, { targetId: H1, charged: true, damage: 45, stunned: true, destroys: true });
    const e = g.encounters.fsmEnemy('hound_1')!;
    expect(e.state).toBe('destroyed');
    expect(g.spells.targetPosition(H1)).toBeNull();
    inject(g.spells, { targetId: H1, damage: 20 });
    expect(g.morality().history).toHaveLength(1);
  });

  it('choosing through the panel also settles the FSM enemy', () => {
    const g = setup({ bindings: fsmHounds });
    g.tick(0.05);
    stunHound(g, H1);
    expect(g.encounters.choose('hound_1', 'purify')).toEqual({ ok: true });
    expect(g.encounters.fsmEnemy('hound_1')!.state).toBe('purified');
    expect(g.morality().value).toBe(10);
  });

  it('a saved stun is restored: a fresh runtime spawns the enemy already stunned', () => {
    const a = setup({ bindings: fsmHounds });
    a.tick(0.05);
    stunHound(a, H1);
    const savedState = a.store.getState().world;
    const b = setup({ bindings: fsmHounds });
    b.store.setState({ world: savedState });
    b.tick(0.05);
    expect(b.encounters.fsmEnemy('hound_1')!.state).toBe('stunned');
    expect(b.encounters.fsmEnemy('hound_2')!.state).not.toBe('stunned');
  });
});

describe('dev training enemy (?start=garden, dev builds only)', () => {
  it('spawns only in a dev build opened with ?start=garden', () => {
    expect(shouldSpawnTraining(true, '?start=garden')).toBe(true);
    expect(shouldSpawnTraining(false, '?start=garden')).toBe(false);
    expect(shouldSpawnTraining(true, '?start=street')).toBe(false);
    expect(shouldSpawnTraining(true, '')).toBe(false);
    expect(shouldSpawnTraining(true, '?scene=last_house&start=garden')).toBe(true);
  });

  it('is off the critical path: away from the route, the veils and every placed enemy', () => {
    // The garden start respawns at (58, 30) and the route runs north through the gate at (58, 20).
    expect(Math.hypot(TRAINING_SPAWN.x - 58, TRAINING_SPAWN.z - 30)).toBeGreaterThan(TRAINING_HOUND.aggroRadius);
    expect(TRAINING_SPAWN.x).toBeLessThan(58 - 5);
    expect(TRAINING_SPAWN.z).toBeGreaterThan(30);
    expect(ENCOUNTER_BINDINGS.some((b) => b.entity === TRAINING_ENEMY_ID)).toBe(false);
  });

  it('can be fought, purified or destroyed without touching flags or morality, and comes back', () => {
    const g = setup({ start: 'garden', withEnemies: true, bindings: [] });
    const flagsBefore = [...g.flags()];
    const e = spawnTrainingEnemy(g.enemies!);
    expect(e.id).toBe(TRAINING_ENEMY_ID);
    expect(e.summoned).toBe(true);
    for (const outcome of ['destroy', 'purify'] as const) {
      stunHound(g, TRAINING_ENEMY_ID);
      expect(e.state).toBe('stunned');
      if (outcome === 'destroy') inject(g.spells, { targetId: TRAINING_ENEMY_ID, charged: true, damage: 45, stunned: true, destroys: true });
      else inject(g.spells, { targetId: TRAINING_ENEMY_ID, spell: 'purify', damage: 0, stunned: true });
      expect(e.state).toBe(outcome === 'destroy' ? 'destroyed' : 'purified');
      g.tick(TRAINING_RESPAWN_S + 0.2);
      expect(e.state, 'comes back fresh').not.toMatch(/purified|destroyed|stunned/);
      expect(e.hp).toBe(80);
      expect(g.spells.targetPosition(TRAINING_ENEMY_ID)).not.toBeNull();
    }
    expect(g.flags()).toEqual(flagsBefore);
    expect(g.morality()).toEqual({ value: 0, history: [] });
  });

  it('only acts in the exterior scene', () => {
    const g = setup({ start: 'garden', bindings: [] });
    const e = spawnTrainingEnemy(g.enemies!);
    g.store.getState().setScene('last_house');
    g.pose.x = TRAINING_SPAWN.x + 3;
    g.pose.z = TRAINING_SPAWN.z;
    g.tick(2);
    expect(e.x).toBe(TRAINING_SPAWN.x);
    expect(g.enemies!.hostileActive()).toBe(false);
  });
});
