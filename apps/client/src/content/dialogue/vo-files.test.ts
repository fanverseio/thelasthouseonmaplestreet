/// <reference types="node" />
import { existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { VO_BASE_PATH, voiceUrl } from '../../services/voice.ts';
import { ALL_LINES } from './index.ts';

const VO_DIR = fileURLToPath(new URL('../../../public/assets/audio/vo/', import.meta.url));
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

describe('voice-over files', () => {
  it('the client plays from the folder these files live in', () => {
    expect(VO_BASE_PATH).toBe('/assets/audio/vo');
    expect(voiceUrl('vo_elena_b1_01')).toBe('/assets/audio/vo/vo_elena_b1_01.mp3');
  });

  it('every spoken line has a non-empty audio file', () => {
    for (const l of ALL_LINES) {
      const file = `${VO_DIR}${l.id}.mp3`;
      expect(existsSync(file), `${l.id}.mp3 is missing`).toBe(true);
      expect(statSync(file).size, `${l.id}.mp3 is empty`).toBeGreaterThan(1024);
    }
  });

  it('has no orphan files', () => {
    const ids = new Set(ALL_LINES.map((l) => `${l.id}.mp3`));
    const orphans = readdirSync(VO_DIR).filter((f) => !ids.has(f));
    expect(orphans).toEqual([]);
  });

  it('stays small enough to ship (under 10 MB)', () => {
    const total = readdirSync(VO_DIR).reduce((n, f) => n + statSync(`${VO_DIR}${f}`).size, 0);
    expect(total).toBeLessThan(MAX_TOTAL_BYTES);
  });
});
