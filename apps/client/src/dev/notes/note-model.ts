/**
 * Playtest notes (DEV ONLY, local dev server): the author presses N during play, types a comment, and the game
 * records where and when it happened plus a screenshot saved under test-image/. Notes live in their own
 * localStorage key, never in the game save, and leave the browser only when the author saves the JSON file.
 * Pure data and functions; notes-store.ts does the storage, notes-panel.tsx the UI.
 */
import { z } from 'zod';

export const NOTE_TAGS = ['bug', 'visual', 'audio', 'pacing', 'idea'] as const;
export type NoteTag = (typeof NOTE_TAGS)[number];
/** Colour per tag, shared by the panel chips and the pins. */
export const TAG_COLOR: Readonly<Record<NoteTag, string>> = { bug: '#ff5a4a', visual: '#4aa8ff', audio: '#c07aff', pacing: '#ffb35c', idea: '#5ad17a' };
export const NOTE_SEVERITIES = [1, 2, 3] as const;
export type NoteSeverity = (typeof NOTE_SEVERITIES)[number];
/** Longest comment kept (characters). */
export const MAX_NOTE_TEXT = 2000;

const Vec3 = z.tuple([z.number(), z.number(), z.number()]);

/** Everything the game fills in by itself when N is pressed. */
export const NoteContextSchema = z.object({
  scene: z.string(),
  zone: z.string(),
  pos: Vec3,
  yaw: z.number(),
  pitch: z.number(),
  objective: z.string(),
  checkpoint: z.string(),
  flags: z.array(z.string()),
  /** The phase play was in when N was pressed (playing or paused). */
  phase: z.string(),
  sequence: z.string().nullable(),
  mode: z.string(),
  hp: z.number(),
  magic: z.number(),
  spell: z.string(),
  fps: z.number(),
  preset: z.string(),
  viewport: z.tuple([z.number(), z.number()]),
});
export type NoteContext = z.infer<typeof NoteContextSchema>;

export const NoteSchema = z.object({
  id: z.number().int().positive(),
  tag: z.enum(NOTE_TAGS),
  severity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string().max(MAX_NOTE_TEXT),
  /** ISO wall-clock time. */
  at: z.string(),
  /** Minutes since the notebook was started. */
  runMin: z.number(),
  context: NoteContextSchema,
  /** Absolute path of the screenshot in the repo's test-image/ folder, or null. */
  image: z.string().nullable(),
  /** Why there is no screenshot, when there is none. */
  imageError: z.string().optional(),
});
export type Note = z.infer<typeof NoteSchema>;

export const NotebookSchema = z.object({
  version: z.literal(1),
  /** When the notebook was started (ISO). */
  startedAt: z.string(),
  /** Short id used in screenshot file names, e.g. 20261112-2231. */
  session: z.string(),
  nextId: z.number().int().positive(),
  notes: z.array(NoteSchema),
});
export type Notebook = z.infer<typeof NotebookSchema>;

const pad = (n: number): string => String(n).padStart(2, '0');

/** `20261112-2231` from a date (local time, so it matches the author's clock). */
export function sessionId(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function emptyNotebook(now: Date): Notebook {
  return { version: 1, startedAt: now.toISOString(), session: sessionId(now), nextId: 1, notes: [] };
}

/** Reads a stored notebook; anything broken or from another version starts a fresh one (never throws). */
export function parseNotebook(raw: string | null, now: Date): Notebook {
  if (!raw) return emptyNotebook(now);
  try {
    const parsed = NotebookSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : emptyNotebook(now);
  } catch {
    return emptyNotebook(now);
  }
}

export interface NoteDraft {
  tag: NoteTag;
  severity: NoteSeverity;
  text: string;
}

/** Adds a note with the given id (reserved when N was pressed). Text is trimmed and capped. */
export function addNote(
  book: Notebook,
  id: number,
  draft: NoteDraft,
  context: NoteContext,
  now: Date,
  image: { path: string | null; error?: string },
): Notebook {
  const note: Note = {
    id,
    tag: draft.tag,
    severity: draft.severity,
    text: draft.text.trim().slice(0, MAX_NOTE_TEXT),
    at: now.toISOString(),
    runMin: Math.round(((now.getTime() - Date.parse(book.startedAt)) / 60000) * 10) / 10,
    context,
    image: image.path,
    ...(image.error ? { imageError: image.error } : {}),
  };
  return { ...book, nextId: Math.max(book.nextId, id + 1), notes: [...book.notes, note] };
}

/** Takes the next id without adding a note yet (the screenshot is sent while the author types). */
export function reserveId(book: Notebook): { book: Notebook; id: number } {
  return { book: { ...book, nextId: book.nextId + 1 }, id: book.nextId };
}

export function editNote(book: Notebook, id: number, patch: Partial<NoteDraft>): Notebook {
  return {
    ...book,
    notes: book.notes.map((n) =>
      n.id !== id ? n : { ...n, ...patch, ...(patch.text !== undefined ? { text: patch.text.trim().slice(0, MAX_NOTE_TEXT) } : {}) },
    ),
  };
}

export function deleteNote(book: Notebook, id: number): Notebook {
  return { ...book, notes: book.notes.filter((n) => n.id !== id) };
}

/** File name for the saved JSON, e.g. tlh-notes-20261112-2231.json. */
export function exportFilename(book: Notebook): string {
  return `tlh-notes-${book.session}.json`;
}

/** The saved JSON: the notebook plus where it came from. */
export function exportJson(book: Notebook, meta: { appVersion: string; exportedAt: Date; userAgent: string }): string {
  return JSON.stringify(
    { ...book, appVersion: meta.appVersion, exportedAt: meta.exportedAt.toISOString(), userAgent: meta.userAgent, count: book.notes.length },
    null,
    2,
  );
}

/** The notes drawn as pins in one scene. */
export function pinsForScene(book: Notebook, scene: string): Note[] {
  return book.notes.filter((n) => n.context.scene === scene);
}
