import { useEffect } from 'react';

export interface VideoPlaceholderProps {
  clipId: string;
  /** Seconds the placeholder stays up when no clip file exists. */
  fallbackSeconds: number;
  /** Called once when the clip is over (the real player will call it from the video element's end event). */
  onEnded: (clipId: string) => void;
}

/** Stand-in for a generated cinematic clip: a black panel with the clip id, ended by a timer. */
export function VideoPlaceholder({ clipId, fallbackSeconds, onEnded }: VideoPlaceholderProps) {
  useEffect(() => {
    const t = window.setTimeout(() => onEnded(clipId), fallbackSeconds * 1000);
    return () => window.clearTimeout(t);
  }, [clipId, fallbackSeconds, onEnded]);

  return (
    <div className="video-placeholder" role="status" data-testid="video-placeholder">
      <p>{clipId}</p>
      <small>cinematic placeholder</small>
    </div>
  );
}
