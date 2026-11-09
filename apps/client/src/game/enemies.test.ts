import { describe, expect, it } from 'vitest';
import { BRIGGS, CAT, ENEMY_DEFS, FOX, HOUND, SHADOW_DECOY, SMOKE_WRAITH, TRAINING_HOUND, WATCHER } from '../content/enemies/index.ts';
import { aabb, type Collider } from './collision.ts';
import {
  DEFAULT_ABILITIES,
  EnemySystem,
  NOOP_ABILITY,
  PLAYER_INVULN_S,
  primaryReach,
  STUN_MIN_MAGIC,
  STUN_THRESHOLD,
  validateEnemyDef,
  type AbilityHandler,
  type AbilityKind,
  type EnemyDef,
  type EnemyEvent,
  type TelegraphedAttackSpec,
} from './enemies.ts';
import { InputController } from './input.ts';
import { SIM_DT } from './player.ts';
import { SPELL_CONFIG, SpellSystem, type AimPose, type SpellContext, type SpellEvent, type SpellHit } from './spells.ts';
import { createGameStore } from '../store/game-store.ts';

const FIGHT: SpellContext = { hostileActive: true, ritualActive: false };
const FAR = { x: 500, z: 500 };

interface RigOptions {
  colliders?: Collider[];
  magic?: number;
  hp?: number;
}

/** A headless Elena at the origin facing -Z, the real SpellSystem and an EnemySystem, stepped like the rig does. */
function rig(opts: RigOptions = {}) {
  const store = createGameStore();
  store.getState().startNewGame('classic');
  store.setState((s) => ({
    player: { ...s.player, spellsUnlocked: ['arcane_bolt', 'ward', 'purify'], selectedSpell: 'arcane_bolt', magic: opts.magic ?? 100, hp: opts.hp ?? 100 },
  }));
  const spells = new SpellSystem({ store });
  const enemies = new EnemySystem({ store, spells, colliders: () => opts.colliders ?? [], seed: 7 });
  const input = new InputController();
  const spellEvents: SpellEvent[] = [];
  const events: EnemyEvent[] = [];
  spells.on((e) => spellEvents.push(e));
  enemies.on((e) => events.push(e));
  const aim: AimPose = { x: 0, y: 1.65, z: 0, yaw: 0, pitch: 0 };
  const player = { x: FAR.x, z: FAR.z };
  const step = () => {
    input.tick(SIM_DT * 1000);
    enemies.step(SIM_DT, player);
    spells.step(SIM_DT, input.state, aim, FIGHT);
    input.state.lmbTap = false;
    input.state.lmbReleased = false;
  };
  const steps = (n: number) => {
    for (let i = 0; i < n; i++) step();
  };
  const seconds = (s: number) => steps(Math.round(s / SIM_DT));
  const click = (n: number) => {
    input.mouseDown(0);
    steps(n);
    input.mouseUp(0);
    step();
  };
  const tap = () => {
    click(3);
    seconds(0.4);
  };
  const charged = () => {
    input.mouseDown(0);
    seconds(1.3);
    input.mouseUp(0);
    step();
    seconds(1.6);
  };
  const purify = (hold = 3) => {
    store.getState().selectSpell('purify');
    input.mouseDown(0);
    seconds(hold);
    input.mouseUp(0);
    step();
    seconds(1.1);
    store.getState().selectSpell('arcane_bolt');
  };
  const stand = (x: number, z: number) => {
    player.x = x;
    player.z = z;
  };
  const hp = () => store.getState().player.hp;
  const magic = () => store.getState().player.magic;
  const of = <T extends EnemyEvent['type']>(type: T) => events.filter((e): e is Extract<EnemyEvent, { type: T }> => e.type === type);
  return { store, spells, enemies, input, aim, step, steps, seconds, click, tap, charged, purify, stand, player, hp, magic, events, spellEvents, of };
}

type Rig = ReturnType<typeof rig>;

/** A hound 6 m ahead of the caster, idle because Elena (for the FSM) is far away. */
function houndAhead(r: Rig, def: EnemyDef = HOUND) {
  return r.enemies.spawn(def, { x: 0, z: -6 });
}

function inject(spells: SpellSystem, hit: Partial<SpellHit> & Pick<SpellHit, 'targetId'>): void {
  const full: SpellHit = { type: 'hit', targetKind: 'enemy', spell: 'arcane_bolt', charged: false, damage: 20, stunned: false, destroys: false, ...hit };
  (spells as unknown as { emit(e: SpellEvent): void }).emit(full);
}

describe('enemy data (docs/combat-tuning.md section 4)', () => {
  const table: [EnemyDef, { hp: number; speed: number; damage: number; cooldown: number; telegraph: number; purifiable: boolean; cls: string }][] = [
    [FOX, { hp: 60, speed: 5.0, damage: 8, cooldown: 1.5, telegraph: 0.4, purifiable: true, cls: 'animal' }],
    [HOUND, { hp: 80, speed: 5.5, damage: 10, cooldown: 1.6, telegraph: 0.5, purifiable: true, cls: 'animal' }],
    [CAT, { hp: 50, speed: 6.0, damage: 10, cooldown: 2.0, telegraph: 0.6, purifiable: true, cls: 'animal' }],
    [BRIGGS, { hp: 300, speed: 3.0, damage: 12, cooldown: 2.0, telegraph: 1.0, purifiable: true, cls: 'mini_boss' }],
    [WATCHER, { hp: 280, speed: 3.5, damage: 15, cooldown: 2.5, telegraph: 0.8, purifiable: true, cls: 'mini_boss' }],
    [SHADOW_DECOY, { hp: 1, speed: 4.0, damage: 6, cooldown: 1.0, telegraph: 0, purifiable: false, cls: 'none' }],
    [SMOKE_WRAITH, { hp: 20, speed: 4.5, damage: 8, cooldown: 1.8, telegraph: 0.4, purifiable: false, cls: 'none' }],
  ];
  it.each(table.map(([def, want]) => ({ id: def.id, def, want })))('$id matches the tuning table', ({ def, want }) => {
    const attack = def.abilities.find((a): a is TelegraphedAttackSpec => a.kind === 'telegraphedAttack')!;
    expect(def.maxHp).toBe(want.hp);
    expect(def.speed).toBe(want.speed);
    expect(attack.damage).toBe(want.damage);
    expect(attack.cooldownS).toBe(want.cooldown);
    expect(attack.telegraphS).toBe(want.telegraph);
    expect(def.purifiable).toBe(want.purifiable);
    expect(def.moralityClass).toBe(want.cls);
  });

  it('animals are leashed at 20 m with a 12 m aggro; every def validates', () => {
    for (const d of [FOX, HOUND, CAT]) {
      expect(d.leashRadius).toBe(20);
      expect(d.aggroRadius).toBe(12);
    }
    for (const d of Object.values(ENEMY_DEFS)) expect(validateEnemyDef(d), d.id).toEqual([]);
  });

  it('Briggs and the Watcher carry the 5.7 / 5.8 abilities as typed data', () => {
    expect(BRIGGS.abilities.map((a) => a.kind)).toEqual(['telegraphedAttack', 'groundSlam', 'smokePuff']);
    const slam = BRIGGS.abilities.find((a) => a.kind === 'groundSlam');
    expect(slam).toMatchObject({ damage: 20, radius: 3, telegraphS: 1.2, activeBelowHp: 0.6 });
    const tp = WATCHER.abilities.find((a) => a.kind === 'teleport');
    expect(tp).toMatchObject({ intervalS: [6, 9], telegraphS: 0.8, minPlayerDistance: 2 });
    expect(tp && tp.kind === 'teleport' && tp.nodes).toEqual([1, 2, 3, 4, 5, 6].map((n) => `node.house66.tp_${n}`));
    expect(WATCHER.abilities.find((a) => a.kind === 'spawnDecoys')).toMatchObject({ thresholds: [0.6, 0.4], count: 2 });
    expect(WATCHER.abilities.find((a) => a.kind === 'voiceAtHp')).toMatchObject({ thresholds: [0.9, 0.5, 0.3] });
    expect(primaryReach(BRIGGS)).toBeGreaterThan(0);
  });

  it('the training hound earns no morality', () => {
    expect(TRAINING_HOUND.moralityClass).toBe('none');
  });
});

describe('stun floor and persistent stun (P16)', () => {
  it('three tap bolts take a hound to the 30% floor and stun it; HP never goes below it', () => {
    const r = rig();
    const e = houndAhead(r);
    const floor = HOUND.maxHp * STUN_THRESHOLD;
    r.tap();
    expect(e.hp).toBe(60);
    r.tap();
    expect(e.hp).toBe(40);
    expect(e.state).not.toBe('stunned');
    r.tap();
    expect(e.hp).toBe(floor); // 40 - 20 = 20 would be below 24: clamped
    expect(e.state).toBe('stunned');
    expect(r.of('stunned')).toHaveLength(1);
  });

  it('a single charged bolt cannot go below the floor either', () => {
    const r = rig();
    const e = houndAhead(r);
    r.tap();
    r.tap(); // 40
    r.charged(); // 45 damage
    expect(e.hp).toBe(HOUND.maxHp * STUN_THRESHOLD);
    expect(e.state).toBe('stunned');
  });

  it('a charged bolt on a healthy enemy does damage but does not destroy it', () => {
    const r = rig();
    const e = houndAhead(r);
    r.charged();
    expect(e.hp).toBe(35);
    expect(e.state).not.toBe('destroyed');
  });

  it('entering stun raises magic to at least 60, and leaves a higher value alone', () => {
    const r = rig({ magic: 30 });
    const e = houndAhead(r);
    e.hp = 25;
    r.tap(); // 25 - 20 -> clamp to 24
    expect(e.state).toBe('stunned');
    expect(r.magic()).toBeGreaterThanOrEqual(STUN_MIN_MAGIC);
    const r2 = rig({ magic: 100 });
    const e2 = houndAhead(r2);
    e2.hp = 25;
    r2.tap();
    expect(e2.state).toBe('stunned');
    expect(r2.magic()).toBeGreaterThan(STUN_MIN_MAGIC);
    expect(r2.magic()).toBeLessThanOrEqual(100);
  });

  it('after the magic floor both choices are affordable', () => {
    const r = rig({ magic: 9 });
    const e = houndAhead(r);
    e.hp = 25;
    r.tap();
    expect(r.magic()).toBeGreaterThanOrEqual(SPELL_CONFIG.purify.cost);
    expect(r.magic()).toBeGreaterThanOrEqual(SPELL_CONFIG.bolt.charged.cost);
  });

  it('stunned has no timer: a minute later it is unchanged, silent and harmless next to Elena', () => {
    const r = rig();
    const e = houndAhead(r);
    e.hp = 25;
    r.tap();
    expect(e.state).toBe('stunned');
    const count = r.events.length;
    r.stand(0, -5); // right next to it
    r.seconds(60);
    expect(e.state).toBe('stunned');
    expect(e.hp).toBe(24);
    expect(r.hp()).toBe(100);
    expect(r.events.length).toBe(count);
  });

  it('a tap bolt on a stunned enemy deals 0, shows the hint and changes nothing', () => {
    const r = rig();
    const e = houndAhead(r);
    e.hp = 25;
    r.tap();
    r.tap();
    expect(e.state).toBe('stunned');
    expect(e.hp).toBe(24);
    const view = r.spells.view();
    expect(view.hint).not.toBeNull();
    expect(r.events.filter((x) => x.type === 'hit')).toHaveLength(1);
  });

  it('a charged bolt on a stunned enemy destroys it and unregisters the target', () => {
    const r = rig();
    const e = houndAhead(r);
    e.hp = 25;
    r.tap();
    const before = r.spells.targetCount;
    r.charged();
    expect(e.state).toBe('destroyed');
    expect(r.of('resolved')).toEqual([{ type: 'resolved', id: 'hound', outcome: 'destroy', summoned: false }]);
    expect(r.spells.targetCount).toBe(before - 1);
  });

  it('a finished Purify saves a stunned enemy; it costs 30 and a hostile enemy fizzles for free', () => {
    const r = rig();
    const e = houndAhead(r);
    r.purify(); // not weakened yet: fizzle at no cost
    expect(e.state).not.toBe('purified');
    expect(r.spellEvents.some((x) => x.type === 'fizzle' && x.reason === 'needs_weakening')).toBe(true);
    expect(r.magic()).toBe(100);
    e.hp = 25;
    r.tap(); // stun (magic 92 -> floor does not lower it)
    const m = r.magic();
    r.purify();
    expect(e.state).toBe('purified');
    expect(r.of('resolved')).toEqual([{ type: 'resolved', id: 'hound', outcome: 'purify', summoned: false }]);
    expect(r.magic()).toBeLessThanOrEqual(m - SPELL_CONFIG.purify.cost + 6 * 5); // paid 30, regenerated a little meanwhile
  });

  it('Purify cannot target a non-purifiable enemy; the wraith is destroyed by damage alone', () => {
    const r = rig();
    const w = r.enemies.spawn(SMOKE_WRAITH, { x: 0, z: -6 });
    r.purify();
    expect(w.state).not.toBe('purified');
    r.tap(); // 20 damage = its whole HP
    expect(w.state).toBe('destroyed');
    expect(r.of('resolved')[0]).toMatchObject({ outcome: 'destroy' });
  });

  it('property: random hits never drop a living purifiable enemy below the floor, and stunned never moves', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const r = rig();
      const e = r.enemies.spawn(HOUND, { x: 0, z: -6 });
      let s = seed * 7919;
      const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      const floor = HOUND.maxHp * STUN_THRESHOLD;
      for (let i = 0; i < 40 && e.alive; i++) {
        const wasStunned = e.state === 'stunned';
        const hpBefore = e.hp;
        const charged = rnd() < 0.3;
        const purify = rnd() < 0.1;
        inject(r.spells, {
          targetId: 'hound',
          spell: purify ? 'purify' : 'arcane_bolt',
          charged,
          damage: purify ? 0 : charged ? 45 : wasStunned ? 0 : 20,
          stunned: wasStunned,
          destroys: charged && wasStunned,
        });
        if (e.alive) {
          expect(e.hp).toBeGreaterThanOrEqual(floor);
          if (wasStunned) expect(e.hp).toBe(hpBefore);
        }
      }
    }
  });
});

describe('attacks are telegraphed and go through the Ward', () => {
  it('a bite shows a wind-up, lands after the telegraph, then respects the cooldown and invulnerability', () => {
    const r = rig();
    const e = r.enemies.spawn(HOUND, { x: 0, z: -1.2 });
    r.stand(0, 0);
    r.step();
    expect(e.state).toBe('attack');
    expect(r.of('telegraph')).toEqual([{ type: 'telegraph', id: 'hound', ability: 'bite', seconds: 0.5 }]);
    expect(e.view().telegraph).not.toBeNull();
    r.seconds(0.4);
    expect(r.hp()).toBe(100); // still winding up
    r.seconds(0.2);
    expect(r.hp()).toBe(90);
    expect(r.of('attack')[0]).toMatchObject({ damage: 10, blocked: false, hit: true });
    // The next bite cannot start before the 1.6 s cooldown, and lands after its own wind-up.
    r.seconds(1.0);
    expect(r.hp()).toBe(90);
    r.seconds(1.3);
    expect(r.hp()).toBe(80);
  });

  it('a wind-up that Elena walks out of misses', () => {
    const r = rig();
    r.enemies.spawn(HOUND, { x: 0, z: -1.2 });
    r.stand(0, 0);
    r.step();
    r.stand(0, 8);
    r.seconds(0.7);
    expect(r.hp()).toBe(100);
    expect(r.of('attack')[0]).toMatchObject({ hit: false, damage: 0 });
  });

  it('the Ward blocks the damage, staggers the attacker and cancels its next wind-up for 0.5 s', () => {
    const r = rig();
    const e = r.enemies.spawn(HOUND, { x: 0, z: -1.2 });
    r.store.getState().selectSpell('ward');
    r.click(2); // cast Ward
    expect(r.spells.wardActive).toBe(true);
    r.stand(0, 0);
    r.seconds(0.8);
    expect(r.hp()).toBe(100);
    expect(r.of('attack')[0]).toMatchObject({ blocked: true, damage: 0 });
    expect(r.of('staggered')).toEqual([{ type: 'staggered', id: 'hound', seconds: 0.5 }]);
    expect(r.spellEvents.some((x) => x.type === 'ward_blocked' && x.sourceId === 'hound')).toBe(true);
    expect(e.view().staggered || e.state !== 'attack').toBe(true);
  });

  it('the invulnerability window after a hit stops a second source from stacking', () => {
    const r = rig();
    r.enemies.spawn(HOUND, { x: 0.5, z: -1 });
    r.enemies.spawn(FOX, { x: -0.5, z: -1 });
    r.stand(0, 0);
    r.seconds(0.6); // both wind-ups end almost together (0.5 and 0.4 s)
    expect(PLAYER_INVULN_S).toBe(0.6);
    expect(r.hp()).toBe(100 - 8); // the fox lands first (0.4 s); the hound at 0.5 s falls in the window
  });

  it('hpFloor caps a scripted hit so Elena keeps at least that much', () => {
    const r = rig({ hp: 35 });
    const def: EnemyDef = { ...BRIGGS, id: 'capped', abilities: [{ kind: 'telegraphedAttack', name: 'swipe', damage: 12, cooldownS: 2, telegraphS: 0.1, range: 2.2, hpFloor: 30 }] };
    r.enemies.spawn(def, { x: 0, z: -1.5 });
    r.stand(0, 0);
    r.seconds(1);
    expect(r.hp()).toBe(30); // 35 - 12 = 23, capped at 30
    r.seconds(2.5);
    expect(r.hp()).toBe(30); // the floor holds for every hit
  });

  it('enemies do nothing while Elena is dead (the runtime handles the death)', () => {
    const r = rig({ hp: 0 });
    const e = r.enemies.spawn(HOUND, { x: 0, z: -1.2 });
    r.stand(0, 0);
    r.seconds(2);
    expect(e.state).toBe('idle');
    expect(r.hp()).toBe(0);
  });
});

describe('steering, wall sliding, patrol and leash', () => {
  it('chases Elena and stops at a stand-off from her', () => {
    const r = rig();
    const e = r.enemies.spawn(HOUND, { x: 10, z: 0 });
    r.stand(0, 0);
    r.seconds(5);
    const d = Math.hypot(e.x, e.z);
    expect(d).toBeLessThan(2);
    expect(d).toBeGreaterThan(0.5);
  });

  it('moves at its speed (about 5.5 m/s for a hound)', () => {
    const r = rig();
    const e = r.enemies.spawn(HOUND, { x: 11, z: 0 });
    r.stand(0, 0);
    r.seconds(1);
    expect(11 - e.x).toBeGreaterThan(5.3);
    expect(11 - e.x).toBeLessThan(5.7);
  });

  it('slides along a wall to get round it and never ends up inside it', () => {
    const wall = aabb(4, -2, 5, 2);
    const r = rig({ colliders: [wall] });
    const e = r.enemies.spawn(HOUND, { x: 0, z: 0 });
    r.stand(10, 3);
    let blockedOnce = false;
    for (let i = 0; i < 60 * 12; i++) {
      r.step();
      const dx = e.x - Math.min(Math.max(e.x, wall.minX), wall.maxX);
      const dz = e.z - Math.min(Math.max(e.z, wall.minZ), wall.maxZ);
      expect(Math.hypot(dx, dz)).toBeGreaterThanOrEqual(HOUND.bodyRadius - 1e-6);
      if (e.x > 3.4 && e.x < 3.7 && e.z > 0.1) blockedOnce = true;
    }
    expect(blockedOnce).toBe(true);
    expect(Math.hypot(e.x - 10, e.z - 3)).toBeLessThan(2.2);
  });

  it('an idle animal ignores Elena outside its aggro radius, and notices her inside', () => {
    const r = rig();
    const e = r.enemies.spawn(HOUND, { x: 0, z: 0 });
    r.stand(15, 0);
    r.seconds(1);
    expect(e.state).toBe('idle');
    r.stand(10, 0);
    r.step();
    expect(e.state).toBe('chase');
  });

  it('gives up when Elena leaves the leash, walks home, heals and is idle again', () => {
    const r = rig();
    const e = r.enemies.spawn(HOUND, { x: 0, z: 0 });
    e.hp = 50;
    r.stand(8, 0);
    r.seconds(1);
    expect(e.state === 'chase' || e.state === 'attack').toBe(true);
    r.stand(40, 0); // beyond the 20 m leash
    r.step();
    expect(e.state).toBe('patrol');
    expect(e.returning).toBe(true);
    r.seconds(8);
    expect(Math.hypot(e.x, e.z)).toBeLessThan(0.5);
    expect(e.state).toBe('idle');
    expect(e.hp).toBe(80);
    expect(e.engaged).toBe(false);
    r.stand(60, 0);
    r.seconds(1);
    expect(e.state).toBe('idle'); // Elena beyond the leash cannot aggro it
  });

  it('a mini-boss has no leash and follows across the map once woken', () => {
    const r = rig();
    const e = r.enemies.spawn(BRIGGS, { x: 0, z: 0 });
    r.stand(60, 0);
    r.seconds(1);
    expect(e.state).toBe('idle');
    e.wake();
    r.seconds(1);
    expect(e.state).toBe('chase');
    expect(e.x).toBeGreaterThan(2.5);
  });

  it('patrol wanders within its radius of the spawn, deterministically for a seed', () => {
    const run = () => {
      const r = rig();
      const e = r.enemies.spawn(TRAINING_HOUND, { x: 10, z: 10 });
      let moved = false;
      let far = 0;
      for (let i = 0; i < 60 * 40; i++) {
        r.step();
        if (e.state === 'patrol') moved = true;
        far = Math.max(far, Math.hypot(e.x - 10, e.z - 10));
      }
      return { moved, far, x: e.x, z: e.z };
    };
    const a = run();
    expect(a.moved).toBe(true);
    expect(a.far).toBeGreaterThan(0.5);
    expect(a.far).toBeLessThan(TRAINING_HOUND.patrol!.radius + 0.5);
    expect(run()).toEqual(a);
  });

  it('a hit wakes an idle enemy', () => {
    const r = rig();
    const e = r.enemies.spawn(BRIGGS, { x: 0, z: -6 });
    r.tap();
    expect(e.engaged).toBe(true);
  });
});

describe('abilities layer', () => {
  const kinds: AbilityKind[] = ['telegraphedAttack', 'groundSlam', 'smokePuff', 'teleport', 'spawnDecoys', 'voiceAtHp'];

  it('has a handler for every ability kind; only telegraphedAttack does anything yet', () => {
    expect(Object.keys(DEFAULT_ABILITIES).sort()).toEqual([...kinds].sort());
    expect(DEFAULT_ABILITIES.telegraphedAttack.run).toBeTypeOf('function');
    for (const k of kinds.filter((x) => x !== 'telegraphedAttack')) expect(DEFAULT_ABILITIES[k], k).toBe(NOOP_ABILITY);
  });

  it('Briggs and the Watcher run their stub abilities without error and still attack', () => {
    for (const def of [BRIGGS, WATCHER]) {
      const r = rig();
      r.enemies.spawn(def, { x: 0, z: -2 });
      r.stand(0, 0);
      r.seconds(6);
      expect(r.hp(), def.id).toBeLessThan(100);
    }
  });

  it('a handler can be swapped without touching the FSM (the 5.7 / 5.8 hook)', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    const spells = new SpellSystem({ store });
    const calls: string[] = [];
    const slam: AbilityHandler<Extract<EnemyDef['abilities'][number], { kind: 'groundSlam' }>> = {
      passive: (e, spec) => {
        calls.push(`${e.id}:${spec.kind}`);
      },
    };
    const enemies = new EnemySystem({ store, spells, abilities: { groundSlam: slam } });
    enemies.spawn(BRIGGS, { x: 0, z: 0 });
    enemies.step(SIM_DT, { x: 50, z: 50 });
    expect(calls).toEqual(['briggs:groundSlam']);
  });
});
