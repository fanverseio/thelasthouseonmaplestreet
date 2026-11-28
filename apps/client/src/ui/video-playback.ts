/**
 * Pure rules for the cinematic player (ui/video-player.tsx). No DOM here, so they run in Vitest.
 *
 * How a clip ends (never a softlock):
 * - The file loads: the player tells the runner `videoPlaying` (its own fallback timer stops) and from then on
 *   the player owns the end: the `ended` event, or a fallback timer if the clip later errors or stalls.
 * - The file is missing or fails before it loads: the placeholder shows and its timer runs `fallbackSeconds`
 *   (the runner's own timer runs too; whichever ends first wins).
 * - Autoplay with sound is refused: a "Play" button waits for a click, tap or key. No timer runs meanwhile.
 */

/** Seconds to wait for the file before giving up and using the placeholder. */
export const LOAD_TIMEOUT_SECONDS = 8;
/** A playing clip that has not moved for this long is treated as over. */
export const STALL_SECONDS = 12;
/** Touch: hold this long on the clip to skip it (the same as hold E). */
export const TOUCH_SKIP_SECONDS = 1;

export type VideoMode = 'loading' | 'playing' | 'needsTap' | 'fallback';

export function clipUrl(clipId: string): string {
  return `/assets/video/${clipId}.mp4`;
}

/** What a rejected `play()` means: the browser wants a gesture first, or the clip cannot play at all. */
export function modeAfterPlayRejected(error: unknown): 'needsTap' | 'fallback' {
  const name = typeof error === 'object' && error !== null && 'name' in error ? String((error as { name: unknown }).name) : '';
  return name === 'NotAllowedError' ? 'needsTap' : 'fallback';
}

/**
 * Milliseconds until the fallback ends the clip. Before the file loaded: the full `fallbackSeconds`.
 * After (a late error or stall): whatever is left of the clip, at least 1 s, so the scene is never cut dead.
 */
export function fallbackDelayMs(fallbackSeconds: number, loaded: boolean, currentTime: number): number {
  const left = loaded ? fallbackSeconds - currentTime : fallbackSeconds;
  return Math.max(1, left) * 1000;
}

/** Mobile is landscape only: hold the clip while a touch device is upright. */
export function holdForRotate(touch: boolean, portrait: boolean): boolean {
  return touch && portrait;
}

/** The clip should be running now (not waiting for a tap, the rotate overlay or the pause menu). */
export function shouldPlay(mode: VideoMode, rotateHold: boolean, paused: boolean): boolean {
  return mode === 'playing' && !rotateHold && !paused;
}
