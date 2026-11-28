import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { KEY_BINDINGS, type InputController } from '../game/input.ts';
import { stickAxes, stickKnob, touchLookDelta } from '../game/mobile-mode.ts';
import { settingsStore, useGame } from '../store/index.ts';
import { SPELL_LABELS } from './hud.tsx';

/** Move stick radius in CSS px. */
const STICK_RADIUS = 56;

export interface TouchControlsProps {
  input: InputController;
  /** Not in play (paused, locket, overlay, a clip): kept mounted but invisible and untouchable. */
  hidden: boolean;
  /** A cinematic holds control: only the hold-to-skip button shows. */
  cinematic: boolean;
  /** Called with the pointer id of the tap, so the pause screen can ignore that same tap's click. */
  onPause: (pointerId: number) => void;
}

/**
 * Mobile mode controls. View only: every touch becomes the same InputState the keyboard and mouse fill
 * (game/input.ts), so the game rules do not know about touch. Left side: a floating move stick.
 * Right side: drag to look. Buttons: E (hold = skip a cinematic), T, sprint toggle, spells, cast, pause.
 */
export function TouchControls({ input, hidden, cinematic, onPause }: TouchControlsProps) {
  const root = useRef<HTMLDivElement>(null);
  const unlocked = useGame((s) => s.player.spellsUnlocked);
  const selected = useGame((s) => s.player.selectedSpell);
  const [sprint, setSprint] = useState(false);
  const [stick, setStick] = useState<{ ox: number; oy: number; kx: number; ky: number } | null>(null);
  const moveId = useRef<number | null>(null);
  const look = useRef<{ id: number; x: number; y: number } | null>(null);

  // No scroll, zoom, pull-to-refresh, long-press menu or synthetic mouse clicks from these touches.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const stop = (e: Event) => {
      if (e.cancelable) e.preventDefault();
    };
    el.addEventListener('touchstart', stop, { passive: false });
    el.addEventListener('touchmove', stop, { passive: false });
    el.addEventListener('contextmenu', stop);
    return () => {
      el.removeEventListener('touchstart', stop);
      el.removeEventListener('touchmove', stop);
      el.removeEventListener('contextmenu', stop);
    };
  }, []);

  // Leaving play (pause, locket, overlay, a clip) or a cinematic drops every held touch.
  useEffect(() => {
    if (!hidden && !cinematic) return;
    input.setStick(0, 0);
    input.releaseAll();
    moveId.current = null;
    look.current = null;
    setStick(null);
  }, [input, cinematic, hidden]);
  useEffect(() => () => input.setSprintLatch(false), [input]);

  const capture = (e: ReactPointerEvent) => {
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // synthetic or already-released pointer: moves still arrive while the finger stays on the zone
    }
  };

  const moveDown = (e: ReactPointerEvent) => {
    if (moveId.current !== null) return;
    moveId.current = e.pointerId;
    capture(e);
    setStick({ ox: e.clientX, oy: e.clientY, kx: 0, ky: 0 });
  };
  const moveMove = (e: ReactPointerEvent) => {
    if (e.pointerId !== moveId.current || !stick) return;
    const dx = e.clientX - stick.ox;
    const dy = e.clientY - stick.oy;
    const a = stickAxes(dx, dy, STICK_RADIUS);
    input.setStick(a.x, a.z);
    const k = stickKnob(dx, dy, STICK_RADIUS);
    setStick({ ...stick, kx: k.x, ky: k.y });
  };
  const moveUp = (e: ReactPointerEvent) => {
    if (e.pointerId !== moveId.current) return;
    moveId.current = null;
    input.setStick(0, 0);
    setStick(null);
  };

  const lookDown = (e: ReactPointerEvent) => {
    if (look.current) return;
    look.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    capture(e);
  };
  const lookMove = (e: ReactPointerEvent) => {
    const l = look.current;
    if (!l || e.pointerId !== l.id) return;
    const s = settingsStore.getState();
    const d = touchLookDelta(e.clientX - l.x, e.clientY - l.y, s.touchSensitivity / s.mouseSensitivity); // the rig multiplies by the mouse setting again
    l.x = e.clientX;
    l.y = e.clientY;
    if (d) input.touchLook(d.dx, d.dy);
  };
  const lookUp = (e: ReactPointerEvent) => {
    if (look.current?.id === e.pointerId) look.current = null;
  };

  /** A button that holds a key while the finger is down. */
  const key = (code: string, label: string, cls: string, testId: string) => (
    <button
      type="button"
      className={`touch-btn ${cls}`}
      data-testid={testId}
      aria-label={label}
      onPointerDown={(e) => {
        capture(e);
        input.keyDown(code);
      }}
      onPointerUp={() => input.keyUp(code)}
      onPointerCancel={() => input.keyUp(code)}
    >
      {label}
    </button>
  );

  if (cinematic) {
    return (
      <div ref={root} className="touch-controls" data-testid="touch-controls" data-cinematic="true" data-hidden={hidden ? 'true' : 'false'}>
        {key(KEY_BINDINGS.interact, 'Hold to skip', 'touch-skip', 'touch-skip')}
      </div>
    );
  }

  const spells = [
    { id: 'arcane_bolt', code: KEY_BINDINGS.spell1 },
    { id: 'purify', code: KEY_BINDINGS.spell2 },
    { id: 'ward', code: KEY_BINDINGS.spell3 },
  ] as const;
  return (
    <div ref={root} className="touch-controls" data-testid="touch-controls" data-hidden={hidden ? 'true' : 'false'}>
      <div className="touch-move" data-testid="touch-move" onPointerDown={moveDown} onPointerMove={moveMove} onPointerUp={moveUp} onPointerCancel={moveUp}>
        {stick && (
          <div className="touch-stick" style={{ left: stick.ox, top: stick.oy }} aria-hidden="true">
            <div className="touch-knob" style={{ transform: `translate(${stick.kx}px, ${stick.ky}px)` }} />
          </div>
        )}
      </div>
      <div className="touch-look" data-testid="touch-look" onPointerDown={lookDown} onPointerMove={lookMove} onPointerUp={lookUp} onPointerCancel={lookUp} />
      <button type="button" className="touch-btn touch-pause" data-testid="touch-pause" aria-label="Pause" onPointerUp={(e) => onPause(e.pointerId)}>
        ❚❚
      </button>
      <div className="touch-buttons">
        <div className="touch-spells">
          {spells.map(({ id, code }, i) =>
            unlocked.includes(id) ? (
              <button
                key={id}
                type="button"
                className={`touch-btn touch-spell${selected === id ? ' selected' : ''}`}
                data-testid={`touch-spell-${i + 1}`}
                aria-label={SPELL_LABELS[id].name}
                onPointerDown={() => input.keyDown(code)}
                onPointerUp={() => input.keyUp(code)}
                onPointerCancel={() => input.keyUp(code)}
              >
                {SPELL_LABELS[id].glyph}
              </button>
            ) : null,
          )}
        </div>
        {key(KEY_BINDINGS.locket, 'T', 'touch-locket', 'touch-t')}
        <button
          type="button"
          className={`touch-btn touch-sprint${sprint ? ' on' : ''}`}
          data-testid="touch-sprint"
          aria-label="Sprint"
          aria-pressed={sprint}
          onPointerDown={() => {
            input.setSprintLatch(!sprint);
            setSprint(!sprint);
          }}
        >
          Run
        </button>
        {key(KEY_BINDINGS.interact, 'E', 'touch-interact', 'touch-e')}
        {unlocked.length > 0 && (
          <button
            type="button"
            className="touch-btn touch-cast"
            data-testid="touch-cast"
            aria-label="Cast (hold to charge)"
            onPointerDown={(e) => {
              capture(e);
              input.mouseDown(0);
            }}
            onPointerUp={() => input.mouseUp(0)}
            onPointerCancel={() => input.mouseUp(0)}
          >
            Cast
          </button>
        )}
      </div>
    </div>
  );
}
