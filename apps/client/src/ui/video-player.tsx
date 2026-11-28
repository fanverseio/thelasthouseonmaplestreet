import { useCallback, useEffect, useRef, useState } from 'react';
import { VideoPlaceholder } from './video-placeholder.tsx';
import {
  LOAD_TIMEOUT_SECONDS,
  STALL_SECONDS,
  TOUCH_SKIP_SECONDS,
  clipUrl,
  fallbackDelayMs,
  holdForRotate,
  modeAfterPlayRejected,
  shouldPlay,
  type VideoMode,
} from './video-playback.ts';

export interface VideoPlayerProps {
  clipId: string;
  /** Seconds the placeholder stays up when the file is missing or fails. */
  fallbackSeconds: number;
  /** The file loaded: the runner stops its own fallback timer and waits for `onEnded`. */
  onPlaying: (clipId: string) => void;
  /** Called once when the clip is over (end event, or the fallback). */
  onEnded: (clipId: string) => void;
  /** Touch tap-and-hold skip (desktop uses hold E through the skip hold). */
  onSkip: () => void;
  /** The game is paused (Esc menu): hold the clip. */
  paused: boolean;
}

const isTouch = (): boolean => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;
const isPortrait = (): boolean => typeof window !== 'undefined' && window.matchMedia?.('(orientation: portrait)').matches === true;

/** First gesture on a phone: go full screen and try to lock landscape. Both may be refused; that is fine. */
function enterMobileLandscape(): void {
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => undefined);
  const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
  orientation?.lock?.('landscape').catch(() => undefined);
}

/**
 * Full-screen cinematic clip: `/assets/video/<clipId>.mp4`, letterboxed on black, with sound, no controls.
 * Rules for ending it live in video-playback.ts. The sim keeps ticking under it as before (control is locked).
 */
export function VideoPlayer({ clipId, fallbackSeconds, onPlaying, onEnded, onSkip, paused }: VideoPlayerProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<VideoMode>('loading');
  const [touch] = useState(isTouch);
  const [portrait, setPortrait] = useState(isPortrait);
  const loaded = useRef(false);
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onEnded(clipId);
  }, [clipId, onEnded]);

  const tryPlay = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    v.play().then(
      () => setMode('playing'),
      (err: unknown) => setMode(modeAfterPlayRejected(err)),
    );
  }, []);

  // Rotate: follow the orientation on touch devices.
  useEffect(() => {
    if (!touch) return;
    const mq = window.matchMedia('(orientation: portrait)');
    const on = () => setPortrait(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [touch]);
  const rotateHold = holdForRotate(touch, portrait);

  // The file never loads: use the placeholder.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!loaded.current) setMode('fallback');
    }, LOAD_TIMEOUT_SECONDS * 1000);
    return () => window.clearTimeout(t);
  }, []);

  // Fallback after a late failure (the placeholder runs its own timer when nothing loaded).
  useEffect(() => {
    if (mode !== 'fallback' || !loaded.current) return;
    const t = window.setTimeout(finish, fallbackDelayMs(fallbackSeconds, true, ref.current?.currentTime ?? 0));
    return () => window.clearTimeout(t);
  }, [mode, fallbackSeconds, finish]);

  // Play or hold the clip as the tap, rotate and pause states change.
  useEffect(() => {
    const v = ref.current;
    if (!v || mode !== 'playing') return;
    if (shouldPlay(mode, rotateHold, paused)) {
      if (v.paused) tryPlay();
    } else if (!v.paused) v.pause();
  }, [mode, rotateHold, paused, tryPlay]);

  // Stall watchdog: a clip that stops moving while it should play counts as over.
  useEffect(() => {
    if (!shouldPlay(mode, rotateHold, paused)) return;
    let last = -1;
    let still = 0;
    const t = window.setInterval(() => {
      const now = ref.current?.currentTime ?? 0;
      still = now === last ? still + 1 : 0;
      last = now;
      if (still >= STALL_SECONDS) setMode('fallback');
    }, 1000);
    return () => window.clearInterval(t);
  }, [mode, rotateHold, paused]);

  // Autoplay was refused: any click, tap or key (except Esc) starts it. Pointer lock can stay on.
  useEffect(() => {
    if (mode !== 'needsTap') return;
    const go = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key === 'Escape') return;
      if (touch) enterMobileLandscape();
      tryPlay();
    };
    window.addEventListener('pointerdown', go);
    window.addEventListener('keydown', go);
    return () => {
      window.removeEventListener('pointerdown', go);
      window.removeEventListener('keydown', go);
    };
  }, [mode, touch, tryPlay]);

  // Touch: tap and hold to skip; the first touch also asks for full screen and landscape.
  const holdTimer = useRef<number | null>(null);
  const firstTouch = useRef(true);
  const cancelHold = () => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    if (firstTouch.current) {
      firstTouch.current = false;
      enterMobileLandscape();
    }
    cancelHold();
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      onSkip();
    }, TOUCH_SKIP_SECONDS * 1000);
  };
  useEffect(() => cancelHold, []);

  if (mode === 'fallback' && !loaded.current) {
    return <VideoPlaceholder clipId={clipId} fallbackSeconds={fallbackSeconds} onEnded={finish} />;
  }

  return (
    <div
      className="video-player"
      data-testid="video-player"
      data-mode={mode}
      onPointerDown={onPointerDown}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onPointerLeave={cancelHold}
    >
      <video
        ref={ref}
        src={clipUrl(clipId)}
        preload="auto"
        playsInline
        disablePictureInPicture
        controls={false}
        onLoadedMetadata={() => {
          if (loaded.current) return;
          loaded.current = true;
          onPlaying(clipId);
          setMode('playing');
        }}
        onEnded={finish}
        onError={() => setMode('fallback')}
      />
      {mode === 'needsTap' && !rotateHold && (
        <button type="button" className="video-play" onClick={tryPlay}>
          {touch ? 'Tap to play' : 'Click or press a key to play'}
        </button>
      )}
      {touch && mode === 'playing' && !rotateHold && <small className="video-skip-hint">Tap and hold to skip</small>}
    </div>
  );
}
