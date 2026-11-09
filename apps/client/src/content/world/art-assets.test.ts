import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
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
