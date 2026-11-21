/**
 * Playtest notes UI (DEV ONLY, `?notes=1` on the dev server). N: grab the frame, freeze play and open a note;
 * Enter saves (with a pin where Elena stands), Esc cancels. Shift+N: the list, where notes are edited or
 * deleted and the JSON file is saved. Lazy-loaded by game-view.tsx only when the switch is on.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react';
import { gameStore, settingsStore } from '../../store/index.ts';
import type { GamePhase } from '../../store/game-store.ts';
import { noteContext } from './note-context.ts';
import { NOTE_SEVERITIES, NOTE_TAGS, TAG_COLOR, type Note, type NoteContext, type NoteSeverity, type NoteTag } from './note-model.ts';
import { captureCanvas, fpsMeter, notes, saveJsonFile, uploadImage } from './notes-store.ts';

/** Phases a note may be opened from: never over a puzzle, the locket, a sequence or the ending. */
const OPEN_FROM: ReadonlySet<GamePhase> = new Set(['playing', 'paused']);

interface Draft {
  tag: NoteTag;
  severity: NoteSeverity;
  text: string;
}

type View =
  | { kind: 'closed' }
  | { kind: 'compose'; context: NoteContext; blob: Blob | null; pending: Promise<Blob | null> | null; preview: string | null; editId: number | null }
  | { kind: 'list' };

/** Full-screen layer that centres the box (no CSS transform, so clicks land where the buttons are drawn). */
const layer: CSSProperties = { position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', zIndex: 1000 };
const box: CSSProperties = {
  width: 'min(560px, 92vw)', maxHeight: '86vh', overflow: 'auto',
  background: '#12141c', color: '#e6e6ee', border: '1px solid #3a4152', borderRadius: 8, padding: 16, font: '14px sans-serif',
  boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
};
const chip = (on: boolean, color = '#ffb35c'): CSSProperties => ({
  padding: '4px 10px', marginRight: 6, marginBottom: 6, borderRadius: 12, cursor: 'pointer', font: '13px sans-serif',
  border: `1px solid ${on ? color : '#3a4152'}`, background: on ? color : '#1a1e29', color: on ? '#111' : '#dde',
});
const button: CSSProperties = { padding: '6px 12px', marginRight: 8, borderRadius: 4, border: '1px solid #3a4152', background: '#1f2431', color: '#eee', cursor: 'pointer' };

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

export default function NotesPanel({ host, activeSequence }: { host: RefObject<HTMLDivElement | null>; activeSequence: () => string | null }) {
  const book = useSyncExternalStore(notes.subscribe, notes.get);
  const [view, setView] = useState<View>({ kind: 'closed' });
  const [draft, setDraft] = useState<Draft>({ tag: 'bug', severity: 2, text: '' });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const viewRef = useRef(view);
  viewRef.current = view;
  // Focus the list once when it opens (so Esc works), not on every re-render.
  const focusOnce = useCallback((el: HTMLDivElement | null) => el?.focus(), []);

  const freeze = () => {
    gameStore.getState().setPhase('overlay'); // freezes the sim; game-view releases pointer lock in this phase
  };
  const close = useCallback(() => {
    const v = viewRef.current;
    if (v.kind === 'compose' && v.preview) URL.revokeObjectURL(v.preview);
    setView({ kind: 'closed' });
    gameStore.getState().setPhase('paused'); // "Click to resume", like closing the locket
  }, []);

  const openCompose = useCallback(() => {
    const s = gameStore.getState();
    const canvas = host.current?.querySelector('canvas') ?? null;
    // Start the capture first (the frame as it was when N was pressed), then open the box at once;
    // the preview fills in when the JPEG is ready (a software GPU can take a second or two).
    const pending = captureCanvas(canvas);
    const context = noteContext(s, {
      sequence: activeSequence(),
      fps: fpsMeter.value,
      preset: settingsStore.getState().graphicsPreset,
      viewport: [window.innerWidth, window.innerHeight],
    });
    setDraft((d) => ({ ...d, text: '' }));
    setView({ kind: 'compose', context, blob: null, pending, preview: null, editId: null });
    freeze();
    void pending.then((blob) => {
      setView((v) => (v.kind === 'compose' && v.pending === pending ? { ...v, blob, preview: blob ? URL.createObjectURL(blob) : null } : v));
    });
  }, [host, activeSequence]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyN' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (viewRef.current.kind !== 'closed') return;
      if (!OPEN_FROM.has(gameStore.getState().game.phase)) return;
      e.preventDefault();
      if (e.shiftKey) {
        setView({ kind: 'list' });
        freeze();
      } else openCompose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openCompose]);

  const save = async () => {
    const v = viewRef.current;
    if (v.kind !== 'compose' || saving) return;
    if (v.editId !== null) {
      notes.edit(v.editId, draft);
      setView({ kind: 'list' });
      return;
    }
    setSaving(true);
    const blob = v.blob ?? (v.pending ? await v.pending : null);
    const id = notes.reserve();
    const image = await uploadImage(notes.get().session, id, blob);
    notes.add(id, draft, v.context, image);
    setSaving(false);
    setStatus(image.path ? `Note #${id} saved` : `Note #${id} saved without screenshot (${image.error ?? 'unknown'})`);
    setTimeout(() => setStatus(''), 3000);
    close();
  };

  const onComposeKey = (e: ReactKeyboardEvent) => {
    e.stopPropagation(); // keep game keys (E, T, Esc, digits) away from the game while typing
    if (e.key === 'Escape') {
      e.preventDefault();
      if (viewRef.current.kind === 'compose' && (viewRef.current as { editId: number | null }).editId !== null) setView({ kind: 'list' });
      else close();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void save();
    }
  };

  const edit = (n: Note) => {
    setDraft({ tag: n.tag, severity: n.severity, text: n.text });
    setView({ kind: 'compose', context: n.context, blob: null, pending: null, preview: null, editId: n.id });
  };

  return (
    <>
      <div
        style={{ position: 'fixed', right: 10, bottom: 10, zIndex: 999, pointerEvents: 'none', font: '12px sans-serif', color: '#dde', background: 'rgba(10,12,18,0.7)', padding: '4px 8px', borderRadius: 4 }}
        data-testid="notes-badge"
      >
        Notes on · N add · Shift+N list · {book.notes.length} {book.notes.length === 1 ? 'note' : 'notes'}
        {status && <div style={{ color: '#ffb35c' }}>{status}</div>}
      </div>

      {view.kind === 'compose' && (
        <div style={layer} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        <div style={box} role="dialog" aria-label={view.editId !== null ? `Edit note ${view.editId}` : 'New playtest note'} onKeyDown={onComposeKey}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>{view.editId !== null ? `Edit note #${view.editId}` : `New note #${book.nextId}`}</div>
          <div style={{ color: '#9aa', fontSize: 12, marginBottom: 8 }}>
            {view.context.scene} · {view.context.zone} · [{view.context.pos[0]}, {view.context.pos[2]}] · {view.context.objective}
          </div>
          {view.preview && <img src={view.preview} alt="Screenshot of this moment" style={{ width: '100%', borderRadius: 4, marginBottom: 8 }} />}
          <div role="group" aria-label="Tag">
            {NOTE_TAGS.map((t) => (
              <button type="button" key={t} style={chip(draft.tag === t, TAG_COLOR[t])} aria-pressed={draft.tag === t} onClick={() => setDraft({ ...draft, tag: t })}>
                {t}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Severity">
            {NOTE_SEVERITIES.map((s) => (
              <button type="button" key={s} style={chip(draft.severity === s)} aria-pressed={draft.severity === s} onClick={() => setDraft({ ...draft, severity: s })}>
                {s === 1 ? '1 minor' : s === 2 ? '2 should fix' : '3 must fix'}
              </button>
            ))}
          </div>
          <label style={{ display: 'block', marginTop: 4 }}>
            <span style={{ display: 'block', fontSize: 12, color: '#9aa', marginBottom: 4 }}>Comment (Enter saves, Shift+Enter new line, Esc cancels)</span>
            <textarea
              aria-label="Comment"
              autoFocus
              rows={4}
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              style={{ width: '100%', boxSizing: 'border-box', background: '#0b0d13', color: '#eee', border: '1px solid #3a4152', borderRadius: 4, padding: 8, font: '14px sans-serif' }}
            />
          </label>
          <div style={{ marginTop: 10 }}>
            <button type="button" style={button} onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save note'}
            </button>
            <button type="button" style={button} onClick={() => (view.editId !== null ? setView({ kind: 'list' }) : close())}>
              Cancel
            </button>
          </div>
        </div>
        </div>
      )}

      {view.kind === 'list' && (
        <div style={layer} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        <div
          style={box}
          role="dialog"
          aria-label="Playtest notes"
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') close();
          }}
          tabIndex={-1}
          ref={focusOnce}
        >
          <div style={{ marginBottom: 10, fontWeight: 600 }}>
            Playtest notes ({book.notes.length}) · session {book.session}
          </div>
          {book.notes.length === 0 && <p style={{ color: '#9aa' }}>No notes yet. Close this and press N during play.</p>}
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {book.notes.map((n) => (
              <li key={n.id} style={{ borderTop: '1px solid #262b38', padding: '8px 0' }}>
                <span style={{ ...chip(true, TAG_COLOR[n.tag]), cursor: 'default' }}>#{n.id} {n.tag} · {n.severity}</span>
                <span style={{ color: '#9aa', fontSize: 12 }}>
                  {n.context.zone} · {n.runMin} min{n.image ? ' · 📷' : ''}
                </span>
                <div style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}>{n.text || <i style={{ color: '#9aa' }}>(no comment)</i>}</div>
                <button type="button" style={button} onClick={() => edit(n)}>Edit</button>
                <button type="button" style={button} onClick={() => notes.remove(n.id)} aria-label={`Delete note ${n.id}`}>Delete</button>
              </li>
            ))}
          </ol>
          <div style={{ marginTop: 12 }}>
            <button type="button" style={button} onClick={saveJsonFile} disabled={book.notes.length === 0}>
              Save JSON file
            </button>
            <button
              type="button"
              style={button}
              disabled={book.notes.length === 0}
              onClick={() => {
                if (window.confirm('Delete all notes? Screenshots in test-image/ are kept.')) notes.clear();
              }}
            >
              Clear all
            </button>
            <button type="button" style={button} onClick={close}>
              Close
            </button>
          </div>
        </div>
        </div>
      )}
    </>
  );
}
