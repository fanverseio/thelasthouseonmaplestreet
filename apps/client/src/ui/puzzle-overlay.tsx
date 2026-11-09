import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { getLine } from '../content/dialogue/index.ts';
import { P3_PADLOCK, P5_BOARD } from '../content/puzzles/index.ts';
import {
  boardMask,
  createNumberLock,
  createPuzzleController,
  createTalkingBoard,
  lockGlow,
  type NumberLockState,
  type PuzzleController,
  type PuzzleInput,
  type PuzzleEvent,
  type TalkingBoardState,
} from '../game/puzzles.ts';
import { cueForPuzzleInput, cuesForPuzzleEvent } from '../services/audio-cues.ts';
import { sfx } from '../services/sfx.ts';
import { gameStore, useGame } from '../store/index.ts';

export interface PuzzleOverlayProps {
  puzzle: 'p3_padlock' | 'p5_board';
  /** Speaks a hint line through the world runtime (voice hook). */
  say: (lineId: string) => void;
  onClose: () => void;
}

const SCARE_TEXT: Record<string, string> = {
  door_slam: 'A door slams somewhere in the house.',
  whispers: 'Whispers crawl along the walls.',
  chandelier_sway: 'The chandelier sways, though there is no wind.',
  cold_breath: 'A cold breath passes over you.',
  piano_note: 'A single piano note hangs in the air.',
  shadow_pass: 'A shadow passes behind you.',
};

const shell: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1rem',
  background: 'rgba(5, 5, 10, 0.85)',
  color: '#f2eee6',
  textAlign: 'center',
};
const btn: CSSProperties = { padding: '0.5rem 0.9rem', background: 'transparent', color: 'inherit', border: '1px solid #c9a24a', font: 'inherit', cursor: 'pointer' };

/** Send an input to the puzzle and make its small sound (dial click, planchette slide). */
function sendInput<S extends object>(controller: PuzzleController<S>, puzzle: 'p3_padlock' | 'p5_board', input: PuzzleInput): PuzzleEvent[] {
  const cue = cueForPuzzleInput(puzzle, input);
  if (cue) sfx.play(cue);
  return controller.input(input);
}

/** Full-screen overlay for the two overlay puzzles. State lives in the store, so closing never loses it. */
export function PuzzleOverlay({ puzzle, say, onClose }: PuzzleOverlayProps) {
  const [note, setNote] = useState('');
  const onEvents = (events: PuzzleEvent[]) => {
    for (const e of events) {
      for (const r of cuesForPuzzleEvent(puzzle, e)) sfx.play(r.cue);
      if (e.t === 'hint' && e.line) setNote(`${getLine(e.line)?.speaker ?? 'Angel'}: ${getLine(e.line)?.text ?? ''}`);
      else if (e.t === 'scare') setNote(SCARE_TEXT[e.scare] ?? 'Something stirs.');
      else if (e.t === 'rattle') setNote('The padlock rattles.');
      else if (e.t === 'refused') setNote('Nothing happens. Not yet.');
      else if (e.t === 'solved') setNote(puzzle === 'p3_padlock' ? 'The padlock clicks open.' : 'The board goes still.');
    }
  };
  return createPortal(
    puzzle === 'p3_padlock' ? <NumberLock say={say} onClose={onClose} onEvents={onEvents} note={note} /> : <TalkingBoard say={say} onClose={onClose} onEvents={onEvents} note={note} />,
    document.body,
  );
}

interface InnerProps {
  say: (lineId: string) => void;
  onClose: () => void;
  onEvents: (events: PuzzleEvent[]) => void;
  note: string;
}

function useController<S extends object>(factory: () => PuzzleController<S>, id: 'p3_padlock' | 'p5_board', onEvents: (e: PuzzleEvent[]) => void) {
  const controller = useMemo(factory, []);
  const stored = useGame((s) => s.progress.puzzles[id]);
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    onEvents(controller.open());
  }, [controller, onEvents]);
  return { controller, solved: stored?.solved ?? false, level: stored?.hintLevel ?? 0 };
}

function useOverlayFocus() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return ref;
}

export function NumberLock({ say, onClose, onEvents, note }: InnerProps) {
  const machine = useMemo(() => createNumberLock(P3_PADLOCK), []);
  const { controller, solved, level } = useController(() => createPuzzleController(gameStore, machine, { say }), 'p3_padlock', onEvents);
  useGame((s) => s.progress.puzzles.p3_padlock); // re-render on any state change
  const state: NumberLockState = controller.state();
  const glow = lockGlow(P3_PADLOCK, level);
  const ref = useOverlayFocus();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      let input: PuzzleInput | null = null;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') input = { k: 'dial', delta: 1 };
      else if (e.code === 'KeyS' || e.code === 'ArrowDown') input = { k: 'dial', delta: -1 };
      else if (e.code === 'KeyA' || e.code === 'ArrowLeft') input = { k: 'cursor', delta: -1 };
      else if (e.code === 'KeyD' || e.code === 'ArrowRight') input = { k: 'cursor', delta: 1 };
      else if (e.code === 'KeyE' || e.code === 'Enter') input = { k: 'try' };
      else if (e.code !== 'Escape') return;
      e.preventDefault();
      if (input) onEvents(sendInput(controller, 'p3_padlock', input));
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [controller, onClose, onEvents]);

  return (
    <div ref={ref} tabIndex={-1} style={shell} role="dialog" aria-modal="true" aria-label="Padlock">
      <h2 style={{ margin: 0 }}>Padlock</h2>
      <div style={{ display: 'flex', gap: '1rem' }}>
        {state.dials.map((digit, i) => {
          const g = glow.find((x) => x.index === i);
          return (
            <div
              key={i}
              role="group"
              aria-label={`Dial ${i + 1}`}
              onWheel={(e) => onEvents(sendInput(controller, 'p3_padlock', { k: 'cursor', delta: i - state.cursor }).concat(sendInput(controller, 'p3_padlock', { k: 'dial', delta: e.deltaY < 0 ? 1 : -1 })))}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', outline: i === state.cursor ? '2px solid #c9a24a' : 'none', padding: '0.4rem' }}
            >
              <button type="button" style={btn} aria-label={`Dial ${i + 1} up`} onClick={() => onEvents(sendInput(controller, 'p3_padlock', { k: 'cursor', delta: i - state.cursor }).concat(sendInput(controller, 'p3_padlock', { k: 'dial', delta: 1 })))}>
                ▲
              </button>
              <span aria-live="polite" style={{ fontSize: '2.5rem', minWidth: '1.5ch', color: g ? '#ffe9a8' : undefined, textShadow: g ? '0 0 12px #ffd76a' : undefined }}>
                {digit}
              </span>
              <button type="button" style={btn} aria-label={`Dial ${i + 1} down`} onClick={() => onEvents(sendInput(controller, 'p3_padlock', { k: 'cursor', delta: i - state.cursor }).concat(sendInput(controller, 'p3_padlock', { k: 'dial', delta: -1 })))}>
                ▼
              </button>
            </div>
          );
        })}
      </div>
      {glow.length > 0 && <p style={{ margin: 0, color: '#ffe9a8' }}>Glowing: {glow.map((g) => g.digit).join(' ')}</p>}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button type="button" style={btn} onClick={() => onEvents(sendInput(controller, 'p3_padlock', { k: 'try' }))} disabled={solved}>
          Try (E)
        </button>
        <button type="button" style={btn} onClick={onClose}>
          Close (Esc)
        </button>
      </div>
      <p role="status" aria-live="polite" style={{ margin: 0, minHeight: '1.5em', maxWidth: '36em' }}>
        {solved ? 'The padlock is open.' : note}
      </p>
      <small style={{ opacity: 0.7 }}>Wheel or W/S: change digit · A/D: move dial · E: try · Esc: close</small>
    </div>
  );
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const COLS = 7;

export function TalkingBoard({ say, onClose, onEvents, note }: InnerProps) {
  const machine = useMemo(() => createTalkingBoard(P5_BOARD), []);
  const { controller, solved } = useController(() => createPuzzleController(gameStore, machine, { say }), 'p5_board', onEvents);
  useGame((s) => s.progress.puzzles.p5_board);
  const state: TalkingBoardState = controller.state();
  const [cursor, setCursor] = useState(0);
  const mask = boardMask(P5_BOARD, state);
  const ref = useOverlayFocus();
  const used = (l: string) => state.guessed.includes(l) || state.revealed.includes(l);
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const move = (d: number) => {
        e.preventDefault();
        setCursor((c) => (((c + d) % 26) + 26) % 26);
      };
      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.code === 'ArrowLeft') move(-1);
      else if (e.code === 'ArrowRight') move(1);
      else if (e.code === 'ArrowUp') move(-COLS);
      else if (e.code === 'ArrowDown') move(COLS);
      else if (e.code === 'KeyE' || e.code === 'Enter') {
        e.preventDefault();
        onEvents(sendInput(controller, 'p5_board', { k: 'letter', letter: LETTERS[cursorRef.current]! }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [controller, onClose, onEvents]);

  return (
    <div ref={ref} tabIndex={-1} style={shell} role="dialog" aria-modal="true" aria-label="Talking board">
      <h2 style={{ margin: 0 }}>Talking board</h2>
      <p aria-label={`Word: ${mask.map((m) => m ?? 'blank').join(' ')}`} style={{ margin: 0, fontSize: '2.5rem', letterSpacing: '0.4em' }}>
        {mask.map((m) => m ?? '_').join(' ')}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 3rem)`, gap: '0.4rem' }}>
        {LETTERS.map((l, i) => (
          <button
            key={l}
            type="button"
            style={{ ...btn, outline: i === cursor ? '2px solid #ffe9a8' : 'none', opacity: used(l) ? 0.4 : 1 }}
            disabled={solved || used(l)}
            aria-label={`Letter ${l}`}
            onClick={() => {
              setCursor(i);
              onEvents(sendInput(controller, 'p5_board', { k: 'letter', letter: l }));
            }}
          >
            {l}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button type="button" style={btn} onClick={() => onEvents(sendInput(controller, 'p5_board', { k: 'reset' }))} disabled={solved}>
          Reset board
        </button>
        <button type="button" style={btn} onClick={onClose}>
          Close (Esc)
        </button>
      </div>
      <p role="status" aria-live="polite" style={{ margin: 0, minHeight: '1.5em', maxWidth: '36em' }}>
        {solved ? 'The board goes still.' : note}
      </p>
      <small style={{ opacity: 0.7 }}>Click a letter, or arrows + E · Esc: close</small>
    </div>
  );
}

