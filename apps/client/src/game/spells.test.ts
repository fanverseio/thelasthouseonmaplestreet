import type { SpellId } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { createGameStore } from '../store/game-store.ts';
import { InputController, TAP_MAX_MS } from './input.ts';
import { SIM_DT } from './player.ts';
import {
  HINT_SECONDS,
  MAGIC_REGEN,
  MAX_MAGIC,
  PROJECTILE_POOL_SIZE,
  raySphere,
  SPELL_CONFIG,
  SPELL_FLAG_ORDER,
  SPELL_HINTS,
  SPELL_UNLOCK_FLAGS,
  SPELL_UNLOCK_ORDER,
  SpellSystem,
  stunFloorBoltDamage,
  type AimPose,
  type PurifyStatus,
  type SpellContext,
  type SpellEvent,
  type SpellTarget,
} from './spells.ts';

const AIM: AimPose = { x: 0, y: 1.65, z: 0, yaw: 0, pitch: 0 }; // faces -Z
const CALM: SpellContext = { hostileActive: false, ritualActive: false };
const FIGHT: SpellContext = { hostileActive: true, ritualActive: false };

function rig(opts: { unlocked?: SpellId[]; selected?: SpellId; magic?: number; ctx?: SpellContext } = {}) {
  const store = createGameStore();
  store.getState().startNewGame('classic');
  store.setState((s) => ({
    player: {
      ...s.player,
      spellsUnlocked: opts.unlocked ?? ['arcane_bolt', 'ward', 'purify'],
      selectedSpell: opts.selected ?? 'arcane_bolt',
      magic: opts.magic ?? MAX_MAGIC,
    },
  }));
  const spells = new SpellSystem({ store });
  const input = new InputController();
  const events: SpellEvent[] = [];
  spells.on((e) => events.push(e));
  let ctx = opts.ctx ?? FIGHT;
  const aim = { ...AIM };
  /** One fixed step, as the player rig runs it. */
  const step = () => {
    input.tick(SIM_DT * 1000);
    spells.step(SIM_DT, input.state, aim, ctx);
    input.state.lmbTap = false;
    input.state.lmbReleased = false;
  };
  const steps = (n: number) => {
    for (let i = 0; i < n; i++) step();
  };
  const seconds = (s: number) => steps(Math.round(s / SIM_DT));
  /** Press, hold for `n` steps, release, then run one more step so the release edge is read. */
  const click = (n: number) => {
    input.mouseDown(0);
    steps(n);
    input.mouseUp(0);
    step();
  };
  return {
    store, spells, input, events, aim,
    step, steps, seconds, click,
    setCtx: (c: SpellContext) => { ctx = c; },
    magic: () => store.getState().player.magic,
    kinds: (type: SpellEvent['type']) => events.filter((e) => e.type === type),
  };
}

function target(over: Partial<SpellTarget> & { id: string }): SpellTarget {
  return {
    kind: 'enemy',
    position: { x: 0, y: 1.65, z: -10 },
    radius: 0.5,
    accepts: { bolt: 'any', purify: true },
    ...over,
  };
}

/** A fake enemy that can be stunned, using the stun floor hook. */
function fakeEnemy(id: string, z: number, stunned: { value: boolean }): SpellTarget {
  return target({
    id,
    position: { x: 0, y: 1.65, z },
    isStunned: () => stunned.value,
    boltDamage: (charged, base) => stunFloorBoltDamage(stunned.value, charged, base),
    purifyStatus: (): PurifyStatus => (stunned.value ? 'ready' : 'needs_weakening'),
  });
}

describe('spell config (combat-tuning section 2)', () => {
  it('holds the documented numbers', () => {
    expect(SPELL_CONFIG.bolt.tap).toEqual({ cost: 8, damage: 20, cooldown: 0.35 });
    expect(SPELL_CONFIG.bolt.charged).toEqual({ cost: 25, damage: 45, cooldown: 1.5 });
    expect(SPELL_CONFIG.bolt.chargeS).toBe(1.2);
    expect(SPELL_CONFIG.bolt.speed).toBe(30);
    expect(SPELL_CONFIG.bolt.range).toBe(40);
    expect(SPELL_CONFIG.purify).toMatchObject({ cost: 30, channelS: 2.5, cooldown: 1, range: 8, outOfRangeRefund: 0.5 });
    expect(SPELL_CONFIG.ward).toMatchObject({ cost: 25, cooldown: 6, durationS: 4, staggerS: 0.5 });
    expect(MAGIC_REGEN).toEqual({ combat: 6, calm: 12, ritual: 15 });
    expect(TAP_MAX_MS).toBe(200);
  });
});

describe('unlock hooks', () => {
  it('spells unlock only from the progression flags, in the documented order', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    expect(store.getState().player.spellsUnlocked).toEqual([]);
    expect(store.getState().selectSpell('ward')).toBe(false);
    const order: SpellId[] = [];
    const prereq = ['seq1_done', 'seq2_done', 'seq3_started'] as const;
    for (const f of ['locket_taken', 'angel_awake', 'home_done', ...prereq]) store.getState().setFlag(f);
    for (const flag of SPELL_FLAG_ORDER) {
      expect(store.getState().setFlag(flag).ok).toBe(true);
      order.push(...store.getState().player.spellsUnlocked.filter((s) => !order.includes(s)));
    }
    expect(order).toEqual([...SPELL_UNLOCK_ORDER]);
    expect(SPELL_UNLOCK_ORDER).toEqual(['arcane_bolt', 'ward', 'purify']);
    expect(SPELL_UNLOCK_FLAGS).toEqual({ spell_bolt: 'arcane_bolt', spell_ward: 'ward', spell_purify: 'purify' });
  });

  it('a spell cannot be unlocked out of order (Purify needs Ward, Ward needs the Briggs scene)', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    expect(store.getState().setFlag('spell_purify').ok).toBe(false);
    expect(store.getState().setFlag('spell_ward').ok).toBe(false);
    expect(store.getState().player.spellsUnlocked).toEqual([]);
  });

  it('the system casts only unlocked spells', () => {
    const r = rig({ unlocked: [], selected: 'arcane_bolt' });
    r.click(5);
    expect(r.events).toEqual([]);
    expect(r.spells.activeProjectiles()).toBe(0);
    for (const sel of ['ward', 'purify'] as const) {
      const w = rig({ unlocked: ['arcane_bolt'], selected: sel });
      w.click(20);
      expect(w.kinds('cast')).toHaveLength(0);
      expect(w.spells.wardActive).toBe(false);
    }
  });

  it('the selected spell comes from the store: Ward selected means LMB does not fire a bolt', () => {
    const r = rig({ selected: 'ward' });
    r.click(5);
    expect(r.spells.activeProjectiles()).toBe(0);
    expect(r.spells.wardActive).toBe(true);
  });
});

describe('Arcane Bolt', () => {
  it('a tap costs 8, fires a 30 m/s projectile and starts the 0.35 s cooldown', () => {
    const r = rig({ ctx: CALM });
    r.input.mouseDown(0);
    r.steps(6); // 100 ms: a tap
    r.input.mouseUp(0);
    const before = r.magic();
    r.step();
    expect(r.magic()).toBeCloseTo(Math.min(MAX_MAGIC, before + MAGIC_REGEN.calm * SIM_DT) - 8, 6); // regen first, then the spend
    expect(r.kinds('cast')).toEqual([{ type: 'cast', spell: 'arcane_bolt', charged: false }]);
    expect(r.spells.activeProjectiles()).toBe(1);
    expect(r.spells.cooldownLeft('arcane_bolt')).toBeCloseTo(0.35 - SIM_DT * 0, 1);
    const p = r.spells.projectiles.find((x) => x.active)!;
    r.seconds(0.5);
    expect(Math.abs(p.z + 15.5)).toBeLessThan(0.1); // 30 m/s * (0.5 s + the cast step) along -Z
    expect(p.damage).toBe(20);
  });

  it('tap vs hold at 200 ms: a short press is a tap, a longer press waits for the charge', () => {
    const tap = rig();
    tap.click(6); // 100 ms
    expect(tap.kinds('cast')).toHaveLength(1);
    const hold = rig();
    hold.click(18); // 300 ms: a hold, but far from charged
    expect(hold.kinds('cast')).toHaveLength(0);
    expect(hold.spells.activeProjectiles()).toBe(0);
    expect(hold.kinds('fizzle')).toEqual([{ type: 'fizzle', spell: 'arcane_bolt', reason: 'charge_cancelled' }]);
  });

  it('a charged bolt needs the full 1.2 s: 25 magic, 45 damage, 1.5 s cooldown', () => {
    const short = rig();
    short.click(70); // 1.167 s: not enough
    expect(short.kinds('cast')).toHaveLength(0);
    expect(short.magic()).toBe(MAX_MAGIC);

    const r = rig({ ctx: CALM });
    r.input.mouseDown(0);
    r.steps(73); // 1.217 s
    r.input.mouseUp(0);
    const before = r.magic();
    r.step();
    expect(r.magic()).toBeCloseTo(Math.min(MAX_MAGIC, before + MAGIC_REGEN.calm * SIM_DT) - 25, 6);
    expect(r.kinds('cast')).toEqual([{ type: 'cast', spell: 'arcane_bolt', charged: true }]);
    expect(r.spells.projectiles.find((p) => p.active)).toMatchObject({ charged: true, damage: 45 });
    expect(r.spells.cooldownLeft('arcane_bolt')).toBeGreaterThan(1.4);
  });

  it('the view reports the charge fraction while LMB is held', () => {
    const r = rig();
    r.input.mouseDown(0);
    r.steps(36); // 0.6 s
    const v = r.spells.view(r.input.state);
    expect(v.charging).toBe(true);
    expect(v.charge).toBeCloseTo(0.5, 1);
    r.steps(60);
    expect(r.spells.view(r.input.state).charge).toBe(1);
  });

  it('is refused at low magic (no cost, hint) and during the cooldown', () => {
    const low = rig({ magic: 7, ctx: FIGHT });
    low.click(6);
    expect(low.kinds('fizzle')).toEqual([{ type: 'fizzle', spell: 'arcane_bolt', reason: 'low_magic' }]);
    expect(low.spells.activeProjectiles()).toBe(0);
    expect(low.magic()).toBeCloseTo(7 + MAGIC_REGEN.combat * SIM_DT * 7, 4); // only regen moved it
    expect(low.spells.view().hint).toBe(SPELL_HINTS.lowMagic);

    const r = rig();
    r.click(3);
    r.click(3); // well inside 0.35 s
    expect(r.kinds('cast')).toHaveLength(1);
    expect(r.kinds('fizzle')).toEqual([{ type: 'fizzle', spell: 'arcane_bolt', reason: 'cooldown' }]);
    r.seconds(0.4);
    r.click(3);
    expect(r.kinds('cast')).toHaveLength(2);
  });

  it('hints expire', () => {
    const r = rig({ magic: 0, ctx: FIGHT });
    r.setCtx({ hostileActive: true, ritualActive: false });
    r.store.setState((s) => ({ player: { ...s.player, magic: 0 } }));
    r.click(3);
    expect(r.spells.view().hint).toBe(SPELL_HINTS.lowMagic);
    r.seconds(HINT_SECONDS + 0.1);
    expect(r.spells.view().hint).toBeNull();
  });
});

describe('projectile hits and the pool', () => {
  it('hits the nearest target on the line, with a typed event', () => {
    const r = rig();
    r.spells.register(target({ id: 'far', position: { x: 0, y: 1.65, z: -20 } }));
    r.spells.register(target({ id: 'near', position: { x: 0, y: 1.65, z: -8 } }));
    r.click(3);
    r.seconds(1);
    const hits = r.kinds('hit');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ type: 'hit', targetId: 'near', targetKind: 'enemy', spell: 'arcane_bolt', charged: false, damage: 20 });
    expect(r.spells.activeProjectiles()).toBe(0);
  });

  it('misses a target off the line and expires at 40 m', () => {
    const r = rig();
    r.spells.register(target({ id: 'side', position: { x: 5, y: 1.65, z: -10 } }));
    r.click(3);
    r.seconds(1.5);
    expect(r.kinds('hit')).toHaveLength(0);
    expect(r.spells.activeProjectiles()).toBe(0);
    // Out of range: a target at 45 m is never hit.
    const far = rig();
    far.spells.register(target({ id: 'far', position: { x: 0, y: 1.65, z: -45 } }));
    far.click(3);
    far.seconds(2);
    expect(far.kinds('hit')).toHaveLength(0);
  });

  it('respects what a target accepts: charged_only ignores a tap, none is passed through', () => {
    const r = rig();
    r.spells.register(target({ id: 'shell', kind: 'shell', accepts: { bolt: 'charged_only', purify: false } }));
    r.click(3);
    r.seconds(1);
    expect(r.kinds('hit')).toHaveLength(0);
    r.seconds(1);
    r.input.mouseDown(0);
    r.steps(73);
    r.input.mouseUp(0);
    r.step();
    r.seconds(1);
    expect(r.kinds('hit')).toEqual([expect.objectContaining({ targetId: 'shell', targetKind: 'shell', charged: true, damage: 45 })]);
  });

  it('unregistering removes the target', () => {
    const r = rig();
    const off = r.spells.register(target({ id: 'a' }));
    expect(r.spells.targetCount).toBe(1);
    off();
    expect(r.spells.targetCount).toBe(0);
    r.click(3);
    r.seconds(1);
    expect(r.kinds('hit')).toHaveLength(0);
  });

  it('uses a fixed pool: same slots, same length, reused after a bolt ends', () => {
    const r = rig();
    const slots = [...r.spells.projectiles];
    expect(slots).toHaveLength(PROJECTILE_POOL_SIZE);
    r.click(3);
    const first = r.spells.projectiles.findIndex((p) => p.active);
    expect(first).toBe(0);
    r.seconds(1.6); // out of range, slot freed
    expect(r.spells.activeProjectiles()).toBe(0);
    r.click(3);
    expect(r.spells.projectiles.findIndex((p) => p.active)).toBe(0); // the same slot again
    expect(r.spells.projectiles).toHaveLength(PROJECTILE_POOL_SIZE);
    r.spells.projectiles.forEach((p, i) => expect(p).toBe(slots[i]));
  });

  it('several bolts fly at once in different slots', () => {
    const r = rig();
    r.click(3);
    r.seconds(0.4);
    r.click(3);
    expect(r.spells.activeProjectiles()).toBe(2);
  });

  it('refuses a cast when the pool is full, without spending magic', () => {
    const r = rig({ ctx: CALM });
    for (const p of r.spells.projectiles) p.active = true;
    r.click(3);
    expect(r.kinds('fizzle')).toEqual([{ type: 'fizzle', spell: 'arcane_bolt', reason: 'pool_full' }]);
    expect(r.magic()).toBe(MAX_MAGIC);
  });

  it('raySphere: hit, miss, behind, inside and too far', () => {
    expect(raySphere(0, 0, 0, 0, 0, -1, 40, 0, 0, -10, 1)).toBeCloseTo(9);
    expect(raySphere(0, 0, 0, 0, 0, -1, 40, 3, 0, -10, 1)).toBe(-1);
    expect(raySphere(0, 0, 0, 0, 0, -1, 40, 0, 0, 10, 1)).toBe(-1);
    expect(raySphere(0, 0, 0, 0, 0, -1, 40, 0, 0, 0, 1)).toBe(0);
    expect(raySphere(0, 0, 0, 0, 0, -1, 5, 0, 0, -10, 1)).toBe(-1);
  });
});

describe('stun floor rule (target-side hook)', () => {
  it('a tap bolt on a stunned enemy deals 0 and shows the choice prompt; a hostile one takes 20', () => {
    const stunned = { value: true };
    const r = rig();
    r.spells.register(fakeEnemy('fox', -10, stunned));
    r.click(3);
    r.seconds(1);
    expect(r.kinds('hit')).toEqual([{ type: 'hit', targetId: 'fox', targetKind: 'enemy', spell: 'arcane_bolt', charged: false, damage: 0, stunned: true, destroys: false }]);
    expect(r.spells.view().hint).toBe('Hold to destroy | 2: Purify');

    stunned.value = false;
    r.seconds(0.5);
    r.click(3);
    r.seconds(1);
    expect(r.kinds('hit')[1]).toMatchObject({ damage: 20, stunned: false, destroys: false });
  });

  it('a charged bolt still lands on a stunned enemy and is marked as the destroy', () => {
    const r = rig();
    r.spells.register(fakeEnemy('fox', -10, { value: true }));
    r.input.mouseDown(0);
    r.steps(73);
    r.input.mouseUp(0);
    r.step();
    r.seconds(1);
    expect(r.kinds('hit')).toEqual([expect.objectContaining({ charged: true, damage: 45, stunned: true, destroys: true })]);
  });

  it('the helper itself', () => {
    expect(stunFloorBoltDamage(true, false, 20)).toBe(0);
    expect(stunFloorBoltDamage(true, true, 45)).toBe(45);
    expect(stunFloorBoltDamage(false, false, 20)).toBe(20);
  });
});

describe('Ward', () => {
  it('costs 25, lasts 4 s, blocks damage events and reports the stagger', () => {
    const r = rig({ selected: 'ward', ctx: CALM });
    r.click(3);
    expect(r.kinds('ward_up')).toEqual([{ type: 'ward_up', seconds: 4 }]);
    expect(r.magic()).toBe(MAX_MAGIC - 25);
    expect(r.spells.wardActive).toBe(true);
    expect(r.spells.absorbDamage(12, 'enemy.briggs')).toBe(0);
    expect(r.kinds('ward_blocked')).toEqual([{ type: 'ward_blocked', amount: 12, sourceId: 'enemy.briggs', staggerS: 0.5 }]);
    r.seconds(3.8);
    expect(r.spells.wardActive).toBe(true);
    r.seconds(0.3);
    expect(r.spells.wardActive).toBe(false);
    expect(r.kinds('ward_down')).toHaveLength(1);
    expect(r.spells.absorbDamage(12)).toBe(12);
  });

  it('has a 6 s cooldown, needs magic, and does nothing for zero damage', () => {
    const r = rig({ selected: 'ward', ctx: CALM });
    r.click(3);
    r.seconds(4.5);
    r.click(3); // 4.6 s after the first: still cooling down
    expect(r.kinds('cast')).toHaveLength(1);
    expect(r.kinds('fizzle')).toEqual([{ type: 'fizzle', spell: 'ward', reason: 'cooldown' }]);
    r.seconds(1.5);
    r.click(3);
    expect(r.kinds('cast')).toHaveLength(2);
    expect(r.spells.absorbDamage(0)).toBe(0);

    const low = rig({ selected: 'ward', magic: 24 });
    low.click(3);
    expect(low.spells.wardActive).toBe(false);
    expect(low.kinds('fizzle')).toEqual([{ type: 'fizzle', spell: 'ward', reason: 'low_magic' }]);
  });

  it('works with a long press too (any release counts) and reset drops it', () => {
    const r = rig({ selected: 'ward' });
    r.click(30);
    expect(r.spells.wardActive).toBe(true);
    r.spells.reset();
    expect(r.spells.wardActive).toBe(false);
    expect(r.spells.cooldownLeft('ward')).toBe(0);
  });
});

describe('Purify', () => {
  function purifyRig(over: Partial<SpellTarget> = {}, z = -5, magic = MAX_MAGIC) {
    const r = rig({ selected: 'purify', magic, ctx: CALM });
    const stunned = { value: true };
    const t = { ...fakeEnemy('fox', z, stunned), ...over };
    r.spells.register(t);
    return { r, t, stunned };
  }

  it('channels 2.5 s on a stunned enemy, pays 30 at the start, then emits a purify hit', () => {
    const { r } = purifyRig();
    r.input.mouseDown(0);
    r.steps(18); // past the tap limit: the channel starts
    expect(r.kinds('purify_started')).toEqual([{ type: 'purify_started', targetId: 'fox', cost: 30 }]);
    expect(r.spells.channeling).toBe(true);
    expect(r.magic()).toBeCloseTo(MAX_MAGIC - 30 + 0, -1); // regen tops up some, never to full
    expect(r.magic()).toBeLessThan(MAX_MAGIC);
    r.seconds(2.3);
    expect(r.kinds('hit')).toHaveLength(0);
    expect(r.spells.view(r.input.state).channel).toBeGreaterThan(0.8);
    r.seconds(0.4);
    expect(r.kinds('hit')).toEqual([{ type: 'hit', targetId: 'fox', targetKind: 'enemy', spell: 'purify', charged: false, damage: 0, stunned: true, destroys: false }]);
    expect(r.spells.channeling).toBe(false);
    expect(r.spells.cooldownLeft('purify')).toBeGreaterThan(0.5);
  });

  it('does not start on a short tap, and the held button does not restart after a finish', () => {
    const { r } = purifyRig();
    r.click(6);
    expect(r.kinds('purify_started')).toHaveLength(0);
    r.input.mouseDown(0);
    r.seconds(3.2); // completes at about 2.7 s, the button stays down
    expect(r.kinds('hit')).toHaveLength(1);
    r.seconds(2);
    expect(r.kinds('purify_started')).toHaveLength(1);
    r.input.mouseUp(0);
    r.step();
    r.seconds(1.1); // cooldown over
    r.input.mouseDown(0);
    r.steps(18);
    expect(r.kinds('purify_started')).toHaveLength(2);
  });

  it('releasing early cancels the channel with no refund', () => {
    const { r } = purifyRig();
    r.input.mouseDown(0);
    r.seconds(1);
    const mid = r.magic();
    r.input.mouseUp(0);
    r.step();
    expect(r.kinds('purify_cancelled')).toEqual([{ type: 'purify_cancelled', targetId: 'fox', reason: 'released', refunded: 0 }]);
    expect(r.magic()).toBeCloseTo(mid + MAGIC_REGEN.calm * SIM_DT, 4);
    expect(r.kinds('hit')).toHaveLength(0);
    expect(r.spells.cooldownLeft('purify')).toBeGreaterThan(0.9);
  });

  it('leaving the 8 m range cancels it with a 50% refund (15)', () => {
    const { r, t } = purifyRig({}, -6);
    r.input.mouseDown(0);
    r.seconds(1);
    const before = r.magic();
    t.position.z = -30;
    r.step();
    expect(r.kinds('purify_cancelled')).toEqual([{ type: 'purify_cancelled', targetId: 'fox', reason: 'out_of_range', refunded: 15 }]);
    expect(r.magic()).toBeCloseTo(before + 15 + MAGIC_REGEN.calm * SIM_DT, 4);
    expect(r.kinds('hit')).toHaveLength(0);
  });

  it('does not start beyond 8 m, and does not need the beam to stay on target once started', () => {
    const far = purifyRig({}, -12);
    far.r.input.mouseDown(0);
    far.r.seconds(0.5);
    expect(far.r.kinds('purify_started')).toHaveLength(0);
    expect(far.r.magic()).toBe(MAX_MAGIC);

    const { r } = purifyRig();
    r.input.mouseDown(0);
    r.seconds(0.5);
    r.aim.yaw = 1; // look away: the channel stays (only range ends it)
    r.seconds(2.5);
    expect(r.kinds('hit')).toHaveLength(1);
  });

  it('fizzles on a hostile enemy at no cost with the hint', () => {
    const { r, stunned } = purifyRig();
    stunned.value = false;
    r.input.mouseDown(0);
    r.seconds(0.5);
    expect(r.kinds('fizzle')).toEqual([{ type: 'fizzle', spell: 'purify', reason: 'needs_weakening' }]);
    expect(r.magic()).toBe(MAX_MAGIC);
    expect(r.spells.view().hint).toBe('It must be weakened first.');
    expect(r.spells.channeling).toBe(false);
  });

  it('costs 0 on runes and anchors, and needs a valid target', () => {
    for (const kind of ['rune', 'anchor'] as const) {
      const { r } = purifyRig({ id: `${kind}.x`, kind, accepts: { bolt: 'none', purify: true }, purifyStatus: undefined, isStunned: undefined, boltDamage: undefined }, -4, 10);
      // Low magic would block an enemy; a rune/anchor still works.
      r.input.mouseDown(0);
      r.seconds(3);
      expect(r.kinds('purify_started')).toEqual([{ type: 'purify_started', targetId: `${kind}.x`, cost: 0 }]);
      expect(r.kinds('hit')).toEqual([expect.objectContaining({ targetKind: kind, spell: 'purify' })]);
    }
    const none = rig({ selected: 'purify' });
    none.input.mouseDown(0);
    none.seconds(1);
    expect(none.kinds('purify_started')).toHaveLength(0);
    expect(none.magic()).toBe(MAX_MAGIC);
    // An aimed target that does not accept Purify (a plain shell) is not a valid target.
    none.spells.register(target({ id: 'shell', kind: 'shell', accepts: { bolt: 'any', purify: false }, position: { x: 0, y: 1.65, z: -4 } }));
    none.seconds(1);
    expect(none.kinds('purify_started')).toHaveLength(0);
  });

  it('is refused at low magic (an enemy costs 30)', () => {
    const { r } = purifyRig({}, -5, 20);
    r.setCtx(FIGHT);
    r.input.mouseDown(0);
    r.seconds(0.5);
    expect(r.kinds('fizzle')).toEqual([{ type: 'fizzle', spell: 'purify', reason: 'low_magic' }]);
    expect(r.kinds('purify_started')).toHaveLength(0);
  });

  it('cancels with a full refund when the target stops being valid, and reset cancels', () => {
    const { r, stunned } = purifyRig();
    r.input.mouseDown(0);
    r.seconds(0.6);
    stunned.value = false;
    r.step();
    expect(r.kinds('purify_cancelled')).toEqual([{ type: 'purify_cancelled', targetId: 'fox', reason: 'invalid', refunded: 30 }]);

    const b = purifyRig();
    b.r.input.mouseDown(0);
    b.r.seconds(0.6);
    b.r.spells.reset();
    expect(b.r.spells.channeling).toBe(false);
    expect(b.r.kinds('purify_cancelled')).toEqual([expect.objectContaining({ reason: 'reset', refunded: 0 })]);
  });
});

describe('magic regen and store actions', () => {
  it('regenerates 6/s in combat, 12/s when calm, 15/s in the ritual, and clamps at 100', () => {
    for (const [ctx, rate] of [[FIGHT, 6], [CALM, 12], [{ hostileActive: true, ritualActive: true }, 15]] as const) {
      const r = rig({ magic: 10, ctx });
      r.seconds(1);
      expect(r.magic()).toBeCloseTo(10 + rate, 0);
      expect(r.spells.regenRate(ctx)).toBe(rate);
    }
    const full = rig({ magic: 99, ctx: CALM });
    full.seconds(2);
    expect(full.magic()).toBe(MAX_MAGIC);
  });

  it('spendMagic is all-or-nothing and gainMagic clamps', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    expect(store.getState().spendMagic(40)).toBe(true);
    expect(store.getState().player.magic).toBe(60);
    expect(store.getState().spendMagic(61)).toBe(false);
    expect(store.getState().player.magic).toBe(60);
    store.getState().gainMagic(500);
    expect(store.getState().player.magic).toBe(MAX_MAGIC);
    store.getState().gainMagic(-5);
    expect(store.getState().player.magic).toBe(MAX_MAGIC);
  });
});
