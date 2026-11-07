import { createStore } from 'zustand/vanilla';

/**
 * Player settings (docs/input-ux.md section 8). Stored separately from saves under `tlh.settings`
 * (persistence arrives with the save system in tasks.md task 4.1).
 */
export const GRAPHICS_PRESETS = ['low', 'medium', 'high'] as const;
export type GraphicsPreset = (typeof GRAPHICS_PRESETS)[number];

export interface SettingsData {
  volume: { master: number; music: number; sfx: number; ambience: number; voice: number };
  mouseSensitivity: number;
  invertY: boolean;
  fieldOfView: number;
  graphicsPreset: GraphicsPreset;
  reduceFlashing: boolean;
  headBob: boolean;
  subtitleSize: 'normal' | 'large';
  warningAcknowledged: boolean;
}

export const FOV_MIN = 70;
export const FOV_MAX = 100;

export function defaultSettings(): SettingsData {
  return {
    volume: { master: 0.8, music: 0.7, sfx: 0.8, ambience: 0.8, voice: 1 },
    mouseSensitivity: 1,
    invertY: false,
    fieldOfView: 80,
    graphicsPreset: 'medium',
    // On by default once the photosensitivity warning is confirmed (docs/input-ux.md section 10).
    reduceFlashing: true,
    headBob: true,
    subtitleSize: 'normal',
    warningAcknowledged: false,
  };
}

export interface SettingsState extends SettingsData {
  setFieldOfView: (fov: number) => void;
  /** Patch simple settings (sensitivity, toggles, preset). Volumes are clamped to 0..1. */
  updateSettings: (patch: Partial<Omit<SettingsData, 'volume'>> & { volume?: Partial<SettingsData['volume']> }) => void;
  resetSettings: () => void;
}

export function createSettingsStore() {
  return createStore<SettingsState>()((set) => ({
    ...defaultSettings(),
    setFieldOfView: (fov) => set({ fieldOfView: Math.min(FOV_MAX, Math.max(FOV_MIN, Math.round(fov))) }),
    updateSettings: (patch) =>
      set((s) => {
        const volume = { ...s.volume };
        for (const [k, v] of Object.entries(patch.volume ?? {})) {
          volume[k as keyof typeof volume] = Math.min(1, Math.max(0, v));
        }
        const next = { ...patch, volume };
        if (patch.mouseSensitivity !== undefined) next.mouseSensitivity = Math.min(3, Math.max(0.2, patch.mouseSensitivity));
        if (patch.fieldOfView !== undefined) next.fieldOfView = Math.min(FOV_MAX, Math.max(FOV_MIN, Math.round(patch.fieldOfView)));
        return next;
      }),
    resetSettings: () => set(defaultSettings()),
  }));
}
