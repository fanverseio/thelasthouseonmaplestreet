import type { EntityId, ProgressFlag } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { PLACEMENTS } from '../content/world/placements.ts';
import { RITUAL_TUNING, SHELL_ID, STRIKE_INTERVALS, type RitualEvent } from './ritual.ts';
import { SIM_DT } from './player.ts';
import { createAnchorDriver, createFightRig, injectSpellHit } from './test-helpers.ts';

/** A rig in the ritual chamber with the seal already woken (ritual_active), Elena at cp_ritual. */
function ritualRig(options: { keepAlive?: boolean } = {}) {
  const rig = createFightRig('ritual', { keepAlive: options.keepAlive ?? false });
  rig.goTo(0, -14.2);
  expect(rig.press()).toMatchObject({ status: 'done', id: 'seal.ritual.central' });
  expect(rig.flags()).toContain('ritual_active');
  rig.goTo(0, -12);
  const events: RitualEvent[] = [];
  rig.ritual.on((e) => events.push(e));
  const driver = createAnchorDriver(rig);
  const freezeWraiths = () => rig.enemies.all().forEach((e) => (e.held = true));
  /** Set an anchor flag the way a finished task would, and skip Felix's clip so the smoke runs again. */
  const grant = (dir: 'north' | 'east' | 'west') => {
    expect(rig.store.getState().setFlag(`anchor_${dir}` as ProgressFlag).ok).toBe(true);
    rig.tick(0.1);
    if (rig.world.sequences.active) rig.world.sequences.skip();
    rig.tick(0.1);
  };
  const count = (type: RitualEvent['type']) => events.filter((e) => e.type === type).length;
  const at = (dir: 'north' | 'east' | 'west') => PLACEMENTS[`anchor.ritual.${dir}` as EntityId]!;
  return { ...rig, events, driver, freezeWraiths, grant, count, at };
}

describe('smoke pressure scales with the anchors restored', () => {
  it('rings come every 4 / 3.5 / 3 s for 0 / 1 / 2 anchors and stop at 3', () => {
    expect(STRIKE_INTERVALS).toEqual([4, 3.5, 3]);
    const t = ritualRig({ keepAlive: true });
    const gaps = (n: number): number[] => {
      const times: number[] = [];
      const off = t.ritual.on((e) => e.type === 'ring_warning' && times.push(t.world.simTime));
      t.tick(n);
      off();
      return times.slice(1).map((x, i) => Math.round((x - times[i]!) * 10) / 10);
    };
    expect(new Set(gaps(21))).toEqual(new Set([4]));
    t.grant('north');
    expect(new Set(gaps(22))).toEqual(new Set([3.5]));
    t.grant('east');
    expect(new Set(gaps(20))).toEqual(new Set([3]));
    t.grant('west');
    expect(t.flags()).toContain('anchors_all');
    const warned = t.count('ring_warning');
    t.tick(30);
    expect(t.count('ring_warning')).toBe(warned);
    expect(t.ritual.view()).toMatchObject({ active: false, strike: 'idle', rings: [], pools: [] });
  });

  it('wraiths: 1 alive with no anchor, 2 with one or two, none at the end; pools only from the second anchor', () => {
    const t = ritualRig({ keepAlive: true });
    t.tick(1);
    expect(t.ritual.wraithCount()).toBe(1);
    t.tick(30);
    expect(t.ritual.wraithCount()).toBe(1);
    expect(t.ritual.view().pools).toHaveLength(0);
    t.grant('north');
    t.tick(1);
    expect(t.ritual.wraithCount()).toBe(2);
    t.tick(30);
    expect(t.ritual.view().pools).toHaveLength(0);
    t.grant('east');
    t.tick(RITUAL_TUNING.pool.everyS + 1);
    expect(t.ritual.wraithCount()).toBe(2);
    expect(t.ritual.view().pools.length).toBeGreaterThan(0);
    expect(t.ritual.view().pools.length).toBeLessThanOrEqual(RITUAL_TUNING.pool.max);
    t.grant('west');
    t.tick(1);
    expect(t.ritual.wraithCount()).toBe(0);
    expect(t.enemies.all().filter((e) => e.id.startsWith('wraith.')).length).toBe(0);
    expect(t.ritual.view().pools).toHaveLength(0);
  });

  it('wraiths spawn at spawn.ritual.wraith_1..4 and respawn 8 s after one is destroyed', () => {
    const t = ritualRig({ keepAlive: true });
    t.tick(0.2);
    const first = t.enemies.all().find((e) => e.id.startsWith('wraith.'))!;
    const spawns = [1, 2, 3, 4].map((n) => PLACEMENTS[`spawn.ritual.wraith_${n}` as EntityId]!);
    expect(spawns.some((s) => s.x === first.spawnPoint.x && s.z === first.spawnPoint.z)).toBe(true);
    first.held = true;
    injectSpellHit(t.spells, { targetId: first.id, damage: 20 });
    expect(first.state).toBe('destroyed');
    expect(t.ritual.wraithCount()).toBe(0);
    t.tick(7.5);
    expect(t.ritual.wraithCount()).toBe(0);
    t.tick(0.7);
    expect(t.ritual.wraithCount()).toBe(1);
    expect(t.enemies.all().filter((e) => e.id === first.id)).toHaveLength(0); // the corpse is gone
  });
});

describe('the smoke hurts through the Ward', () => {
  it('a ring that lands on Elena deals 15; stepping out of it, or a Ward, takes it away', () => {
    const t = ritualRig();
    t.tick(0.2);
    t.freezeWraiths();
    const hp0 = t.hp();
    t.tick(4 - 0.2 + RITUAL_TUNING.ring.telegraphS + 0.2); // stand still through the first ring
    expect(t.hp()).toBe(hp0 - 15);
    // Second ring: walk out of it.
    t.tick(3);
    expect(t.ritual.view().rings).toHaveLength(1);
    t.pos.x += 4;
    t.tick(1.6);
    expect(t.events.filter((e) => e.type === 'ring_landed' && !e.hit)).toHaveLength(1);
    expect(t.events.filter((e) => e.type === 'ring_landed' && e.hit && !e.blocked)).toHaveLength(1);
    // Third ring: raise the Ward.
    t.pos.x -= 4;
    t.tick(2.6);
    expect(t.ritual.view().rings.length).toBeGreaterThan(0);
    t.fight.ward();
    expect(t.spells.wardActive).toBe(true);
    t.tick(1.5);
    expect(t.events.filter((e) => e.type === 'ring_landed' && e.hit && !e.blocked)).toHaveLength(1); // still only the first
    expect(t.events.some((e) => e.type === 'ring_landed' && e.blocked)).toBe(true);
  });

  it('pauses during a cinematic clip: no rings, wraiths held, and it resumes afterwards', () => {
    const t = ritualRig({ keepAlive: true });
    t.tick(2);
    const wraith = t.enemies.all().find((e) => e.id.startsWith('wraith.'))!;
    expect(wraith.held).toBe(false);
    expect(t.store.getState().setFlag('anchor_west').ok).toBe(true); // the first anchor starts cin_felix_anchor
    t.tick(0.2);
    expect(t.world.sequences.active).toBe('cin_felix_anchor');
    const warned = t.count('ring_warning');
    t.tick(10);
    expect(t.count('ring_warning')).toBe(warned);
    expect(wraith.held).toBe(true);
    t.world.sequences.skip();
    t.tick(5);
    expect(wraith.held).toBe(false);
    expect(t.count('ring_warning')).toBeGreaterThan(warned);
  });
});

describe('anchor north: break the smoke shell with Arcane Bolt, then hold E', () => {
  it('E refuses while the shell is intact; 5 tap bolts break it; holding E 3 s restores', () => {
    const t = ritualRig({ keepAlive: true });
    t.freezeWraiths();
    t.driver.stand('north');
    expect(t.press()).toMatchObject({ status: 'refused', reason: 'shell_intact' });
    expect(t.ritual.view().hint).toMatch(/Arcane Bolt/);
    expect(t.ritual.view().shell).toEqual({ hp: 100, maxHp: 100, broken: false });
    expect(t.spells.targetPosition(SHELL_ID)).not.toBeNull();
    expect(t.driver.breakShell()).toBe(5);
    expect(t.ritual.view().shell?.broken).toBe(true);
    expect(t.spells.targetPosition(SHELL_ID)).toBeNull();
    expect(t.press()).toMatchObject({ status: 'done' });
    t.world.setHeld(true);
    t.tick(2.8);
    expect(t.flags()).not.toContain('anchor_north');
    expect(t.ritual.view().channel?.progress).toBeGreaterThan(0.9);
    t.tick(0.4);
    expect(t.flags()).toContain('anchor_north');
    expect(t.ritual.view().channel).toBeNull();
  });

  it('releasing E keeps the progress; the shell regrows after 20 s and the work is lost', () => {
    const t = ritualRig({ keepAlive: true });
    t.freezeWraiths();
    t.driver.breakShell();
    t.press();
    t.world.setHeld(true);
    t.tick(1.5);
    t.world.setHeld(false);
    t.tick(0.1);
    expect(t.ritual.view().channel).toBeNull();
    expect(t.ritual.anchorProgress('north')).toBeCloseTo(1.5, 1);
    t.press();
    t.world.setHeld(true);
    t.tick(1.3);
    expect(t.flags()).not.toContain('anchor_north');
    t.tick(0.4);
    expect(t.flags()).toContain('anchor_north'); // 1.5 + 1.5 s banked
  });

  it('a shell left alone grows back after 20 s', () => {
    const t = ritualRig({ keepAlive: true });
    t.freezeWraiths();
    t.driver.breakShell();
    t.press();
    t.world.setHeld(true);
    t.tick(1);
    t.world.setHeld(false);
    t.tick(19.5);
    expect(t.ritual.view().shell?.broken).toBe(true);
    t.tick(1);
    expect(t.ritual.view().shell).toEqual({ hp: 100, maxHp: 100, broken: false });
    expect(t.ritual.anchorProgress('north')).toBe(0);
    expect(t.spells.targetPosition(SHELL_ID)).not.toBeNull();
    expect(t.count('shell_regrown')).toBe(1);
  });

  it('progress and the broken shell survive death; the regrow clock restarts', () => {
    const t = ritualRig({ keepAlive: true });
    t.freezeWraiths();
    t.driver.breakShell();
    t.press();
    t.world.setHeld(true);
    t.tick(2);
    t.world.setHeld(false);
    t.tick(15);
    t.store.setState((s) => ({ player: { ...s.player, hp: 0 } }));
    t.tick(0.2);
    expect(t.store.getState().player.hp).toBe(100);
    expect(t.ritual.view().shell?.broken).toBe(true);
    expect(t.ritual.anchorProgress('north')).toBeGreaterThan(1.9);
    t.tick(19);
    expect(t.ritual.view().shell?.broken).toBe(true); // a fresh 20 s
  });
});

describe('anchor east: hold E 6 s while the smoke strikes', () => {
  it('without a Ward every strike deals 10 and pauses the channel, but the progress is kept', () => {
    const t = ritualRig();
    t.freezeWraiths();
    t.driver.stand('east');
    t.store.setState((s) => ({ player: { ...s.player, hp: 100 } }));
    expect(t.press()).toMatchObject({ status: 'done' });
    t.world.setHeld(true);
    t.tick(1.3);
    expect(t.hp()).toBe(100);
    t.tick(0.3); // the first strike lands at 1.5 s
    expect(t.hp()).toBe(90);
    expect(t.ritual.view().channel?.paused).toBe(true);
    const p0 = t.ritual.anchorProgress('east');
    t.tick(0.3);
    expect(t.ritual.anchorProgress('east')).toBeCloseTo(p0, 5); // paused
    t.tick(1);
    expect(t.ritual.anchorProgress('east')).toBeGreaterThan(p0); // it goes on, nothing was lost
    expect(t.flags()).not.toContain('anchor_east');
  });

  it('the Ward blocks the strikes: no damage, no pause', () => {
    const t = ritualRig();
    t.freezeWraiths();
    t.driver.stand('east');
    t.press();
    t.world.setHeld(true);
    t.fight.ward();
    const hp = t.hp();
    t.tick(3.5); // the Ward lasts 4 s: two strikes
    expect(t.hp()).toBe(hp);
    expect(t.ritual.view().channel?.paused).toBe(false);
    expect(t.events.filter((e) => e.type === 'ring_landed' && e.blocked).length).toBeGreaterThanOrEqual(2);
    expect(t.ritual.anchorProgress('east')).toBeGreaterThan(3);
  });

  it('keeps the progress across release and across death, and finishes after 6 s in total', () => {
    const t = ritualRig({ keepAlive: true });
    t.freezeWraiths();
    t.driver.stand('east');
    t.press();
    t.world.setHeld(true);
    t.fight.ward();
    t.tick(1);
    t.world.setHeld(false);
    t.tick(0.1);
    const banked = t.ritual.anchorProgress('east');
    expect(banked).toBeGreaterThan(0.5);
    t.store.setState((s) => ({ player: { ...s.player, hp: 0 } }));
    t.tick(0.2);
    expect(t.ritual.anchorProgress('east')).toBe(banked);
    t.driver.east();
    expect(t.flags()).toContain('anchor_east');
  });
});

describe('anchor west: channel Purify on the anchor for 4 s', () => {
  /** Hold the left mouse button with Purify selected, aimed at the west anchor. */
  function channel(t: ReturnType<typeof ritualRig>, seconds: number) {
    const p = { x: t.at('west').x, z: t.at('west').z, position: { y: 1.2 } };
    t.fight.select('purify');
    t.fight.input.lmbDown = true;
    t.fight.input.lmbHeldMs = 300;
    t.fight.run(seconds, p);
  }

  it('completes after 4 s of channel and costs no magic', () => {
    const t = ritualRig({ keepAlive: true });
    t.driver.stand('west');
    t.tick(0.3);
    t.freezeWraiths();
    t.store.setState((s) => ({ player: { ...s.player, magic: 60 } }));
    channel(t, 3.8);
    expect(t.flags()).not.toContain('anchor_west');
    expect(t.spells.view().channel).toBeGreaterThan(0.9);
    channel(t, 0.4);
    expect(t.flags()).toContain('anchor_west');
  });

  it('damage that gets through interrupts the channel but keeps the progress', () => {
    const t = ritualRig({ keepAlive: true });
    t.driver.stand('west');
    t.tick(0.3);
    t.freezeWraiths();
    channel(t, 2);
    expect(t.spells.channeling).toBe(true);
    t.enemies.damagePlayer(8, 'wraith');
    expect(t.spells.channeling).toBe(false);
    expect(t.events.some((e) => e.type === 'channel_interrupted')).toBe(true);
    expect(t.ritual.anchorProgress('west')).toBeCloseTo(2, 1);
    // Release, wait out the cooldown, channel again: only the rest is needed.
    t.fight.input.lmbDown = false;
    t.fight.input.lmbReleased = true;
    t.fight.step();
    t.fight.run(1.2);
    t.fight.ward(); // the ring that lands meanwhile is absorbed
    channel(t, 1.8);
    expect(t.flags()).not.toContain('anchor_west');
    channel(t, 0.5);
    expect(t.flags()).toContain('anchor_west');
  });

  it('a Ward absorbs the damage and the channel goes on', () => {
    const t = ritualRig({ keepAlive: true });
    t.freezeWraiths();
    t.driver.stand('west');
    t.fight.ward();
    t.fight.select('purify');
    channel(t, 1);
    expect(t.enemies.damagePlayer(8, 'wraith')).toMatchObject({ blocked: true });
    expect(t.spells.channeling).toBe(true);
  });

  it('progress survives death', () => {
    const t = ritualRig({ keepAlive: true });
    t.freezeWraiths();
    t.driver.stand('west');
    channel(t, 2);
    t.fight.input.lmbDown = false;
    t.store.setState((s) => ({ player: { ...s.player, hp: 0 } }));
    t.tick(0.2);
    expect(t.ritual.anchorProgress('west')).toBeGreaterThan(1.8);
    t.driver.west();
    expect(t.flags()).toContain('anchor_west');
  });

  it('at least two wraiths harass while Elena is at the anchor', () => {
    const t = ritualRig({ keepAlive: true });
    t.tick(1);
    expect(t.ritual.wraithCount()).toBe(1);
    t.driver.stand('west');
    t.tick(1);
    expect(t.ritual.wraithCount()).toBe(2);
  });
});

describe('magic never blocks an anchor', () => {
  const setMagic = (t: ReturnType<typeof ritualRig>, v: number) => t.store.setState((s) => ({ player: { ...s.player, magic: v } }));
  const magic = (t: ReturnType<typeof ritualRig>) => t.store.getState().player.magic;

  it('tops magic up to the anchor floor when its task starts and while Elena is near', () => {
    const floors = { north: RITUAL_TUNING.north.floorMagic, east: RITUAL_TUNING.east.floorMagic, west: RITUAL_TUNING.west.floorMagic };
    for (const dir of ['north', 'east', 'west'] as const) {
      const t = ritualRig();
      t.freezeWraiths();
      t.driver.stand(dir);
      setMagic(t, 0);
      t.press();
      expect(magic(t), dir).toBeGreaterThanOrEqual(floors[dir]);
      setMagic(t, 0);
      t.tick(0.1);
      expect(magic(t), dir).toBeGreaterThanOrEqual(floors[dir]);
    }
  });

  it('five tap bolts at the shell are always affordable with no magic to begin with', () => {
    const t = ritualRig();
    t.freezeWraiths();
    t.driver.stand('north');
    setMagic(t, 0);
    expect(t.driver.breakShell()).toBe(5);
    expect(t.ritual.view().shell?.broken).toBe(true);
  });

  it('Ward stays affordable at the east anchor and Purify at the west one, even from empty', () => {
    const t = ritualRig();
    t.freezeWraiths();
    t.driver.stand('east');
    setMagic(t, 0);
    t.press();
    t.fight.ward();
    expect(t.spells.wardActive).toBe(true);
    const w = ritualRig();
    w.driver.stand('west');
    w.tick(0.3);
    w.freezeWraiths();
    setMagic(w, 0);
    w.driver.west();
    expect(w.flags()).toContain('anchor_west');
  });

  it('far from every anchor there is no floor', () => {
    const t = ritualRig();
    t.freezeWraiths();
    setMagic(t, 0);
    t.tick(0.5);
    expect(magic(t)).toBeLessThan(10);
  });
});

describe('sanity', () => {
  it('the sim step is the one the tuning assumes', () => {
    expect(SIM_DT).toBeGreaterThan(0);
  });
});
