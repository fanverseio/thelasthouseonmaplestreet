/**
 * Shared world-effect functions (ARCHITECTURE 6.4). Authored content and the Angel use the same ones.
 * The Angel only ever gets the restricted AngelEffectApi below: no flags, no gates, no items, no morality.
 */
import type { EntityId } from '@tlh/shared';
import type { GameStore } from '../store/game-store.ts';

export interface LightTarget {
  setLight(target: string, effect: 'flicker', seconds: number): void;
}

export const FLICKER_SECONDS = 3;

export function flickerLight(lights: LightTarget, id: EntityId, seconds = FLICKER_SECONDS): void {
  lights.setLight(id, 'flicker', seconds);
}

/** Mark an optional clue revealed (world state only; it is saved with the world slice). */
export function revealClue(store: GameStore, id: EntityId): void {
  store.setState((s) => ({ world: { entities: { ...s.world.entities, [id]: { ...s.world.entities[id], revealed: true } } } }));
}

export function restoreMagic(store: GameStore, amount: number): void {
  store.getState().gainMagic(amount);
}

/** The only effects the Angel can cause. Each call is made after validation, never directly from LLM output. */
export interface AngelEffectApi {
  flickerLights(id: EntityId): void;
  revealClue(id: EntityId): void;
  restoreMagic(amount: number): void;
}

export function createAngelEffectApi(store: GameStore, lights: LightTarget): AngelEffectApi {
  return Object.freeze({
    flickerLights: (id: EntityId) => flickerLight(lights, id),
    revealClue: (id: EntityId) => revealClue(store, id),
    restoreMagic: (amount: number) => restoreMagic(store, Math.max(1, Math.min(25, Math.round(amount)))),
  });
}
