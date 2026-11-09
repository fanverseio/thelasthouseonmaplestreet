import { describe, expect, it } from 'vitest';
import { CAT, HOUND } from '../content/enemies/index.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import { SPELL_CONFIG } from './spells.ts';
import { createFightRig, injectSpellHit, type FightRig } from './test-helpers.ts';

const H1 = 'enemy.grounds.hound_1';
const H2 = 'enemy.grounds.hound_2';

/** The lane start (spells all taught, lane open), then through the grounds gate: both hounds wake (5.9). */
function atGrounds(keepAlive = true) {
  const r = createFightRig('lane', { keepAlive });
  r.goTo(-57, 21);
  return r;
}

describe('the two hounds on the FSM (5.9)', () => {
  it('are dormant on the lane and wake together at the grounds gate; they bite', () => {
    const r = createFightRig('lane', { keepAlive: false });
    r.tick(3);
    for (const id of ['hound_1', 'hound_2'] as const) {
      const e = r.encounters.fsmEnemy(id)!;
      expect(e.held, id).toBe(true);
      expect([e.x, e.z]).toEqual([e.spawnPoint.x, e.spawnPoint.z]);
    }
    r.goTo(-57, 21);
    expect(r.encounters.view('hound_1')).toMatchObject({ engaged: true, hostile: true });
    expect(r.encounters.view('hound_2')).toMatchObject({ engaged: true, hostile: true });
    r.tick(4);
    expect(r.hp()).toBeLessThan(100);
    expect(r.events.some((e) => e.type === 'attack' && e.ability === 'bite' && e.damage === 10)).toBe(true);
  });

  it('enc_approach_resolved only after BOTH are resolved; morality +/-10 each, nothing else changes', () => {
    const r = atGrounds();
    const before = [...r.flags()];
    r.fight.defeat('hound_1', 'destroy');
    expect(r.flags()).not.toContain('enc_approach_resolved');
    expect(r.store.getState().progress.morality.value).toBe(-10);
    r.fight.defeat('hound_2', 'purify');
    expect(r.flags()).toContain('enc_approach_resolved');
    expect(r.store.getState().progress.morality.value).toBe(0);
    expect(r.flags().filter((f) => !before.includes(f))).toEqual(['enc_approach_resolved']);
    expect(r.store.getState().progress.morality.history.map((h) => h.delta)).toEqual([-10, 10]);
  });

  it('a hound stunned beside a still-hostile sibling is offered first, and stays stunned and harmless', () => {
    const r = atGrounds();
    r.fight.stun('hound_1');
    expect(r.encounters.active()?.id).toBe('hound_1');
    expect(r.encounters.view('hound_1')).toMatchObject({ canChoose: true, fsm: true });
    expect(r.encounters.view('hound_2').hostile).toBe(true);
    r.tick(20);
    expect(r.encounters.fsmEnemy('hound_1')!.state).toBe('stunned');
  });

  it('a Bolt from far outside the approach range engages a dormant hound', () => {
    const r = createFightRig('lane');
    r.pos.x = -58;
    r.pos.z = 0; // 24 m south: no approach, no trigger
    r.tick(0.1);
    expect(r.encounters.view('hound_1').engaged).toBe(false);
    r.fight.tap('hound_1');
    r.fight.run(1); // the bolt flies 30 m/s: 24 m takes 0.8 s
    expect(r.encounters.view('hound_1').engaged).toBe(true);
  });

  it('is never unwinnable: leaving the 20 m leash resets both, coming back wakes them again', () => {
    const r = atGrounds();
    r.fight.tap('hound_1');
    r.goTo(-58, -20); // 44 m away
    r.tick(12);
    for (const id of ['hound_1', 'hound_2'] as const) {
      expect(r.encounters.view(id), id).toMatchObject({ engaged: false, state: 'idle' });
      expect(r.encounters.fsmEnemy(id)!.hp, id).toBe(HOUND.maxHp);
    }
    r.goTo(-57, 21);
    expect(r.encounters.view('hound_1').engaged).toBe(true);
    r.fight.defeat('hound_1', 'purify');
    r.fight.defeat('hound_2', 'purify');
    expect(r.flags()).toContain('enc_approach_resolved');
  });

  it('with no magic at all the stun still tops it up, so Purify and the charged Bolt are both affordable', () => {
    const r = atGrounds(false);
    r.tick(0.1);
    r.store.setState((s) => ({ player: { ...s.player, magic: 0 } }));
    for (let i = 0; i < 3; i++) injectSpellHit(r.spells, { targetId: H1, damage: 20 });
    expect(r.encounters.fsmEnemy('hound_1')!.state).toBe('stunned');
    expect(r.store.getState().player.magic).toBeGreaterThanOrEqual(60);
    expect(r.store.getState().player.magic).toBeGreaterThanOrEqual(SPELL_CONFIG.purify.cost);
    expect(r.store.getState().player.magic).toBeGreaterThanOrEqual(SPELL_CONFIG.bolt.charged.cost);
  });

  it('death: the resolved hound stays resolved, the other resets and wakes again on approach', () => {
    const r = atGrounds();
    r.fight.defeat('hound_1', 'destroy');
    r.store.setState((s) => ({ player: { ...s.player, hp: 0 } }));
    r.pos.x = 500;
    r.pos.z = 500;
    r.tick(0.05);
    expect(r.encounters.view('hound_1').state).toBe('resolved');
    expect(r.encounters.view('hound_2')).toMatchObject({ state: 'idle', engaged: false });
    r.goTo(-54, 22);
    expect(r.encounters.view('hound_2').engaged).toBe(true);
    r.fight.defeat('hound_2', 'purify');
    expect(r.flags()).toContain('enc_approach_resolved');
  });

  it('both hounds keep their placements and morality classes (animal)', () => {
    expect(PLACEMENTS[H1 as keyof typeof PLACEMENTS]).toBeDefined();
    expect(PLACEMENTS[H2 as keyof typeof PLACEMENTS]).toBeDefined();
    expect(HOUND.moralityClass).toBe('animal');
  });
});

describe('the interior cat on the FSM (5.9)', () => {
  const CAT_AT = PLACEMENTS['enemy.interior.cat' as keyof typeof PLACEMENTS]!;
  function atCat(keepAlive = true): FightRig {
    const r = createFightRig('interior', { keepAlive });
    expect(r.store.getState().game.scene).toBe('last_house');
    r.goTo(CAT_AT.x, CAT_AT.z + 3);
    return r;
  }

  it('is dormant until Elena comes within 4 m, then pounces for 10', () => {
    const r = createFightRig('interior', { keepAlive: false });
    r.tick(3);
    expect(r.encounters.fsmEnemy('interior_cat')!.held).toBe(true);
    expect(r.encounters.view('interior_cat').engaged).toBe(false);
    r.goTo(CAT_AT.x, CAT_AT.z + 3);
    expect(r.encounters.view('interior_cat')).toMatchObject({ engaged: true, hostile: true });
    r.tick(4);
    expect(r.events.some((e) => e.type === 'attack' && e.ability === 'pounce' && e.damage === 10)).toBe(true);
  });

  it.each([
    { choice: 'purify' as const, delta: 10 },
    { choice: 'destroy' as const, delta: -10 },
  ])('$choice sets enc_interior_resolved and moves morality by $delta', ({ choice, delta }) => {
    const r = atCat();
    r.fight.defeat('interior_cat', choice);
    expect(r.flags()).toContain('enc_interior_resolved');
    expect(r.store.getState().progress.morality.value).toBe(delta);
    expect(r.encounters.view('interior_cat').outcome).toBe(choice);
  });

  it('a death resets an unstunned cat; a stunned cat stays stunned', () => {
    const r = atCat();
    r.fight.tap('interior_cat');
    const e = r.encounters.fsmEnemy('interior_cat')!;
    expect(e.hp).toBeLessThan(CAT.maxHp);
    r.encounters.handleDeath();
    expect(e.hp).toBe(CAT.maxHp);
    expect(r.encounters.view('interior_cat')).toMatchObject({ engaged: false, state: 'idle' });

    const s = createFightRig('interior');
    s.goTo(CAT_AT.x, CAT_AT.z + 3);
    s.fight.stun('interior_cat');
    s.encounters.handleDeath();
    expect(s.encounters.view('interior_cat').state).toBe('stunned');
  });
});
