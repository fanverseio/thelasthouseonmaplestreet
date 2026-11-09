import type { ProgressFlag } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { ENCOUNTER_BINDINGS } from '../content/encounters/index.ts';
import { getLine } from '../content/dialogue/index.ts';
import { ALL_SEQUENCES } from '../content/sequences/index.ts';
import { exteriorColliders } from '../content/world/exterior-layout.ts';
import { createWorldRegistry } from '../content/world/index.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import { createGameStore } from '../store/game-store.ts';
import { moveAndSlide } from './collision.ts';
import { createEncounterWorld } from './encounter-runtime.ts';
import { PLAYER_RADIUS, SIM_DT } from './player.ts';
import { validateSequenceDef } from './sequences.ts';

const BRIGGS = 'enemy.garden.briggs';

/** A headless Elena standing at the intersection after Beat 3 (seq2_done), with real collision. */
function setup() {
  const store = createGameStore();
  store.getState().startNewGame('classic');
  for (const f of ['locket_taken', 'angel_awake', 'home_done', 'seq1_done', 'seq2_done', 'spell_bolt']) {
    expect(store.getState().setFlag(f).ok, f).toBe(true);
  }
  const { world, encounters } = createEncounterWorld({ store });
  const order: ProgressFlag[] = [];
  let seen = store.getState().progress.flags.length;
  store.subscribe((s) => {
    for (const f of s.progress.flags.slice(seen)) order.push(f);
    seen = s.progress.flags.length;
  });
  const pos = { x: 58, z: 30 };
  const flags = () => store.getState().progress.flags;
  const tick = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / SIM_DT); i++) world.tick(SIM_DT, { x: pos.x, z: pos.z });
  };
  const walkTo = (x: number, z: number) => {
    for (let i = 0; i < 60 * 40; i++) {
      const dx = x - pos.x;
      const dz = z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) break;
      const step = Math.min(d, 4 * SIM_DT);
      const next = moveAndSlide(pos, { x: (dx / d) * step, z: (dz / d) * step }, PLAYER_RADIUS, exteriorColliders(flags()));
      const moved = Math.hypot(next.x - pos.x, next.z - pos.z);
      pos.x = next.x;
      pos.z = next.z;
      world.tick(SIM_DT, { x: pos.x, z: pos.z });
      if (moved < 1e-6) break;
    }
    return Math.hypot(x - pos.x, z - pos.z);
  };
  const press = () => world.interact({ x: pos.x, z: pos.z });
  const moralityValue = () => store.getState().progress.morality.value;
  return { store, world, encounters, order, pos, flags, tick, walkTo, press, moralityValue };
}

type Game = ReturnType<typeof setup>;

/** Walk into the garden and up to Briggs; the 4 m approach engages him. */
function approach(g: Game) {
  expect(g.walkTo(58, 18)).toBeLessThan(0.1);
  g.walkTo(57, 8);
  expect(g.flags()).toContain('seq3_started');
  g.walkTo(57, 7.4);
}

/** Through the transformation and the scripted first attack; Ward is cast (or not) during the wind-up. */
function throughAttack(g: Game, ward: boolean) {
  g.tick(6.2);
  const v = g.encounters.view('briggs');
  expect(v.telegraphing).toBe(true);
  if (ward) expect(g.encounters.castWard()).toBe(true);
  g.tick(2.6); // the wind-up is 2.5 s (Q31)
  expect(g.flags()).toContain('spell_ward');
}

/** Weaken with E, wait for the stub's stun. */
function weakenAndStun(g: Game) {
  expect(g.world.prompt).toBe('E  Weaken Mr Briggs');
  expect(g.press()).toMatchObject({ status: 'done', id: BRIGGS });
  expect(g.encounters.view('briggs').state).toBe('weakened');
  g.tick(1.7);
  expect(g.encounters.view('briggs').state).toBe('stunned');
}

describe('Beat 4 content', () => {
  const registry = createWorldRegistry();

  it('references only existing entities, lines and sequences', () => {
    for (const id of ['trg.garden.enter', BRIGGS, 'clue.garden.walkie', 'door.garden.garage', 'pickup.garden.fuse', 'light.garden.porch']) {
      expect(registry.has(id), id).toBe(true);
      expect(PLACEMENTS[id], id).toBeDefined();
    }
    const seq = ALL_SEQUENCES.find((s) => s.id === 'seq3_cursed_neighbour')!;
    expect(validateSequenceDef(seq)).toEqual([]);
    for (const st of seq.steps) if (st.t === 'line') expect(getLine(st.lineId), st.lineId).toBeDefined();
    for (const b of ENCOUNTER_BINDINGS) {
      expect(registry.has(b.entity), b.entity).toBe(true);
      for (const l of [...(b.startLines ?? []), ...Object.values(b.outcomeLines ?? {}).flatMap((x) => x.map((y) => y.line))]) {
        expect(getLine(l), l).toBeDefined();
      }
    }
    expect(getLine('vo_angel_b4_c0')?.placeholder).toBe(true);
  });
});

describe.each([
  { choice: 'purify' as const, delta: 30, flag: 'briggs_purified' as const, ward: true },
  { choice: 'destroy' as const, delta: -30, flag: 'briggs_destroyed' as const, ward: false },
])('Beat 4 headless playthrough: $choice', ({ choice, delta, flag, ward }) => {
  it('reaches seq3_done with every flag in order', () => {
    const g = setup();
    expect(g.walkTo(58, 18)).toBeLessThan(0.1);
    expect(g.store.getState().game.checkpointId).toBe('cp_garden');
    expect(g.store.getState().progress.flags).not.toContain('seq3_started');

    g.walkTo(57, 8);
    expect(g.flags()).toContain('seq3_started');
    expect(g.world.sequences.active).toBe('seq3_cursed_neighbour');
    expect(g.world.canOpenLocket()).toBe(false); // combat-blocked while hostile
    g.walkTo(57, 7.4);
    g.store.setState((s) => ({ player: { ...s.player, hp: 35 } }));

    // Too early: not weakened yet, no Ward.
    expect(g.world.prompt).toBe('E  Speak to Mr Briggs');
    expect(g.press()).toMatchObject({ status: 'refused', id: BRIGGS });
    expect(g.encounters.view('briggs').state).toBe('idle');

    throughAttack(g, ward);
    // The scripted hit cannot take HP below 30; a Ward blocks it entirely.
    expect(g.store.getState().player.hp).toBe(ward ? 35 : 30);

    weakenAndStun(g);
    expect(g.flags()).toContain('spell_purify');
    expect(g.store.getState().player.magic).toBeGreaterThanOrEqual(60);
    expect(g.world.canOpenLocket()).toBe(true); // allowed during the stun choice
    expect(g.moralityValue()).toBe(0);

    expect(g.encounters.choose('briggs', choice)).toEqual({ ok: true });
    expect(g.flags()).toContain(flag);
    expect(g.flags()).not.toContain('walkie_found'); // the walkie is picked up, not dropped into the flags
    expect(g.moralityValue()).toBe(delta);
    expect(g.store.getState().progress.morality.history).toHaveLength(1);
    expect(g.encounters.view('briggs')).toMatchObject({ state: 'resolved', outcome: choice, hostile: false });
    expect(g.encounters.choose('briggs', choice)).toMatchObject({ ok: false, reason: 'already_resolved' });

    // The walkie crackles with Gartner's voice.
    g.tick(0.5);
    g.walkTo(55.8, 5);
    expect(g.world.prompt).toBe('E  Pick up the walkie-talkie');
    expect(g.press()).toMatchObject({ status: 'done', id: 'clue.garden.walkie' });
    expect(g.world.spoken).toContain('vo_gartner_b4_01');
    g.tick(1);
    expect(g.flags()).toContain('seq3_done');
    expect(g.world.sequences.active).toBeNull();

    expect(g.order.filter((f) => f.startsWith('seq3') || f.startsWith('spell_') || f.startsWith('briggs') || f === 'walkie_found')).toEqual([
      'seq3_started',
      'spell_ward',
      'spell_purify',
      flag,
      'walkie_found',
      'seq3_done',
    ]);
    expect(g.store.getState().game.checkpointId).toBe('cp_garden_after');

    // Both outcomes lead to the same place: the north veil and the garage are open.
    expect(g.walkTo(58, -30)).toBeLessThan(0.5);
    expect(g.walkTo(60.4, 16.6)).toBeLessThan(0.5);
    expect(g.press()).toMatchObject({ status: 'done', id: 'pickup.garden.fuse' });
    expect(g.store.getState().progress.carried).toContain('fuse');
  });

  it('never shows the score in prompts, subtitles or encounter views', () => {
    const g = setup();
    approach(g);
    throughAttack(g, ward);
    weakenAndStun(g);
    g.encounters.choose('briggs', choice);
    g.tick(5);
    const shown = [JSON.stringify(g.encounters.view('briggs')), g.world.prompt ?? '', g.world.subtitle?.text ?? '', ...g.world.spoken.map((id) => getLine(id)?.text ?? '')].join('\n');
    expect(shown).not.toMatch(/moral/i);
    expect(shown).not.toContain(String(Math.abs(delta)));
  });
});

describe('Beat 4 rules', () => {
  it('rejects Angel actions on Briggs-owned entities while seq3 runs', () => {
    const g = setup();
    expect(g.world.sequences.checkAngelAction(BRIGGS)).toEqual({ ok: true });
    approach(g);
    expect(g.world.sequences.active).toBe('seq3_cursed_neighbour');
    for (const owned of [BRIGGS, 'clue.garden.walkie', 'trg.garden.enter']) {
      expect(g.world.sequences.checkAngelAction(owned)).toEqual({ ok: false, reason: 'entity_owned' });
    }
    expect(g.world.sequences.checkAngelAction('light.garden.porch')).toEqual({ ok: false, reason: 'sequence_blocked' });
    throughAttack(g, true);
    weakenAndStun(g);
    g.encounters.choose('briggs', 'purify');
    g.walkTo(55.8, 5);
    g.press();
    g.tick(1);
    expect(g.world.sequences.checkAngelAction('light.garden.porch')).toEqual({ ok: true });
  });

  it('refuses choosing before the stun and purify from the wrong state', () => {
    const g = setup();
    approach(g);
    expect(g.encounters.choose('briggs', 'purify')).toMatchObject({ ok: false, reason: 'not_stunned' });
    expect(g.moralityValue()).toBe(0);
  });

  it('death during the fight keeps flags, resets Briggs and respawns at cp_garden', () => {
    const g = setup();
    approach(g);
    throughAttack(g, false);
    weakenAndStun(g);
    const before = [...g.flags()];
    g.store.setState((s) => ({ player: { ...s.player, hp: 0 } }));
    g.encounters.tick(SIM_DT, { x: 58, z: 20 }); // hp 0 is death; the view puts her at the respawn point
    expect(g.flags()).toEqual(before);
    expect(g.encounters.view('briggs')).toMatchObject({ state: 'idle', engaged: false, hostile: false });
    expect(g.world.sequences.active).toBeNull();
    const s = g.store.getState();
    expect(s.game.checkpointId).toBe('cp_garden');
    expect(s.player.hp).toBe(100);
    expect([s.player.pos[0], s.player.pos[2]]).toEqual([58, 20]);
    expect(s.world.entities[BRIGGS]).toEqual({ state: 'idle', engaged: false });
    expect(g.moralityValue()).toBe(0);

    // Back at the garden gate she can try again: the flags stay, Briggs is full strength again.
    g.pos.x = 58;
    g.pos.z = 20;
    g.walkTo(57, 8);
    expect(g.encounters.view('briggs').engaged).toBe(true);
    expect(g.world.sequences.active).toBe('seq3_cursed_neighbour');
    expect(g.world.prompt).toBe('E  Weaken Mr Briggs'); // the Ward is already hers
    expect(g.press()).toMatchObject({ status: 'done' });
    g.tick(1.7);
    expect(g.encounters.choose('briggs', 'destroy')).toEqual({ ok: true });
    expect(g.moralityValue()).toBe(-30);
  });

  it('keeps a resolved Briggs resolved through death', () => {
    const g = setup();
    approach(g);
    throughAttack(g, true);
    weakenAndStun(g);
    g.encounters.choose('briggs', 'purify');
    g.encounters.handleDeath();
    expect(g.encounters.view('briggs')).toMatchObject({ state: 'resolved', outcome: 'purify' });
    expect(g.flags()).toContain('briggs_purified');
    expect(g.moralityValue()).toBe(30);
  });

  it('derives resolved from flags for a loaded save', () => {
    const g = setup();
    approach(g);
    throughAttack(g, true);
    g.store.getState().setFlag('spell_purify');
    g.store.getState().setFlag('briggs_destroyed');
    expect(g.encounters.view('briggs')).toMatchObject({ state: 'resolved', outcome: 'destroy' });
    expect(g.encounters.hostileActive()).toBe(false);
  });
});
