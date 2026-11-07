import type { TestBrightness } from '../store/settings-store.ts';

/** Scene lighting presets. right is a testing aid so the greybox is easy to read; 
ormal is the intended mood. */
export interface Lighting {
  background: string;
  fogColor: string;
  fogDensity: number;
  ambient: number;
  sun: number;
}

export const EXTERIOR_LIGHTING: Record<TestBrightness, Lighting> = {
  normal: { background: '#07080c', fogColor: '#0b0d14', fogDensity: 0.045, ambient: 0.25, sun: 0.7 },
  bright: { background: '#1b2438', fogColor: '#222c44', fogDensity: 0.012, ambient: 1.1, sun: 1.9 },
};

export const INTERIOR_LIGHTING: Record<TestBrightness, Lighting> = {
  normal: { background: '#050507', fogColor: '#07070a', fogDensity: 0.08, ambient: 0.18, sun: 0 },
  bright: { background: '#14141c', fogColor: '#17171f', fogDensity: 0.025, ambient: 0.9, sun: 0 },
};
