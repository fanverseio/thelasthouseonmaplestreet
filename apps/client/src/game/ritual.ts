/**
 * Final ritual runtime (Beat 11, task 4.9): the smoke pressure placeholder. Headless, sim time only.
 * While the ritual is active (`ritual_active`, not yet `anchors_all`) the smoke "strikes" every few seconds:
 * a short warning, then a landing. In this greybox a strike is HARMLESS (it only shows a HUD cue); the real
 * rings, pools and wraiths (combat-tuning.md section "The smoke") replace it later. Pressure follows the
 * number of anchors restored, and all strikes stop at `anchors_all`.
 * The anchors themselves are flags and hold interactions (content/interactions/beat11.ts), so they survive
 * death and respawn by construction: nothing here resets them.
 */
import type { ProgressFlag } from '@tlh/shared';
import type { GameStore } from '../store/game-store.ts';
import type { WorldRuntime } from './world-runtime.ts';

/** Seconds between strikes by anchors restored (0, 1, 2). combat-tuning.md: 4, 3.5, 3. */
export const STRIKE_INTERVALS = [4, 3.5, 3] as const;
/** Seconds the warning shows before a strike lands, and how long the landing cue stays. */
export const STRIKE_WARNING_SECONDS = 1.2;
export const STRIKE_LANDED_SECONDS = 0.6;

const ANCHORS: readonly ProgressFlag[] = ['anchor_north', 'anchor_east', 'anchor_west'];

export type StrikePhase = 'idle' | 'warning' | 'landed';

export interface RitualView {
  /** The smoke is attacking (ritual active, not finished). */
  active: boolean;
  /** Anchors restored so far, 0..3. */
  anchors: number;
  strike: StrikePhase;
}

export interface RitualRuntime {
  attach(world: WorldRuntime): void;
  /** Advance by one sim step (createEncounterWorld calls this from the world tick). */
  tick(dt: number): void;
  view(): RitualView;
  /** Strikes that have landed since the ritual began (for tests and later scoring). */
  readonly strikesLanded: number;
  readonly version: number;
  subscribe(listener: () => void): () => void;
}

export function createRitualRuntime(options: { store: GameStore }): RitualRuntime {
  const { store } = options;
  let world: WorldRuntime | null = null;
  let phase: StrikePhase = 'idle';
  let clock = 0;
  let landed = 0;
  let tauntOne = false;
  let tauntTwo = false;
  let version = 0;
  const listeners = new Set<() => void>();
  const bump = () => {
    version++;
    for (const l of listeners) l();
  };

  const flags = () => store.getState().progress.flags;
  const anchorCount = () => ANCHORS.filter((f) => flags().includes(f)).length;
  const isActive = () => flags().includes('ritual_active') && !flags().includes('anchors_all');

  function setPhase(next: StrikePhase): void {
    if (next === phase) return;
    phase = next;
    bump();
  }

  return {
    attach(w) {
      world = w;
    },
    tick(dt) {
      if (!isActive()) {
        clock = 0;
        setPhase('idle');
        return;
      }
      // A cinematic is playing: the smoke holds its breath.
      if (world && world.sequences.active !== null) return;
      clock += dt;
      const interval = STRIKE_INTERVALS[Math.min(anchorCount(), STRIKE_INTERVALS.length - 1)]!;
      if (phase === 'idle') {
        if (clock >= interval) {
          clock = 0;
          setPhase('warning');
        }
      } else if (phase === 'warning') {
        if (clock >= STRIKE_WARNING_SECONDS) {
          clock = 0;
          landed++;
          setPhase('landed');
          // Ambient taunts, once each (script Beat 11).
          if (!tauntOne) {
            tauntOne = true;
            world?.say('vo_smoke_b11_01');
          } else if (!tauntTwo && anchorCount() >= 2) {
            tauntTwo = true;
            world?.say('vo_smoke_b11_02');
          }
        }
      } else if (clock >= STRIKE_LANDED_SECONDS) {
        clock = 0;
        setPhase('idle');
      }
    },
    view: () => ({ active: isActive(), anchors: anchorCount(), strike: phase }),
    get strikesLanded() {
      return landed;
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
  };
}
