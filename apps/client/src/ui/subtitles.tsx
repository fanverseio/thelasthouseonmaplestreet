import { useSettings } from '../store/index.ts';

export interface SubtitleLine {
  speaker: string;
  text: string;
}

/** Always-on subtitles. The speaker is always shown; size follows the subtitle setting. */
export function Subtitles({ line }: { line: SubtitleLine | null }) {
  const size = useSettings((s) => s.subtitleSize);
  if (!line) return null;
  return (
    <div
      className="subtitles"
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: '8%',
        transform: 'translateX(-50%)',
        maxWidth: '70%',
        padding: '0.5em 1em',
        background: 'rgba(0, 0, 0, 0.7)',
        color: '#f2eee6',
        textAlign: 'center',
        fontSize: size === 'large' ? '1.75rem' : '1.1rem',
        lineHeight: 1.35,
        pointerEvents: 'none',
      }}
    >
      <strong>{line.speaker}:</strong> {line.text}
    </div>
  );
}
