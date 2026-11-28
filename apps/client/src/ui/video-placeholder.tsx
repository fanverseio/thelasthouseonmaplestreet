import { useEffect } from 'react';

export interface VideoPlaceholderProps {
  clipId: string;
  /** Seconds the placeholder stays up when no clip file exists. */
  fallbackSeconds: number;
  /** Called once when the placeholder time is over. */
  onEnded: (clipId: string) => void;
}

/** Fallback for a cinematic clip that is missing or fails to load (ui/video-player.tsx): a black panel ended by a timer. */
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
