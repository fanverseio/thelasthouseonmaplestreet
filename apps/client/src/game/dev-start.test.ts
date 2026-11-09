import { describe, expect, it } from 'vitest';
import { createGameStore } from '../store/game-store.ts';
import { createEncounterWorld } from './encounter-runtime.ts';
import { SIM_DT } from './player.ts';
import { moveAndSlide } from './collision.ts';
import { exteriorColliders } from '../content/world/exterior-layout.ts';
import { applyDevStart, DEV_STARTS, devKillPlayer, isDevStart } from './dev-start.ts';
import { shouldSpawnTraining, spawnTrainingEnemy, TRAINING_ENEMY_ID, TRAINING_NEAR_SPAWN, TRAINING_SPAWN, trainingSpawnFor } from './dev-training.ts';
import { PLAYER_RADIUS } from './player.ts';
import { createFightRig } from './test-helpers.ts';

describe('dev start', () => {
  it('replays real flags with no rejection and lands on the right checkpoint', () => {
    for (const [name, checkpoint] of [['street', 'cp_street'], ['garden', 'cp_intersection'], ['house66', 'cp_house66']] as const) {
      const store = createGameStore();
      store.getState().startNewGame('classic');
      expect(applyDevStart(store, name)).toEqual([]);
      expect(store.getState().progress.flags).toEqual([...DEV_STARTS[name]]);
      expect(store.getState().game.checkpointId).toBe(checkpoint);
    }
  });

  it('garden start has Arcane Bolt', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    applyDevStart(store, 'garden');
    expect(store.getState().player.spellsUnlocked).toContain('arcane_bolt');
  });

  it('only accepts known names', () => {
    expect(isDevStart('street')).toBe(true);
    expect(isDevStart('toString')).toBe(false);
    expect(isDevStart(null)).toBe(false);
  });
});

describe('Last House dev starts', () => {
  it('?start=interior stands in the entrance hall in the Last House scene on cp_interior', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    expect(applyDevStart(store, 'interior')).toEqual([]);
    const s = store.getState();
    expect(s.game.scene).toBe('last_house');
    expect(s.game.checkpointId).toBe('cp_interior');
    expect(s.player.pos).toEqual([0, 0, 20]);
    expect(s.progress.flags).toContain('runes_done');
    expect(s.progress.flags).not.toContain('enc_interior_resolved');
    expect(s.player.spellsUnlocked).toEqual(['arcane_bolt', 'ward', 'purify']);
  });

  it('?start=ritual-door stands in the ritual chamber with the board solved, on cp_ritual', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    expect(applyDevStart(store, 'ritual-door')).toEqual([]);
    const s = store.getState();
    expect(s.game.scene).toBe('last_house');
    expect(s.game.checkpointId).toBe('cp_ritual');
    expect(s.player.pos).toEqual([0, 0, -12]);
    expect(s.progress.flags).toEqual(expect.arrayContaining(['enc_interior_resolved', 'board_solved']));
    expect(s.progress.flags).not.toContain('seq6_done');
    expect(isDevStart('interior')).toBe(true);
    expect(isDevStart('ritual-door')).toBe(true);
  });
});

describe('dev start: lane and grounds', () => {
  it('replays real flags with no rejection and lands on the right checkpoint', () => {
    for (const [name, checkpoint, pos] of [
      ['lane', 'cp_lane', [-58, 0, -20]],
      ['grounds', 'cp_outbuilding', [-52, 0, 25.5]],
    ] as const) {
      const store = createGameStore();
      store.getState().startNewGame('classic');
      expect(applyDevStart(store, name)).toEqual([]);
      expect(store.getState().progress.flags).toEqual([...DEV_STARTS[name]]);
      expect(store.getState().game.checkpointId).toBe(checkpoint);
      expect(store.getState().player.pos).toEqual(pos);
      expect(store.getState().player.spellsUnlocked).toEqual(expect.arrayContaining(['purify', 'ward', 'arcane_bolt']));
    }
  });

  it('lane stops before Beat 7 and grounds before Beat 8; neither skips a later flag', () => {
    expect(DEV_STARTS.lane).toContain('lane_open');
    expect(DEV_STARTS.lane).not.toContain('enc_approach_resolved');
    expect(DEV_STARTS.grounds).toContain('padlock_open');
    expect(DEV_STARTS.grounds).not.toContain('seq5_done');
    expect(isDevStart('lane')).toBe(true);
    expect(isDevStart('grounds')).toBe(true);
  });
});

describe('dev-only F9 (Q22)', () => {
  it('sets health to 0 and the real death handling respawns at the checkpoint with full health', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    applyDevStart(store, 'street');
    store.getState().setPhase('playing');
    const { world, encounters } = createEncounterWorld({ store });
    const before = store.getState().player.respawns;
    devKillPlayer(store);
    expect(store.getState().player.hp).toBe(0);
    world.tick(SIM_DT, { x: 0, z: 0 });
    expect(store.getState().player.hp).toBe(100);
    expect(store.getState().player.respawns).toBe(before + 1);
    expect(store.getState().game.checkpointId).toBe('cp_street');
    expect(encounters.hostileActive()).toBe(false);
  });
});

describe('?start=training (dev practice range, tasks 5.6-5.9)', () => {
  it('is a known start with exactly the garden flags and the garden checkpoint', () => {
    expect(isDevStart('training')).toBe(true);
    expect([...DEV_STARTS.training]).toEqual([...DEV_STARTS.garden]);
    const store = createGameStore();
    store.getState().startNewGame('classic');
    expect(applyDevStart(store, 'training')).toEqual([]);
    expect(store.getState().progress.flags).toEqual([...DEV_STARTS.training]);
    expect(store.getState().game.checkpointId).toBe('cp_intersection');
    expect(store.getState().player.pos).toEqual([58, 0, 30]);
  });

  it('unlocks all three spells (Bolt, Ward, Purify) at once', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    applyDevStart(store, 'training');
    expect(store.getState().player.spellsUnlocked).toEqual(['arcane_bolt', 'ward', 'purify']);
    expect(store.getState().player.selectedSpell).toBe('arcane_bolt');
    expect(store.getState().selectSpell('purify')).toBe(true);
    expect(store.getState().selectSpell('ward')).toBe(true);
    // the story flags for the spells are NOT set: the spells are a dev unlock only
    expect(store.getState().progress.flags).not.toContain('spell_ward');
    expect(store.getState().progress.flags).not.toContain('spell_purify');
  });

  it('spawns the practice hound only in a dev build, near the spawn for training and far for garden', () => {
    expect(shouldSpawnTraining(true, '?start=training')).toBe(true);
    expect(shouldSpawnTraining(false, '?start=training')).toBe(false);
    expect(shouldSpawnTraining(true, '?start=lane')).toBe(false);
    expect(trainingSpawnFor('?start=training')).toBe(TRAINING_NEAR_SPAWN);
    expect(trainingSpawnFor('?start=garden')).toBe(TRAINING_SPAWN);
    expect(trainingSpawnFor('')).toBe(TRAINING_SPAWN);
    const d = Math.hypot(TRAINING_NEAR_SPAWN.x - 58, TRAINING_NEAR_SPAWN.z - 30);
    expect(d).toBeGreaterThan(3);
    expect(d).toBeLessThan(10);
  });

  it('the near spot is free ground, in the exterior street scene', () => {
    for (const flags of [DEV_STARTS.training, []] as const) {
      const q = moveAndSlide({ x: TRAINING_NEAR_SPAWN.x, z: TRAINING_NEAR_SPAWN.z }, { x: 0, z: 0 }, PLAYER_RADIUS, exteriorColliders(flags));
      expect(Math.hypot(q.x - TRAINING_NEAR_SPAWN.x, q.z - TRAINING_NEAR_SPAWN.z)).toBeLessThan(1e-9);
    }
  });

  it('Purify and Ward can be practised on it: it bites, a Ward blocks, bolts stun, Purify frees it; no flag or morality moves', () => {
    const r = createFightRig('training', { keepAlive: false });
    const hound = spawnTrainingEnemy(r.enemies, trainingSpawnFor('?start=training'));
    const flagsBefore = [...r.flags()];
    expect(hound.id).toBe(TRAINING_ENEMY_ID);
    r.fight.run(0.2);
    // it hunts her, winds up a bite: a Ward cast now blocks it
    for (let i = 0; i < 60 * 8 && hound.state !== 'attack'; i++) r.fight.step();
    expect(hound.state).toBe('attack');
    r.fight.ward();
    r.fight.run(1);
    expect(r.events.some((e) => e.type === 'attack' && e.id === TRAINING_ENEMY_ID && e.blocked)).toBe(true);
    // bolts to the stun, then Purify (2 + hold LMB)
    const keep = createFightRig('training', { keepAlive: true });
    const h2 = spawnTrainingEnemy(keep.enemies, trainingSpawnFor('?start=training'));
    keep.fight.stun(TRAINING_ENEMY_ID);
    expect(h2.state).toBe('stunned');
    keep.fight.purify(TRAINING_ENEMY_ID);
    expect(h2.state).toBe('purified');
    expect(keep.flags()).toEqual(flagsBefore);
    expect(keep.store.getState().progress.morality).toEqual({ value: 0, history: [] });
  });
});