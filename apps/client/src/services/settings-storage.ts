import { z } from 'zod';
import {
  defaultSettings,
  FOV_MAX,
  FOV_MIN,
  GRAPHICS_PRESETS,
  INTERACT_GLOWS,
  TEST_BRIGHTNESS,
  type SettingsData,
} from '../store/settings-store.ts';
import type { KeyValueBackend } from './save-storage.ts';

/** Settings live under their own key, never inside the save (Reset progress leaves them alone). */
export const SETTINGS_STORAGE_KEY = 'tlh.settings';

const d = defaultSettings();
const unit = (fallback: number) => z.number().min(0).max(1).catch(fallback);
const flag = (fallback: boolean) => z.boolean().catch(fallback);

/**
 * Every field falls back to its default on its own, so one bad or missing value (an older file, a hand edit)
 * costs only that value. Anything that is not an object gives all defaults.
 */
const SettingsSchema = z.object({
  volume: z
    .object({
      master: unit(d.volume.master),
      music: unit(d.volume.music),
      sfx: unit(d.volume.sfx),
      ambience: unit(d.volume.ambience),
      voice: unit(d.volume.voice),
    })
    .catch(d.volume),
  mouseSensitivity: z.number().min(0.2).max(3).catch(d.mouseSensitivity),
  invertY: flag(d.invertY),
  fieldOfView: z.number().int().min(FOV_MIN).max(FOV_MAX).catch(d.fieldOfView),
  graphicsPreset: z.enum(GRAPHICS_PRESETS).catch(d.graphicsPreset),
  reduceFlashing: flag(d.reduceFlashing),
  headBob: flag(d.headBob),
  interactGlow: z.enum(INTERACT_GLOWS).catch(d.interactGlow),
  testBrightness: z.enum(TEST_BRIGHTNESS).catch(d.testBrightness),
  showPosition: flag(d.showPosition),
  subtitleSize: z.enum(['normal', 'large']).catch(d.subtitleSize),
  warningAcknowledged: flag(d.warningAcknowledged),
});

function browserStorage(): KeyValueBackend | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Parse stored text into settings. Never throws; null, bad JSON or a non-object give the defaults. */
export function parseSettings(raw: string | null): SettingsData {
  if (raw === null) return defaultSettings();
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return defaultSettings();
    return SettingsSchema.parse(value);
  } catch {
    return defaultSettings();
  }
}

/** The data fields only (no store actions), ready to write. */
export function pickSettings(state: SettingsData): SettingsData {
  const { volume, mouseSensitivity, invertY, fieldOfView, graphicsPreset, reduceFlashing, headBob, interactGlow, testBrightness, showPosition, subtitleSize, warningAcknowledged } = state;
  return { volume: { ...volume }, mouseSensitivity, invertY, fieldOfView, graphicsPreset, reduceFlashing, headBob, interactGlow, testBrightness, showPosition, subtitleSize, warningAcknowledged };
}

/** Reads and writes the settings file. Implementations never throw. */
export class SettingsStorage {
  private readonly backend: KeyValueBackend | null;
  constructor(backend: KeyValueBackend | null = browserStorage()) {
    this.backend = backend;
  }

  load(): SettingsData {
    try {
      return parseSettings(this.backend ? this.backend.getItem(SETTINGS_STORAGE_KEY) : null);
    } catch {
      return defaultSettings();
    }
  }

  /** Returns false when the write failed (quota, private mode). */
  save(state: SettingsData): boolean {
    try {
      if (!this.backend) return false;
      this.backend.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(pickSettings(state)));
      return true;
    } catch {
      return false;
    }
  }
}
