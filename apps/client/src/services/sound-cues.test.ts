/// <reference types="node" />
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CONTROL_CUES, MAX_SECONDS, MIN_SECONDS, SOUND_CUES, cueFolder } from '../../../../tools/sound-cues.mjs';
import { AMB_CUE_IDS, CONTROL_CUE_IDS, SFX_CUE_IDS, cueUrl, isFileCue } from './cue-ids.ts';
import { AMBIENCE_FOR_ZONE, SURFACE_FOR_ZONE, scareCue } from './audio-cues.ts';
import { CUE_TABLE } from './sfx.ts';
import { P5_BOARD } from '../content/puzzles/index.ts';

const AUDIO_DIR = fileURLToPath(new URL('../../public/assets/audio/', import.meta.url));
const SRC_DIR = fileURLToPath(new URL('../', import.meta.url));
const MAX_TOTAL_BYTES = 15 * 1024 * 1024;

const files = (folder: 'sfx' | 'amb') => (existsSync(`${AUDIO_DIR}${folder}`) ? readdirSync(`${AUDIO_DIR}${folder}`) : []);

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = `${dir}${name}`;
    if (statSync(full).isDirectory()) yield* sourceFiles(`${full}/`);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) yield full;
  }
}

describe('sound cue list (tools/sound-cues.mjs)', () => {
  it('has unique ids with the right prefix, bus and duration', () => {
    const ids = SOUND_CUES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of SOUND_CUES) {
      expect(c.id, c.id).toMatch(/^(sfx|amb)_[a-z0-9_]+$/);
      expect(c.bus, c.id).toBe(c.id.startsWith('amb_') ? 'amb' : 'sfx');
      expect(c.seconds, c.id).toBeGreaterThanOrEqual(MIN_SECONDS);
      expect(c.seconds, c.id).toBeLessThanOrEqual(MAX_SECONDS);
      expect(c.prompt.length, c.id).toBeGreaterThan(20);
      if (c.bus === 'amb') expect(c.loop, c.id).toBe(true);
    }
  });

  it('keeps the tone: no music cue, nothing violent in a prompt', () => {
    for (const c of SOUND_CUES) {
      expect(c.id).not.toMatch(/^mus_/);
      expect(c.prompt, c.id).not.toMatch(/\b(blood|scream\w*)\b/i);
    }
  });

  it('matches the ids the client knows', () => {
    expect(new Set(SOUND_CUES.map((c) => c.id))).toEqual(new Set([...SFX_CUE_IDS, ...AMB_CUE_IDS]));
    expect([...CONTROL_CUES].sort()).toEqual([...CONTROL_CUE_IDS].sort());
  });

  it('has the cue families the design asks for', () => {
    expect(AMB_CUE_IDS).toHaveLength(8);
    expect(SFX_CUE_IDS.filter((id) => id.startsWith('sfx_footsteps_') && id !== 'sfx_footsteps_behind')).toHaveLength(18);
    expect(SFX_CUE_IDS.filter((id) => id.startsWith('sfx_whisper_'))).toHaveLength(6);
    expect(SFX_CUE_IDS.filter((id) => id.startsWith('sfx_scare_'))).toHaveLength(6);
  });
});

describe('sound files', () => {
  it('every cue has a non-empty file in its folder', () => {
    for (const c of SOUND_CUES) {
      const file = `${AUDIO_DIR}${cueFolder(c)}/${c.id}.mp3`;
      expect(existsSync(file), `${c.id}.mp3 is missing`).toBe(true);
      expect(statSync(file).size, `${c.id}.mp3 is too small`).toBeGreaterThan(1024 / 2);
    }
  });

  it('has no orphan files', () => {
    const sfx = new Set(SOUND_CUES.filter((c) => c.bus === 'sfx').map((c) => `${c.id}.mp3`));
    const amb = new Set(SOUND_CUES.filter((c) => c.bus === 'amb').map((c) => `${c.id}.mp3`));
    expect(files('sfx').filter((f) => !sfx.has(f))).toEqual([]);
    expect(files('amb').filter((f) => !amb.has(f))).toEqual([]);
  });

  it('serves each cue from the folder the client asks for', () => {
    expect(cueUrl('sfx_hit')).toBe('/assets/audio/sfx/sfx_hit.mp3');
    expect(cueUrl('amb_home')).toBe('/assets/audio/amb/amb_home.mp3');
  });

  it('stays small enough to ship (sfx + ambience under 15 MB)', () => {
    const total = ['sfx', 'amb'].reduce((n, d) => n + files(d as 'sfx' | 'amb').reduce((m, f) => m + statSync(`${AUDIO_DIR}${d}/${f}`).size, 0), 0);
    expect(total).toBeLessThan(MAX_TOTAL_BYTES);
  });
});

describe('cues used in code', () => {
  it('every sfx_ / amb_ id written in the source has a file (or is a control cue)', () => {
    const used = new Map<string, string>();
    for (const file of sourceFiles(SRC_DIR)) {
      // A literal ending in _ is a prefix (startsWith, a template), not a cue id.
      for (const m of readFileSync(file, 'utf8').matchAll(/['"`]((?:sfx|amb)_[a-z0-9_]*[a-z0-9])['"`]/g)) used.set(m[1]!, file);
    }
    expect(used.size).toBeGreaterThan(30);
    for (const [id, file] of used) {
      expect(isFileCue(id) || (CONTROL_CUE_IDS as readonly string[]).includes(id), `${id} (in ${file}) has no cue file`).toBe(true);
    }
  });

  it('the synth fallback table only names cues that have files', () => {
    for (const id of Object.keys(CUE_TABLE)) expect(isFileCue(id), id).toBe(true);
  });

  it('zone tables name real cues', () => {
    for (const cue of Object.values(AMBIENCE_FOR_ZONE)) expect(AMB_CUE_IDS as readonly string[]).toContain(cue);
    for (const surface of Object.values(SURFACE_FOR_ZONE)) expect(SFX_CUE_IDS).toContain(`sfx_footsteps_${surface}_1`);
  });

  it('every board scare in the puzzle data has a sound', () => {
    for (const s of P5_BOARD.scares) expect(scareCue(s), s).not.toBeNull();
    expect(scareCue('nope')).toBeNull();
  });
});
