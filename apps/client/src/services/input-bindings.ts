import { InputController, stepPointerLock, type PointerLockEvent, type PointerLockState } from '../game/input.ts';

/**
 * Connects DOM events to the headless InputController and pointer lock machine.
 * Returns a cleanup function. No automatic lock retries: lock is requested only from a click.
 */
export interface InputBindingsOptions {
  element: HTMLElement;
  input: InputController;
  /** Called whenever the pointer lock machine changes state. */
  onLockChange: (state: PointerLockState, pause: boolean) => void;
  /** True while gameplay input should be read (not paused, not in an overlay). */
  isActive: () => boolean;
}

export function bindInput(opts: InputBindingsOptions): () => void {
  const { element, input, onLockChange, isActive } = opts;
  let lock: PointerLockState = 'unlocked';

  const feed = (event: PointerLockEvent) => {
    const step = stepPointerLock(lock, event);
    lock = step.state;
    if (step.requestLock) void element.requestPointerLock?.();
    if (event !== 'user_click') onLockChange(step.state, step.pause);
    if (step.pause) input.releaseAll();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!isActive() && e.code !== 'Escape') return;
    if (['Space', 'Tab'].includes(e.code)) e.preventDefault();
    input.keyDown(e.code, e.repeat);
  };
  const onKeyUp = (e: KeyboardEvent) => input.keyUp(e.code);
  const onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement === element && isActive()) input.mouseMove(e.movementX, e.movementY);
  };
  const onMouseDown = (e: MouseEvent) => {
    if (document.pointerLockElement !== element) return;
    if (isActive()) input.mouseDown(e.button);
  };
  const onMouseUp = (e: MouseEvent) => input.mouseUp(e.button);
  const onLockEvent = () => feed(document.pointerLockElement === element ? 'lock_acquired' : 'lock_released');
  const onBlur = () => feed('window_blur');
  const onVisibility = () => {
    if (document.hidden) feed('tab_hidden');
  };
  const onClick = () => feed('user_click');

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener('pointerlockchange', onLockEvent);
  element.addEventListener('click', onClick);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('blur', onBlur);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('pointerlockchange', onLockEvent);
    element.removeEventListener('click', onClick);
    if (document.pointerLockElement === element) document.exitPointerLock();
  };
}
