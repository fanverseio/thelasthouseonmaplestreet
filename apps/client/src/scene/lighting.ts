import type { TestBrightness } from '../store/settings-store.ts';

/** Scene lighting presets. right is a testing aid so the greybox is easy to read; 
ormal is the intended mood. */
export interface Lighting {
  background: string;
  fogColor: string;
  fogDensity: number;
  ambient: number;
  sun: number;
  /** Gain on baked lightmaps (models.tsx); normal shows the bake as lit in Blender. */
  lightmap: number;
  /** Ground-mist puff opacity and colour (scene/atmosphere.tsx); 0 = no mist. */
  mist: number;
  mistColor: string;
  /** Lamp halo opacity. */
  halo: number;
}

export const EXTERIOR_LIGHTING: Record<TestBrightness, Lighting> = {
  normal: { background: '#0a0c12', fogColor: '#0c0f17', fogDensity: 0.055, ambient: 0.25, sun: 0.7, lightmap: 0.6, mist: 0.1, mistColor: '#5a6478', halo: 0.4 },
  bright: { background: '#151b28', fogColor: '#1a2232', fogDensity: 0.03, ambient: 0.7, sun: 1.4, lightmap: 1.0, mist: 0.14, mistColor: '#8592ab', halo: 0.5 },
};

export const INTERIOR_LIGHTING: Record<TestBrightness, Lighting> = {
  normal: { background: '#050507', fogColor: '#07070a', fogDensity: 0.08, ambient: 0.18, sun: 0, lightmap: 0.6, mist: 0, mistColor: '#000000', halo: 0.4 },
  bright: { background: '#14141c', fogColor: '#17171f', fogDensity: 0.025, ambient: 0.6, sun: 0, lightmap: 1.0, mist: 0, mistColor: '#000000', halo: 0.5 },
};
