/**
 * Hold-E skip for cinematics (docs/input-ux.md, cinematic-controller.md). Headless: the view feeds
 * `input.state.interactHeldMs` every sim step; after SKIP_HOLD_SECONDS the sequence runner's skip() runs.
 * Skipping applies every flag and spell and stops the video overlay (the runner does that itself).
 */
import { SKIP_HOLD_SECONDS, type SequenceDef, type SequenceRunner } from './sequences.ts';

const hasVideo = (steps: readonly SequenceDef['steps'][number][]): boolean =>
  steps.some((s) => s.t === 'video' || (s.t === 'parallel' && hasVideo(s.steps)));

/** A sequence that can be skipped: flagged skippable AND it takes control ('locked') or plays a clip. */
export function isHoldSkippable(def: SequenceDef | undefined): boolean {
  if (!def || !def.skippable) return false;
  return def.policy.control === 'locked' || hasVideo(def.steps);
}

/** 0..1 progress of a hold of `heldMs`. */
export function skipProgress(heldMs: number): number {
  return Math.min(1, Math.max(0, heldMs / (SKIP_HOLD_SECONDS * 1000)));
}

export interface SkipHold {
  /** Feed the current E hold (ms) once per sim step. Returns true on the step the skip fired. */
  feed(heldMs: number): boolean;
  /** A hold-skippable sequence is playing: show the prompt. */
  readonly available: boolean;
  /** 0..1 ring fill, quantised to 1/20 so the UI re-renders rarely. */
  readonly progress: number;
  readonly version: number;
  subscribe(listener: () => void): () => void;
}

/**
 * Optional: the clip on screen, and a way to end it. Lets hold-E skip a clip inside a sequence that is not
 * skippable itself (Briggs, Gartner): the clip ends early and the sequence goes on, so no flag is lost.
 */
export interface ClipSkip {
  current(): string | null;
  end(clipId: string): void;
}

export function createSkipHold(runner: Pick<SequenceRunner, 'active' | 'skip'>, defs: readonly SequenceDef[], clip?: ClipSkip): SkipHold {
  let available = false;
  let progress = 0;
  let version = 0;
  let lastId: string | null = null;
  /** E was already down when the sequence began: it must be released and pressed again. */
  let needRelease = false;
  const listeners = new Set<() => void>();
  const set = (a: boolean, p: number) => {
    const q = Math.floor(p * 20) / 20;
    if (a === available && q === progress) return;
    available = a;
    progress = q;
    version++;
    for (const l of listeners) l();
  };

  return {
    feed(heldMs) {
      const id = runner.active;
      const def = id ? defs.find((d) => d.id === id) : undefined;
      const wholeSkip = isHoldSkippable(def);
      const clipId = !wholeSkip && id ? (clip?.current() ?? null) : null;
      if (!id || (!wholeSkip && !clipId)) {
        lastId = id;
        needRelease = false;
        set(false, 0);
        return false;
      }
      const key = clipId ? `${id}:${clipId}` : id;
      if (key !== lastId) needRelease = heldMs > 0;
      lastId = key;
      if (heldMs <= 0) needRelease = false;
      if (needRelease) {
        set(true, 0);
        return false;
      }
      const p = skipProgress(heldMs);
      if (p >= 1) {
        if (clipId) {
          clip!.end(clipId);
          needRelease = true; // the sequence goes on: release E before anything else reacts to it
          set(false, 0);
          return true;
        }
        const r = runner.skip();
        lastId = runner.active;
        needRelease = r.skipped && runner.active !== null; // a queued sequence started: release first
        set(false, 0);
        return r.skipped;
      }
      set(true, p);
      return false;
    },
    get available() {
      return available;
    },
    get progress() {
      return progress;
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
