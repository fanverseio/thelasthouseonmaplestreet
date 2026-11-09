import { SAVE_STORAGE_KEY } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { createSettingsStore, defaultSettings } from '../store/settings-store.ts';
import { LocalStorageSaveStorage, type KeyValueBackend } from './save-storage.ts';
import { parseSettings, SETTINGS_STORAGE_KEY, SettingsStorage } from './settings-storage.ts';

function memoryBackend(): KeyValueBackend & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe('settings storage (Q23)', () => {
  it('uses the key tlh.settings', () => {
    expect(SETTINGS_STORAGE_KEY).toBe('tlh.settings');
  });

  it('gives the defaults when nothing is stored', () => {
    expect(new SettingsStorage(memoryBackend()).load()).toEqual(defaultSettings());
    expect(new SettingsStorage(null).load()).toEqual(defaultSettings());
  });

  it('round-trips every setting, including warningAcknowledged', () => {
    const backend = memoryBackend();
    const changed = {
      ...defaultSettings(),
      volume: { master: 0.1, music: 0.2, sfx: 0.3, ambience: 0.4, voice: 0.5 },
      mouseSensitivity: 2.5,
      invertY: true,
      fieldOfView: 95,
      graphicsPreset: 'low' as const,
      reduceFlashing: false,
      headBob: false,
      interactGlow: 'off' as const,
      testBrightness: 'normal' as const,
      showPosition: false,
      subtitleSize: 'large' as const,
      warningAcknowledged: true,
    };
    expect(new SettingsStorage(backend).save(changed)).toBe(true);
    expect(new SettingsStorage(backend).load()).toEqual(changed);
  });

  it('never throws on corrupt input and falls back to defaults', () => {
    for (const raw of ['', '{', 'null', '[]', '42', '"x"', '{"volume":5}']) {
      expect(() => parseSettings(raw), raw).not.toThrow();
    }
    expect(parseSettings('{')).toEqual(defaultSettings());
    expect(parseSettings('null')).toEqual(defaultSettings());
    expect(parseSettings('[]')).toEqual(defaultSettings());
  });

  it('keeps the good fields and defaults only the bad ones', () => {
    const s = parseSettings(JSON.stringify({ invertY: true, fieldOfView: 500, graphicsPreset: 'ultra', volume: { master: 0.3, music: 'loud' }, extra: 1 }));
    expect(s.invertY).toBe(true);
    expect(s.fieldOfView).toBe(defaultSettings().fieldOfView);
    expect(s.graphicsPreset).toBe(defaultSettings().graphicsPreset);
    expect(s.volume.master).toBe(0.3);
    expect(s.volume.music).toBe(defaultSettings().volume.music);
    expect(s).not.toHaveProperty('extra');
  });

  it('survives a backend that throws', () => {
    const bad: KeyValueBackend = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => undefined,
    };
    const storage = new SettingsStorage(bad);
    expect(storage.load()).toEqual(defaultSettings());
    expect(storage.save(defaultSettings())).toBe(false);
  });

  it('a store started from stored settings restores them after a reload', () => {
    const backend = memoryBackend();
    const storage = new SettingsStorage(backend);
    const first = createSettingsStore(storage.load());
    first.subscribe((state) => void storage.save(state));
    first.getState().updateSettings({ warningAcknowledged: true, invertY: true, subtitleSize: 'large' });
    const second = createSettingsStore(new SettingsStorage(backend).load());
    expect(second.getState()).toMatchObject({ warningAcknowledged: true, invertY: true, subtitleSize: 'large' });
  });

  it('Reset progress (clearing the save) leaves the settings alone', () => {
    const backend = memoryBackend();
    const settings = new SettingsStorage(backend);
    settings.save({ ...defaultSettings(), warningAcknowledged: true, invertY: true });
    backend.map.set(SAVE_STORAGE_KEY, '{"anything":1}');
    new LocalStorageSaveStorage(backend).clear();
    expect(backend.map.has(SAVE_STORAGE_KEY)).toBe(false);
    expect(backend.map.has(SETTINGS_STORAGE_KEY)).toBe(true);
    expect(settings.load()).toMatchObject({ warningAcknowledged: true, invertY: true });
  });
});
