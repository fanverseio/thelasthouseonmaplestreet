/**
 * Interaction: nearest interactable, prompt text, pickups, sockets and carried items.
 * Pure functions over plain data. Headless: no React or Three.
 */
import type { EntityId, ItemId } from '@tlh/shared';

export const INTERACT_RANGE = 2.5;
export const MAX_CARRIED = 4;

export interface Interactable {
  id: EntityId;
  x: number;
  z: number;
  /** Text shown as "E  <prompt>". */
  prompt: string;
  /** False hides it (already used, locked out by flags). */
  enabled: boolean;
}

export interface Hit {
  target: Interactable;
  distance: number;
}

/**
 * Nearest enabled interactable within range. When `yaw` is given, targets behind the player
 * (more than 100 degrees off the view direction) are ignored. Ties break by ID for determinism.
 */
export function findNearest(
  px: number,
  pz: number,
  list: readonly Interactable[],
  range = INTERACT_RANGE,
  yaw?: number,
): Hit | null {
  let best: Hit | null = null;
  const fx = yaw === undefined ? 0 : -Math.sin(yaw);
  const fz = yaw === undefined ? 0 : -Math.cos(yaw);
  for (const t of list) {
    if (!t.enabled) continue;
    const dx = t.x - px;
    const dz = t.z - pz;
    const d = Math.hypot(dx, dz);
    if (d > range) continue;
    if (yaw !== undefined && d > 0.5 && (dx * fx + dz * fz) / d < Math.cos((100 * Math.PI) / 180)) continue;
    if (!best || d < best.distance || (d === best.distance && t.id < best.target.id)) {
      best = { target: t, distance: d };
    }
  }
  return best;
}

export type PickupResult = { ok: true; carried: ItemId[] } | { ok: false; reason: 'full' | 'duplicate' };

/** Pick an item up. At most 4 key items, no duplicates. */
export function pickUp(carried: readonly ItemId[], item: ItemId): PickupResult {
  if (carried.includes(item)) return { ok: false, reason: 'duplicate' };
  if (carried.length >= MAX_CARRIED) return { ok: false, reason: 'full' };
  return { ok: true, carried: [...carried, item] };
}

export interface SocketDef {
  id: EntityId;
  accepts: ItemId;
}

export type SocketResult =
  | { ok: true; carried: ItemId[]; consumed: ItemId }
  | { ok: false; reason: 'missing_item' };

/** Items are consumed only by the socket that accepts them. Anything else leaves the list unchanged. */
export function useSocket(carried: readonly ItemId[], socket: SocketDef): SocketResult {
  if (!carried.includes(socket.accepts)) return { ok: false, reason: 'missing_item' };
  return { ok: true, carried: carried.filter((i) => i !== socket.accepts), consumed: socket.accepts };
}

/** HUD helper: the carried row shows only while something is carried. */
export function showCarriedRow(carried: readonly ItemId[]): boolean {
  return carried.length > 0;
}

/** Prompt line for the HUD, or null when nothing is in range. */
export function promptFor(hit: Hit | null): string | null {
  return hit ? `E  ${hit.target.prompt}` : null;
}
