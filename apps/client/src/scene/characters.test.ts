import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { enemyDef } from '../content/enemies/index.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import { CHARACTER_URLS, CLIP_FALLBACK, ENEMY_LOOKS, enemyClip, headingOf, NPC_LOOKS, turnDelta, type ClipInput } from './character-config.ts';

/** Animated characters (scripts/pipeline/animate_characters.py): files, clips, eye nodes, and the state -> clip map. */
const PUBLIC = new URL('../../public/', import.meta.url);
const MAX_BYTES = 3 * 1024 * 1024;
/** asset-manifest.md budgets (+2% for the decimator). */
const TRIS: Record<string, number> = { felix: 10200, gartner: 10200, briggs: 15300, watcher: 12300, fox: 5100, cat: 5100, hound: 6200 };
const BASE_CLIPS = ['idle', 'walk', 'run', 'windup', 'strike', 'stagger', 'stunned', 'purified'];

interface Gltf {
  nodes: { name?: string }[];
  meshes: { primitives: { indices?: number; attributes: Record<string, number> }[] }[];
  accessors: { count: number }[];
  skins?: { joints: number[] }[];
  animations?: { name?: string }[];
}

function read(url: string): { json: Gltf; bytes: number } {
  const buf = readFileSync(fileURLToPath(new URL(url.slice(1), PUBLIC)));
  expect(buf.toString('ascii', 0, 4)).toBe('glTF');
  const n = buf.readUInt32LE(12);
  return { json: JSON.parse(buf.toString('utf8', 20, 20 + n)) as Gltf, bytes: buf.length };
}

describe.each(CHARACTER_URLS.map((u) => [u]))('%s', (url) => {
  const name = url.split('/').pop()!.replace('.glb', '');
  const { json, bytes } = read(url);
  const corrupted = [...Object.values(ENEMY_LOOKS), ...Object.values(NPC_LOOKS)].some((l) => l.url === url && l.corrupted);
  const prims = json.meshes.flatMap((m) => m.primitives);

  it('is skinned, one draw call, inside the size and triangle budget', () => {
    expect(bytes).toBeLessThan(MAX_BYTES);
    expect(json.skins?.length).toBe(1);
    expect(prims.length).toBeLessThan(3);
    for (const p of prims) expect(Object.keys(p.attributes)).toEqual(expect.arrayContaining(['JOINTS_0', 'WEIGHTS_0']));
    const tris = prims.reduce((s, p) => s + (p.indices === undefined ? 0 : json.accessors[p.indices]!.count / 3), 0);
    expect(tris).toBeLessThanOrEqual(TRIS[name] ?? 15000);
  });

  it('carries the clips the game plays', () => {
    const clips = (json.animations ?? []).map((a) => a.name);
    expect(clips).toEqual(expect.arrayContaining(BASE_CLIPS));
    for (const look of Object.values(NPC_LOOKS).filter((l) => l.url === url)) expect(clips).toEqual(expect.arrayContaining([look.idleClip, look.nearClip]));
  });

  it.runIf(corrupted)('has eye nodes for the red glow', () => {
    const names = json.nodes.map((n) => n.name);
    expect(names).toEqual(expect.arrayContaining(['eye_L', 'eye_R']));
  });
});

describe('character looks', () => {
  it('every enemy look belongs to a real enemy definition, every NPC stands on a placement', () => {
    for (const id of Object.keys(ENEMY_LOOKS)) expect(enemyDef(id), id).toBeDefined();
    for (const look of Object.values(NPC_LOOKS)) expect(PLACEMENTS[look.at], look.at).toBeDefined();
  });

  it('eye anchors (when set) are a pair on the head, a human-like distance apart', () => {
    for (const [id, look] of Object.entries(ENEMY_LOOKS)) {
      if (!look.eyes) continue;
      const [lx, ly, lz] = look.eyes.l;
      const [rx, ry, rz] = look.eyes.r;
      const apart = Math.hypot(lx - rx, ly - ry, lz - rz);
      expect(apart, id).toBeGreaterThan(0.02);
      expect(apart, id).toBeLessThan(0.12);
      for (const v of [...look.eyes.l, ...look.eyes.r]) expect(Math.abs(v), id).toBeLessThan(0.3);
    }
  });

  it('only the smoke-touched are corrupted', () => {
    for (const [id, look] of Object.entries(ENEMY_LOOKS)) expect(look.corrupted, id).toBe(true);
    for (const look of Object.values(NPC_LOOKS)) expect(look.corrupted).toBe(false);
  });
});

describe('enemyClip', () => {
  const base: ClipInput = { state: 'idle', telegraph: null, ring: null, staggered: false, speed: 0, maxSpeed: 5, striking: null };
  const runner = { runsAbove: 0.5 };
  const walker = { runsAbove: null };

  it('moves: idle, walk, run (bipeds never run)', () => {
    expect(enemyClip(base, runner).clip).toBe('idle');
    expect(enemyClip({ ...base, state: 'patrol', speed: 1 }, runner).clip).toBe('walk');
    expect(enemyClip({ ...base, state: 'chase', speed: 4 }, runner).clip).toBe('run');
    expect(enemyClip({ ...base, state: 'chase', speed: 4 }, walker).clip).toBe('walk');
  });

  it('a wind-up follows the telegraph; a slam ring picks the slam wind-up', () => {
    expect(enemyClip({ ...base, state: 'attack', telegraph: 0.4 }, walker)).toEqual({ clip: 'windup', scrub: 0.4 });
    expect(enemyClip({ ...base, state: 'attack', telegraph: 0.4, ring: 3 }, walker)).toEqual({ clip: 'slam_windup', scrub: 0.4 });
    expect(enemyClip({ ...base, state: 'attack', striking: 'slam' }, walker).clip).toBe('slam');
  });

  it('reactions win: stunned and destroyed kneel/lie, purified rests, a hit staggers', () => {
    expect(enemyClip({ ...base, state: 'stunned', telegraph: 0.5 }, walker).clip).toBe('stunned');
    expect(enemyClip({ ...base, state: 'destroyed' }, walker).clip).toBe('stunned');
    expect(enemyClip({ ...base, state: 'purified', speed: 3 }, walker).clip).toBe('purified');
    expect(enemyClip({ ...base, state: 'chase', speed: 3, staggered: true }, runner).clip).toBe('stagger');
  });

  it('quadrupeds without slam clips fall back to the plain attack', () => {
    expect(CLIP_FALLBACK.slam_windup).toBe('windup');
    expect(CLIP_FALLBACK.slam).toBe('strike');
  });
});

describe('turning', () => {
  it('turns the short way round and faces +Z at heading 0', () => {
    expect(turnDelta(3, -3)).toBeCloseTo(2 * Math.PI - 6);
    expect(turnDelta(-3, 3)).toBeCloseTo(6 - 2 * Math.PI);
    expect(headingOf(0, 1)).toBeCloseTo(0);
    expect(headingOf(1, 0)).toBeCloseTo(Math.PI / 2);
  });
});
