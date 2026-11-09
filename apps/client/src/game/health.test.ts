import { describe, expect, it } from 'vitest';
import { createGameStore } from '../store/game-store.ts';
import { HP_REGEN, HpRegen, MAX_HP } from './health.ts';
import { SIM_DT } from './player.ts';
import { createFightRig } from './test-helpers.ts';

function rig(start = 50) {
  const store = createGameStore();
  store.getState().startNewGame('classic');
  store.setState((s) => ({ player: { ...s.player, hp: start } }));
  const regen = new HpRegen(store);
  const run = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / SIM_DT); i++) regen.step(SIM_DT);
  };
  const hit = (amount: number) => store.setState((s) => ({ player: { ...s.player, hp: s.player.hp - amount } }));
  const hp = () => store.getState().player.hp;
  return { store, regen, run, hit, hp };
}

describe('Elena HP regeneration (combat-tuning section 1)', () => {
  it('config: 5 HP/s after 6 s without damage', () => {
    expect(HP_REGEN).toEqual({ delayS: 6, perSecond: 5 });
    expect(MAX_HP).toBe(100);
  });

  it('none for the first 6 s', () => {
    const r = rig(50);
    r.run(5.9);
    expect(r.hp()).toBe(50);
  });

  it('then 5 HP per second', () => {
    const r = rig(50);
    r.run(6 + 4);
    expect(r.hp()).toBeCloseTo(50 + 4 * 5, 0);
    expect(r.hp()).toBeGreaterThan(65);
    expect(r.hp()).toBeLessThan(75);
  });

  it('taking damage restarts the 6 s clock', () => {
    const r = rig(50);
    r.run(8); // regenerating
    const before = r.hp();
    expect(before).toBeGreaterThan(50);
    r.hit(10);
    const after = r.hp();
    r.run(5.9);
    expect(r.hp()).toBe(after);
    r.run(2);
    expect(r.hp()).toBeGreaterThan(after);
  });

  it('never beyond the maximum', () => {
    const r = rig(95);
    r.run(30);
    expect(r.hp()).toBe(MAX_HP);
  });

  it('a dead Elena (HP 0) does not regenerate', () => {
    const r = rig(0);
    r.run(30);
    expect(r.hp()).toBe(0);
  });

  it('a respawn (HP back to full) is not damage, and reset() restarts the clock', () => {
    const r = rig(40);
    r.run(3);
    r.store.setState((s) => ({ player: { ...s.player, hp: 100 } }));
    r.hit(10);
    r.regen.reset();
    r.run(5.9);
    expect(r.hp()).toBe(90);
    r.run(1);
    expect(r.hp()).toBeGreaterThan(90);
  });
});

describe('HP regeneration in the world', () => {
  it('runs from the encounter runtime tick: damage, 6 s of quiet, then it climbs', () => {
    const r = createFightRig('garden');
    r.store.setState((s) => ({ player: { ...s.player, hp: 60 } }));
    r.tick(5.5);
    expect(r.hp()).toBe(60);
    r.tick(3);
    expect(r.hp()).toBeGreaterThan(60);
    expect(r.hp()).toBeLessThan(80);
  });
});
