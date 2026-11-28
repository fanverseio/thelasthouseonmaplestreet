/// <reference types="node" />
import { existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { worstCaseForcedSeconds, type SequenceStep } from '../../game/sequences.ts';
import { clipUrl } from '../../ui/video-playback.ts';
import { ALL_SEQUENCES } from '../sequences/index.ts';
import { VIDEO_CLIPS } from './clips.ts';

const VIDEO_DIR = fileURLToPath(new URL('../../../public/assets/video/', import.meta.url));

const videoStepIds = (): string[] => {
  const out: string[] = [];
  const walk = (steps: readonly SequenceStep[]) => {
    for (const s of steps) {
      if (s.t === 'video') out.push(s.clipId);
      if (s.t === 'parallel') walk(s.steps);
    }
  };
  for (const d of ALL_SEQUENCES) walk(d.steps);
  return out;
};

describe('cinematic clip files', () => {
  it('the player loads from the folder these files live in', () => {
    expect(clipUrl('seq6_two_keys')).toBe('/assets/video/seq6_two_keys.mp4');
  });

  it.each([...new Set([...VIDEO_CLIPS.map((c) => c.id), ...videoStepIds()])])('%s.mp4 exists and is not empty', (id) => {
    const file = `${VIDEO_DIR}${id}.mp4`;
    expect(existsSync(file), `${id}.mp4 is missing`).toBe(true);
    expect(statSync(file).size).toBeGreaterThan(100_000);
  });

  it('every file in the folder belongs to a clip in the manifest', () => {
    const ids = new Set(VIDEO_CLIPS.map((c) => c.id));
    for (const f of readdirSync(VIDEO_DIR)) expect(ids.has(f.replace(/\.mp4$/, '')), f).toBe(true);
  });

  it('forced-control total: the final clips run past the 180 s design cap (open author decision)', () => {
    // PRD 5.3 caps forced loss of control at 180 s. The 16 final clips need more. Until the author decides
    // (raise the cap or cut clips), this pins the current worst case so it cannot grow unnoticed.
    // It counts both Briggs and both Watcher outcome clips, so a real run is a little shorter.
    expect(worstCaseForcedSeconds(ALL_SEQUENCES)).toBeLessThanOrEqual(FORCED_SECONDS_NOW);
  });
});

/** Worst case today (see the test above). */
const FORCED_SECONDS_NOW = 264;
