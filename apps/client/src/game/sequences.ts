/**
 * Headless sequence runner (task 3.4). See .kiro/specs/the-last-house/docs/cinematic-controller.md,
 * as amended by the author: cinematics are generated video clips that are simply played, so the runner
 * has a `video` step and no camera, animation or look-clamp machinery.
 * Pure TypeScript: advanced by a fixed sim dt, no wall clock, no React or Three imports.
 * The view renders the typed effects the runner emits.
 *
 * Decisions where the doc is silent (also listed in the task report):
 * - `setFlag` steps are validated against `setsOnComplete` but applied at completion with the rest of
 *   `setsOnComplete`, so an interrupt never leaves a partial flag. Same for spell unlocks.
 * - `video`, `wait`, `waitFor` and `prompt` block the step list; other steps are instant.
 *   Use `parallel` to overlap them.
 * - Atmosphere overlap (disjoint `owns`) is not implemented: strictly one sequence at a time.
 */
import type { EntityId, ProgressFlag, SequenceId, SpellId } from '@tlh/shared';
import type { SetFlagResult } from './progression.ts';

/** Not yet defined in `@tlh/shared`; plain strings until the audio and voice tables exist. */
export type AudioCueId = string;
export type VoiceLineId = string;

export type ControlMode = 'full' | 'limited' | 'locked';
export type LocketPolicy = 'allowed' | 'combat_blocked' | 'blocked';

export interface SequencePolicy {
  locket: LocketPolicy;
  angelActions: 'allowed' | 'blocked';
  control: ControlMode;
}

export type SequenceStep =
  /** Plays a clip by ID. Ends on `videoEnded`, or after `fallbackSeconds` when no clip file exists. */
  | { t: 'video'; clipId: string; fallbackSeconds: number }
  | { t: 'light'; target: EntityId; effect: 'flicker' | 'on' | 'off' | 'burst' | 'color'; seconds?: number }
  | { t: 'spawn' | 'despawn'; target: EntityId }
  | { t: 'audio'; cue: AudioCueId; at?: EntityId; bus: 'sfx' | 'amb' | 'mus' | 'vo' }
  | { t: 'line'; lineId: VoiceLineId }
  | { t: 'fx'; effect: 'smoke' | 'veilRecede' | 'mirrorCrack' | 'runes' | 'glow'; target: EntityId }
  | { t: 'setFlag'; flag: ProgressFlag }
  | { t: 'unlockSpell'; spell: SpellId }
  /** orFlags: with until 'flag', any of these also ends the prompt (a two-way choice). */
  | { t: 'prompt'; textId: string; until: 'input' | 'flag'; flag?: ProgressFlag; orFlags?: ProgressFlag[] }
  | { t: 'wait'; seconds: number }
  | { t: 'waitFor'; cond: { flag: ProgressFlag } | { trigger: EntityId } | { input: 'interact' } }
  | { t: 'parallel'; steps: SequenceStep[] };

export interface SequenceDef {
  id: SequenceId;
  kind: 'horror' | 'cinematic' | 'atmosphere' | 'ending';
  trigger: { entity: EntityId } | { flag: ProgressFlag };
  requires: ProgressFlag[];
  owns: EntityId[];
  policy: SequencePolicy;
  maxForcedSeconds: number;
  skippable: boolean;
  setsOnComplete: ProgressFlag[];
  steps: SequenceStep[];
}

/** What the view renders. `sequenceId` says which sequence produced it. */
export type EffectBody =
  | { k: 'video'; clipId: string; fallbackSeconds: number }
  | { k: 'videoStop'; clipId: string }
  | { k: 'light'; target: EntityId; effect: 'flicker' | 'on' | 'off' | 'burst' | 'color'; seconds?: number }
  | { k: 'spawn'; target: EntityId }
  | { k: 'despawn'; target: EntityId }
  | { k: 'audio'; cue: AudioCueId; at?: EntityId; bus: 'sfx' | 'amb' | 'mus' | 'vo' }
  | { k: 'line'; lineId: VoiceLineId }
  | { k: 'fx'; effect: 'smoke' | 'veilRecede' | 'mirrorCrack' | 'runes' | 'glow'; target: EntityId }
  | { k: 'unlockSpell'; spell: SpellId }
  | { k: 'prompt'; textId: string; until: 'input' | 'flag'; flag?: ProgressFlag }
  | { k: 'promptEnd'; textId: string }
  | { k: 'flagSet'; flag: ProgressFlag; ok: boolean }
  | { k: 'spellUnlocked'; spell: SpellId }
  | { k: 'rollback' }
  | { k: 'sequenceEnd'; how: 'completed' | 'skipped' | 'interrupted' };
export type SequenceEffect = EffectBody & { sequenceId: SequenceId };

export const CAMERA_RESTORE_SECONDS = 0.4;
export const SKIP_HOLD_SECONDS = 1; // input-level; exposed for the input layer
export const DEFAULT_POLICY: SequencePolicy = { locket: 'allowed', angelActions: 'allowed', control: 'full' };

/** The subset of the game store the runner needs (a `GameStore` satisfies it). */
export interface SequenceStoreLike {
  getState(): { progress: { flags: readonly string[] }; setFlag: (flag: string) => SetFlagResult };
}

/**
 * `videoPlaying`: the clip file exists and is playing (the fallback timer stops).
 * `videoEnded`: it finished.
 */
export type SequenceSignal =
  | { trigger: EntityId }
  | { input: 'interact' }
  | { videoPlaying: string }
  | { videoEnded: string };
export type TriggerOutcome =
  | { status: 'started' | 'queued' }
  | { status: 'rejected'; reason: 'invalid' | 'requires_unmet' | 'already_active'; detail: string };

export interface SequenceRunnerOptions {
  store: SequenceStoreLike;
  /** Called for every effect as it is emitted (it is also returned from each runner call). */
  onEffect?: (effect: SequenceEffect) => void;
  /** Called at completion or skip for each spell the sequence unlocks (the store has no spell action yet). */
  onUnlockSpell?: (spell: SpellId, sequenceId: SequenceId) => void;
}

// ---------------------------------------------------------------------------
// Static helpers

function walk(steps: readonly SequenceStep[], visit: (s: SequenceStep) => void): void {
  for (const s of steps) {
    if (s.t === 'parallel') walk(s.steps, visit);
    else visit(s);
  }
}

/** Problems that make a def unusable. Empty means valid. */
export function validateSequenceDef(def: SequenceDef): string[] {
  const errors: string[] = [];
  const sets = new Set<string>(def.setsOnComplete);
  if (def.maxForcedSeconds < 0) errors.push('maxForcedSeconds < 0');
  walk(def.steps, (s) => {
    if (s.t === 'setFlag' && !sets.has(s.flag)) errors.push(`setFlag ${s.flag} not in setsOnComplete`);
    if (s.t === 'wait' && !(s.seconds >= 0)) errors.push('wait seconds must be >= 0');
    if (s.t === 'video' && !(s.fallbackSeconds >= 0)) errors.push('video fallbackSeconds must be >= 0');
    if (s.t === 'prompt' && s.until === 'flag' && !s.flag) errors.push('prompt until flag needs a flag');
  });
  return errors;
}

/** Spells the sequence unlocks, in step order, without duplicates. */
export function spellsOf(def: SequenceDef): SpellId[] {
  const out: SpellId[] = [];
  walk(def.steps, (s) => {
    if (s.t === 'unlockSpell' && !out.includes(s.spell)) out.push(s.spell);
  });
  return out;
}

/** Key of the world state an effect leaves behind, or null for transient effects. */
export function effectStateKey(e: EffectBody): string | null {
  switch (e.k) {
    case 'spawn':
    case 'despawn':
      return `presence:${e.target}`;
    case 'light':
      return e.effect === 'on' || e.effect === 'off' ? `light:${e.target}` : null;
    case 'unlockSpell':
      return `spell:${e.spell}`;
    case 'flagSet':
      return `flag:${e.flag}`;
    case 'spellUnlocked':
      return `spellUnlocked:${e.spell}`;
    default:
      return null;
  }
}

/** Fold effects into the last-written value per state key (for comparing runs). */
export function foldEffects(effects: readonly SequenceEffect[]): Record<string, string> {
  const state: Record<string, string> = {};
  for (const e of effects) {
    const body: Record<string, unknown> = { ...e };
    delete body.sequenceId;
    const key = effectStateKey(body as unknown as EffectBody);
    if (key) state[key] = JSON.stringify(body);
  }
  return state;
}

function stepEffect(s: SequenceStep): EffectBody | null {
  switch (s.t) {
    case 'video':
      return { k: 'video', clipId: s.clipId, fallbackSeconds: s.fallbackSeconds };
    case 'light':
      return { k: 'light', target: s.target, effect: s.effect, ...(s.seconds !== undefined && { seconds: s.seconds }) };
    case 'spawn':
      return { k: 'spawn', target: s.target };
    case 'despawn':
      return { k: 'despawn', target: s.target };
    case 'audio':
      return { k: 'audio', cue: s.cue, ...(s.at !== undefined && { at: s.at }), bus: s.bus };
    case 'line':
      return { k: 'line', lineId: s.lineId };
    case 'fx':
      return { k: 'fx', effect: s.effect, target: s.target };
    case 'unlockSpell':
      return { k: 'unlockSpell', spell: s.spell };
    case 'prompt':
      return { k: 'prompt', textId: s.textId, until: s.until, ...(s.flag !== undefined && { flag: s.flag }) };
    default:
      return null;
  }
}

/** Effects every end (complete, skip, interrupt) emits: stop every clip the sequence can play. */
function endEffects(def: SequenceDef): EffectBody[] {
  const out: EffectBody[] = [];
  walk(def.steps, (s) => {
    if (s.t === 'video') out.push({ k: 'videoStop', clipId: s.clipId });
  });
  return out;
}

/** Last persistent effect per state key, in first-seen order: what a skip applies. */
function stateEffects(def: SequenceDef): EffectBody[] {
  const last = new Map<string, EffectBody>();
  walk(def.steps, (s) => {
    const e = stepEffect(s);
    if (!e) return;
    const key = effectStateKey(e);
    if (key) last.set(key, e);
  });
  return [...last.values()];
}

/** The effects a skip emits to reach the end state (also the state a full run ends in). */
export function finalEffects(def: SequenceDef): EffectBody[] {
  return [...stateEffects(def), ...endEffects(def)];
}

/**
 * Forced-control seconds for one playthrough: every non-ending sequence plus the chosen ending
 * (docs section 4: 25 + 30 + 45 + 20 + 30 = 150, limit 180).
 */
export function forcedControlSeconds(defs: readonly SequenceDef[], ending: SequenceId): number {
  return defs.reduce((sum, d) => sum + (d.kind !== 'ending' || d.id === ending ? d.maxForcedSeconds : 0), 0);
}

/** The worst case over every ending present in `defs`. */
export function worstCaseForcedSeconds(defs: readonly SequenceDef[]): number {
  const endings = defs.filter((d) => d.kind === 'ending');
  if (endings.length === 0) return defs.reduce((s, d) => s + d.maxForcedSeconds, 0);
  return Math.max(...endings.map((e) => forcedControlSeconds(defs, e.id)));
}

// ---------------------------------------------------------------------------
// Step execution

interface ExecCtx {
  emit: (e: EffectBody) => void;
  hasFlag: (f: string) => boolean;
  signals: Set<string>;
}

const signalKey = (s: SequenceSignal): string => {
  if ('trigger' in s) return `trigger:${s.trigger}`;
  if ('input' in s) return `input:${s.input}`;
  if ('videoPlaying' in s) return `videoPlaying:${s.videoPlaying}`;
  return `videoEnded:${s.videoEnded}`;
};

/** Walks a step list. `advance(budget)` returns the unused budget; done when `done` is true. */
class Exec {
  private i = 0;
  private remaining: number | null = null; // time left on a blocking step
  private child: Exec[] | null = null; // active parallel children
  private promptId: string | null = null;
  private readonly steps: readonly SequenceStep[];
  done = false;

  constructor(steps: readonly SequenceStep[]) {
    this.steps = steps;
    if (steps.length === 0) this.done = true;
  }

  advance(budget: number, ctx: ExecCtx): number {
    while (!this.done) {
      const step = this.steps[this.i]!;
      if (step.t === 'parallel') {
        if (!this.child) this.child = step.steps.map((s) => new Exec([s]));
        let left = budget;
        for (const c of this.child) left = Math.min(left, c.advance(budget, ctx));
        if (!this.child.every((c) => c.done)) return 0;
        this.child = null;
        budget = left;
      } else if (step.t === 'video') {
        if (this.remaining === null) {
          this.remaining = step.fallbackSeconds;
          ctx.emit(stepEffect(step)!);
        }
        const ended = `videoEnded:${step.clipId}`;
        if (ctx.signals.has(ended)) {
          ctx.signals.delete(ended);
          ctx.signals.delete(`videoPlaying:${step.clipId}`);
          this.remaining = null;
        } else if (ctx.signals.has(`videoPlaying:${step.clipId}`)) {
          return 0; // a real clip is playing: wait for its end, not the fallback timer
        } else if (this.remaining > budget) {
          this.remaining -= budget;
          return 0;
        } else {
          budget -= this.remaining;
          this.remaining = null;
        }
      } else if (step.t === 'wait') {
        this.remaining ??= step.seconds;
        if (this.remaining > budget) {
          this.remaining -= budget;
          return 0;
        }
        budget -= this.remaining;
        this.remaining = null;
      } else if (step.t === 'waitFor') {
        const c = step.cond;
        const met = 'flag' in c ? ctx.hasFlag(c.flag) : ctx.signals.has(signalKey(c));
        if (!met) return 0;
        if (!('flag' in c)) ctx.signals.delete(signalKey(c));
      } else if (step.t === 'prompt') {
        if (this.promptId === null) {
          this.promptId = step.textId;
          ctx.emit(stepEffect(step)!);
        }
        const met = step.until === 'flag' ? ctx.hasFlag(step.flag!) || (step.orFlags ?? []).some((f) => ctx.hasFlag(f)) : ctx.signals.has('input:interact');
        if (!met) return 0;
        if (step.until === 'input') ctx.signals.delete('input:interact');
        ctx.emit({ k: 'promptEnd', textId: step.textId });
        this.promptId = null;
      } else if (step.t !== 'setFlag') {
        const e = stepEffect(step);
        if (e) ctx.emit(e);
      }
      // setFlag: deferred to completion by the runner, nothing to do here.
      if (++this.i >= this.steps.length) this.done = true;
    }
    return budget;
  }
}

// ---------------------------------------------------------------------------
// Runner

export interface SequenceResult {
  id: SequenceId;
  how: 'completed' | 'skipped' | 'interrupted';
  flagsSet: ProgressFlag[];
  flagsRejected: ProgressFlag[];
  spellsUnlocked: SpellId[];
  /** Camera and control restore info for the view/input layer (the view owns the camera). */
  restore: { cameraSeconds: number; requestPointerLock: true };
}

export interface SequenceRunner {
  /** Request a sequence. Starts now when idle, otherwise queues. */
  trigger(def: SequenceDef): { outcome: TriggerOutcome; effects: SequenceEffect[] };
  /** Advance by one fixed sim step. Returns the effects emitted. No-op while paused or idle. */
  tick(dt: number): SequenceEffect[];
  /** A world trigger fired, the player pressed interact, or the view reports clip state. */
  signal(signal: SequenceSignal): void;
  /** Hold-E skip (the 1 s hold is input-level). False when idle or not skippable. */
  skip(): { skipped: boolean; effects: SequenceEffect[] };
  /** Death or load: roll back the active sequence (no flags, no spells) and drop the queue. */
  interrupt(reason: 'death' | 'load'): SequenceEffect[];
  /** Locket pause. Returns whether the request was honoured under the active policy. */
  setPaused(paused: boolean, ctx?: { inCombat?: boolean }): boolean;
  readonly isPaused: boolean;
  readonly active: SequenceId | null;
  readonly queued: readonly SequenceId[];
  /** Policy of the active sequence, or the free-play default. */
  readonly policy: SequencePolicy;
  /** Entities owned by the active sequence. */
  readonly ownedEntities: readonly EntityId[];
  isOwned(entity: EntityId): boolean;
  /** For the Angel action validator: reject actions on owned entities, or any action when blocked. */
  checkAngelAction(target: EntityId): { ok: true } | { ok: false; reason: 'sequence_blocked' | 'entity_owned' };
  readonly results: readonly SequenceResult[];
}

const RESTORE = { cameraSeconds: CAMERA_RESTORE_SECONDS, requestPointerLock: true } as const;

export function createSequenceRunner(options: SequenceRunnerOptions): SequenceRunner {
  const { store } = options;
  let activeDef: SequenceDef | null = null;
  let exec: Exec | null = null;
  let paused = false;
  const queue: SequenceDef[] = [];
  const signals = new Set<string>();
  const results: SequenceResult[] = [];

  const hasFlag = (f: string) => store.getState().progress.flags.includes(f);

  function makeEmitter(out: SequenceEffect[], id: SequenceId) {
    return (body: EffectBody) => {
      const e = { ...body, sequenceId: id } as SequenceEffect;
      out.push(e);
      options.onEffect?.(e);
    };
  }

  function reset(): void {
    activeDef = null;
    exec = null;
    paused = false;
    signals.clear();
  }

  function begin(def: SequenceDef, out: SequenceEffect[]): void {
    reset();
    activeDef = def;
    exec = new Exec(def.steps);
    pump(0, out);
  }

  /** Advance the active sequence, finishing it and starting queued ones as needed. */
  function pump(dt: number, out: SequenceEffect[]): void {
    let budget = dt;
    while (activeDef && exec) {
      const def = activeDef;
      exec.advance(budget, { emit: makeEmitter(out, def.id), hasFlag, signals });
      if (!exec.done) return;
      finish(def, 'completed', out);
      const next = queue.shift();
      if (!next) return;
      activeDef = next;
      exec = new Exec(next.steps);
      budget = 0;
    }
  }

  function finish(def: SequenceDef, how: 'completed' | 'skipped', out: SequenceEffect[]): void {
    const emit = makeEmitter(out, def.id);
    if (how === 'skipped') for (const e of stateEffects(def)) emit(e);
    for (const e of endEffects(def)) emit(e);
    // Commit: flags in setsOnComplete order, then spells in step order.
    const flagsSet: ProgressFlag[] = [];
    const flagsRejected: ProgressFlag[] = [];
    for (const flag of def.setsOnComplete) {
      const r = store.getState().setFlag(flag);
      if (r.ok) flagsSet.push(flag);
      else flagsRejected.push(flag);
      emit({ k: 'flagSet', flag, ok: r.ok });
    }
    const spells = spellsOf(def);
    for (const spell of spells) {
      options.onUnlockSpell?.(spell, def.id);
      emit({ k: 'spellUnlocked', spell });
    }
    emit({ k: 'sequenceEnd', how });
    results.push({ id: def.id, how, flagsSet, flagsRejected, spellsUnlocked: spells, restore: RESTORE });
    reset();
  }

  return {
    trigger(def) {
      const out: SequenceEffect[] = [];
      const errors = validateSequenceDef(def);
      if (errors.length > 0) {
        return { outcome: { status: 'rejected', reason: 'invalid', detail: errors.join('; ') }, effects: out };
      }
      const missing = def.requires.filter((f) => !hasFlag(f));
      if (missing.length > 0) {
        return { outcome: { status: 'rejected', reason: 'requires_unmet', detail: missing.join(', ') }, effects: out };
      }
      if (activeDef?.id === def.id || queue.some((q) => q.id === def.id)) {
        return { outcome: { status: 'rejected', reason: 'already_active', detail: def.id }, effects: out };
      }
      if (activeDef) {
        queue.push(def);
        return { outcome: { status: 'queued' }, effects: out };
      }
      begin(def, out);
      return { outcome: { status: 'started' }, effects: out };
    },
    tick(dt) {
      const out: SequenceEffect[] = [];
      if (activeDef && !paused) pump(dt, out);
      return out;
    },
    signal(s) {
      if (activeDef) signals.add(signalKey(s));
    },
    skip() {
      const out: SequenceEffect[] = [];
      if (!activeDef || !activeDef.skippable) return { skipped: false, effects: out };
      finish(activeDef, 'skipped', out);
      const next = queue.shift();
      if (next) begin(next, out);
      return { skipped: true, effects: out };
    },
    interrupt() {
      const out: SequenceEffect[] = [];
      if (activeDef) {
        const def = activeDef;
        const emit = makeEmitter(out, def.id);
        emit({ k: 'rollback' });
        for (const e of endEffects(def)) emit(e);
        emit({ k: 'sequenceEnd', how: 'interrupted' });
        results.push({ id: def.id, how: 'interrupted', flagsSet: [], flagsRejected: [], spellsUnlocked: [], restore: RESTORE });
      }
      reset();
      queue.length = 0;
      return out;
    },
    setPaused(p, ctx) {
      if (!activeDef) return false;
      const locket = activeDef.policy.locket;
      const ok = !p || locket === 'allowed' || (locket === 'combat_blocked' && !ctx?.inCombat);
      if (!ok) return false;
      paused = p;
      return true;
    },
    get isPaused() {
      return paused;
    },
    get active() {
      return activeDef?.id ?? null;
    },
    get queued() {
      return queue.map((q) => q.id);
    },
    get policy() {
      return activeDef?.policy ?? DEFAULT_POLICY;
    },
    get ownedEntities() {
      return activeDef?.owns ?? [];
    },
    isOwned(entity) {
      return activeDef?.owns.includes(entity) ?? false;
    },
    checkAngelAction(target) {
      if (!activeDef) return { ok: true };
      if (activeDef.owns.includes(target)) return { ok: false, reason: 'entity_owned' };
      if (activeDef.policy.angelActions === 'blocked') return { ok: false, reason: 'sequence_blocked' };
      return { ok: true };
    },
    results,
  };
}
