import { describe, expect, it } from 'vitest';
import { BRIGGS_BINDING } from '../content/encounters/index.ts';
import { BRIGGS } from '../content/enemies/index.ts';
import { createGameStore } from '../store/game-store.ts';
import { EnemySystem, type EnemyDef, type EnemyEvent } from './enemies.ts';
import { SIM_DT } from './player.ts';
import { SPELL_CONFIG, SpellSystem } from './spells.ts';
import { createFightRig, injectSpellHit, type FightRig } from './test-helpers.ts';

const BRIGGS_ID = 'enemy.garden.briggs';

/** The garden start: Bolt only. Elena walks up to Briggs (the 4 m approach engages him). */
function engage(r: FightRig) {
  r.goTo(57, 8);
  expect(r.encounters.view('briggs').engaged).toBe(true);
}

/** Tick until the scripted first attack starts (the sequence's briggs_ward prompt). */
function untilTelegraph(r: FightRig) {
  for (let i = 0; i < 60 * 14 && !r.encounters.view('briggs').telegraphing; i++) r.tick(SIM_DT);
  expect(r.encounters.view('briggs').telegraphing).toBe(true);
}

/** Past the scripted attack: tick until it has struck. */
function untilStrike(r: FightRig) {
  for (let i = 0; i < 60 * 4 && r.encounters.view('briggs').telegraphing; i++) r.tick(SIM_DT);
  expect(r.encounters.view('briggs').telegraphing).toBe(false);
}

describe('Briggs binding (5.7)', () => {
  it('runs on the FSM with the 2.5 s scripted attack capped at 30 HP', () => {
    expect(BRIGGS_BINDING.mode).toBe('fsm');
    expect(BRIGGS_BINDING.telegraph).toMatchObject({ seconds: 2.5, hpFloor: 30, wardFlag: 'spell_ward' });
  });
});

describe('the scripted first attack (requirements 5.2, 5.3)', () => {
  it('Briggs is frozen through the transformation: no chase, no damage, no Ward yet', () => {
    const r = createFightRig('garden');
    engage(r);
    const e = r.encounters.fsmEnemy('briggs')!;
    const x0 = e.x;
    const z0 = e.z;
    r.tick(5);
    expect(e.held).toBe(true);
    expect([e.x, e.z]).toEqual([x0, z0]);
    expect(r.hp()).toBe(100);
    expect(r.flags()).not.toContain('spell_ward');
    expect(r.encounters.view('briggs').hostile).toBe(true);
  });

  it('spell_ward is set the moment the wind-up STARTS, and Ward is selectable then', () => {
    const r = createFightRig('garden');
    engage(r);
    untilTelegraph(r);
    expect(r.flags()).toContain('spell_ward');
    expect(r.store.getState().player.spellsUnlocked).toContain('ward');
    expect(r.store.getState().player.selectedSpell).toBe('arcane_bolt');
    expect(r.store.getState().selectSpell('ward')).toBe(true); // key 3
    expect(r.encounters.fsmEnemy('briggs')!.view().telegraph).not.toBeNull();
    expect(r.hp()).toBe(100); // the strike has not landed yet
  });

  it('LMB Ward (spell 3 selected) during the wind-up blocks the strike entirely', () => {
    const r = createFightRig('garden');
    engage(r);
    untilTelegraph(r);
    r.store.setState((s) => ({ player: { ...s.player, hp: 35 } }));
    r.fight.ward();
    expect(r.spells.wardActive).toBe(true);
    expect(r.store.getState().player.magic).toBe(100 - SPELL_CONFIG.ward.cost);
    untilStrike(r);
    expect(r.hp()).toBe(35);
    const strike = r.events.find((e) => e.type === 'attack' && e.ability === 'scripted_strike');
    expect(strike).toMatchObject({ blocked: true, hit: true, damage: 0 });
    expect(r.events.some((e) => e.type === 'staggered')).toBe(true);
  });

  it.each([
    { from: 100, expected: 88 },
    { from: 40, expected: 30 },
    { from: 35, expected: 30 },
    { from: 31, expected: 30 },
    { from: 30, expected: 30 },
    { from: 20, expected: 20 }, // already below the cap: the strike never lowers it further
  ])('without a Ward the strike takes HP $from to $expected (never below 30)', ({ from, expected }) => {
    const r = createFightRig('garden');
    engage(r);
    untilTelegraph(r);
    r.store.setState((s) => ({ player: { ...s.player, hp: from } }));
    untilStrike(r);
    expect(r.hp()).toBe(expected);
    expect(r.events.find((e) => e.type === 'attack' && e.ability === 'scripted_strike')).toMatchObject({ blocked: false, hit: true });
  });

  it('afterwards Briggs is released and fights for real; the cap no longer applies', () => {
    const r = createFightRig('garden');
    engage(r);
    untilTelegraph(r);
    r.fight.ward();
    untilStrike(r);
    const e = r.encounters.fsmEnemy('briggs')!;
    expect(e.held).toBe(false);
    r.store.setState((s) => ({ player: { ...s.player, hp: 20 } }));
    r.tick(5.5); // the Ward from the wind-up has run out; HP regeneration has not started yet
    expect(e.state === 'chase' || e.state === 'attack').toBe(true);
    const swipe = r.events.find((ev) => ev.type === 'attack' && ev.ability === 'swipe' && ev.damage > 0);
    expect(swipe).toMatchObject({ damage: 12 });
    expect(r.hp()).toBe(8); // below 30: the cap belongs to the scripted strike only
  });

  it('a Briggs who is stunned before the wind-up gets no strike, but Ward is still taught', () => {
    const r = createFightRig('garden', { keepAlive: true });
    engage(r);
    const e = r.encounters.fsmEnemy('briggs')!;
    r.fight.stun('briggs');
    expect(e.state).toBe('stunned');
    untilTelegraphOrFlag(r);
    expect(r.flags()).toContain('spell_ward');
    expect(e.scripted).toBeNull();
    expect(r.events.some((ev) => ev.type === 'attack' && ev.ability === 'scripted_strike')).toBe(false);
  });

  it('a second engagement after a death does not replay the scripted attack', () => {
    const r = createFightRig('garden');
    engage(r);
    untilTelegraph(r);
    r.fight.ward();
    untilStrike(r);
    r.store.setState((s) => ({ player: { ...s.player, hp: 0 } }));
    r.pos.x = 500;
    r.pos.z = 500;
    r.tick(0.05);
    expect(r.store.getState().player.respawns).toBe(1);
    const e = r.encounters.fsmEnemy('briggs')!;
    expect(e.held).toBe(true); // dormant again until the story engages him
    expect(e.hp).toBe(300);
    r.goTo(57, 8);
    expect(e.held).toBe(false); // ward was taught: no scripted attack to wait for
  });
});

function untilTelegraphOrFlag(r: FightRig) {
  for (let i = 0; i < 60 * 14 && !r.flags().includes('spell_ward'); i++) r.tick(SIM_DT);
}

describe('the stun, the Purify prompt and the choice (requirements 5.4, 6.4)', () => {
  function toStun(r: FightRig) {
    engage(r);
    untilTelegraph(r);
    r.fight.ward();
    untilStrike(r);
    r.fight.stun('briggs');
  }

  it('30% HP: persistent stun, spell_purify set, Purify unlocked, magic raised to 60', () => {
    const r = createFightRig('garden', { keepAlive: true });
    toStun(r);
    const e = r.encounters.fsmEnemy('briggs')!;
    expect(e.state).toBe('stunned');
    expect(e.hp).toBe(90);
    expect(r.flags()).toContain('spell_purify');
    expect(r.store.getState().player.spellsUnlocked).toContain('purify');
    expect(r.store.getState().player.magic).toBeGreaterThanOrEqual(60);
    expect(r.encounters.view('briggs')).toMatchObject({ state: 'stunned', canChoose: true, canPurify: true, fsm: true, hostile: false });
    r.tick(30); // no timer
    expect(e.state).toBe('stunned');
    expect(r.flags()).not.toContain('briggs_purified');
    expect(r.store.getState().progress.morality.value).toBe(0);
  });

  it('Purify (2 + hold LMB) saves him: briggs_purified, +30, the walkie is a pickup', () => {
    const r = createFightRig('garden', { keepAlive: true });
    toStun(r);
    r.fight.purify('briggs');
    expect(r.flags()).toContain('briggs_purified');
    expect(r.flags()).not.toContain('briggs_destroyed');
    expect(r.flags()).not.toContain('walkie_found'); // deferred: the player picks it up
    expect(r.store.getState().progress.morality.value).toBe(30);
    expect(r.encounters.fsmEnemy('briggs')!.state).toBe('purified');
  });

  it('a held charged Bolt destroys him: briggs_destroyed, -30', () => {
    const r = createFightRig('garden', { keepAlive: true });
    toStun(r);
    r.fight.charged('briggs');
    expect(r.flags()).toContain('briggs_destroyed');
    expect(r.flags()).not.toContain('briggs_purified');
    expect(r.store.getState().progress.morality.value).toBe(-30);
    expect(r.encounters.fsmEnemy('briggs')!.state).toBe('destroyed');
  });

  it('a TAP Bolt on the stunned Briggs does nothing but show the hint', () => {
    const r = createFightRig('garden', { keepAlive: true });
    toStun(r);
    r.fight.tap('briggs');
    expect(r.encounters.fsmEnemy('briggs')!.state).toBe('stunned');
    expect(r.store.getState().progress.morality.history).toHaveLength(0);
  });

  it('dying while he is stunned keeps him stunned and choosable', () => {
    const r = createFightRig('garden', { keepAlive: true });
    toStun(r);
    r.store.setState((s) => ({ player: { ...s.player, hp: 0 } }));
    r.pos.x = 500;
    r.pos.z = 500;
    r.tick(0.05);
    expect(r.store.getState().player.respawns).toBe(1);
    const e = r.encounters.fsmEnemy('briggs')!;
    expect(e.state).toBe('stunned');
    expect(e.hp).toBe(90);
    expect(r.encounters.view('briggs').state).toBe('stunned');
    r.goTo(57, 8);
    r.fight.purify('briggs');
    expect(r.flags()).toContain('briggs_purified');
  });

  it('dying while engaged but not stunned resets him to full HP', () => {
    const r = createFightRig('garden', { keepAlive: true });
    engage(r);
    untilTelegraph(r);
    r.fight.ward();
    untilStrike(r);
    r.fight.tap('briggs');
    r.fight.tap('briggs');
    const e = r.encounters.fsmEnemy('briggs')!;
    expect(e.hp).toBeLessThan(300);
    r.store.setState((s) => ({ player: { ...s.player, hp: 0 } }));
    r.pos.x = 500;
    r.pos.z = 500;
    r.tick(0.05);
    expect(e.hp).toBe(300);
    expect(e.state).toBe('idle');
    expect(r.encounters.view('briggs')).toMatchObject({ engaged: false, state: 'idle' });
  });
});

/* ---------------- Phase 2: the ground slam, and the smoke puff (enemy system level) ---------------- */

function bare(def: EnemyDef = BRIGGS, elena = { x: 0, z: 2.5 }) {
  const store = createGameStore();
  store.getState().startNewGame('classic');
  store.setState((s) => ({ player: { ...s.player, spellsUnlocked: ['arcane_bolt', 'ward', 'purify'], magic: 100, hp: 100 } }));
  const spells = new SpellSystem({ store });
  const enemies = new EnemySystem({ store, spells, seed: 3 });
  const events: EnemyEvent[] = [];
  enemies.on((e) => events.push(e));
  const e = enemies.spawn(def, { x: 0, z: 0 }, { id: 'briggs' });
  e.wake();
  const input = { lmbDown: false, lmbHeldMs: 0, lmbTap: false, lmbReleased: false };
  const aim = { x: 0, y: 1.65, z: 0, yaw: 0, pitch: 0 };
  const step = () => {
    enemies.step(SIM_DT, elena);
    spells.step(SIM_DT, input, aim, { hostileActive: true, ritualActive: false });
    input.lmbReleased = false;
  };
  const seconds = (s: number) => {
    for (let i = 0; i < Math.round(s / SIM_DT); i++) step();
  };
  const hp = () => store.getState().player.hp;
  return { store, spells, enemies, events, e, elena, input, step, seconds, hp };
}

/** Briggs without the swipe, so the slam can be seen on its own. */
const SLAM_ONLY: EnemyDef = { ...BRIGGS, abilities: BRIGGS.abilities.filter((a) => a.kind === 'groundSlam') };
const hasSlam = (events: EnemyEvent[]) => events.some((ev) => ev.type === 'telegraph' && ev.ability === 'groundSlam');

describe('phase 2: the ground slam (below 60% HP)', () => {
  it('Briggs data: 20 damage, 3 m ring, 1.2 s telegraph, only below 60%', () => {
    expect(BRIGGS.abilities.find((a) => a.kind === 'groundSlam')).toMatchObject({ damage: 20, radius: 3, telegraphS: 1.2, cooldownS: 6, activeBelowHp: 0.6 });
  });

  it.each([300, 200, 181, 180])('no slam at %i HP (not strictly below 60%)', (hp) => {
    const t = bare(SLAM_ONLY);
    t.e.hp = hp;
    t.seconds(10);
    expect(hasSlam(t.events)).toBe(false);
  });

  it('slams below 60%: a 1.2 s telegraph with a visible 3 m ring, then 20 damage inside the ring', () => {
    const t = bare(SLAM_ONLY);
    t.e.hp = 179;
    t.step();
    expect(t.e.state).toBe('attack');
    expect(t.events.find((ev) => ev.type === 'telegraph' && ev.ability === 'groundSlam')).toMatchObject({ seconds: 1.2 });
    expect(t.e.view().ring).toBe(3);
    t.seconds(0.6);
    expect(t.hp()).toBe(100); // not yet
    expect(t.e.view().telegraph).toBeGreaterThan(0.3);
    t.seconds(0.8);
    expect(t.hp()).toBe(80);
    expect(t.events.find((ev) => ev.type === 'attack' && ev.ability === 'groundSlam')).toMatchObject({ damage: 20, hit: true, blocked: false });
    expect(t.e.view().ring).toBeNull();
  });

  it('Elena outside the 3 m ring takes nothing', () => {
    const t = bare(SLAM_ONLY, { x: 0, z: 3.6 });
    t.e.hp = 179;
    t.seconds(2);
    expect(hasSlam(t.events)).toBe(true);
    expect(t.hp()).toBe(100);
    expect(t.events.find((ev) => ev.type === 'attack' && ev.ability === 'groundSlam')).toMatchObject({ hit: false, damage: 0 });
  });

  it('too far away (more than the ring plus 1 m): no slam at all', () => {
    const t = bare(SLAM_ONLY, { x: 0, z: 6 });
    t.e.hp = 100;
    t.seconds(0.2);
    expect(hasSlam(t.events)).toBe(false);
  });

  it('goes through the Ward: a Ward up at impact blocks it and staggers him', () => {
    const t = bare(SLAM_ONLY);
    t.e.hp = 179;
    t.step();
    t.store.getState().selectSpell('ward');
    t.input.lmbReleased = true;
    t.step();
    expect(t.spells.wardActive).toBe(true);
    t.seconds(1.4);
    expect(t.hp()).toBe(100);
    expect(t.events.find((ev) => ev.type === 'attack' && ev.ability === 'groundSlam')).toMatchObject({ blocked: true, damage: 0 });
    expect(t.events.some((ev) => ev.type === 'staggered')).toBe(true);
  });

  it('repeats every 6 s of cooldown, not faster', () => {
    const t = bare(SLAM_ONLY);
    t.e.hp = 150;
    t.store.setState((s) => ({ player: { ...s.player, hp: 100 } }));
    const strikeTimes: number[] = [];
    for (let i = 0; i < 60 * 17; i++) {
      const before = t.events.length;
      t.step();
      if (t.events.slice(before).some((ev) => ev.type === 'attack' && ev.ability === 'groundSlam')) strikeTimes.push((i + 1) * SIM_DT);
    }
    expect(strikeTimes).toHaveLength(3); // 1.2 s, then one 6 s cooldown, a wind-up and a recovery later: ~8.4 s, ~15.6 s
    expect(strikeTimes[1]! - strikeTimes[0]!).toBeGreaterThanOrEqual(6);
    expect(strikeTimes[2]! - strikeTimes[1]!).toBeGreaterThanOrEqual(6);
  });

  it('a stun mid slam cancels the wind-up', () => {
    const t = bare(SLAM_ONLY);
    t.e.hp = 179;
    t.step();
    expect(t.e.state).toBe('attack');
    for (let i = 0; i < 8; i++) injectSpellHit(t.spells, { targetId: 'briggs', damage: 45, charged: true });
    expect(t.e.state).toBe('stunned');
    t.seconds(2);
    expect(t.hp()).toBe(100);
    expect(t.e.view().ring).toBeNull();
  });

  it('with the swipe back in, both attacks happen in a long fight below 60%', () => {
    const t = bare(BRIGGS, { x: 0, z: 2 });
    t.e.hp = 150;
    for (let i = 0; i < 60 * 30; i++) {
      t.store.setState((s) => ({ player: { ...s.player, hp: 100 } }));
      t.step();
    }
    const kinds = new Set(t.events.filter((ev): ev is Extract<EnemyEvent, { type: 'attack' }> => ev.type === 'attack').map((ev) => ev.ability));
    expect(kinds.has('swipe')).toBe(true);
    expect(kinds.has('groundSlam')).toBe(true);
  });
});

describe('the smoke puff', () => {
  const puffs = (events: EnemyEvent[]) => events.filter((ev) => ev.type === 'smoke_puff');

  it('is harmless: it emits a 2 s puff event, never damage, and the first one comes after ~4 s', () => {
    const t = bare({ ...BRIGGS, abilities: BRIGGS.abilities.filter((a) => a.kind === 'smokePuff') }, { x: 0, z: 5 });
    t.seconds(3.5);
    expect(puffs(t.events)).toHaveLength(0);
    t.seconds(1);
    expect(puffs(t.events)).toHaveLength(1);
    expect(puffs(t.events)[0]).toMatchObject({ type: 'smoke_puff', seconds: 2, id: 'briggs' });
    expect(t.hp()).toBe(100);
  });

  it('repeats on its 12 s cooldown, only while Elena is within 8 m', () => {
    const near = bare({ ...BRIGGS, abilities: BRIGGS.abilities.filter((a) => a.kind === 'smokePuff') }, { x: 0, z: 6 });
    near.seconds(30);
    expect(puffs(near.events).length).toBe(3); // ~4 s, ~16 s, ~28 s
    const far = bare({ ...BRIGGS, speed: 0.001, abilities: BRIGGS.abilities.filter((a) => a.kind === 'smokePuff') }, { x: 0, z: 20 });
    far.seconds(30);
    expect(puffs(far.events)).toHaveLength(0);
  });

  it('is part of phase 1 (full HP) as well as phase 2', () => {
    const t = bare(BRIGGS, { x: 0, z: 2 });
    for (let i = 0; i < 60 * 6; i++) {
      t.store.setState((s) => ({ player: { ...s.player, hp: 100 } }));
      t.step();
    }
    expect(puffs(t.events).length).toBeGreaterThanOrEqual(1);
    expect(t.e.hp).toBe(300);
  });
});

describe('Briggs entity id in the encounter', () => {
  it('the FSM enemy shares the encounter entity id', () => {
    const r = createFightRig('garden');
    engage(r);
    expect(r.encounters.fsmEnemy('briggs')!.id).toBe(BRIGGS_ID);
  });
});
