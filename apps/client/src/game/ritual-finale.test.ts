import { MORALITY_MAX, MORALITY_MIN, moralityBand, type ProgressFlag } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { ALL_INTERACTIONS } from '../content/interactions/index.ts';
import type { Cond } from '../content/interactions/types.ts';
import { getLine } from '../content/dialogue/index.ts';
import { ALL_SEQUENCES } from '../content/sequences/index.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import { MemorySaveStorage } from '../services/save-storage.ts';
import { createGameStore, type GameStore } from '../store/game-store.ts';
import { applyDevStart, isDevStart } from './dev-start.ts';
import { angelFinalLineId, ENDING_CHOICES, endingFlagFor, endingOfFlags, type EndingChoice } from './ending.ts';
import { createEncounterWorld } from './encounter-runtime.ts';
import { InputController } from './input.ts';
import { canContinue } from './save.ts';
import { sealState, type SealState } from './progression.ts';
import { SIM_DT } from './player.ts';
import { validateSequenceDef } from './sequences.ts';
import { createAnchorDriver, createFightRig } from './test-helpers.ts';

type Dir = 'north' | 'east' | 'west';

/**
 * A headless Elena in the ritual chamber, started the way `?start=ritual` does, with the REAL spell, enemy and ritual
 * systems (task 5.10). `restore(dir)` plays the anchor's mechanic like a player: Bolts and E (north), E and Ward (east),
 * Purify (west). Elena is topped up each step so the smoke cannot kill her (the unit tests of the director cover damage).
 */
function setup(start: 'ritual' | 'ritual-choice' = 'ritual') {
  const rig = createFightRig(start, { keepAlive: true });
  const driver = createAnchorDriver(rig);
  const { store, storage, world, ritual, ending, pos, flags, tick, press } = rig;
  const goTo = (id: string) => {
    const p = PLACEMENTS[id as keyof typeof PLACEMENTS]!;
    pos.x = p.x;
    pos.z = p.z + 1; // one metre in front of it
  };
  const activate = () => {
    goTo('seal.ritual.central');
    expect(press()).toMatchObject({ status: 'done', id: 'seal.ritual.central' });
  };
  const restore = (dir: Dir) => {
    driver.restore(dir);
    world.setHeld(false);
  };
  /** Wait out the first-anchor cinematic placeholder (15 s fallback). */
  const finishCinematic = () => {
    tick(16);
  };
  return { store, storage, world, encounters: rig.encounters, ritual, ending, pos, flags, tick, goTo, press, restore, activate, finishCinematic, driver, rig };
}

describe('the anchors are real tasks, not hold-E stubs', () => {
  it('holding E on east or west alone never restores them', () => {
    const t = setup();
    t.activate();
    t.driver.stand('east');
    t.press();
    t.world.setHeld(true);
    t.tick(1.4); // before the first strike: no pause, plain progress
    expect(t.flags()).not.toContain('anchor_east');
    t.driver.stand('west');
    expect(t.press()).toMatchObject({ status: 'refused', reason: 'use_purify' });
    t.world.setHeld(true);
    t.tick(10);
    expect(t.flags()).not.toContain('anchor_west');
  });

  it('the north anchor refuses while the smoke shell stands, selects Arcane Bolt, and the Angel hints', () => {
    const t = setup();
    t.activate();
    t.store.setState((s) => ({ player: { ...s.player, selectedSpell: 'purify' } }));
    t.driver.stand('north');
    expect(t.press()).toMatchObject({ status: 'refused', id: 'anchor.ritual.north', reason: 'shell_intact' });
    expect(t.store.getState().player.selectedSpell).toBe('arcane_bolt');
    expect(t.world.spoken).toContain('vo_angel_p6_h_north');
    expect(t.ritual.view().channel).toBeNull();
  });

  it('pressing E before the seal is woken does nothing', () => {
    const t = setup();
    t.driver.stand('east');
    expect(t.press()).toMatchObject({ status: 'none' });
  });

  it('the Angel hints the first unrestored anchor after 45 s without progress, one at a time (Q15)', () => {
    const t = setup();
    expect(t.flags()).not.toContain('ritual_active');
    t.tick(60);
    expect(t.world.spoken).not.toContain('vo_angel_p6_h_north'); // not before the ritual is active
    t.activate();
    t.tick(44);
    expect(t.world.spoken).not.toContain('vo_angel_p6_h_north');
    t.tick(2);
    expect(t.world.spoken.filter((l) => l === 'vo_angel_p6_h_north')).toHaveLength(1);
    t.tick(120); // said once per stall, not nagging
    expect(t.world.spoken.filter((l) => l === 'vo_angel_p6_h_north')).toHaveLength(1);
    expect(t.world.spoken).not.toContain('vo_angel_p6_h_east');
    t.restore('north');
    t.finishCinematic();
    expect(t.flags()).toContain('anchor_north');
    t.tick(40);
    expect(t.world.spoken).not.toContain('vo_angel_p6_h_east');
    t.tick(10);
    expect(t.world.spoken).toContain('vo_angel_p6_h_east');
    expect(t.world.spoken).not.toContain('vo_angel_p6_h_west');
  });
});

describe('Beat 11: the ritual, headless', () => {
  it('wakes the seal: ritual_active, then the seal says "Restore the anchors"', () => {
    const t = setup();
    expect(t.flags()).not.toContain('ritual_active');
    t.activate();
    expect(t.flags()).toContain('ritual_active');
    expect(t.world.spoken).toContain('vo_elena_b11_01');
    t.tick(3.1);
    expect(t.world.spoken).toContain('vo_angel_b11_01');
    t.goTo('seal.ritual.central');
    t.tick(0.1);
    expect(t.world.prompt).toBe('E  Restore the anchors');
  });

  it('anchors can be restored in every order and end in anchors_all', () => {
    const orders: Dir[][] = [
      ['north', 'east', 'west'], ['north', 'west', 'east'], ['east', 'north', 'west'],
      ['east', 'west', 'north'], ['west', 'north', 'east'], ['west', 'east', 'north'],
    ];
    for (const order of orders) {
      const t = setup();
      t.activate();
      for (const [i, dir] of order.entries()) {
        t.restore(dir);
        expect(t.flags(), order.join()).toContain(`anchor_${dir}`);
        if (i === 0) {
          // The first anchor brings Felix's clip; control is locked until it ends.
          expect(t.world.video?.clipId).toBe('cin_felix_anchor');
          expect(t.flags()).not.toContain('felix3_done');
          t.finishCinematic();
          expect(t.flags()).toContain('felix3_done');
          expect(t.world.video).toBeNull();
        }
        expect(t.flags().includes('anchors_all')).toBe(i === 2);
      }
      expect(t.world.spoken).toContain('vo_elena_b11_02');
      expect(sealState(t.flags())).toBe('choice');
    }
  });

  it('the Felix clip plays once, for the first anchor only', () => {
    const t = setup();
    t.activate();
    t.restore('east');
    t.finishCinematic();
    t.restore('west');
    expect(t.world.video).toBeNull();
    expect(t.world.sequences.results.filter((r) => r.id === 'cin_felix_anchor')).toHaveLength(1);
  });

  it('skipping the Felix clip still sets felix3_done', () => {
    const t = setup();
    t.activate();
    t.restore('west');
    expect(t.world.sequences.active).toBe('cin_felix_anchor');
    expect(t.world.sequences.skip().skipped).toBe(true);
    expect(t.flags()).toContain('felix3_done');
    expect(t.world.video).toBeNull();
  });

  it('the smoke strikes (rings) speed up with each anchor and stop at anchors_all', () => {
    const t = setup();
    t.activate();
    t.tick(4.1);
    expect(t.ritual.view().strike).toBe('warning');
    t.tick(1.3);
    expect(t.ritual.view().strike).toBe('landed');
    expect(t.ritual.strikesLanded).toBeGreaterThanOrEqual(1);
    expect(t.world.spoken).toContain('vo_smoke_b11_01');
    for (const dir of ['north', 'east', 'west'] as const) {
      t.restore(dir);
      t.finishCinematic();
    }
    t.tick(1);
    expect(t.flags()).toContain('anchors_all');
    const landed = t.ritual.strikesLanded;
    t.tick(30);
    expect(t.ritual.strikesLanded).toBe(landed);
    expect(t.ritual.view()).toMatchObject({ active: false, strike: 'idle' });
    expect(t.ritual.wraithCount()).toBe(0);
  });

  it('death keeps the anchors and ritual_active, and respawns at cp_ritual', () => {
    const t = setup();
    t.activate();
    t.restore('east');
    t.finishCinematic();
    t.restore('west');
    expect(t.flags()).toEqual(expect.arrayContaining(['anchor_east', 'anchor_west', 'ritual_active', 'felix3_done']));
    t.store.setState((s) => ({ player: { ...s.player, hp: 0 } }));
    t.tick(0.1);
    const s = t.store.getState();
    expect(s.player.hp).toBe(100);
    expect(s.game.checkpointId).toBe('cp_ritual');
    expect(s.player.pos[2]).toBe(-12);
    expect(s.progress.flags).toEqual(expect.arrayContaining(['anchor_east', 'anchor_west', 'ritual_active', 'felix3_done']));
    // The last anchor still finishes the ritual after the respawn.
    t.restore('north');
    expect(t.flags()).toContain('anchors_all');
  });

  it('a task in progress is dropped by death, but its progress is banked', () => {
    const t = setup();
    t.activate();
    t.driver.stand('east');
    t.press();
    t.world.setHeld(true);
    t.tick(3);
    t.store.setState((s) => ({ player: { ...s.player, hp: 0 } }));
    t.pos.x = 0;
    t.pos.z = -12; // respawn point, far from the east anchor
    t.tick(0.1);
    expect(t.ritual.view().channel).toBeNull();
    expect(t.flags()).not.toContain('anchor_east');
    expect(t.ritual.anchorProgress('east')).toBeGreaterThan(1);
  });
});

/** Cond check used to prove the seal's defs follow the state table. */
function holds(c: Cond | undefined, flags: readonly ProgressFlag[]): boolean {
  if (!c) return true;
  return (c.flags ?? []).every((f) => flags.includes(f)) && !(c.notFlags ?? []).some((f) => flags.includes(f));
}

describe('the central seal states', () => {
  const prompts: Record<SealState, string | null> = {
    locked: null,
    reveal: 'Lay your hand on the seal',
    activate: 'Wake the seal',
    inert: 'Restore the anchors',
    choice: 'Decide the seal',
    done: null,
  };
  const states: [ProgressFlag[], SealState][] = [
    [[], 'locked'],
    [['board_solved'], 'reveal'],
    [['board_solved', 'seq6_done'], 'activate'],
    [['board_solved', 'seq6_done', 'ritual_active'], 'inert'],
    [['board_solved', 'seq6_done', 'ritual_active', 'anchors_all'], 'choice'],
    [['board_solved', 'seq6_done', 'ritual_active', 'anchors_all', 'ending_keeper'], 'done'],
    [['board_solved', 'seq6_done', 'ritual_active', 'anchors_all', 'ending_broken'], 'done'],
  ];

  it('shows exactly the def for the current sealState, and none when locked or done', () => {
    const seals = ALL_INTERACTIONS.interactions.filter((i) => i.id === 'seal.ritual.central');
    for (const [flags, state] of states) {
      const shown = seals.filter((d) => holds(d.show, flags));
      expect(sealState(flags)).toBe(state);
      expect(shown.map((d) => d.prompt), state).toEqual(prompts[state] ? [prompts[state]] : []);
    }
  });

  it('the three anchors are placed in their own rooms, behind the doors', () => {
    const inRoom = (id: keyof typeof PLACEMENTS, [x1, z1, x2, z2]: number[]) => {
      const p = PLACEMENTS[id]!;
      return p.x > x1! && p.x < x2! && p.z > z1! && p.z < z2!;
    };
    expect(inRoom('anchor.ritual.north', [-4, -44, 4, -30])).toBe(true);
    expect(inRoom('anchor.ritual.east', [12, -22, 24, -14])).toBe(true);
    expect(inRoom('anchor.ritual.west', [-24, -22, -12, -14])).toBe(true);
  });

  it('the new sequences are valid skippable single-video clips with the named clip ids', () => {
    const want = { cin_felix_anchor: 15, cin_ending_keeper: 25, cin_ending_broken: 25 } as const;
    for (const [id, seconds] of Object.entries(want)) {
      const def = ALL_SEQUENCES.find((s) => s.id === id)!;
      expect(validateSequenceDef(def), id).toEqual([]);
      expect(def.skippable, id).toBe(true);
      expect(def.steps, id).toEqual([{ t: 'video', clipId: id, fallbackSeconds: seconds }]);
    }
  });

  it('every authored final Angel line exists, one per band', () => {
    for (const band of ['dark', 'neutral', 'kind'] as const) {
      const line = getLine(angelFinalLineId(band));
      expect(line?.speaker, band).toBe('Angel');
      expect(line?.text.length, band).toBeGreaterThan(10);
    }
  });
});

describe('Beat 12: the final choice and the endings', () => {
  /** Walk the whole overlay for one choice and let the ending clip play out (or be skipped). */
  function finish(t: ReturnType<typeof setup>, choice: EndingChoice, how: 'play' | 'skip' = 'play') {
    t.goTo('seal.ritual.central');
    expect(t.press()).toMatchObject({ status: 'done', id: 'seal.ritual.central' });
    expect(t.store.getState().game.phase).toBe('overlay');
    expect(t.ending.view()?.stage).toBe('angel');
    t.ending.advance();
    t.ending.select(choice);
    expect(t.ending.view()?.stage).toBe('confirm');
    expect(t.ending.confirm()).toEqual({ ok: true });
    expect(t.store.getState().game.phase).toBe('playing');
    expect(t.world.video?.clipId).toBe(`cin_ending_${choice}`);
    if (how === 'skip') t.world.sequences.skip();
    t.tick(26);
  }

  it('the overlay: Angel line first, then the two options, then the confirm, with no timer', () => {
    const t = setup('ritual-choice');
    t.goTo('seal.ritual.central');
    t.press();
    const v = t.ending.view()!;
    expect(v.stage).toBe('angel');
    expect(v.angel.speaker).toBe('Angel');
    expect(v.options.map((o) => o.label)).toEqual([
      "Restore the seal and take Felix's place as its keeper",
      'Break the seal and pull Felix free',
    ]);
    // No timer: even a minute of waiting changes nothing.
    t.tick(60);
    expect(t.ending.view()?.stage).toBe('angel');
    expect(endingOfFlags(t.flags())).toBeNull();
    t.ending.select('keeper'); // ignored: the Angel has not finished
    expect(t.ending.view()?.stage).toBe('angel');
    t.ending.advance();
    expect(t.ending.view()?.stage).toBe('choose');
    t.ending.back(); // Esc outside the confirm step does nothing
    expect(t.ending.view()?.stage).toBe('choose');
    t.ending.select('broken');
    expect(t.ending.view()).toMatchObject({ stage: 'confirm', selected: 'broken', confirmText: 'This cannot be undone.' });
    expect(endingOfFlags(t.flags())).toBeNull(); // selecting is not choosing
    t.ending.back(); // Esc backs out of the confirm only
    expect(t.ending.view()).toMatchObject({ stage: 'choose', selected: null });
    t.ending.select('keeper');
    expect(t.ending.confirm()).toEqual({ ok: true });
    expect(t.flags()).toContain('ending_keeper');
    expect(t.flags()).not.toContain('ending_broken');
  });

  it('opening the overlay is refused before anchors_all and after a choice', () => {
    const t = setup();
    expect(t.ending.open()).toBe('anchors_missing');
    const u = setup('ritual-choice');
    u.ending.open();
    u.ending.advance();
    u.ending.select('keeper');
    u.ending.confirm();
    expect(u.ending.open()).toBe('already_chosen');
  });

  for (const choice of ENDING_CHOICES) {
    it(`${choice}: ends the game, marks the save finished, hides Continue, goes to credits`, () => {
      const t = setup('ritual-choice');
      finish(t, choice);
      expect(t.flags()).toContain(endingFlagFor(choice));
      expect(t.flags()).toContain('game_finished');
      expect(t.flags()).not.toContain(endingFlagFor(choice === 'keeper' ? 'broken' : 'keeper'));
      expect(t.ending.finished).toBe(true);
      expect(t.store.getState().game.phase).toBe('credits');
      const saved = t.storage.load();
      expect(saved.status).toBe('finished');
      expect(canContinue(saved)).toBe(false);
      expect(sealState(t.flags())).toBe('done');
      // Back at the menu: still no Continue, and the seal offers nothing.
      t.store.getState().setPhase('menu');
      expect(canContinue(t.storage.load())).toBe(false);
    });

    it(`${choice}: skipping the ending clip finishes the game the same way`, () => {
      const t = setup('ritual-choice');
      finish(t, choice, 'skip');
      expect(t.flags()).toContain('game_finished');
      expect(t.storage.load().status).toBe('finished');
      expect(t.store.getState().game.phase).toBe('credits');
    });
  }

  it('a game reloaded between the choice and the end clip plays the clip again and still finishes', () => {
    const t = setup('ritual-choice');
    t.store.getState().setFlag('ending_broken'); // as a save made mid-ending would hold
    t.tick(1);
    expect(t.world.video?.clipId).toBe('cin_ending_broken');
    t.tick(26);
    expect(t.storage.load().status).toBe('finished');
    expect(t.store.getState().game.phase).toBe('credits');
  });
});

/** Small seeded generator so the property runs are reproducible. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe('P8: the ending is a function of the choice only', () => {
  const rand = lcg(20261107);
  const moralities = [MORALITY_MIN, -99, -26, -25, -24, 0, 24, 25, 26, 99, MORALITY_MAX, ...Array.from({ length: 10 }, () => Math.round(rand() * 200 - 100))];

  it('the mapping takes the choice and nothing else', () => {
    expect(endingFlagFor.length).toBe(1);
    expect(endingFlagFor('keeper')).toBe('ending_keeper');
    expect(endingFlagFor('broken')).toBe('ending_broken');
  });

  it('for every morality value and both choices the ending is identical and both are reachable', () => {
    const lines = new Set<string>();
    for (const morality of moralities) {
      for (const choice of ENDING_CHOICES) {
        const store: GameStore = createGameStore();
        store.getState().startNewGame('classic');
        applyDevStart(store, 'ritual-choice');
        store.setState((s) => ({ progress: { ...s.progress, morality: { ...s.progress.morality, value: morality } } }));
        store.getState().setPhase('playing');
        const storage = new MemorySaveStorage();
        const { world, ending } = createEncounterWorld({ store, storage });
        expect(world.interact({ x: 0, z: -14 })).toMatchObject({ status: 'done', id: 'seal.ritual.central' });
        const view = ending.view()!;
        lines.add(`${moralityBand(morality)}:${view.angel.text}`);
        // The line (and only the line) follows the band.
        expect(view.angel.text).toBe(getLine(angelFinalLineId(moralityBand(morality)))!.text);
        // The options never depend on it.
        expect(view.options.map((o) => o.id)).toEqual(['keeper', 'broken']);
        ending.advance();
        ending.select(choice);
        expect(ending.confirm()).toEqual({ ok: true });
        const flags = store.getState().progress.flags;
        expect(endingOfFlags(flags), `m=${morality} ${choice}`).toBe(choice);
        expect(flags.includes('ending_keeper')).toBe(choice === 'keeper');
        expect(flags.includes('ending_broken')).toBe(choice === 'broken');
        for (let i = 0; i < 60 * 26; i++) world.tick(SIM_DT, { x: 0, z: -14 });
        expect(store.getState().progress.flags).toContain('game_finished');
        expect(store.getState().game.phase).toBe('credits');
        expect(storage.load().status).toBe('finished');
      }
    }
    expect(lines.size).toBe(3); // all three authored lines were reached, one per band
  }, 90_000);

  it('both endings are reachable from every combination of optional flags once anchors_all holds', () => {
    const optional: ProgressFlag[][] = [[], ['journal_5'], ['journal_5', 'gartner_pressed'], ['enc_street_resolved', 'gartner_comforted']];
    for (const extra of optional) {
      for (const choice of ENDING_CHOICES) {
        const store: GameStore = createGameStore();
        store.getState().startNewGame('classic');
        applyDevStart(store, 'ritual-choice');
        for (const f of extra) store.getState().setFlag(f);
        expect(store.getState().progress.flags).toContain('anchors_all');
        expect(store.getState().setFlag(endingFlagFor(choice)).ok).toBe(true);
        expect(store.getState().setFlag(endingFlagFor(choice === 'keeper' ? 'broken' : 'keeper')).ok).toBe(false);
        expect(store.getState().setFlag('game_finished').ok).toBe(true);
      }
    }
  });

  it('no ending flag can be set without anchors_all', () => {
    const store: GameStore = createGameStore();
    store.getState().startNewGame('classic');
    applyDevStart(store, 'ritual');
    for (const choice of ENDING_CHOICES) expect(store.getState().setFlag(endingFlagFor(choice)).ok).toBe(false);
    expect(store.getState().setFlag('game_finished').ok).toBe(false);
  });
});

describe('dev start and input for the finale', () => {
  it('?start=ritual lands in the ritual chamber with the seal ready to wake; ?start=ritual-choice has all anchors', () => {
    for (const [name, last] of [['ritual', 'seq6_done'], ['ritual-choice', 'anchors_all']] as const) {
      const store = createGameStore();
      store.getState().startNewGame('classic');
      expect(applyDevStart(store, name)).toEqual([]);
      const s = store.getState();
      expect(s.game.checkpointId).toBe('cp_ritual');
      expect(s.game.scene).toBe('last_house');
      expect(s.progress.flags).toContain(last);
      expect(s.progress.flags.includes('ritual_active')).toBe(name === 'ritual-choice');
      expect(s.player.spellsUnlocked).toContain('arcane_bolt');
      expect(isDevStart(name)).toBe(true);
    }
  });

  it('the input controller reports E as down until it is released', () => {
    const i = new InputController();
    expect(i.state.interactDown).toBe(false);
    i.keyDown('KeyE');
    i.endFrame();
    expect(i.state.interactDown).toBe(true); // stays true after the one-frame press edge clears
    i.keyUp('KeyE');
    expect(i.state.interactDown).toBe(false);
    i.keyDown('KeyE');
    i.releaseAll();
    expect(i.state.interactDown).toBe(false);
  });
});
