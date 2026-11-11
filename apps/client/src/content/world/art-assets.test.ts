import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MAP_HALF_X, MAP_HALF_Z } from './exterior-layout.ts';
import { HOME_BOUNDS } from './home-layout.ts';
import { PLACEMENTS } from './placements.ts';

/** First art (docs/art-style.md): the GLBs exist, stay inside budget, and carry the nodes the game binds to. */
const MODELS = new URL('../../../public/assets/models/', import.meta.url);
const MAX_BYTES = 3 * 1024 * 1024;

interface GltfJson {
  nodes: { name?: string; mesh?: number; translation?: number[]; extensions?: Record<string, unknown> }[];
  meshes: { primitives: { indices?: number; attributes: { POSITION: number } }[] }[];
  accessors: { count: number; min?: number[]; max?: number[] }[];
  extensionsUsed?: string[];
  skins?: { joints: number[] }[];
  animations?: { name?: string }[];
}

function readGlb(file: string): GltfJson {
  const buf = readFileSync(fileURLToPath(new URL(file, MODELS)));
  expect(buf.toString('ascii', 0, 4)).toBe('glTF');
  expect(buf.readUInt32LE(4)).toBe(2);
  const jsonLength = buf.readUInt32LE(12);
  expect(buf.readUInt32LE(16)).toBe(0x4e4f534a); // 'JSON'
  return JSON.parse(buf.toString('utf8', 20, 20 + jsonLength)) as GltfJson;
}

function triangles(g: GltfJson, nodeName: string): number {
  const node = g.nodes.find((n) => n.name === nodeName);
  if (node?.mesh === undefined) return 0;
  return g.meshes[node.mesh]!.primitives.reduce((sum, p) => sum + (p.indices === undefined ? 0 : g.accessors[p.indices]!.count / 3), 0);
}

function totalTriangles(g: GltfJson): number {
  return g.nodes.reduce((sum, n) => sum + (n.name ? triangles(g, n.name) : 0), 0);
}

const HOME_NODES = [
  'geo_home_shell',
  'door_home_front',
  'socket_home_drawer',
  'prop_home_pumpkin_jar',
  'pickup_home_drawer_key',
  'clue_home_drawing',
  'clue_home_costume',
  'clue_home_journal_1',
  'light_home_felix_window',
];
const STREET_NODES = ['geo_street_ground', 'prop_street_front_streetlight', 'light_street_front_bulb'];

describe.each([
  ['home_elena.glb', HOME_NODES, 25000],
  ['street_front.glb', STREET_NODES, 8000],
  ['hands.glb', ['hand_R', 'hand_L', 'hand_R_skin', 'hand_L_skin'], 8000],
  ['backdrop.glb', ['geo_backdrop_near', 'geo_backdrop_far'], 8000],
  ['terrain.glb', ['geo_terrain'], 20000],
  ['last_house_ext.glb', ['geo_last_house', 'geo_last_house_grounds', 'light_last_house_attic'], 40000],
  ['house_kit.glb', ['kit_house_a', 'kit_house_b', 'kit_house_c', 'kit_house_d'], 6000],
  ['locket.glb', ['locket_smooth', 'locket_tarnished', 'locket_cracked'], 10000],
  ['items.glb', ['pickup_garden_fuse', 'clue_garden_walkie', 'clue_street_candy_bag', 'pickup_house66_fence_key', 'clue_hideout_journal_2', 'clue_lane_journal_3'], 3000],
  ['house_31.glb', ['geo_house31_garage', 'geo_house31_yard', 'light_house31_pumpkins'], 15000],
  ['props.glb', ['prop_streetlight', 'prop_streetlight_bulb'], 5000],
] as const)('%s', (file, required, triBudget) => {
  it('exists and is under 3 MB', () => {
    expect(statSync(fileURLToPath(new URL(file, MODELS))).size).toBeLessThan(MAX_BYTES);
  });

  it('has the required nodes, no lights and no cameras', () => {
    const g = readGlb(file);
    const names = g.nodes.map((n) => n.name);
    for (const n of required) expect(names, n).toContain(n);
    expect(g.extensionsUsed ?? []).not.toContain('KHR_lights_punctual');
    expect(g.nodes.some((n) => n.extensions?.KHR_lights_punctual)).toBe(false);
  });

  it('stays inside the triangle budget', () => {
    expect(totalTriangles(readGlb(file))).toBeLessThanOrEqual(triBudget);
  });
});

describe('home_elena.glb binds to the registry', () => {
  it('puts every entity node at its placement (x, z), with Y up and Z south', () => {
    const g = readGlb('home_elena.glb');
    for (const node of g.nodes) {
      if (!node.name || !/^(door|socket|prop_home_pumpkin_jar|pickup|clue)_/.test(node.name)) continue;
      const id = node.name.replace(/^(\w+?)_(\w+?)_(.*)$/, '$1.$2.$3');
      const p = PLACEMENTS[id as keyof typeof PLACEMENTS];
      if (!p) continue;
      const t = node.translation ?? [0, 0, 0];
      expect(t[0], `${node.name} x`).toBeCloseTo(p.x, 1);
      expect(t[2], `${node.name} z`).toBeCloseTo(p.z, 1);
    }
  });

  it('keeps the shell on the house footprint (roof overhang 1 m, porch 2.5 m)', () => {
    const g = readGlb('home_elena.glb');
    const node = g.nodes.find((n) => n.name === 'geo_home_shell')!;
    const prim = g.meshes[node.mesh!]!.primitives;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const p of prim) {
      const a = g.accessors[p.attributes.POSITION]!;
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i]!, a.min![i]!);
        max[i] = Math.max(max[i]!, a.max![i]!);
      }
    }
    expect(min[0]).toBeGreaterThanOrEqual(HOME_BOUNDS.minX - 1);
    expect(max[0]).toBeLessThanOrEqual(HOME_BOUNDS.maxX + 1);
    expect(min[2]).toBeGreaterThanOrEqual(HOME_BOUNDS.minZ - 3);
    expect(max[2]).toBeLessThanOrEqual(HOME_BOUNDS.maxZ + 1);
    expect(min[1]).toBeGreaterThanOrEqual(-0.2);
  });
});

describe('items.glb binds to the registry', () => {
  it('has one node per story item, standing at its placement', () => {
    const g = readGlb('items.glb');
    const roots = g.nodes.filter((n) => n.mesh !== undefined && /^(pickup|clue)_/.test(n.name ?? ''));
    expect(roots.length).toBeGreaterThan(0);
    for (const node of roots) {
      const id = node.name!.replace(/^(\w+?)_(\w+?)_(.*)$/, '$1.$2.$3');
      const p = PLACEMENTS[id as keyof typeof PLACEMENTS];
      expect(p, `${node.name} has a placement`).toBeDefined();
      const t = node.translation ?? [0, 0, 0];
      expect(t[0], `${node.name} x`).toBeCloseTo(p!.x, 1);
      expect(t[2], `${node.name} z`).toBeCloseTo(p!.z, 1);
    }
  });
});

describe('hands.glb (Elena, first person)', () => {
  const POSES = ['idle', 'open', 'spread', 'claw', 'flick', 'grab', 'cup'];

  it('has two skins and every finger-pose clip for both hands (scene/hands.tsx plays them)', () => {
    const g = readGlb('hands.glb');
    expect(g.skins?.length).toBe(2);
    const clips = new Set((g.animations ?? []).map((a) => a.name));
    for (const side of ['R', 'L']) for (const p of POSES) expect(clips, `${side}_${p}`).toContain(`${side}_${p}`);
  });
});

describe('backdrop.glb (shadow houses)', () => {
  /** Every vertex position of every mesh primitive (nodes sit at the origin, float32 VEC3 positions). */
  function positions(file: string): [number, number, number][] {
    const buf = readFileSync(fileURLToPath(new URL(file, MODELS)));
    const jsonLength = buf.readUInt32LE(12);
    const g = JSON.parse(buf.toString('utf8', 20, 20 + jsonLength)) as GltfJson & {
      bufferViews: { byteOffset?: number; byteLength: number; byteStride?: number }[];
      accessors: { bufferView?: number; byteOffset?: number; count: number }[];
    };
    const binStart = 20 + jsonLength + 8;
    const out: [number, number, number][] = [];
    for (const n of g.nodes) {
      if (n.mesh === undefined) continue;
      for (const p of g.meshes[n.mesh]!.primitives) {
        const a = g.accessors[p.attributes.POSITION]!;
        const v = g.bufferViews[a.bufferView!]!;
        const stride = v.byteStride ?? 12;
        const base = binStart + (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
        for (let i = 0; i < a.count; i++) {
          const o = base + i * stride;
          out.push([buf.readFloatLE(o), buf.readFloatLE(o + 4), buf.readFloatLE(o + 8)]);
        }
      }
    }
    return out;
  }

  it('keeps every vertex outside the play area (2 m past the fog wall) and inside the camera range', () => {
    const pts = positions('backdrop.glb');
    expect(pts.length).toBeGreaterThan(100);
    for (const [x, , z] of pts) {
      expect(Math.abs(x) > MAP_HALF_X + 2 || Math.abs(z) > MAP_HALF_Z + 2, `vertex at ${x.toFixed(1)}, ${z.toFixed(1)}`).toBe(true);
      expect(Math.hypot(x, z)).toBeLessThan(130);
    }
  });
});
