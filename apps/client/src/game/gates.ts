/**
 * Gates open only from flags (architecture principle 6). Pure evaluation over GateDef data.
 */
import type { EntityId, ProgressFlag } from '@tlh/shared';
import type { GateDef } from './world-registry.ts';

export function isGateOpen(gate: GateDef, flags: readonly ProgressFlag[]): boolean {
  return gate.opensOn !== null && flags.includes(gate.opensOn);
}

/** IDs of every gate that is open for these flags. */
export function openGates(gates: readonly GateDef[], flags: readonly ProgressFlag[]): EntityId[] {
  return gates.filter((g) => isGateOpen(g, flags)).map((g) => g.id);
}

/** Gates that changed state between two flag sets, so the view can play a recede effect once. */
export function gateChanges(
  gates: readonly GateDef[],
  before: readonly ProgressFlag[],
  after: readonly ProgressFlag[],
): { opened: EntityId[]; closed: EntityId[] } {
  const opened: EntityId[] = [];
  const closed: EntityId[] = [];
  for (const g of gates) {
    const was = isGateOpen(g, before);
    const now = isGateOpen(g, after);
    if (!was && now) opened.push(g.id);
    if (was && !now) closed.push(g.id);
  }
  return { opened, closed };
}

/** Veil recede placeholder: opacity 0..1 for a veil that opened `elapsedS` seconds ago. */
export const VEIL_RECEDE_SECONDS = 2.5;

export function veilOpacity(elapsedS: number, base = 0.92): number {
  const t = Math.min(1, Math.max(0, elapsedS / VEIL_RECEDE_SECONDS));
  return base * (1 - t);
}
