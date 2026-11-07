/**
 * Encounter runtime (task 3.9): wires the headless encounter stub (encounter-stub.ts) into the game
 * store and the world runtime. No React, no Three. Other beats reuse it by adding an
 * `EncounterBinding` (content/encounters/) and, if wanted, an `encounter` interaction action.
 *
 * - Per-encounter state is plain data in `store.world.entities[enemyId]` ({ state, engaged }).
 *   Timers (telegraph, stun delay) are hot data and live here, not in the store.
 * - Flags only go through the store's `setFlag`, in the order the stub returns them.
 * - Death resets every unresolved encounter to idle; resolved ones stay resolved.
 * - Resolved status is also derived from flags, so a loaded save agrees with its flags.
 */
import type { EntityId, ProgressFlag, SequenceId } from '@tlh/shared';
import { ALL_SEQUENCES } from '../content/sequences/index.ts';
import { PLACEMENTS, type Placement } from '../content/world/placements.ts';
import { ENCOUNTER_BINDINGS } from '../content/encounters/index.ts';
import type { GameStore } from '../store/game-store.ts';
import { createChoiceRuntime } from './dialogue-choice.ts';
import {
  applyMoralityDelta,
  resolveEncounter,
  STUB_ENCOUNTERS,
  stepEncounter,
  type EncounterChoice,
  type EncounterRejection,
  type EncounterState,
  type StubEncounterId,
} from './encounter-stub.ts';
import type { SequenceDef, SequenceEffect } from './sequences.ts';
import { createWorldRuntime, type PlayerPose, type WorldRuntime, type WorldRuntimeOptions } from './world-runtime.ts';

/** Scripted first attack (combat-tuning section 6): telegraphed, wardable, can never kill. */
export interface TelegraphDef {
  /** The sequence `prompt` step (textId) that starts the wind-up. */
  promptId: string;
  seconds: number;
  damage: number;
  /** The hit cannot take HP below this. */
  hpFloor: number;
  /** Set when the wind-up ends, whether Elena warded or not. */
  wardFlag: ProgressFlag;
  magicCost: number;
}

export interface EncounterBinding {
  id: StubEncounterId;
  /** Where the enemy stands (a key of content/world/placements.ts). */
  entity: EntityId;
  /** Started when the encounter engages. */
  sequence?: SequenceId;
  /** Set when the encounter engages (before the sequence starts). */
  startFlag?: ProgressFlag;
  /** The encounter may only engage while all of these are set. */
  requires?: readonly ProgressFlag[];
  /** Engages by itself when Elena comes this close (metres). */
  approachRange?: number;
  startLines?: readonly string[];
  /** Weaken (interact) is refused until this flag is set. */
  weakenRequires?: ProgressFlag;
  /** Seconds from weakened to the persistent stun (stands in for the 30% HP threshold). */
  stunAfter: number;
  /** Set in order when the enemy is stunned. */
  stunFlags: readonly ProgressFlag[];
  telegraph?: TelegraphDef;
  /** Spoken when the enemy is stunned (after the stun flags are set). */
  stunLines?: readonly { line: string; after?: number }[];
  /** Leave the stub's drop flags (e.g. walkie_found) to a player interaction instead of setting them. */
  deferDrops?: boolean;
  outcomeLines?: Partial<Record<EncounterChoice, readonly { line: string; after?: number }[]>>;
}

export const STUN_MIN_MAGIC = 60;

/** Plain data for the UI and the scene. Never carries the hidden score. */
export interface EncounterView {
  id: StubEncounterId;
  entity: EntityId;
  state: EncounterState;
  engaged: boolean;
  /** Dangerous right now: engaged and neither stunned nor resolved. */
  hostile: boolean;
  /** The scripted wind-up is running: Ward can be cast. */
  telegraphing: boolean;
  canWeaken: boolean;
  canChoose: boolean;
  /** Which way a resolved encounter went. */
  outcome: EncounterChoice | null;
}

export type ChooseResult =
  | { ok: true }
  | { ok: false; reason: EncounterRejection | 'flag_rejected' | 'unknown_encounter'; detail?: string };

export interface EncounterRuntimeOptions {
  store: GameStore;
  bindings?: readonly EncounterBinding[];
  sequences?: readonly SequenceDef[];
  placements?: Readonly<Record<EntityId, Placement>>;
}

export interface EncounterRuntime {
  /** Must be called once before use (createEncounterWorld does it). */
  attach(world: WorldRuntime): void;
  /** Options to pass to createWorldRuntime so the two layers are connected. */
  readonly worldHooks: Required<Pick<WorldRuntimeOptions, 'onEncounter' | 'onTick' | 'inCombat'>> & {
    onEffect: (effect: SequenceEffect) => void;
  };
  /** Engage the encounter, or weaken it once the player may (E on the enemy). Returns a failure reason or null. */
  interact(id: StubEncounterId): string | null;
  /** Purify or destroy a stunned enemy. */
  choose(id: StubEncounterId, choice: EncounterChoice): ChooseResult;
  /** Cast Ward during a telegraphed attack. */
  castWard(): boolean;
  /** Death: roll the active sequence back, reset unresolved encounters to idle, respawn at the checkpoint. */
  handleDeath(): void;
  tick(dt: number, pose: PlayerPose): void;
  handleEffect(effect: SequenceEffect): void;
  /** Any engaged hostile enemy (drives the locket's combat_blocked policy). */
  hostileActive(): boolean;
  view(id: StubEncounterId): EncounterView;
  /** The engaged, unresolved encounter, if any. */
  active(): EncounterView | null;
  readonly bindings: readonly EncounterBinding[];
  readonly version: number;
  subscribe(listener: () => void): () => void;
}

export function createEncounterRuntime(options: EncounterRuntimeOptions): EncounterRuntime {
  const { store } = options;
  const bindings = options.bindings ?? ENCOUNTER_BINDINGS;
  const sequences = options.sequences ?? ALL_SEQUENCES;
  const placements = options.placements ?? PLACEMENTS;
  let world: WorldRuntime | null = null;
  let pose: PlayerPose = { x: 0, z: 0 };
  let version = 0;
  const listeners = new Set<() => void>();
  /** Seconds left on the scripted wind-up, per encounter. */
  const telegraphs = new Map<StubEncounterId, { left: number; warded: boolean }>();
  /** Seconds left until the weakened enemy is stunned. */
  const stunTimers = new Map<StubEncounterId, number>();

  const bump = () => {
    version++;
    for (const l of listeners) l();
  };
  const flags = () => store.getState().progress.flags;
  const bindingOf = (id: StubEncounterId) => bindings.find((b) => b.id === id);
  const needWorld = (): WorldRuntime => {
    if (!world) throw new Error('EncounterRuntime: attach(world) first');
    return world;
  };

  function outcomeOf(id: StubEncounterId): EncounterChoice | null {
    const def = STUB_ENCOUNTERS[id];
    for (const choice of ['purify', 'destroy'] as const) {
      const f = def.outcomeFlags[choice];
      if (f && flags().includes(f)) return choice;
    }
    return null;
  }

  function read(id: StubEncounterId): { state: EncounterState; engaged: boolean } {
    const def = STUB_ENCOUNTERS[id];
    const raw = store.getState().world.entities[def.enemyId];
    const resolvedByFlags = outcomeOf(id) !== null;
    const state = resolvedByFlags ? 'resolved' : ((raw?.['state'] as EncounterState | undefined) ?? 'idle');
    return { state, engaged: raw?.['engaged'] === true };
  }

  function write(id: StubEncounterId, patch: { state?: EncounterState; engaged?: boolean }): void {
    const key = STUB_ENCOUNTERS[id].enemyId;
    store.setState((s) => ({
      world: { ...s.world, entities: { ...s.world.entities, [key]: { ...s.world.entities[key], ...patch } } },
    }));
    bump();
  }

  function view(id: StubEncounterId): EncounterView {
    const b = bindingOf(id);
    const { state, engaged } = read(id);
    const weakenOk = !b?.weakenRequires || flags().includes(b.weakenRequires);
    return {
      id,
      entity: b?.entity ?? STUB_ENCOUNTERS[id].enemyId,
      state,
      engaged,
      hostile: engaged && (state === 'idle' || state === 'weakened'),
      telegraphing: telegraphs.has(id),
      canWeaken: engaged && state === 'idle' && weakenOk && !telegraphs.has(id),
      canChoose: engaged && state === 'stunned',
      outcome: state === 'resolved' ? outcomeOf(id) : null,
    };
  }

  function engage(b: EncounterBinding): boolean {
    const w = needWorld();
    if (read(b.id).state === 'resolved' || read(b.id).engaged) return false;
    if (!(b.requires ?? []).every((f) => flags().includes(f))) return false;
    if (w.sequences.active !== null) return false;
    if (b.startFlag && !store.getState().setFlag(b.startFlag).ok) return false;
    write(b.id, { engaged: true });
    for (const line of b.startLines ?? []) w.say(line);
    if (b.sequence) {
      const def = sequences.find((s) => s.id === b.sequence);
      if (def) w.sequences.trigger(def);
    }
    return true;
  }

  function startTelegraph(b: EncounterBinding): void {
    const t = b.telegraph;
    if (!t || telegraphs.has(b.id) || flags().includes(t.wardFlag) || !read(b.id).engaged) return;
    telegraphs.set(b.id, { left: t.seconds, warded: false });
    bump();
  }

  function endTelegraph(b: EncounterBinding): void {
    const t = b.telegraph;
    const cur = telegraphs.get(b.id);
    telegraphs.delete(b.id);
    if (!t || !cur) return;
    if (!cur.warded) {
      store.setState((s) => {
        const hp = s.player.hp;
        return { player: { ...s.player, hp: Math.max(hp - t.damage, Math.min(hp, t.hpFloor)) } };
      });
    }
    store.getState().setFlag(t.wardFlag);
    bump();
  }

  function stun(b: EncounterBinding): void {
    stunTimers.delete(b.id);
    const r = stepEncounter(read(b.id).state, 'stun');
    if (!r.ok) return;
    write(b.id, { state: r.state });
    for (const f of b.stunFlags) store.getState().setFlag(f);
    store.setState((s) => (s.player.magic >= STUN_MIN_MAGIC ? s : { player: { ...s.player, magic: STUN_MIN_MAGIC } }));
    for (const l of b.stunLines ?? []) needWorld().say(l.line, l.after);
  }

  function interact(id: StubEncounterId): string | null {
    const b = bindingOf(id);
    if (!b) return 'unknown_encounter';
    const cur = read(id);
    if (cur.state === 'resolved') return 'already_resolved';
    if (!cur.engaged) return engage(b) ? null : 'cannot_engage';
    if (!view(id).canWeaken) return 'not_ready';
    const r = stepEncounter(cur.state, 'weaken');
    if (!r.ok) return r.reason;
    write(id, { state: r.state });
    stunTimers.set(id, b.stunAfter);
    return null;
  }

  function choose(id: StubEncounterId, choice: EncounterChoice): ChooseResult {
    const b = bindingOf(id);
    if (!b) return { ok: false, reason: 'unknown_encounter' };
    const w = needWorld();
    const def = STUB_ENCOUNTERS[id];
    const siblingStates = Object.fromEntries((def.group ?? []).map((g) => [g, read(g).state]));
    const r = resolveEncounter({ id, state: read(id).state, choice, flags: flags(), siblingStates });
    if (!r.ok) return { ok: false, reason: r.reason };
    const drops: readonly ProgressFlag[] = b.deferDrops ? def.dropFlags : [];
    for (const flag of r.flagsToSet) {
      if (drops.includes(flag)) continue;
      const set = store.getState().setFlag(flag);
      if (!set.ok) return { ok: false, reason: 'flag_rejected', detail: set.detail };
    }
    const at = w.simTime;
    store.setState((s) => ({
      progress: { ...s.progress, morality: applyMoralityDelta(s.progress.morality, r.moralityDelta, r.reason, at) },
    }));
    write(id, { state: r.next });
    stunTimers.delete(id);
    for (const l of b.outcomeLines?.[choice] ?? []) w.say(l.line, l.after);
    return { ok: true };
  }

  function castWard(): boolean {
    for (const b of bindings) {
      const cur = telegraphs.get(b.id);
      if (!cur || cur.warded || !b.telegraph) continue;
      cur.warded = true;
      const cost = b.telegraph.magicCost;
      store.setState((s) => ({ player: { ...s.player, magic: Math.max(0, s.player.magic - cost) } }));
      bump();
      return true;
    }
    return false;
  }

  function handleDeath(): void {
    needWorld().sequences.interrupt('death');
    telegraphs.clear();
    stunTimers.clear();
    for (const b of bindings) {
      if (read(b.id).state !== 'resolved') write(b.id, { state: 'idle', engaged: false });
    }
    store.getState().respawn();
    bump();
  }

  function tick(dt: number, p: PlayerPose): void {
    pose = p;
    if (store.getState().player.hp <= 0) {
      handleDeath();
      return;
    }
    for (const b of bindings) {
      const cur = read(b.id);
      if (cur.state === 'resolved') continue;
      if (!cur.engaged) {
        const place = placements[b.entity];
        const near = b.approachRange !== undefined && place && Math.hypot(pose.x - place.x, pose.z - place.z) <= b.approachRange;
        if (near && needWorld().sequences.active === null) engage(b);
        continue;
      }
      const tele = telegraphs.get(b.id);
      if (tele) {
        tele.left -= dt;
        if (tele.left <= 0) endTelegraph(b);
      }
      const left = stunTimers.get(b.id);
      if (left !== undefined) {
        const next = left - dt;
        if (next <= 0) stun(b);
        else stunTimers.set(b.id, next);
      }
    }
  }

  function handleEffect(e: SequenceEffect): void {
    if (e.k !== 'prompt') return;
    for (const b of bindings) if (b.telegraph?.promptId === e.textId) startTelegraph(b);
  }

  return {
    attach(w) {
      world = w;
    },
    worldHooks: {
      onEncounter: (_op, id) => interact(id as StubEncounterId),
      onTick: tick,
      inCombat: () => hostileActive(),
      onEffect: handleEffect,
    },
    interact,
    choose,
    castWard,
    handleDeath,
    tick,
    handleEffect,
    hostileActive,
    view,
    active() {
      for (const b of bindings) {
        const v = view(b.id);
        if (v.engaged && v.state !== 'resolved') return v;
      }
      return null;
    },
    bindings,
    get version() {
      return version;
    },
    subscribe(l) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };

  function hostileActive(): boolean {
    return bindings.some((b) => view(b.id).hostile);
  }
}

/** Convenience: a world runtime and an encounter runtime wired together. */
export function createEncounterWorld(options: WorldRuntimeOptions & { bindings?: readonly EncounterBinding[] }) {
  const { bindings, ...worldOptions } = options;
  const encounters = createEncounterRuntime({
    store: options.store,
    ...(bindings && { bindings }),
    ...(options.content?.sequences && { sequences: options.content.sequences }),
    ...(options.content?.placements && { placements: options.content.placements }),
  });
  const choices = createChoiceRuntime({ store: options.store });
  const hooks = encounters.worldHooks;
  const world = createWorldRuntime({
    ...worldOptions,
    onEncounter: hooks.onEncounter,
    onTick: (dt, pose) => {
      hooks.onTick(dt, pose);
      worldOptions.onTick?.(dt, pose);
    },
    inCombat: hooks.inCombat,
    onEffect: (e) => {
      hooks.onEffect(e);
      choices.handleEffect(e);
      worldOptions.onEffect?.(e);
    },
  });
  encounters.attach(world);
  choices.attach(world);
  return { world, encounters, choices };
}
