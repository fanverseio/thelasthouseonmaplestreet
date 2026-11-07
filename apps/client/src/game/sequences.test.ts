import type { ProgressFlag, SequenceId, SpellId } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { createGameStore, type GameStore } from '../store/game-store.ts';
import {
  createSequenceRunner,
  finalEffects,
  foldEffects,
  forcedControlSeconds,
  validateSequenceDef,
  worstCaseForcedSeconds,
  type SequenceDef,
  type SequenceEffect,
  type SequenceStep,
} from './sequences.ts';

const DT = 1 / 60;

/** Skippable limited sequence with every kind of state change. Sets seq2_done and spell_bolt. */
const FELIX: SequenceDef = {
  id: 'seq2_felix_streetlight',
  kind: 'horror',
  trigger: { entity: 'trigger.street.felix' },
  requires: ['seq1_done'],
  owns: ['light.street.lamp', 'npc.street.felix'],
  policy: { locket: 'blocked', angelActions: 'blocked', control: 'limited' },
  maxForcedSeconds: 25,
  skippable: true,
  setsOnComplete: ['seq2_done', 'spell_bolt'],
  steps: [
    { t: 'video', clipId: 'clip_felix_streetlight', fallbackSeconds: 2 },
    { t: 'light', target: 'light.street.lamp', effect: 'off' },
    { t: 'spawn', target: 'npc.street.felix' },
    { t: 'wait', seconds: 1 },
    { t: 'parallel', steps: [
      { t: 'light', target: 'light.street.lamp', effect: 'flicker', seconds: 2 },
      { t: 'line', lineId: 'felix.line1' },
      { t: 'wait', seconds: 2 },
    ] },
    { t: 'light', target: 'light.street.lamp', effect: 'on' },
    { t: 'unlockSpell', spell: 'arcane_bolt' },
    { t: 'setFlag', flag: 'seq2_done' },
    { t: 'fx', effect: 'glow', target: 'npc.street.felix' },
    { t: 'wait', seconds: 1 },
    { t: 'despawn', target: 'npc.street.felix' },
  ],
};

/** Non-skippable interactive sequence that waits for input. */
const EMPTY_STREET: SequenceDef = {
  id: 'seq1_empty_street',
  kind: 'horror',
  trigger: { flag: 'home_done' },
  requires: [],
  owns: ['light.street.lamp'],
  policy: { locket: 'allowed', angelActions: 'blocked', control: 'full' },
  maxForcedSeconds: 0,
  skippable: false,
  setsOnComplete: ['seq1_done'],
  steps: [
    { t: 'prompt', textId: 'press_e', until: 'input' },
    { t: 'audio', cue: 'cue.steps', bus: 'sfx' },
    { t: 'waitFor', cond: { trigger: 'trigger.street.window' } },
  ],
};

/** Tiny atmosphere event with no flags. */
const WINDOW: SequenceDef = {
  id: 'atm_home_window',
  kind: 'atmosphere',
  trigger: { entity: 'trigger.home.window' },
  requires: [],
  owns: ['prop.home.curtain'],
  policy: { locket: 'allowed', angelActions: 'allowed', control: 'full' },
  maxForcedSeconds: 0,
  skippable: false,
  setsOnComplete: [],
  steps: [{ t: 'fx', effect: 'smoke', target: 'prop.home.curtain' }, { t: 'wait', seconds: 0.5 }],
};

function setup(flags: ProgressFlag[] = ['seq1_done']) {
  const store: GameStore = createGameStore();
  store.setState((s) => ({ progress: { ...s.progress, flags } }));
  const spells: SpellId[] = [];
  const all: SequenceEffect[] = [];
  const runner = createSequenceRunner({
    store,
    onEffect: (e) => all.push(e),
    onUnlockSpell: (s) => spells.push(s),
  });
  return { store, runner, spells, all };
}

/** Run until idle or the step budget runs out; returns ticks used. */
function runToEnd(runner: ReturnType<typeof setup>['runner'], maxTicks = 60 * 60): number {
  let n = 0;
  while (runner.active && n < maxTicks) {
    runner.tick(DT);
    n++;
  }
  return n;
}

describe('sequence definitions', () => {
  it('samples validate', () => {
    for (const d of [FELIX, EMPTY_STREET, WINDOW]) expect(validateSequenceDef(d)).toEqual([]);
  });

  it('rejects a setFlag step not listed in setsOnComplete', () => {
    const bad: SequenceDef = { ...FELIX, setsOnComplete: ['spell_bolt'] };
    expect(validateSequenceDef(bad)).toEqual(['setFlag seq2_done not in setsOnComplete']);
    const { runner } = setup();
    expect(runner.trigger(bad).outcome).toMatchObject({ status: 'rejected', reason: 'invalid' });
  });

  it('rejects a trigger whose requirements are unmet', () => {
    const { runner } = setup([]);
    expect(runner.trigger(FELIX).outcome).toMatchObject({ status: 'rejected', reason: 'requires_unmet' });
    expect(runner.active).toBeNull();
  });
});

describe('full run', () => {
  it('advances by sim dt, sets flags and spells only at completion, then restores', () => {
    const { store, runner, spells, all } = setup();
    expect(runner.trigger(FELIX).outcome.status).toBe('started');
    expect(runner.policy).toEqual(FELIX.policy);
    const ticks = runToEnd(runner);
    // 2 (video fallback) + 1 + 2 + 1 = 6 s of blocking steps
    expect(ticks / 60).toBeGreaterThan(5.9);
    expect(ticks / 60).toBeLessThan(6.1);
    expect(store.getState().progress.flags).toEqual(['seq1_done', 'seq2_done', 'spell_bolt']);
    expect(spells).toEqual(['arcane_bolt']);
    expect(runner.policy.control).toBe('full');
    expect(runner.results.at(-1)).toMatchObject({
      how: 'completed',
      flagsSet: ['seq2_done', 'spell_bolt'],
      restore: { cameraSeconds: 0.4, requestPointerLock: true },
    });
    expect(all.at(-1)).toMatchObject({ k: 'sequenceEnd', how: 'completed' });
  });

  it('does not set flags mid-run', () => {
    const { store, runner } = setup();
    runner.trigger(FELIX);
    for (let i = 0; i < 60 * 4; i++) runner.tick(DT);
    expect(runner.active).toBe('seq2_felix_streetlight');
    expect(store.getState().progress.flags).toEqual(['seq1_done']);
  });

  it('waits on prompt input and trigger signals', () => {
    const { runner, store } = setup([]);
    runner.trigger(EMPTY_STREET);
    for (let i = 0; i < 120; i++) runner.tick(DT);
    expect(runner.active).toBe('seq1_empty_street');
    runner.signal({ input: 'interact' });
    runner.tick(DT);
    runner.signal({ trigger: 'trigger.street.window' });
    runner.tick(DT);
    expect(runner.active).toBeNull();
    expect(store.getState().progress.flags).toContain('seq1_done');
  });

  it('is not skippable when the def says so', () => {
    const { runner } = setup([]);
    runner.trigger(EMPTY_STREET);
    expect(runner.skip().skipped).toBe(false);
    expect(runner.active).toBe('seq1_empty_street');
  });

  it('locket pause follows the policy', () => {
    const { runner } = setup([]);
    runner.trigger(EMPTY_STREET); // locket allowed
    expect(runner.setPaused(true)).toBe(true);
    const frozen = runner.tick(DT);
    expect(frozen).toEqual([]);
    expect(runner.setPaused(false)).toBe(true);
    runner.interrupt('load');
    const f = setup();
    f.runner.trigger(FELIX); // locket blocked
    expect(f.runner.setPaused(true)).toBe(false);
    expect(f.runner.isPaused).toBe(false);
  });
});

describe('skip equals full run (P14)', () => {
  const fullRun = () => {
    const f = setup();
    f.runner.trigger(FELIX);
    runToEnd(f.runner);
    return f;
  };

  it('skipping at every step yields the same flags, spells and final effects', () => {
    const full = fullRun();
    const fullState = foldEffects(full.all);
    // Probe at every tick up to the sequence length, plus the very start.
    for (let skipAt = 0; skipAt <= 60 * 6; skipAt++) {
      const f = setup();
      f.runner.trigger(FELIX);
      for (let i = 0; i < skipAt && f.runner.active; i++) f.runner.tick(DT);
      if (f.runner.active) expect(f.runner.skip().skipped).toBe(true);
      expect(f.store.getState().progress.flags).toEqual(full.store.getState().progress.flags);
      expect(f.spells).toEqual(full.spells);
      expect(f.runner.results.at(-1)?.spellsUnlocked).toEqual(full.runner.results.at(-1)?.spellsUnlocked);
      expect(foldEffects(f.all)).toEqual(fullState);
      expect(f.runner.active).toBeNull();
    }
  });

  it('skip emits the same finalEffects list as the static final state', () => {
    const f = setup();
    f.runner.trigger(FELIX);
    const { effects } = f.runner.skip();
    const bodies = effects.map((e) => {
      const b: Record<string, unknown> = { ...e };
      delete b.sequenceId;
      return b;
    });
    for (const e of finalEffects(FELIX)) expect(bodies).toContainEqual(e);
    expect(finalEffects(FELIX).map((e) => e.k)).toEqual(['light', 'despawn', 'unlockSpell', 'videoStop']);
  });

  it('skip with nothing running does nothing', () => {
    const { runner } = setup();
    expect(runner.skip()).toEqual({ skipped: false, effects: [] });
  });
});

describe('interrupt', () => {
  it('rolls back to the start with no partial flags or spells, at every step', () => {
    for (let at = 0; at <= 60 * 5; at += 7) {
      const { store, runner, spells } = setup();
      runner.trigger(FELIX);
      for (let i = 0; i < at; i++) runner.tick(DT);
      const effects = runner.interrupt(at % 2 ? 'death' : 'load');
      expect(store.getState().progress.flags).toEqual(['seq1_done']);
      expect(spells).toEqual([]);
      expect(runner.active).toBeNull();
      expect(runner.policy.control).toBe('full');
      expect(effects.map((e) => e.k)).toEqual(expect.arrayContaining(['rollback', 'videoStop', 'sequenceEnd']));
      expect(runner.results.at(-1)).toMatchObject({ how: 'interrupted', flagsSet: [] });
    }
  });

  it('drops the queue and allows a fresh start', () => {
    const { runner, store } = setup();
    runner.trigger(FELIX);
    runner.trigger(WINDOW);
    runner.interrupt('death');
    expect(runner.queued).toEqual([]);
    expect(runner.trigger(FELIX).outcome.status).toBe('started');
    runToEnd(runner);
    expect(store.getState().progress.flags).toContain('seq2_done');
  });
});

describe('ownership and policy while running', () => {
  it('rejects Angel actions on owned entities and, when blocked, on everything', () => {
    const { runner } = setup([]);
    expect(runner.checkAngelAction('light.street.lamp')).toEqual({ ok: true });
    runner.trigger(WINDOW); // angelActions allowed
    expect(runner.ownedEntities).toEqual(['prop.home.curtain']);
    expect(runner.isOwned('prop.home.curtain')).toBe(true);
    expect(runner.checkAngelAction('prop.home.curtain')).toEqual({ ok: false, reason: 'entity_owned' });
    expect(runner.checkAngelAction('light.street.lamp')).toEqual({ ok: true });
    runToEnd(runner);
    expect(runner.isOwned('prop.home.curtain')).toBe(false);
    expect(runner.checkAngelAction('prop.home.curtain')).toEqual({ ok: true });

    runner.trigger(EMPTY_STREET); // angelActions blocked
    expect(runner.checkAngelAction('door.home.front')).toEqual({ ok: false, reason: 'sequence_blocked' });
    expect(runner.checkAngelAction('light.street.lamp')).toEqual({ ok: false, reason: 'entity_owned' });
  });
});

describe('queue', () => {
  it('runs sequences one at a time in trigger order', () => {
    const { runner, all } = setup();
    expect(runner.trigger(WINDOW).outcome.status).toBe('started');
    expect(runner.trigger(FELIX).outcome.status).toBe('queued');
    expect(runner.trigger(WINDOW).outcome).toMatchObject({ status: 'rejected', reason: 'already_active' });
    expect(runner.queued).toEqual<SequenceId[]>(['seq2_felix_streetlight']);
    runToEnd(runner);
    const order = all.filter((e) => e.k === 'sequenceEnd').map((e) => e.sequenceId);
    expect(order).toEqual(['atm_home_window', 'seq2_felix_streetlight']);
    // Never overlapping: Felix effects only appear after the window sequence ended.
    const endIdx = all.findIndex((e) => e.k === 'sequenceEnd');
    expect(all.slice(0, endIdx).every((e) => e.sequenceId === 'atm_home_window')).toBe(true);
    expect(runner.active).toBeNull();
  });

  it('skipping the active sequence starts the next queued one', () => {
    const { runner } = setup();
    runner.trigger(FELIX);
    runner.trigger(WINDOW);
    expect(runner.skip().skipped).toBe(true);
    expect(runner.active).toBe('atm_home_window');
  });
});

describe('forced-control budget', () => {
  const row = (id: SequenceId, kind: SequenceDef['kind'], maxForcedSeconds: number): SequenceDef => ({
    id,
    kind,
    trigger: { flag: 'home_done' },
    requires: [],
    owns: [],
    policy: { locket: 'blocked', angelActions: 'blocked', control: 'locked' },
    maxForcedSeconds,
    skippable: true,
    setsOnComplete: [],
    steps: [] as SequenceStep[],
  });
  // Numbers from docs/cinematic-controller.md section 4.
  const REGISTRY: SequenceDef[] = [
    row('seq1_empty_street', 'horror', 0),
    row('seq2_felix_streetlight', 'horror', 25),
    row('seq3_cursed_neighbour', 'horror', 0),
    row('seq4_gartner_confession', 'horror', 0),
    row('seq5_felix_mirror', 'horror', 30),
    row('seq6_two_keys', 'horror', 45),
    row('cin_felix_anchor', 'cinematic', 20),
    row('cin_ending_keeper', 'ending', 30),
    row('cin_ending_broken', 'ending', 30),
    row('atm_home_window', 'atmosphere', 0),
    row('angel_intro', 'cinematic', 0),
  ];

  it('sums one playthrough with one ending to 150 s (limit 180)', () => {
    expect(forcedControlSeconds(REGISTRY, 'cin_ending_keeper')).toBe(150);
    expect(forcedControlSeconds(REGISTRY, 'cin_ending_broken')).toBe(150);
    expect(worstCaseForcedSeconds(REGISTRY)).toBe(150);
    expect(worstCaseForcedSeconds(REGISTRY)).toBeLessThanOrEqual(180);
  });

  it('counts only one ending (both together would be 180 s)', () => {
    expect(REGISTRY.reduce((s, d) => s + d.maxForcedSeconds, 0)).toBe(180);
  });
});

describe('video step', () => {
  const clip: SequenceDef = {
    ...FELIX,
    id: 'cin_felix_anchor',
    kind: 'cinematic',
    requires: [],
    setsOnComplete: ['seq1_done'],
    steps: [{ t: 'video', clipId: 'clip_anchor', fallbackSeconds: 1 }, { t: 'setFlag', flag: 'seq1_done' }],
  };
  const flagsOf = (f: ReturnType<typeof setup>) => f.store.getState().progress.flags;

  it('emits the clip effect and ends after fallbackSeconds when no clip file plays', () => {
    const f = setup([]);
    const { effects } = f.runner.trigger(clip);
    expect(effects).toEqual([{ k: 'video', clipId: 'clip_anchor', fallbackSeconds: 1, sequenceId: 'cin_felix_anchor' }]);
    for (let i = 0; i < 59; i++) f.runner.tick(DT);
    expect(f.runner.active).toBe('cin_felix_anchor');
    for (let i = 0; i < 3; i++) f.runner.tick(DT);
    expect(f.runner.active).toBeNull();
  });

  it('waits for videoEnded (not the fallback) once the view reports the clip is playing', () => {
    const f = setup([]);
    f.runner.trigger(clip);
    f.runner.signal({ videoPlaying: 'clip_anchor' });
    for (let i = 0; i < 60 * 10; i++) f.runner.tick(DT);
    expect(f.runner.active).toBe('cin_felix_anchor');
    f.runner.signal({ videoEnded: 'clip_anchor' });
    f.runner.tick(DT);
    expect(f.runner.active).toBeNull();
    expect(flagsOf(f)).toContain('seq1_done');
  });

  it('skip stops the video and sets the flags', () => {
    const f = setup([]);
    f.runner.trigger(clip);
    f.runner.signal({ videoPlaying: 'clip_anchor' });
    const { skipped, effects } = f.runner.skip();
    expect(skipped).toBe(true);
    expect(effects.map((e) => e.k)).toContain('videoStop');
    expect(flagsOf(f)).toContain('seq1_done');
  });
});