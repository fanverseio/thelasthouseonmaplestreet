/**
 * The one on/off switch for playtest notes. Dev server only: a built game (Vercel or `npm run build`) never
 * turns them on, because the caller passes `import.meta.env.DEV` and the image endpoint exists only in
 * `vite serve`.
 *   ?notes=1  turn on and remember it (localStorage), so a reload keeps it on
 *   ?notes=0  turn off and forget it
 *   neither   whatever was remembered
 */
export const NOTES_FLAG_KEY = 'tlh.dev.notes';

export interface FlagStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function notesEnabled(dev: boolean, search: string, storage: FlagStorage | null): boolean {
  if (!dev) return false;
  const param = new URLSearchParams(search).get('notes');
  try {
    if (param === '1' || param === 'on') {
      storage?.setItem(NOTES_FLAG_KEY, '1');
      return true;
    }
    if (param === '0' || param === 'off') {
      storage?.removeItem(NOTES_FLAG_KEY);
      return false;
    }
    return storage?.getItem(NOTES_FLAG_KEY) === '1';
  } catch {
    // Storage blocked: only the URL counts.
    return param === '1' || param === 'on';
  }
}
