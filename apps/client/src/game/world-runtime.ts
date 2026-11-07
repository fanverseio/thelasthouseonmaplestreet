/**
 * World runtime: the headless, data-driven layer that makes the world playable (no React, no Three).
 * It interprets content/interactions (interactions, trigger volumes, hints) and content/sequences
 * against the game store. Flags are only ever written through the store's `setFlag`.
 *
 * Driven by the view: `tick(dt, pose)` with a fixed sim step while the phase is `playing`, and
 * `interact(pose)` when E is pressed. Time is sim time only, so every timer freezes with the sim.
 * To add a beat: add data files (see docs in the task report); this file does not change.
 */
import { moralityBand, type EntityId, type ProgressFlag } from '@tlh/shared';
import { ALL_INTERACTIONS } from '../content/interactions/index.ts';
import type { Action, Cond, InteractionContent, InteractionDef } from '../content/interactions/types.ts';
import { getLine } from '../content/dialogue/index.ts';
import { ALL_SEQUENCES } from '../content/sequences/index.ts';
import { PLACEMENTS, type Placement } from '../content/world/placements.ts';
import type { GameStore } from '../store/game-store.ts';
import { canOpenLocket, emptyPlayed, markPlayed, selectClassicLine, type LocketPolicy, type PlayedLines } from './dialogue.ts';
import { highlightsOf, hintLevelOf, initialHintState, stepHint, type HintState } from './hints.ts';
import { findNearest, INTERACT_RANGE, pickUp, useSocket as consumeSocket, type Hit, type Interactable } from './interaction.ts';
import { createSequenceRunner, type SequenceDef, type SequenceEffect, type SequenceRunner, type SequenceSignal } from './sequences.ts';

export interface PlayerPose {
  x: number;
  z: number;
  /** Optional: when given, targets behind the player are ignored. */
  yaw?: number;
}

export interface SpokenLine {
  lineId: string;
  speaker: string;
  text: string;
}

export type InteractResult =
  | { status: 'none' }
  | { status: 'done'; id: EntityId }
  | { status: 'refused'; id: EntityId; reason: string };

/** What the greybox view draws for an entity that is currently present. */
export interface VisibleEntity {
  id: EntityId;
  x: number;
  z: number;
  r: number;
  /** The player could use it right now. */
  interactive: boolean;
  /** A puzzle hint asks the view to highlight it. */
  highlighted: boolean;
}

/** Plain, serialisable runtime state (sequence progress restarts from the last checkpoint on load). */
export interface RuntimeState {
  simTime: number;
  firedTriggers: string[];
  scheduled: { at: number; line: string }[];
  hints: Record<string, HintState>;
  played: PlayedLines;
  subtitle: (SpokenLine & { until: number }) | null;
}

export interface RuntimeContent {
  interactions: InteractionContent;
  sequences: readonly SequenceDef[];
  placements: Readonly<Record<EntityId, Placement>>;
}

export interface WorldRuntimeOptions {
  store: GameStore;
  content?: Partial<RuntimeContent>;
  /** Called for every spoken line (the voice layer hooks in here). */
  onLine?: (line: SpokenLine) => void;
}

export interface WorldRuntime {
  tick(dt: number, pose: PlayerPose): void;
  interact(pose: PlayerPose): InteractResult;
  nearest(pose: PlayerPose): Hit | null;
  /** The sequence runner asked for / ended a clip: view reports clip state here. */
  signal(signal: SequenceSignal): void;
  /** Present entities for the greybox view. */
  visibleEntities(): VisibleEntity[];
  /** T: allowed now (phase check is the caller's). */
  canOpenLocket(): boolean;
  /** Next Classic locket line (marks it played), or null. `hasNext` says another unplayed line follows. */
  locketLine(): { line: SpokenLine; hasNext: boolean } | null;
  readonly locketPolicy: LocketPolicy;
  /** HUD prompt such as "E  Open the front door", or null. */
  readonly prompt: string | null;
  readonly subtitle: SpokenLine | null;
  /** Active sequence video clip (placeholder overlay), or null. */
  readonly video: { clipId: string; fallbackSeconds: number } | null;
  readonly highlights: readonly EntityId[];
  readonly sequences: SequenceRunner;
  readonly simTime: number;
  /** Every line spoken so far, in order (capped); handy for tests and the journal later. */
  readonly spoken: readonly string[];
  /** Bumps whenever prompt, subtitle, video or highlights change (for useSyncExternalStore). */
  readonly version: number;
  subscribe(listener: () => void): () => void;
  getState(): RuntimeState;
  restore(state: RuntimeState): void;
}

const MAX_SPOKEN = 200;

/** Seconds a subtitle stays up: time to read it, at least 2.5. */
export function subtitleSeconds(text: string): number {
  return Math.max(2.5, 1.5 + text.length * 0.055);
}

/** Which story beat (1-4 have Classic lines) the flags are in. */
export function beatOfFlags(flags: readonly ProgressFlag[]): number {
  if (flags.includes('seq3_done')) return 5;
  if (flags.includes('seq2_done')) return 4;
  if (flags.includes('seq1_done')) return 3;
  if (flags.includes('home_done')) return 2;
  return 1;
}

export function createWorldRuntime(options: WorldRuntimeOptions): WorldRuntime {
  const { store } = options;
  const content: RuntimeContent = {
    interactions: options.content?.interactions ?? ALL_INTERACTIONS,
    sequences: options.content?.sequences ?? ALL_SEQUENCES,
    placements: options.content?.placements ?? PLACEMENTS,
  };
  const { interactions: defs, triggers, hints } = content.interactions;

  let simTime = 0;
  let fired = new Set<string>();
  let scheduled: { at: number; line: string }[] = [];
  let hintStates: Record<string, HintState> = Object.fromEntries(hints.map((h) => [h.id, initialHintState()]));
  let played: PlayedLines = emptyPlayed();
  let subtitle: (SpokenLine & { until: number }) | null = null;
  let video: { clipId: string; fallbackSeconds: number } | null = null;
  let prompt: string | null = null;
  let version = 0;
  let spoken: string[] = [];
  const listeners = new Set<() => void>();

  const changed = () => {
    version++;
    for (const l of listeners) l();
  };

  const progress = () => store.getState().progress;

  function holds(c: Cond | undefined): boolean {
    if (!c) return true;
    const { flags, carried } = progress();
    return (
      (c.flags ?? []).every((f) => flags.includes(f)) &&
      !(c.notFlags ?? []).some((f) => flags.includes(f)) &&
      (c.carried ?? []).every((i) => carried.includes(i))
    );
  }

  function say(lineId: string): void {
    const line = getLine(lineId);
    if (!line) return;
    const s = { lineId: line.id, speaker: line.speaker, text: line.text };
    subtitle = { ...s, until: simTime + subtitleSeconds(line.text) };
    spoken.push(line.id);
    if (spoken.length > MAX_SPOKEN) spoken = spoken.slice(-MAX_SPOKEN);
    options.onLine?.(s);
    changed();
  }

  const runner = createSequenceRunner({
    store,
    onEffect: (e: SequenceEffect) => {
      if (e.k === 'line') say(e.lineId);
      else if (e.k === 'video') {
        video = { clipId: e.clipId, fallbackSeconds: e.fallbackSeconds };
        changed();
      } else if (e.k === 'videoStop' && video?.clipId === e.clipId) {
        video = null;
        changed();
      }
    },
  });

  /** Runs actions in order; stops at the first failure and returns its reason. */
  function run(actions: readonly Action[]): string | null {
    for (const a of actions) {
      switch (a.do) {
        case 'setFlag': {
          const r = store.getState().setFlag(a.flag);
          if (!r.ok) return `${r.reason}: ${r.detail}`;
          break;
        }
        case 'pickUp': {
          const r = pickUp(progress().carried, a.item);
          if (!r.ok) return `pickup_${r.reason}`;
          store.setState((s) => ({ progress: { ...s.progress, carried: r.carried } }));
          break;
        }
        case 'useSocket': {
          const r = consumeSocket(progress().carried, { id: '' as EntityId, accepts: a.item });
          if (!r.ok) return r.reason;
          store.setState((s) => ({ progress: { ...s.progress, carried: r.carried } }));
          break;
        }
        case 'say':
          if (a.after && a.after > 0) scheduled.push({ at: simTime + a.after, line: a.line });
          else say(a.line);
          break;
        case 'startSequence': {
          const def = content.sequences.find((s) => s.id === a.sequence);
          if (!def) return `unknown_sequence: ${a.sequence}`;
          const { outcome } = runner.trigger(def);
          if (outcome.status === 'rejected') return `${outcome.reason}: ${outcome.detail}`;
          break;
        }
        case 'checkpoint':
          store.getState().writeCheckpointForEvent(a.event);
          break;
      }
    }
    return null;
  }

  const defOf = (id: EntityId): InteractionDef | undefined => defs.find((d) => d.id === id);

  function interactables(): Interactable[] {
    const out: Interactable[] = [];
    for (const d of defs) {
      const p = content.placements[d.id];
      if (!p || !holds(d.show)) continue;
      const locked = !holds(d.requires);
      out.push({ id: d.id, x: p.x, z: p.z, prompt: locked ? (d.lockedPrompt ?? d.prompt) : d.prompt, enabled: true });
    }
    return out;
  }

  function nearest(pose: PlayerPose): Hit | null {
    return findNearest(pose.x, pose.z, interactables(), INTERACT_RANGE, pose.yaw);
  }

  function highlights(): EntityId[] {
    return hints.flatMap((h) => highlightsOf(h, hintStates[h.id]!));
  }

  function hintLevel(): number {
    return hints.reduce((m, h) => Math.max(m, hintLevelOf(hintStates[h.id]!)), 0);
  }

  /** Puzzle hints: advance by dt sim seconds (0 re-checks the flags right after an interaction). */
  function advanceHints(dt: number): void {
    const before = highlights().join();
    for (const h of hints) {
      const r = stepHint(h, hintStates[h.id]!, progress().flags, dt);
      hintStates[h.id] = r.state;
      for (const step of r.fired) if (step.say) say(step.say);
    }
    if (highlights().join() !== before) changed();
  }

  function tick(dt: number, pose: PlayerPose): void {
    simTime += dt;
    // Delayed lines
    if (scheduled.length > 0) {
      const due = scheduled.filter((s) => s.at <= simTime);
      scheduled = scheduled.filter((s) => s.at > simTime);
      for (const s of due) say(s.line);
    }
    runner.tick(dt);
    // Trigger volumes fire once
    for (const t of triggers) {
      if (fired.has(t.id)) continue;
      const p = content.placements[t.id];
      if (!p || Math.hypot(pose.x - p.x, pose.z - p.z) > p.r || !holds(t.requires)) continue;
      fired.add(t.id);
      run(t.actions);
      runner.signal({ trigger: t.id });
    }
    advanceHints(dt);
    if (subtitle && simTime >= subtitle.until) {
      subtitle = null;
      changed();
    }
    const hit = nearest(pose);
    const next = hit ? `E  ${hit.target.prompt}` : null;
    if (next !== prompt) {
      prompt = next;
      changed();
    }
  }

  function interact(pose: PlayerPose): InteractResult {
    runner.signal({ input: 'interact' });
    const hit = nearest(pose);
    if (!hit) return { status: 'none' };
    const id = hit.target.id;
    const def = defOf(id)!;
    if (!holds(def.requires)) {
      if (def.onRefuse) run(def.onRefuse);
      return { status: 'refused', id, reason: 'requires' };
    }
    const failure = run(def.actions);
    advanceHints(0);
    return failure === null ? { status: 'done', id } : { status: 'refused', id, reason: failure };
  }

  function locketLine() {
    const { flags, morality } = progress();
    const ctx = {
      beat: beatOfFlags(flags),
      band: moralityBand(morality.value),
      flags,
      zone: flags.includes('home_done') ? ('street' as const) : ('home' as const),
      ...(hintLevel() > 0 && { puzzle: { id: 'p1_drawer' as const, hintLevel: hintLevel() } }),
      played,
    };
    const pick = selectClassicLine(ctx);
    if (!pick) return null;
    const line = getLine(pick.id);
    if (!line) return null;
    played = markPlayed(played, pick.id);
    const speaker = { lineId: line.id, speaker: line.speaker, text: line.text };
    options.onLine?.(speaker);
    const next = selectClassicLine({ ...ctx, played });
    return { line: speaker, hasNext: next !== null && (played[next.id] ?? 0) === 0 };
  }

  return {
    tick,
    interact,
    nearest,
    signal: (s) => runner.signal(s),
    visibleEntities() {
      const hl = new Set(highlights());
      const live = new Map(interactables().map((i) => [i.id, i]));
      return Object.entries(content.placements).flatMap(([id, p]) => {
        const def = defOf(id as EntityId);
        // Only entities that have an interaction are drawn as props; hidden ones are gone.
        if (!def || !holds(def.show)) return [];
        return [{ id: id as EntityId, x: p.x, z: p.z, r: p.r, interactive: live.has(id as EntityId), highlighted: hl.has(id as EntityId) }];
      });
    },
    canOpenLocket: () => canOpenLocket(progress().flags, runner.policy.locket, false),
    locketLine,
    get locketPolicy() {
      return runner.policy.locket;
    },
    get prompt() {
      return prompt;
    },
    get subtitle() {
      return subtitle ? { lineId: subtitle.lineId, speaker: subtitle.speaker, text: subtitle.text } : null;
    },
    get video() {
      return video;
    },
    get highlights() {
      return highlights();
    },
    sequences: runner,
    get simTime() {
      return simTime;
    },
    get spoken() {
      return spoken;
    },
    get version() {
      return version;
    },
    subscribe(l) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    getState: () => ({
      simTime,
      firedTriggers: [...fired],
      scheduled: scheduled.map((s) => ({ ...s })),
      hints: { ...hintStates },
      played: { ...played },
      subtitle: subtitle ? { ...subtitle } : null,
    }),
    restore(s) {
      simTime = s.simTime;
      fired = new Set(s.firedTriggers);
      scheduled = s.scheduled.map((x) => ({ ...x }));
      hintStates = { ...s.hints };
      played = { ...s.played };
      subtitle = s.subtitle ? { ...s.subtitle } : null;
      changed();
    },
  };
}
