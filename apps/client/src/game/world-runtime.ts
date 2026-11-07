/**
 * World runtime: the headless, data-driven layer that makes the world playable (no React, no Three).
 * It interprets content/interactions (interactions, trigger volumes, hints) and content/sequences
 * against the game store. Flags are only ever written through the store's `setFlag`.
 *
 * Driven by the view: `tick(dt, pose)` with a fixed sim step while the phase is `playing`, and
 * `interact(pose)` when E is pressed. Time is sim time only, so every timer freezes with the sim.
 * To add a beat: add data files (see docs in the task report); this file does not change.
 */
import { moralityBand, type EntityId, type ProgressFlag, type SceneId } from '@tlh/shared';
import { ALL_INTERACTIONS } from '../content/interactions/index.ts';
import type { Action, Cond, EntityCheck, InteractionContent, InteractionDef } from '../content/interactions/types.ts';
import { getLine } from '../content/dialogue/index.ts';
import { ALL_SEQUENCES } from '../content/sequences/index.ts';
import { PLACEMENTS, type Placement } from '../content/world/placements.ts';
import { sceneOfEntity } from '../content/world/scene-of.ts';
import type { GameStore } from '../store/game-store.ts';
import { checkpointForEvent } from './checkpoints.ts';
import { canOpenLocket, emptyPlayed, markPlayed, selectClassicLine, type LocketPolicy, type PlayedLines } from './dialogue.ts';
import { highlightsOf, hintLevelOf, initialHintState, stepHint, type HintState } from './hints.ts';
import { findAllInRange, INTERACT_RANGE, pickUp, useSocket as consumeSocket, type Hit, type Interactable } from './interaction.ts';
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
  /** A hold interaction has started; it completes in `tick` while E stays down (see `hold`). */
  | { status: 'holding'; id: EntityId }
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
  scheduled: { at: number; line?: string; tut?: { textId: string; seconds: number } }[];
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
  /** Called for every sequence effect (audio cues, fx) the runtime itself does not render. */
  onEffect?: (effect: SequenceEffect) => void;
  /** An `encounter` action fired. Returns a failure reason, or null on success (game/encounter-runtime.ts). */
  onEncounter?: (op: 'interact', id: string) => string | null;
  /**
   * An enterScene action asks for a scene. Return a promise while its code is still loading (the switch waits
   * for it), or null/undefined when it is ready now. Without this hook the switch is immediate.
   */
  loadScene?: (scene: SceneId) => Promise<unknown> | null | undefined;
  /** Called at the end of every tick (the encounter runtime advances here). */
  onTick?: (dt: number, pose: PlayerPose) => void;
  /** True while a hostile enemy is active: the locket's `combat_blocked` policy then applies. */
  inCombat?: () => boolean;
  /** A `finale` action fired (game/ending.ts). Returns a failure reason, or null on success. */
  onFinale?: (op: 'choice') => string | null;
}

export interface WorldRuntime {
  tick(dt: number, pose: PlayerPose): void;
  interact(pose: PlayerPose): InteractResult;
  /** Tell the runtime whether E is down right now (the view calls this before `interact` and every step). */
  setHeld(down: boolean): void;
  /** The running hold interaction (progress 0..1, sim time), or null. */
  readonly hold: { id: EntityId; progress: number; seconds: number } | null;
  nearest(pose: PlayerPose): Hit | null;
  /** Pick the next action in the side panel (Q). No effect with fewer than two actions in range. */
  cycleAction(): void;
  /** Actions in range for the side panel, nearest first. selected is the one E will use. */
  readonly actions: readonly ActionOption[];
  /** The sequence runner asked for / ended a clip: view reports clip state here. */
  signal(signal: SequenceSignal): void;
  /** Speak a dialogue line now, or after sim seconds from now. */
  say(lineId: string, after?: number): void;
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
  /** The scene an enterScene action is waiting to load (the view shows a loading screen), or null. */
  readonly sceneLoading: SceneId | null;
  readonly highlights: readonly EntityId[];
  /** Current HUD tutorial prompt id (movement, bolt), or null. */
  readonly tutorial: string | null;
  /** Last sequence light effect per light (view animates flicker from at + seconds, sim time). */
  readonly lights: Readonly<Record<string, LightFx>>;
  /** Entities a sequence has spawned and not despawned (e.g. the window shadow). */
  readonly present: ReadonlySet<EntityId>;
  readonly sequences: SequenceRunner;
  /** The open overlay puzzle, or null. While set the phase is 'overlay' and the sim is frozen. */
  readonly overlay: { puzzle: 'p3_padlock' | 'p5_board' } | null;
  /** Open an overlay puzzle (same as the `openPuzzle` action). */
  openOverlay(puzzle: 'p3_padlock' | 'p5_board'): void;
  /** Close the overlay: phase becomes 'paused' (then "Click to resume"). Puzzle state stays in the store. */
  closeOverlay(): void;
  readonly simTime: number;
  /** Every line spoken so far, in order (capped); handy for tests and the journal later. */
  readonly spoken: readonly string[];
  /** Bumps whenever prompt, subtitle, video or highlights change (for useSyncExternalStore). */
  readonly version: number;
  subscribe(listener: () => void): () => void;
  getState(): RuntimeState;
  restore(state: RuntimeState): void;
}

export interface ActionOption {
  id: EntityId;
  prompt: string;
  selected: boolean;
}

export interface LightFx {
  effect: 'flicker' | 'on' | 'off' | 'burst' | 'color';
  at: number;
  seconds: number;
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
  let scheduled: RuntimeState['scheduled'] = [];
  let tutorial: { textId: string; until: number } | null = null;
  let lights: Record<string, LightFx> = {};
  const present = new Set<EntityId>();
  let hintStates: Record<string, HintState> = Object.fromEntries(hints.map((h) => [h.id, initialHintState()]));
  let played: PlayedLines = emptyPlayed();
  let subtitle: (SpokenLine & { until: number }) | null = null;
  let video: { clipId: string; fallbackSeconds: number } | null = null;
  let prompt: string | null = null;
  let sceneLoading: SceneId | null = null;
  let version = 0;
  let overlay: { puzzle: 'p3_padlock' | 'p5_board' } | null = null;
  let spoken: string[] = [];
  let held = false;
  let holdState: { id: EntityId; elapsed: number; seconds: number } | null = null;
  const listeners = new Set<() => void>();

  const changed = () => {
    version++;
    for (const l of listeners) l();
  };

  const progress = () => store.getState().progress;

  const entityIs = (e: EntityCheck): boolean => store.getState().world.entities[e.id]?.[e.key] === e.is;

  function holds(c: Cond | undefined): boolean {
    if (!c) return true;
    const { flags, carried } = progress();
    return (
      (c.flags ?? []).every((f) => flags.includes(f)) &&
      !(c.notFlags ?? []).some((f) => flags.includes(f)) &&
      (c.carried ?? []).every((i) => carried.includes(i)) &&
      (c.entities ?? []).every(entityIs) &&
      !(c.notEntities ?? []).some(entityIs) &&
      (c.spell === undefined || (store.getState().player.selectedSpell === c.spell && store.getState().player.spellsUnlocked.includes(c.spell)))
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
    onUnlockSpell: (spell) => {
      store.setState((s) =>
        s.player.spellsUnlocked.includes(spell) ? s : { player: { ...s.player, spellsUnlocked: [...s.player.spellsUnlocked, spell] } },
      );
    },
    onEffect: (e: SequenceEffect) => {
      options.onEffect?.(e);
      if (e.k === 'light') {
        lights = { ...lights, [e.target]: { effect: e.effect, at: simTime, seconds: e.seconds ?? 2 } };
        changed();
      } else if (e.k === 'spawn' || e.k === 'despawn') {
        if (e.k === 'spawn') present.add(e.target);
        else present.delete(e.target);
        changed();
      } else if (e.k === 'line') say(e.lineId);
      else if (e.k === 'video') {
        video = { clipId: e.clipId, fallbackSeconds: e.fallbackSeconds };
        changed();
      } else if (e.k === 'videoStop' && video?.clipId === e.clipId) {
        video = null;
        changed();
      }
    },
  });

  function showTutorial(textId: string, seconds: number): void {
    tutorial = { textId, until: simTime + seconds };
    changed();
  }

  function openOverlay(puzzle: 'p3_padlock' | 'p5_board'): void {
    overlay = { puzzle };
    store.getState().setPhase('overlay');
    changed();
  }

  /** Is this entity part of the scene that is on screen? (Exterior and Last House share one placement table.) */
  const inScene = (id: string): boolean => sceneOfEntity(id) === store.getState().game.scene;

  /** Switch scene now: Elena stands at the event checkpoint's spawn, the scene changes, then the checkpoint is written. */
  function commitScene(scene: SceneId, event: string | undefined): void {
    const cp = event ? checkpointForEvent(event) : null;
    if (cp) store.setState((s) => ({ player: { ...s.player, pos: [cp.spawn.x, 0, cp.spawn.z], yaw: cp.spawn.yaw } }));
    store.getState().setScene(scene);
    if (event) store.getState().writeCheckpointForEvent(event);
    selectedId = null;
    prompt = null;
    changed();
  }

  /** `enterScene`: waits for the scene's code (the loader promise) before switching; one switch at a time. */
  function enterScene(scene: SceneId, event: string | undefined): string | null {
    if (sceneLoading) return 'scene_loading';
    if (store.getState().game.scene === scene) return null;
    const pending = options.loadScene?.(scene);
    if (!pending) {
      commitScene(scene, event);
      return null;
    }
    sceneLoading = scene;
    changed();
    pending.then(
      () => {
        if (sceneLoading !== scene) return;
        sceneLoading = null;
        commitScene(scene, event);
      },
      () => {
        sceneLoading = null; // the code failed to load: stay where we are; pressing the door again retries
        changed();
      },
    );
    return null;
  }

  function closeOverlay(): void {
    if (!overlay) return;
    overlay = null;
    store.getState().setPhase('paused');
    changed();
  }

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
        case 'tutorial':
          if (a.after && a.after > 0) scheduled.push({ at: simTime + a.after, tut: { textId: a.textId, seconds: a.seconds } });
          else showTutorial(a.textId, a.seconds);
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
        case 'openPuzzle':
          openOverlay(a.puzzle);
          break;
        case 'enterScene': {
          const failure = enterScene(a.scene, a.event);
          if (failure) return failure;
          break;
        }
        case 'setEntity':
          store.setState((s) => ({
            world: { ...s.world, entities: { ...s.world.entities, [a.id]: { ...s.world.entities[a.id], [a.key]: a.value } } },
          }));
          changed();
          break;
        case 'finale': {
          const failure = options.onFinale?.(a.op) ?? (options.onFinale ? null : 'no_finale_runtime');
          if (failure) return failure;
          break;
        }
        case 'encounter': {
          const failure = options.onEncounter?.(a.op, a.id) ?? (options.onEncounter ? null : 'no_encounter_runtime');
          if (failure) return failure;
          break;
        }
      }
    }
    return null;
  }

  /** Several defs may share an entity when their show conditions differ; the one shown wins. */
  const defOf = (id: EntityId): InteractionDef | undefined =>
    defs.find((d) => d.id === id && holds(d.show)) ?? defs.find((d) => d.id === id);

  function interactables(): Interactable[] {
    const out: Interactable[] = [];
    for (const d of defs) {
      const p = content.placements[d.id];
      if (!p || !holds(d.show) || !inScene(d.id)) continue;
      const locked = !holds(d.requires);
      if (out.some((o) => o.id === d.id)) continue;
      out.push({ id: d.id, x: p.x, z: p.z, prompt: locked ? (d.lockedPrompt ?? d.prompt) : d.prompt, enabled: true });
    }
    return out;
  }

  let selectedId: EntityId | null = null;
  let actionList: ActionOption[] = [];

  function inRange(pose: PlayerPose): Hit[] {
    return findAllInRange(pose.x, pose.z, interactables(), INTERACT_RANGE, pose.yaw);
  }

  /** The hit E will use: the panel's selection if still in range, else the nearest. */
  function pick(hits: Hit[]): Hit | null {
    return hits.find((h) => h.target.id === selectedId) ?? hits[0] ?? null;
  }

  function nearest(pose: PlayerPose): Hit | null {
    return pick(inRange(pose));
  }

  let lastPose: PlayerPose = { x: 0, z: 0, yaw: 0 };

  function cycleAction(): void {
    const hits = inRange(lastPose);
    if (hits.length < 2) return;
    const i = hits.findIndex((h) => h.target.id === pick(hits)?.target.id);
    selectedId = hits[(i + 1) % hits.length]!.target.id;
    refreshActions(lastPose);
  }

  function refreshActions(pose: PlayerPose): void {
    lastPose = pose;
    const hits = inRange(pose).slice(0, 4);
    const chosen = pick(hits)?.target.id ?? null;
    const next = hits.map((h) => ({ id: h.target.id, prompt: h.target.prompt, selected: h.target.id === chosen }));
    const same = next.length === actionList.length && next.every((n, i) => n.id === actionList[i]!.id && n.prompt === actionList[i]!.prompt && n.selected === actionList[i]!.selected);
    if (!same) {
      actionList = next;
      changed();
    }
  }

  function highlights(): EntityId[] {
    return hints.flatMap((h) => highlightsOf(h, hintStates[h.id]!));
  }

  /** Level of the P1 hints only (the Classic locket lines are keyed to P1). */
  function hintLevel(): number {
    return hints.reduce((m, h) => (h.puzzle === 'p1_drawer' ? Math.max(m, hintLevelOf(hintStates[h.id]!)) : m), 0);
  }

  /** A hint with `near` only counts time while Elena is close to that entity. */
  function hintDt(h: (typeof hints)[number], dt: number): number {
    if (!h.near) return dt;
    const p = content.placements[h.near.entity];
    return p && Math.hypot(lastPose.x - p.x, lastPose.z - p.z) <= h.near.radius ? dt : 0;
  }

  /** Puzzle hints: advance by dt sim seconds (0 re-checks the flags right after an interaction). */
  function advanceHints(dt: number): void {
    const before = highlights().join();
    for (const h of hints) {
      const r = stepHint(h, hintStates[h.id]!, progress().flags, hintDt(h, dt));
      hintStates[h.id] = r.state;
      for (const step of r.fired) {
        if (step.say) say(step.say);
        if (step.flicker) {
          lights = { ...lights, [step.flicker]: { effect: 'flicker', at: simTime, seconds: 4 } };
          changed();
        }
      }
    }
    if (highlights().join() !== before) changed();
  }

  function tick(dt: number, pose: PlayerPose): void {
    simTime += dt;
    // Delayed lines
    if (scheduled.length > 0) {
      const due = scheduled.filter((s) => s.at <= simTime);
      scheduled = scheduled.filter((s) => s.at > simTime);
      for (const s of due) {
        if (s.line) say(s.line);
        if (s.tut) showTutorial(s.tut.textId, s.tut.seconds);
      }
    }
    lastPose = pose;
    runner.tick(dt);
    // Trigger volumes fire once
    for (const t of triggers) {
      if (fired.has(t.id) || !inScene(t.id)) continue;
      const p = content.placements[t.id];
      if (!p || Math.hypot(pose.x - p.x, pose.z - p.z) > p.r || !holds(t.requires)) continue;
      fired.add(t.id);
      run(t.actions);
      runner.signal({ trigger: t.id });
    }
    // Flag rules: run once when the flag first appears (any writer).
    for (const rule of content.interactions.onFlag ?? []) {
      const key = `flag:${rule.flag}`;
      if (fired.has(key) || !progress().flags.includes(rule.flag)) continue;
      fired.add(key);
      if (holds(rule.when)) run(rule.actions);
    }
    stepHold(dt);
    // Condition rules: run once when the condition first holds (rune progress and the like).
    for (const rule of content.interactions.onCond ?? []) {
      const key = `cond:${rule.id}`;
      if (fired.has(key) || !holds(rule.when)) continue;
      fired.add(key);
      run(rule.actions);
    }
    advanceHints(dt);
    options.onTick?.(dt, pose);
    if (tutorial && simTime >= tutorial.until) {
      tutorial = null;
      changed();
    }
    if (subtitle && simTime >= subtitle.until) {
      subtitle = null;
      changed();
    }
    refreshActions(pose);
    const hit = nearest(pose);
    const next = hit ? `E  ${hit.target.prompt}` : null;
    if (next !== prompt) {
      prompt = next;
      changed();
    }
  }

  /** Why the running hold must stop, or null while it may go on. */
  function holdBroken(h: NonNullable<typeof holdState>): boolean {
    const def = defOf(h.id);
    const p = content.placements[h.id];
    if (!held || !def || !def.hold || !p || !holds(def.show) || !holds(def.requires)) return true;
    if (runner.policy.control === 'locked' || video) return true;
    return Math.hypot(lastPose.x - p.x, lastPose.z - p.z) > INTERACT_RANGE + p.r;
  }

  /** Advances the running hold by one sim step; completes it (runs the actions) or cancels it. */
  function stepHold(dt: number): void {
    const h = holdState;
    if (!h) return;
    if (holdBroken(h)) {
      holdState = null;
      changed();
      return;
    }
    h.elapsed += dt;
    if (h.elapsed >= h.seconds) {
      holdState = null;
      run(defOf(h.id)!.actions);
      advanceHints(0);
    }
    changed();
  }

  function interact(pose: PlayerPose): InteractResult {
    runner.signal({ input: 'interact' });
    if (holdState) return { status: 'holding', id: holdState.id };
    const hit = nearest(pose);
    if (!hit) return { status: 'none' };
    const id = hit.target.id;
    const def = defOf(id)!;
    if (!holds(def.requires)) {
      if (def.onRefuse) run(def.onRefuse);
      return { status: 'refused', id, reason: 'requires' };
    }
    if (def.hold) {
      if (runner.policy.control === 'locked' || video) return { status: 'refused', id, reason: 'locked' };
      held = true; // the press that starts a hold is, by definition, a held key; the view corrects this each step
      lastPose = pose;
      holdState = { id, elapsed: 0, seconds: def.hold.seconds };
      changed();
      return { status: 'holding', id };
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
    setHeld(down) {
      held = down;
    },
    get hold() {
      return holdState ? { id: holdState.id, progress: Math.min(1, holdState.elapsed / holdState.seconds), seconds: holdState.seconds } : null;
    },
    say(lineId, after) {
      if (after && after > 0) scheduled.push({ at: simTime + after, line: lineId });
      else say(lineId);
    },
    nearest,
    cycleAction,
    get actions() {
      return actionList;
    },
    signal: (s) => runner.signal(s),
    visibleEntities() {
      const hl = new Set(highlights());
      const live = new Map(interactables().map((i) => [i.id, i]));
      return Object.entries(content.placements).flatMap(([id, p]) => {
        const def = defOf(id as EntityId);
        // Only entities that have an interaction are drawn as props; hidden ones are gone.
        if (!def || !holds(def.show) || !inScene(id)) return [];
        return [{ id: id as EntityId, x: p.x, z: p.z, r: p.r, interactive: live.has(id as EntityId), highlighted: hl.has(id as EntityId) }];
      });
    },
    // Outside a sequence, a hostile enemy blocks the locket (combat_blocked), e.g. the street fox.
    canOpenLocket: () => canOpenLocket(progress().flags, runner.active ? runner.policy.locket : 'combat_blocked', options.inCombat?.() ?? false),
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
    get sceneLoading() {
      return sceneLoading;
    },
    get highlights() {
      return highlights();
    },
    get tutorial() {
      return tutorial?.textId ?? null;
    },
    get lights() {
      return lights;
    },
    get present() {
      return present;
    },
    sequences: runner,
    get overlay() {
      return overlay;
    },
    openOverlay,
    closeOverlay,
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
