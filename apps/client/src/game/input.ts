/**
 * Input state and pointer lock state machine. No DOM access here: the view layer feeds events in.
 * Keys are bound by `event.code`, so layouts do not matter.
 */

export const TAP_MAX_MS = 200;
/** A single mouse move larger than this (px) is a browser glitch (fast flick, lock regained) and is ignored. */
export const MAX_MOUSE_JUMP = 300;

export const KEY_BINDINGS = {
  forward: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  sprint: 'ShiftLeft',
  sprintAlt: 'ShiftRight',
  interact: 'KeyE',
  cycleAction: 'KeyQ',
  faceFront: 'KeyR',
  locket: 'KeyT',
  spell1: 'Digit1',
  spell2: 'Digit2',
  spell3: 'Digit3',
  pause: 'Escape',
} as const;

export interface InputState {
  /** Movement axes in -1..1 (x: right, z: forward). */
  moveX: number;
  moveZ: number;
  sprint: boolean;
  lookDX: number;
  lookDY: number;
  /** LMB currently down, and for how long (ms). */
  lmbDown: boolean;
  lmbHeldMs: number;
  /** One-frame edges, cleared by `endFrame`. */
  interactPressed: boolean;
  /** Q: switch the selected action in the side panel. */
  cyclePressed: boolean;
  /** R: level the view and face the nearest compass direction. */
  faceFrontPressed: boolean;
  locketPressed: boolean;
  pausePressed: boolean;
  spellPressed: 1 | 2 | 3 | null;
  lmbTap: boolean;
  lmbReleased: boolean;
  /** Hold E (ms), used to skip cinematics. */
  interactHeldMs: number;
  /** E is down right now (hold interactions read it every step). */
  interactDown: boolean;
}

export function createInputState(): InputState {
  return {
    moveX: 0,
    moveZ: 0,
    sprint: false,
    lookDX: 0,
    lookDY: 0,
    lmbDown: false,
    lmbHeldMs: 0,
    interactPressed: false,
    cyclePressed: false,
    faceFrontPressed: false,
    locketPressed: false,
    pausePressed: false,
    spellPressed: null,
    lmbTap: false,
    lmbReleased: false,
    interactHeldMs: 0,
    interactDown: false,
  };
}

export class InputController {
  readonly state: InputState = createInputState();
  private readonly down = new Set<string>();
  private skipNextMove = false;

  keyDown(code: string, repeat = false): void {
    if (repeat || this.down.has(code)) return;
    this.down.add(code);
    const s = this.state;
    switch (code) {
      case KEY_BINDINGS.interact:
        s.interactPressed = true;
        break;
      case KEY_BINDINGS.cycleAction:
        s.cyclePressed = true;
        break;
      case KEY_BINDINGS.faceFront:
        s.faceFrontPressed = true;
        break;
      case KEY_BINDINGS.locket:
        s.locketPressed = true;
        break;
      case KEY_BINDINGS.pause:
        s.pausePressed = true;
        break;
      case KEY_BINDINGS.spell1:
        s.spellPressed = 1;
        break;
      case KEY_BINDINGS.spell2:
        s.spellPressed = 2;
        break;
      case KEY_BINDINGS.spell3:
        s.spellPressed = 3;
        break;
    }
    this.recompute();
  }

  keyUp(code: string): void {
    this.down.delete(code);
    this.recompute();
  }

  mouseMove(dx: number, dy: number): void {
    // The first move after the lock comes back, and any huge single jump, are browser glitches.
    if (this.skipNextMove) {
      this.skipNextMove = false;
      return;
    }
    if (Math.abs(dx) > MAX_MOUSE_JUMP || Math.abs(dy) > MAX_MOUSE_JUMP) return;
    this.state.lookDX += dx;
    this.state.lookDY += dy;
  }

  mouseDown(button: number): void {
    if (button !== 0 || this.state.lmbDown) return;
    this.state.lmbDown = true;
    this.state.lmbHeldMs = 0;
  }

  mouseUp(button: number): void {
    if (button !== 0 || !this.state.lmbDown) return;
    const s = this.state;
    s.lmbReleased = true;
    if (s.lmbHeldMs <= TAP_MAX_MS) s.lmbTap = true;
    s.lmbDown = false;
  }

  /** Advance held timers by one simulation step. */
  tick(dtMs: number): void {
    if (this.state.lmbDown) this.state.lmbHeldMs += dtMs;
    this.state.interactHeldMs = this.down.has(KEY_BINDINGS.interact)
      ? this.state.interactHeldMs + dtMs
      : 0;
  }

  /** Clear one-frame edges and accumulated look deltas. Call after the simulation consumed them. */
  endFrame(): void {
    const s = this.state;
    s.lookDX = 0;
    s.lookDY = 0;
    s.interactPressed = false;
    s.cyclePressed = false;
    s.faceFrontPressed = false;
    s.locketPressed = false;
    s.pausePressed = false;
    s.spellPressed = null;
    s.lmbTap = false;
    s.lmbReleased = false;
  }

  /** Ignore the next mouse move (call when pointer lock is regained). */
  ignoreNextMove(): void {
    this.skipNextMove = true;
  }

  /** Drop everything held (focus loss, pause). */
  releaseAll(): void {
    this.down.clear();
    const s = this.state;
    s.lmbDown = false;
    s.lmbHeldMs = 0;
    s.interactHeldMs = 0;
    this.recompute();
  }

  private recompute(): void {
    const d = this.down;
    const s = this.state;
    s.moveZ = (d.has(KEY_BINDINGS.forward) ? 1 : 0) - (d.has(KEY_BINDINGS.back) ? 1 : 0);
    s.moveX = (d.has(KEY_BINDINGS.right) ? 1 : 0) - (d.has(KEY_BINDINGS.left) ? 1 : 0);
    s.sprint = d.has(KEY_BINDINGS.sprint) || d.has(KEY_BINDINGS.sprintAlt);
    s.interactDown = d.has(KEY_BINDINGS.interact);
  }
}

/* ---------------- Pointer lock state machine ---------------- */

export type PointerLockState = 'unlocked' | 'locked' | 'lost';
export type PointerLockEvent =
  | 'lock_acquired'
  | 'lock_released'
  | 'window_blur'
  | 'tab_hidden'
  | 'user_click';

export interface PointerLockStep {
  state: PointerLockState;
  /** Gameplay should pause (and show "Click to resume"). */
  pause: boolean;
  /** The view should call requestPointerLock now. Only ever true on `user_click`. */
  requestLock: boolean;
}

/**
 * `unlocked`: nothing requested yet. `locked`: playing. `lost`: lock dropped while playing.
 * Lock is requested only from a user click, so there is never an automatic retry loop.
 */
export function stepPointerLock(state: PointerLockState, event: PointerLockEvent): PointerLockStep {
  switch (event) {
    case 'lock_acquired':
      return { state: 'locked', pause: false, requestLock: false };
    case 'lock_released':
    case 'window_blur':
    case 'tab_hidden':
      return state === 'locked'
        ? { state: 'lost', pause: true, requestLock: false }
        : { state, pause: state === 'lost', requestLock: false };
    case 'user_click':
      return state === 'locked'
        ? { state, pause: false, requestLock: false }
        : { state, pause: state === 'lost', requestLock: true };
  }
}

/** Keys 1/2/3 select these spells (the store only accepts unlocked ones). */
export const SPELL_FOR_KEY = { 1: 'arcane_bolt', 2: 'purify', 3: 'ward' } as const;
