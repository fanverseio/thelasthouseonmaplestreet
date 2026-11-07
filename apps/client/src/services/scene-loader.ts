import type { ComponentType } from 'react';
import type { ProgressFlag } from '@tlh/shared';

/**
 * Lazy loader for the `last_house` scene. Preloading starts when the player enters the back lane
 * (beat 7); entering the house awaits the same promise, so the download happens once.
 */
export type InteriorSceneComponent = ComponentType<{ flags: readonly ProgressFlag[] }>;

let pending: Promise<InteriorSceneComponent> | null = null;
let loaded: InteriorSceneComponent | null = null;

export function preloadLastHouse(): Promise<InteriorSceneComponent> {
  pending ??= import('../scene/interior-scene.tsx').then((m) => {
    loaded = m.default;
    return m.default;
  });
  return pending;
}

/** The component if it has finished loading, else null. */
export function loadedLastHouse(): InteriorSceneComponent | null {
  return loaded;
}

export function lastHousePreloadStarted(): boolean {
  return pending !== null;
}

/**
 * The `loadScene` hook of the world runtime: null when the scene's code is already here (switch at once),
 * else the preload promise, which the runtime awaits before it switches (see game/world-runtime.ts enterScene).
 */
export function loadSceneHook(scene: string): Promise<unknown> | null {
  if (scene !== 'last_house' || loaded) return null;
  return preloadLastHouse();
}
