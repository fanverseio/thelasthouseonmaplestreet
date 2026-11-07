import { describe, expect, it } from 'vitest';
import { ENCOUNTER_BINDINGS } from '../content/encounters/index.ts';
import { createWorldRegistry } from '../content/world/index.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import { createGameStore } from '../store/game-store.ts';
import { createEncounterWorld } from './encounter-runtime.ts';
import { SIM_DT } from './player.ts';

const FOX = 'enemy.street.fox';

/** Elena just after Beat 3 (seq2_done), standing at the intersection, 15 m east of the fox. */
function setup(extraFlags: string[] = []) {
  const store = createGameStore();
  store.getState().startNewGame('classic');
  for (const f of ['locket_taken', 'angel_awake', 'home_done', 'seq1_done', 'seq2_done', 'spell_bolt', ...extraFlags]) {
    expect(store.getState().setFlag(f).ok, f).toBe(true);
  }
  const { world, encounters } = createEncounterWorld({ store });
  const pos = { x: 57, z: 29.5 };
  const flags = () => store.getState().progress.flags;
  const tick = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / SIM_DT); i++) world.tick(SIM_DT, { x: pos.x, z: pos.z });
  };
  /** Teleport (movement is the view's job; the runtime only reads the pose). */
  const goTo = (x: number, z: number) => {
    pos.x = x;
    pos.z = z;
    tick(SIM_DT * 2);
  };
  const press = () => world.interact({ x: pos.x, z: pos.z });
  return { store, world, encounters, flags, tick, goTo, press, morality: () => store.getState().progress.morality.value };
}

function engageAndStun(g: ReturnType<typeof setup>) {
  g.goTo(42, 29.5); // inside trg.street.fox (r 4): engages
  expect(g.encounters.view('street_fox')).toMatchObject({ engaged: true, hostile: true, state: 'idle' });
  expect(g.press()).toMatchObject({ status: 'done', id: FOX });
  expect(g.encounters.view('street_fox').state).toBe('weakened');
  g.tick(1.2);
  expect(g.encounters.view('street_fox')).toMatchObject({ state: 'stunned', canChoose: true, hostile: false });
}

describe('street fox content', () => {
  it('is a binding without sequence, startFlag or ward, on an existing, placed entity', () => {
    const b = ENCOUNTER_BINDINGS.find((x) => x.id === 'street_fox')!;
    expect(b.sequence).toBeUndefined();
    expect(b.startFlag).toBeUndefined();
    expect(b.telegraph).toBeUndefined();
    expect(b.weakenRequires).toBeUndefined();
    expect(b.leash).toBe(20);
    expect(createWorldRegistry().has(b.entity)).toBe(true);
    expect(PLACEMENTS[b.entity]).toBeDefined();
  });
});

describe('street fox: optional stub encounter', () => {
  it('does nothing before Beat 3 ends', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    const { world, encounters } = createEncounterWorld({ store });
    for (let i = 0; i < 30; i++) world.tick(SIM_DT, { x: 42, z: 29.5 });
    expect(encounters.view('street_fox').engaged).toBe(false);
  });

  it('destroy: stunned without a timer, +/-10 morality, enc_street_resolved', () => {
    const g = setup();
    engageAndStun(g);
    g.tick(60); // stun never times out
    expect(g.encounters.view('street_fox').state).toBe('stunned');
    expect(g.encounters.choose('street_fox', 'destroy')).toEqual({ ok: true });
    expect(g.flags()).toContain('enc_street_resolved');
    expect(g.morality()).toBe(-10);
    expect(g.encounters.view('street_fox')).toMatchObject({ state: 'resolved', outcome: 'destroy' });
    expect(g.encounters.active()).toBeNull();
    g.tick(0.1);
    expect(g.world.prompt).toBeNull(); // the fox prompt is gone
  });

  it('purify is refused until spell_purify; the fox stays stunned and harmless; then purify works', () => {
    const g = setup();
    const hp0 = g.store.getState().player.hp;
    engageAndStun(g);
    expect(g.encounters.choose('street_fox', 'purify')).toEqual({ ok: false, reason: 'purify_locked' });
    g.tick(5);
    expect(g.encounters.view('street_fox')).toMatchObject({ state: 'stunned', hostile: false });
    expect(g.store.getState().player.hp).toBe(hp0);
    expect(g.morality()).toBe(0);
    expect(g.flags()).not.toContain('enc_street_resolved');
    // Later: the spell arrives (Beat 4), the same stunned fox can be purified.
    for (const f of ['seq3_started', 'spell_ward', 'spell_purify']) expect(g.store.getState().setFlag(f).ok, f).toBe(true);
    expect(g.encounters.choose('street_fox', 'purify')).toEqual({ ok: true });
    expect(g.morality()).toBe(10);
    expect(g.flags()).toContain('enc_street_resolved');
    expect(g.encounters.view('street_fox').outcome).toBe('purify');
  });

  it('locket is combat_blocked while hostile and allowed once stunned', () => {
    const g = setup();
    expect(g.world.canOpenLocket()).toBe(true);
    g.goTo(42, 29.5);
    expect(g.encounters.hostileActive()).toBe(true);
    expect(g.world.canOpenLocket()).toBe(false);
    g.press();
    g.tick(1.2);
    expect(g.encounters.hostileActive()).toBe(false);
    expect(g.world.canOpenLocket()).toBe(true);
  });

  it('skip by walking away: a hostile fox resets at 20 m, nothing changes, and it can be re-engaged', () => {
    const g = setup();
    const before = [...g.flags()];
    g.goTo(42, 29.5);
    expect(g.encounters.view('street_fox').engaged).toBe(true);
    g.goTo(42 + 21, 29.5);
    expect(g.encounters.view('street_fox')).toMatchObject({ engaged: false, state: 'idle', hostile: false });
    expect(g.world.canOpenLocket()).toBe(true);
    g.goTo(42 + 19, 29.5); // still within sight, not engaged again by itself (the trigger fires once)
    expect(g.encounters.view('street_fox').engaged).toBe(false);
    g.tick(30);
    expect([...g.flags()]).toEqual(before);
    expect(g.morality()).toBe(0);
    // Walking back and pressing E re-engages it.
    g.goTo(42, 29.5);
    expect(g.press()).toMatchObject({ status: 'done', id: FOX });
    expect(g.encounters.view('street_fox').engaged).toBe(true);
  });

  it('a weakened fox also resets when the player leaves', () => {
    const g = setup();
    g.goTo(42, 29.5);
    g.press();
    g.goTo(80, 29.5);
    expect(g.encounters.view('street_fox')).toMatchObject({ engaged: false, state: 'idle' });
    g.tick(5);
    expect(g.encounters.view('street_fox').state).toBe('idle'); // the stun timer was dropped
  });

  it('a stunned fox stays stunned when left behind, is not offered at range, and can be finished later', () => {
    const g = setup();
    engageAndStun(g);
    g.goTo(80, 29.5);
    expect(g.encounters.view('street_fox').state).toBe('stunned');
    expect(g.encounters.active()).toBeNull();
    g.goTo(45, 29.5);
    expect(g.encounters.active()?.id).toBe('street_fox');
    expect(g.encounters.choose('street_fox', 'destroy').ok).toBe(true);
  });

  it('no softlock: the fox never blocks Beat 4, never damages, and death resets it', () => {
    const g = setup();
    const hp0 = g.store.getState().player.hp;
    g.goTo(42, 29.5);
    g.tick(30);
    expect(g.store.getState().player.hp).toBe(hp0);
    expect(g.world.sequences.active).toBeNull();
    g.goTo(57, 20); // heading for the garden: 17 m away, still hostile and harmless
    expect(g.world.canOpenLocket()).toBe(false);
    g.goTo(58, 12); // 24 m away: gave up
    expect(g.encounters.hostileActive()).toBe(false);
    expect(g.flags()).not.toContain('enc_street_resolved');
    g.goTo(42, 29.5);
    g.encounters.handleDeath();
    expect(g.encounters.view('street_fox')).toMatchObject({ engaged: false, state: 'idle' });
  });
});
