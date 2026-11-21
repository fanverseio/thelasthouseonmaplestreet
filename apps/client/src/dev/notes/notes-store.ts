/**
 * Browser side of playtest notes (DEV ONLY): the notebook in localStorage under its own key (never in the game
 * save), the screenshot capture and upload to the dev server, the JSON file the author saves, and an fps meter.
 */
import { APP_VERSION } from '@tlh/shared';
import { NOTES_IMAGE_ROUTE } from './image-file.ts';
import {
  addNote,
  deleteNote,
  editNote,
  emptyNotebook,
  exportFilename,
  exportJson,
  parseNotebook,
  reserveId,
  type Notebook,
  type NoteContext,
  type NoteDraft,
} from './note-model.ts';

export const NOTES_KEY = 'tlh.playtest.notes';

function load(): Notebook {
  try {
    return parseNotebook(localStorage.getItem(NOTES_KEY), new Date());
  } catch {
    return emptyNotebook(new Date());
  }
}

let book: Notebook = load();
const listeners = new Set<() => void>();

function commit(next: Notebook): void {
  book = next;
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(book));
  } catch {
    // Storage full or blocked: the notes stay in memory until the page closes.
  }
  for (const l of listeners) l();
}

/** The notebook, as a tiny external store for useSyncExternalStore. */
export const notes = {
  get: (): Notebook => book,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  reserve(): number {
    const r = reserveId(book);
    commit(r.book);
    return r.id;
  },
  add(id: number, draft: NoteDraft, context: NoteContext, image: { path: string | null; error?: string }): void {
    commit(addNote(book, id, draft, context, new Date(), image));
  },
  edit(id: number, patch: Partial<NoteDraft>): void {
    commit(editNote(book, id, patch));
  },
  remove(id: number): void {
    commit(deleteNote(book, id));
  },
  /** Starts a new notebook (the screenshots already in test-image/ stay on disk). */
  clear(): void {
    commit(emptyNotebook(new Date()));
  },
};

/** Smoothed frames per second, written by the pins component every frame. */
export const fpsMeter = { value: 0 };

/** The frame on screen as a JPEG (needs the canvas created with preserveDrawingBuffer). Gives up after 10 s. */
export function captureCanvas(canvas: HTMLCanvasElement | null): Promise<Blob | null> {
  if (!canvas) return Promise.resolve(null);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 10_000);
    try {
      canvas.toBlob(
        (b) => {
          clearTimeout(timer);
          resolve(b);
        },
        'image/jpeg',
        0.85,
      );
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

/** Sends a screenshot to the dev server, which writes it to test-image/ and answers with its absolute path. */
export async function uploadImage(session: string, id: number, blob: Blob | null): Promise<{ path: string | null; error?: string }> {
  if (!blob) return { path: null, error: 'no screenshot' };
  try {
    const res = await fetch(`${NOTES_IMAGE_ROUTE}?session=${encodeURIComponent(session)}&id=${id}`, {
      method: 'POST',
      headers: { 'content-type': blob.type || 'image/jpeg' },
      body: blob,
    });
    const body = (await res.json().catch(() => ({}))) as { path?: unknown; error?: unknown };
    if (!res.ok || typeof body.path !== 'string') return { path: null, error: `upload failed (${res.status}${typeof body.error === 'string' ? `: ${body.error}` : ''})` };
    return { path: body.path };
  } catch {
    return { path: null, error: 'dev server not reachable' };
  }
}

/** Saves the notebook as a JSON file through the browser's normal download. */
export function saveJsonFile(): void {
  const json = exportJson(book, { appVersion: APP_VERSION, exportedAt: new Date(), userAgent: navigator.userAgent });
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFilename(book);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
