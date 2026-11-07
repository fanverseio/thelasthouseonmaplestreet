import { SAVE_STORAGE_KEY, type SaveFileV1 } from '@tlh/shared';
import { parseSave, type LoadResult } from '../game/save.ts';

/** Where the single save slot lives. Implementations never throw. */
export interface SaveStorage {
  load(): LoadResult;
  /** Returns false when the write failed (quota, private mode). */
  save(file: SaveFileV1): boolean;
  clear(): void;
}

export interface KeyValueBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class BackendSaveStorage implements SaveStorage {
  protected readonly backend: KeyValueBackend | null;
  constructor(backend: KeyValueBackend | null) {
    this.backend = backend;
  }

  load(): LoadResult {
    try {
      return parseSave(this.backend ? this.backend.getItem(SAVE_STORAGE_KEY) : null);
    } catch {
      return { status: 'corrupt' };
    }
  }

  save(file: SaveFileV1): boolean {
    try {
      if (!this.backend) return false;
      this.backend.setItem(SAVE_STORAGE_KEY, JSON.stringify(file));
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      this.backend?.removeItem(SAVE_STORAGE_KEY);
    } catch {
      /* nothing to clear */
    }
  }
}

function browserStorage(): KeyValueBackend | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Browser localStorage under key `tlh.save`. */
export class LocalStorageSaveStorage extends BackendSaveStorage {
  constructor(backend: KeyValueBackend | null = browserStorage()) {
    super(backend);
  }
}

/** In-memory storage for tests. `raw` exposes the stored text so tests can corrupt it. */
export class MemorySaveStorage extends BackendSaveStorage {
  private readonly map = new Map<string, string>();
  constructor() {
    super({
      getItem: (k) => this.map.get(k) ?? null,
      setItem: (k, v) => void this.map.set(k, v),
      removeItem: (k) => void this.map.delete(k),
    });
  }
  get raw(): string | null {
    return this.map.get(SAVE_STORAGE_KEY) ?? null;
  }
  set raw(value: string | null) {
    if (value === null) this.map.delete(SAVE_STORAGE_KEY);
    else this.map.set(SAVE_STORAGE_KEY, value);
  }
}
