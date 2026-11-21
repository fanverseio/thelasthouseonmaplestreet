import { describe, expect, it } from 'vitest';
import { createGameStore } from '../../store/game-store.ts';
import { imageFileFor, imageKind, isSameOrigin, MAX_IMAGE_BYTES } from './image-file.ts';
import { noteContext } from './note-context.ts';
import {
  addNote,
  deleteNote,
  editNote,
  emptyNotebook,
  exportFilename,
  exportJson,
  MAX_NOTE_TEXT,
  NotebookSchema,
  parseNotebook,
  pinsForScene,
  reserveId,
  sessionId,
  type NoteContext,
} from './note-model.ts';
import { NOTES_FLAG_KEY, notesEnabled, type FlagStorage } from './notes-enabled.ts';

function memoryStorage(): FlagStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

const T0 = new Date(2026, 10, 12, 22, 31, 5);
const ctx = (over: Partial<NoteContext> = {}): NoteContext => ({
  scene: 'exterior', zone: 'street', pos: [1, 0, 2], yaw: 0, pitch: 0, objective: 'Find Felix', checkpoint: 'cp_street', flags: ['home_done'],
  phase: 'playing', sequence: null, mode: 'classic', hp: 100, magic: 100, spell: 'bolt', fps: 60, preset: 'medium', viewport: [1280, 720], ...over,
});

describe('notes switch', () => {
  it('is never on in a built game', () => {
    const s = memoryStorage();
    s.setItem(NOTES_FLAG_KEY, '1');
    expect(notesEnabled(false, '?notes=1', s)).toBe(false);
  });

  it('?notes=1 turns it on and remembers; ?notes=0 turns it off and forgets', () => {
    const s = memoryStorage();
    expect(notesEnabled(true, '', s)).toBe(false);
    expect(notesEnabled(true, '?notes=1', s)).toBe(true);
    expect(notesEnabled(true, '', s)).toBe(true);
    expect(notesEnabled(true, '?start=garden&notes=0', s)).toBe(false);
    expect(notesEnabled(true, '', s)).toBe(false);
    expect(s.data.size).toBe(0);
  });

  it('works without storage (blocked or missing): only the URL counts', () => {
    const broken: FlagStorage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => {} };
    expect(notesEnabled(true, '?notes=1', broken)).toBe(true);
    expect(notesEnabled(true, '', broken)).toBe(false);
    expect(notesEnabled(true, '?notes=1', null)).toBe(true);
  });
});

describe('notebook', () => {
  it('session ids are local date and time', () => {
    expect(sessionId(T0)).toBe('20261112-2231');
    expect(exportFilename(emptyNotebook(T0))).toBe('tlh-notes-20261112-2231.json');
  });

  it('adds, edits and deletes notes; ids never repeat', () => {
    let book = emptyNotebook(T0);
    const a = reserveId(book);
    book = addNote(a.book, a.id, { tag: 'bug', severity: 3, text: '  Fox clips into the fence  ' }, ctx(), new Date(T0.getTime() + 6 * 60000), { path: 'D:\\repo\\test-image\\20261112-2231-n1.jpg' });
    const b = reserveId(book);
    book = addNote(b.book, b.id, { tag: 'idea', severity: 1, text: 'More fog here' }, ctx({ scene: 'last_house' }), T0, { path: null, error: 'no screenshot' });
    expect(book.notes.map((n) => n.id)).toEqual([1, 2]);
    expect(book.notes[0]).toMatchObject({ text: 'Fox clips into the fence', runMin: 6, image: 'D:\\repo\\test-image\\20261112-2231-n1.jpg' });
    expect(book.notes[1]).toMatchObject({ image: null, imageError: 'no screenshot' });
    book = editNote(book, 1, { text: 'Fox clips', severity: 2 });
    expect(book.notes[0]).toMatchObject({ text: 'Fox clips', severity: 2, tag: 'bug' });
    book = deleteNote(book, 1);
    expect(book.notes.map((n) => n.id)).toEqual([2]);
    expect(reserveId(book).id).toBe(3);
    expect(pinsForScene(book, 'last_house')).toHaveLength(1);
    expect(pinsForScene(book, 'exterior')).toHaveLength(0);
  });

  it('caps long comments', () => {
    const { book, id } = reserveId(emptyNotebook(T0));
    const out = addNote(book, id, { tag: 'bug', severity: 1, text: 'x'.repeat(MAX_NOTE_TEXT + 50) }, ctx(), T0, { path: null });
    expect(out.notes[0]!.text).toHaveLength(MAX_NOTE_TEXT);
  });

  it('a stored notebook round-trips; broken or foreign data starts fresh and never throws', () => {
    const { book, id } = reserveId(emptyNotebook(T0));
    const full = addNote(book, id, { tag: 'audio', severity: 2, text: 'Too loud' }, ctx(), T0, { path: null });
    expect(parseNotebook(JSON.stringify(full), T0)).toEqual(full);
    for (const bad of ['{not json', '{"version":2}', '[]', 'null']) expect(parseNotebook(bad, T0).notes).toEqual([]);
    expect(parseNotebook(null, T0).nextId).toBe(1);
  });

  it('the saved JSON is the notebook plus build facts, and parses back', () => {
    const { book, id } = reserveId(emptyNotebook(T0));
    const full = addNote(book, id, { tag: 'pacing', severity: 2, text: 'Slow' }, ctx(), T0, { path: null });
    const json = JSON.parse(exportJson(full, { appVersion: '0.1.0', exportedAt: T0, userAgent: 'test' })) as Record<string, unknown>;
    expect(json).toMatchObject({ appVersion: '0.1.0', count: 1, userAgent: 'test', session: '20261112-2231' });
    expect(NotebookSchema.safeParse(json).success).toBe(true);
  });
});

describe('note context', () => {
  it('records the game facts (scene, zone, objective, flags, player) and nothing else', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    const c = noteContext(store.getState(), { sequence: 'seq1_empty_street', fps: 59.6, preset: 'high', viewport: [1920, 1080] });
    expect(c).toMatchObject({ scene: 'exterior', sequence: 'seq1_empty_street', fps: 60, preset: 'high', mode: 'classic', viewport: [1920, 1080] });
    expect(typeof c.zone).toBe('string');
    expect(typeof c.objective).toBe('string');
    expect(Object.keys(c).sort()).toEqual(
      ['checkpoint', 'flags', 'fps', 'hp', 'magic', 'mode', 'objective', 'phase', 'pitch', 'pos', 'preset', 'scene', 'sequence', 'spell', 'viewport', 'yaw', 'zone'].sort(),
    );
  });
});

describe('screenshot endpoint checks', () => {
  it('builds the file name only from a strict session and id', () => {
    expect(imageFileFor('20261112-2231', '7', 'jpg')).toBe('20261112-2231-n7.jpg');
    for (const [s, id] of [
      ['../../etc', '1'],
      ['20261112-2231', '../x'],
      ['20261112-2231', '0'],
      ['20261112-2231', '1.5'],
      ['2026111-2231', '1'],
      ['20261112-2231/..', '1'],
      [null, '1'],
      ['20261112-2231', null],
    ] as const) {
      expect(imageFileFor(s, id, 'jpg'), `${s} ${id}`).toBeNull();
    }
  });

  it('accepts JPEG and PNG bytes only', () => {
    expect(imageKind(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpg');
    expect(imageKind(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('png');
    expect(imageKind(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull();
    expect(imageKind(new Uint8Array())).toBeNull();
    expect(MAX_IMAGE_BYTES).toBeLessThanOrEqual(8 * 1024 * 1024);
  });

  it('refuses other sites', () => {
    expect(isSameOrigin({ secFetchSite: 'same-origin' })).toBe(true);
    expect(isSameOrigin({ secFetchSite: 'cross-site', origin: 'http://127.0.0.1:5173', host: '127.0.0.1:5173' })).toBe(false);
    expect(isSameOrigin({ origin: 'http://127.0.0.1:5173', host: '127.0.0.1:5173' })).toBe(true);
    expect(isSameOrigin({ origin: 'https://evil.example', host: '127.0.0.1:5173' })).toBe(false);
    expect(isSameOrigin({ host: '127.0.0.1:5173' })).toBe(false);
  });
});
