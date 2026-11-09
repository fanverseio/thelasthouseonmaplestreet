import { describe, expect, it } from 'vitest';
import { ENCOUNTER_BINDINGS } from '../content/encounters/index.ts';
import { FOX } from '../content/enemies/index.ts';
import { createWorldRegistry } from '../content/world/index.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import { createGameStore } from '../store/game-store.ts';
import { createEncounterWorld } from './encounter-runtime.ts';
import { SIM_DT } from './player.ts';
import { createFightRig, type FightRig } from './test-helpers.ts';

const FOX_ENTITY = 'enemy.street.fox';

/** Elena at the intersection right after Beat 3 (the real `garden` dev start: Bolt only), 15 m east of the fox. */
const setup = (keepAlive = false) => createFightRig('garden', { keepAlive });

/** Inside trg.street.fox (r 4): the fox wakes and comes for her. */
function engage(g: FightRig) {
  g.goTo(42, 29.5);
  expect(g.encounters.view('street_fox')).toMatchObject({ engaged: true, hostile: true, state: 'idle' });
}

describe('street fox content (5.6)', () => {
  it('is a binding on the FSM without sequence, startFlag or ward, on an existing, placed entity', () => {
    const b = ENCOUNTER_BINDINGS.find((x) => x.id === 'street_fox')!;
    expect(b.mode).toBe('fsm');
    expect(b.sequence).toBeUndefined();
    expect(b.startFlag).toBeUndefined();
    expect(b.telegraph).toBeUndefined();
    expect(b.weakenRequires).toBeUndefined();
    expect(b.leash).toBe(15); // Q3: the garden gate (about 19.4 m away) is out of range
    expect(FOX.leashRadius).toBe(15); // the FSM enemy gives up at the same 15 m
    expect(createWorldRegistry().has(b.entity)).toBe(true);
    expect(PLACEMENTS[b.entity]).toBeDefined();
  });
});

describe('street fox: optional FSM encounter', () => {
  it('does nothing before Beat 3 ends: no enemy is even spawned', () => {
    const g = createFightRig('street'); // the street start stops before seq2_done
    g.goTo(42, 29.5);
    g.tick(2);
    expect(g.encounters.view('street_fox').engaged).toBe(false);
    expect(g.encounters.fsmEnemy('street_fox')).toBeUndefined();
    expect(g.enemies.all()).toHaveLength(0);
    expect(g.hp()).toBe(100);
  });

  it('is dormant after Beat 3 until Elena engages it (it does not chase from 15 m)', () => {
    const g = setup();
    g.tick(3);
    const e = g.encounters.fsmEnemy('street_fox')!;
    expect(e).toBeDefined();
    expect([e.x, e.z]).toEqual([42, 31]);
    expect(e.held).toBe(true);
    expect(g.encounters.view('street_fox').engaged).toBe(false);
    expect(g.enemies.hostileActive()).toBe(false);
  });

  it('destroy: bolts to the stun (no timer), then a charged Bolt: -10, enc_street_resolved', () => {
    const g = setup(true);
    engage(g);
    expect(g.world.spoken).toContain('vo_angel_fox_c1');
    g.fight.stun('street_fox');
    expect(g.encounters.view('street_fox')).toMatchObject({ state: 'stunned', canChoose: true, hostile: false });
    g.tick(60); // the stun never times out
    expect(g.encounters.view('street_fox').state).toBe('stunned');
    expect(g.morality()).toBe(0);
    g.fight.charged('street_fox');
    expect(g.flags()).toContain('enc_street_resolved');
    expect(g.morality()).toBe(-10);
    expect(g.encounters.view('street_fox')).toMatchObject({ state: 'resolved', outcome: 'destroy' });
    expect(g.encounters.active()).toBeNull();
    g.tick(0.1);
    expect(g.world.prompt).toBeNull(); // the fox prompt is gone
  });

  it('a stunned fox without Purify taught stays stunned and harmless, can be destroyed later, or purified once taught', () => {
    const g = setup(true);
    engage(g);
    g.fight.stun('street_fox');
    g.store.setState((s) => ({ player: { ...s.player, hp: 70 } }));
    expect(() => g.fight.purify('street_fox')).toThrow(/not unlocked/); // Purify is not taught yet
    expect(g.encounters.choose('street_fox', 'purify')).toEqual({ ok: false, reason: 'purify_locked' }); // the keyboard fallback
    g.tick(5);
    expect(g.encounters.view('street_fox')).toMatchObject({ state: 'stunned', hostile: false, canPurify: false });
    expect(g.hp()).toBeGreaterThanOrEqual(70); // harmless (HP only regenerates)
    expect(g.morality()).toBe(0);
    expect(g.flags()).not.toContain('enc_street_resolved');
    // Later: the spell arrives (Beat 4), the same stunned fox can be purified for real.
    for (const f of ['seq3_started', 'spell_ward', 'spell_purify']) expect(g.store.getState().setFlag(f).ok, f).toBe(true);
    expect(g.encounters.view('street_fox').canPurify).toBe(true);
    g.fight.purify('street_fox');
    expect(g.morality()).toBe(10);
    expect(g.flags()).toContain('enc_street_resolved');
    expect(g.encounters.view('street_fox').outcome).toBe('purify');
  });

  it('plays the fox lines (Q25) and hides Purify until spell_purify', () => {
    const g = setup(true);
    engage(g);
    expect(g.world.spoken).toContain('vo_angel_fox_c1'); // engage
    g.fight.stun('street_fox');
    expect(g.encounters.view('street_fox')).toMatchObject({ canChoose: true, canPurify: false, fsm: true });
    expect(g.world.spoken).toContain('vo_elena_fox_01'); // stunned, Purify not taught
    expect(g.world.spoken).not.toContain('vo_angel_fox_c2');
    expect(g.encounters.choose('street_fox', 'purify')).toEqual({ ok: false, reason: 'purify_locked' });
    expect(g.world.spoken).toContain('vo_angel_fox_c2'); // purify-refused
    g.encounters.choose('street_fox', 'purify');
    expect(g.world.spoken.filter((l) => l === 'vo_angel_fox_c2')).toHaveLength(1);
  });

  it('locket is combat_blocked while the fox hunts and allowed once it is stunned', () => {
    const g = setup(true);
    expect(g.world.canOpenLocket()).toBe(true);
    engage(g);
    g.tick(0.5);
    expect(g.encounters.hostileActive()).toBe(true);
    expect(g.world.canOpenLocket()).toBe(false);
    g.fight.stun('street_fox');
    expect(g.encounters.hostileActive()).toBe(false);
    expect(g.world.canOpenLocket()).toBe(true);
  });

  it('the fox is a real threat: it bites (8) and Elena can sprint away', () => {
    const g = setup();
    g.goTo(42, 29.5);
    g.tick(3);
    expect(g.hp()).toBeLessThan(100);
    expect(g.events.some((e) => e.type === 'attack' && e.ability === 'bite' && e.damage === 8)).toBe(true);
  });

  it('skip by walking away: at 15 m the fox gives up and goes home, nothing changes, and it can be re-engaged', () => {
    const g = setup(true);
    const before = [...g.flags()];
    engage(g);
    g.goTo(42 + 16, 29.5);
    g.tick(8); // it walks home and heals
    expect(g.encounters.view('street_fox')).toMatchObject({ engaged: false, state: 'idle', hostile: false });
    const e = g.encounters.fsmEnemy('street_fox')!;
    expect([e.x, e.z]).toEqual([42, 31]);
    expect(e.hp).toBe(60);
    expect(e.held).toBe(true);
    expect(g.world.canOpenLocket()).toBe(true);
    g.goTo(42 + 14, 29.5); // still within sight: not engaged again by itself (the trigger fires once)
    g.tick(5);
    expect(g.encounters.view('street_fox').engaged).toBe(false);
    expect([...g.flags()]).toEqual(before);
    expect(g.morality()).toBe(0);
    // Walking back and pressing E re-engages it.
    g.goTo(42, 29.5);
    expect(g.press()).toMatchObject({ status: 'done', id: FOX_ENTITY });
    expect(g.encounters.view('street_fox').engaged).toBe(true);
  });

  it('a damaged fox heals on its way home (no progress is kept from a skipped fight)', () => {
    const g = setup(true);
    engage(g);
    g.fight.tap('street_fox');
    g.fight.tap('street_fox');
    const e = g.encounters.fsmEnemy('street_fox')!;
    expect(e.hp).toBeLessThan(60);
    g.goTo(80, 29.5);
    g.tick(10);
    expect(e.hp).toBe(60);
    expect(g.encounters.view('street_fox')).toMatchObject({ engaged: false, state: 'idle' });
  });

  it('a stunned fox stays stunned when left behind, is not offered at range, and can be finished later', () => {
    const g = setup(true);
    engage(g);
    g.fight.stun('street_fox');
    g.goTo(80, 29.5);
    g.tick(5);
    expect(g.encounters.view('street_fox').state).toBe('stunned');
    expect(g.encounters.active()).toBeNull();
    g.goTo(45, 29.5);
    expect(g.encounters.active()?.id).toBe('street_fox');
    g.fight.charged('street_fox');
    expect(g.encounters.view('street_fox').state).toBe('resolved');
  });

  it('no softlock: the fox never blocks Beat 4, and death resets an unstunned one', () => {
    const g = setup(true);
    g.goTo(42, 29.5);
    g.tick(10);
    expect(g.world.sequences.active).toBeNull();
    g.goTo(57, 20); // heading for the garden: 17 m from the fox's spawn, past the 15 m leash: it gives up (Q3)
    g.tick(8);
    expect(g.encounters.hostileActive()).toBe(false);
    expect(g.world.canOpenLocket()).toBe(true);
    g.goTo(58, 12); // 24 m away: still gone
    expect(g.encounters.hostileActive()).toBe(false);
    expect(g.flags()).not.toContain('enc_street_resolved');
    g.goTo(42, 29.5);
    g.tick(1);
    g.encounters.handleDeath();
    expect(g.encounters.view('street_fox')).toMatchObject({ engaged: false, state: 'idle' });
    expect(g.encounters.fsmEnemy('street_fox')!.hp).toBe(60);
  });

  it('death keeps a stunned fox stunned (the stun is persistent)', () => {
    const g = setup(true);
    engage(g);
    g.fight.stun('street_fox');
    g.encounters.handleDeath();
    expect(g.encounters.view('street_fox').state).toBe('stunned');
    g.goTo(42, 29.5);
    expect(g.encounters.view('street_fox').state).toBe('stunned');
    expect(g.press()).toMatchObject({ status: 'done', id: FOX_ENTITY }); // the trigger fires once; E offers it again
    expect(g.encounters.view('street_fox')).toMatchObject({ state: 'stunned', canChoose: true });
  });

  it('the stub fallback still exists: without an enemy system the same binding runs on the stub', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    for (const f of ['locket_taken', 'angel_awake', 'home_done', 'seq1_done', 'seq2_done', 'spell_bolt']) store.getState().setFlag(f);
    const { world, encounters } = createEncounterWorld({ store });
    for (let i = 0; i < 30; i++) world.tick(SIM_DT, { x: 42, z: 29.5 });
    expect(encounters.view('street_fox')).toMatchObject({ engaged: true, fsm: false, canWeaken: true });
  });
});
