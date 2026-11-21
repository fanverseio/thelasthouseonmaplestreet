/**
 * P4 runes without the mirror (notes 16-18). Rosalind painted three runes on the outbuilding's inside walls in hidden
 * paint. After seq5_done each unpurified rune is a free Purify SpellTarget on its wall:
 *  - a Purify channel that starts on a rune wakes it (entity state `revealed`, saved): its glyph glows and flows;
 *  - a channel that completes purifies it (entity state `purified`), the same state the E interaction sets.
 * The E prompt "Purify the rune" shows only once a rune is revealed, so Classic players can also finish it with E.
 * runes_done is still set by the content rule (content/interactions/beat8.ts) once all three are purified.
 * Headless: no React or Three. Nothing here writes a flag.
 */
import type { EntityId } from '@tlh/shared';
import { RUNE_WALL, RUNE_Y } from '../content/world/grounds-layout.ts';
import type { GameStore } from '../store/game-store.ts';
import type { SpellEvent, SpellSystem, SpellTarget } from './spells.ts';
import type { PlayerPose } from './world-runtime.ts';

export const RUNE_IDS = ['rune.grounds.r1', 'rune.grounds.r2', 'rune.grounds.r3'] as const satisfies readonly EntityId[];
export type RuneId = (typeof RUNE_IDS)[number];

export const RUNE_TUNING = {
  /** The target sphere on the wall: generous, so Elena can aim at bare wall near the hidden paint (invented). */
  radius: 0.8,
  /** Purify selected within this distance: the hidden paint answers with a faint shimmer (view only, invented). */
  senseM: 3.5,
} as const;

/** Where to aim at a rune (the fighter's AimPoint shape): the glyph centre on its wall. */
export function runeAimPoint(id: RuneId): { x: number; z: number; position: { y: number } } {
  const w = RUNE_WALL[id];
  return { x: w.x, z: w.z, position: { y: RUNE_Y } };
}

/** The pure state the view and tests read. */
export function runeState(entities: Readonly<Record<string, Readonly<Record<string, unknown>> | undefined>>, id: RuneId): 'hidden' | 'revealed' | 'purified' {
  const e = entities[id];
  if (e?.['purified'] === true) return 'purified';
  return e?.['revealed'] === true ? 'revealed' : 'hidden';
}

/** Purify is selected and Elena stands close enough for the hidden paint to shimmer. Pure. */
export function runeSensed(selectedSpell: string, pose: { x: number; z: number }, id: RuneId): boolean {
  const w = RUNE_WALL[id];
  return selectedSpell === 'purify' && Math.hypot(pose.x - w.x, pose.z - w.z) <= RUNE_TUNING.senseM;
}

export interface RuneRuntime {
  /** Register or drop the spell targets for the current flags. Called every tick. */
  tick(pose: PlayerPose): void;
  dispose(): void;
}

export function createRuneRuntime(options: { store: GameStore; spells?: SpellSystem }): RuneRuntime {
  const { store, spells } = options;
  const off = new Map<RuneId, () => void>();
  const flags = () => store.getState().progress.flags;
  const active = () => flags().includes('seq5_done') && !flags().includes('runes_done');

  function setEntity(id: RuneId, key: 'revealed' | 'purified'): void {
    if (store.getState().world.entities[id]?.[key] === true) return;
    store.setState((s) => ({
      world: { ...s.world, entities: { ...s.world.entities, [id]: { ...s.world.entities[id], [key]: true } } },
    }));
  }

  function target(id: RuneId): SpellTarget {
    const w = RUNE_WALL[id];
    return { id, kind: 'rune', position: { x: w.x, y: RUNE_Y, z: w.z }, radius: RUNE_TUNING.radius, accepts: { bolt: 'none', purify: true } };
  }

  const isRune = (id: string): id is RuneId => (RUNE_IDS as readonly string[]).includes(id);
  const offSpells = spells?.on((ev: SpellEvent) => {
    if (!active()) return;
    if (ev.type === 'purify_started' && isRune(ev.targetId)) setEntity(ev.targetId, 'revealed');
    else if (ev.type === 'hit' && ev.spell === 'purify' && isRune(ev.targetId)) {
      setEntity(ev.targetId, 'revealed');
      setEntity(ev.targetId, 'purified');
    }
  });

  return {
    tick() {
      if (!spells) return;
      const on = active();
      const entities = store.getState().world.entities;
      for (const id of RUNE_IDS) {
        const want = on && runeState(entities, id) !== 'purified';
        const has = off.has(id);
        if (want && !has) off.set(id, spells.register(target(id)));
        else if (!want && has) {
          off.get(id)?.();
          off.delete(id);
        }
      }
    },
    dispose() {
      for (const f of off.values()) f();
      off.clear();
      offSpells?.();
    },
  };
}
