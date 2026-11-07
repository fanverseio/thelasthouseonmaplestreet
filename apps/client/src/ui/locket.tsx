import { useEffect } from 'react';
import { useSettings } from '../store/index.ts';
import type { SubtitleLine } from './subtitles.tsx';

export interface LocketProps {
  /** The Angel's current line, shown as speaker plus subtitle. */
  line: SubtitleLine;
  /** True when another line can follow. */
  hasNext: boolean;
  onNext: () => void;
  onClose: () => void;
}

/**
 * Classic locket: no text input. T or E plays the next line; when none is left T closes.
 * Esc always closes.
 */
export function Locket({ line, hasNext, onNext, onClose }: LocketProps) {
  const size = useSettings((s) => s.subtitleSize);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.code === 'KeyT') {
        e.preventDefault();
        if (hasNext) onNext();
        else onClose();
      } else if (e.code === 'KeyE') {
        e.preventDefault();
        if (hasNext) onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasNext, onNext, onClose]);

  return (
    <div
      className="locket"
      role="dialog"
      aria-label="Locket"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        background: 'rgba(5, 5, 10, 0.75)',
        color: '#f2eee6',
        textAlign: 'center',
      }}
    >
      <div aria-hidden="true" style={{ fontSize: '3rem' }}>
        ◈
      </div>
      <p style={{ maxWidth: '36em', margin: 0, fontSize: size === 'large' ? '1.9rem' : '1.3rem', lineHeight: 1.4 }}>
        <strong>{line.speaker}:</strong> {line.text}
      </p>
      <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>
        {hasNext ? 'T or E: next' : 'T: close'} · Esc: close
      </p>
    </div>
  );
}
