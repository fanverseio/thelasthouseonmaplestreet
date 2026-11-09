import { useEffect, useRef, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

export interface JournalPageProps {
  title: string;
  text: string;
  onClose: () => void;
}

const shell: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1rem',
  background: 'rgba(5, 5, 10, 0.8)',
};
const paper: CSSProperties = {
  maxWidth: '32rem',
  width: 'calc(100% - 3rem)',
  padding: '2.5rem 2.75rem',
  background: 'linear-gradient(170deg, #efe3c4 0%, #e3d2a8 60%, #d6c193 100%)',
  color: '#2b2116',
  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), inset 0 0 60px rgba(120, 90, 40, 0.35)',
  transform: 'rotate(-1deg)',
  fontFamily: "Georgia, 'Times New Roman', serif",
};
const heading: CSSProperties = { margin: '0 0 1.25rem', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6b5532' };
const body: CSSProperties = { margin: 0, fontSize: '1.3rem', lineHeight: 1.6, fontStyle: 'italic', whiteSpace: 'pre-line' };
const hint: CSSProperties = { margin: 0, color: '#f2eee6', fontSize: '0.9rem', opacity: 0.8 };
const btn: CSSProperties = { padding: '0.5rem 0.9rem', background: 'transparent', color: '#f2eee6', border: '1px solid #c9a24a', font: 'inherit', cursor: 'pointer' };

/** One of Rosalind's journal pages, held up to read. E or Esc puts it away. */
export function JournalPage({ title, text, onClose }: JournalPageProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return; // the E press that opened the page must not close it
      if (e.code !== 'KeyE' && e.code !== 'Escape') return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div ref={ref} tabIndex={-1} style={shell} role="dialog" aria-modal="true" aria-label={title}>
      <article style={paper}>
        <h2 style={heading}>{title}</h2>
        <p style={body}>{text}</p>
      </article>
      <p style={hint}>E or Esc to put it away</p>
      <button type="button" style={btn} onClick={onClose}>
        Close
      </button>
    </div>,
    document.body,
  );
}
