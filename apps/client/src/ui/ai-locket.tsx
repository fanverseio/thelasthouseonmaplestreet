import type { AiStatus, Credits } from '@tlh/shared';
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import type { AngelDirector, AngelReply } from '../game/angel-director.ts';
import { login } from '../services/api-client.ts';
import { useSettings } from '../store/index.ts';

/** Two passphrase inputs. Values live only in this component's state and go only to /api/access/redeem. */
export function LoginForm({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!p1 || !p2 || busy) return;
    setBusy(true);
    setError(null);
    const r = await login(p1, p2);
    setBusy(false);
    if (r.ok) {
      setP1('');
      setP2('');
      onDone();
      return;
    }
    setError(
      r.error === 'access_invalid'
        ? 'Those words do not match. Both passphrases must be right.'
        : r.error === 'rate_limited'
          ? 'Too many tries. Wait ten minutes, or play Classic.'
          : 'The Angel cannot be reached right now. Classic Mode still works.',
    );
  };
  return (
    <form className="ai-login" data-testid="ai-login" onSubmit={submit} onKeyDown={(e) => e.stopPropagation()}>
      <label className="row">
        Passphrase 1
        <input type="password" autoComplete="off" value={p1} onChange={(e) => setP1(e.target.value)} data-testid="pass1" maxLength={200} />
      </label>
      <label className="row">
        Passphrase 2
        <input type="password" autoComplete="off" value={p2} onChange={(e) => setP2(e.target.value)} data-testid="pass2" maxLength={200} />
      </label>
      {error && (
        <p className="note" role="alert" data-testid="login-error">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || !p1 || !p2} data-testid="login-submit">
        {busy ? 'Checking…' : 'Unlock the Angel'}
      </button>
      {onCancel && (
        <button type="button" className="secondary" onClick={onCancel}>
          Back
        </button>
      )}
      <p className="note">What you type to the Angel is sent to the game's AI provider only to write its reply.</p>
    </form>
  );
}

const STATUS_TEXT: Record<AiStatus, string> = {
  ready: '',
  degraded: 'The locket is dim. The Angel speaks plainly for now.',
  budget_exhausted: 'The Angel is resting. It speaks only what it already knows.',
  unavailable: 'The locket is dim. The Angel is out of reach; it speaks only what it already knows.',
};

/**
 * AI-Enhanced locket: a text box (the game is paused and pointer lock released), a thinking state, and the reply.
 * Any failure shows the authored Classic line with the locket dimmed. Esc closes.
 */
export function AiLocket({ director, onClose, onLogin }: { director: AngelDirector; onClose: () => void; onLogin: () => void }) {
  useSyncExternalStore(director.subscribe, () => director.status);
  const size = useSettings((s) => s.subtitleSize);
  const [text, setText] = useState('');
  const [thinking, setThinking] = useState(false);
  const [reply, setReply] = useState<AngelReply | null>(null);
  const [showLogin, setShowLogin] = useState(director.needsLogin);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), [showLogin]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || thinking) return;
    setThinking(true);
    setText('');
    const r = await director.send(t);
    setThinking(false);
    setReply(r);
    if (director.needsLogin) setShowLogin(true);
  };
  const dim = director.status !== 'ready' || reply?.source === 'classic';
  return (
    <div className="locket ai-locket" data-no-lock="" data-testid="ai-locket" data-dim={dim ? 'true' : 'false'} data-status={director.status} role="dialog" aria-label="Locket" onClick={(e) => e.stopPropagation()}>
      <div aria-hidden="true" className="ai-locket-gem">
        ◈
      </div>
      {showLogin ? (
        <LoginForm
          onDone={() => {
            setShowLogin(false);
            director.setStatus('ready');
            onLogin();
          }}
          onCancel={() => setShowLogin(false)}
        />
      ) : (
        <>
          <p className="ai-locket-reply" data-testid="angel-reply" data-source={reply?.source ?? ''} style={{ fontSize: size === 'large' ? '1.8rem' : '1.25rem' }}>
            {thinking ? <em data-testid="angel-thinking">The silver warms…</em> : reply ? <><strong>The Angel:</strong> {reply.speech}</> : <em>Speak, and the Angel listens.</em>}
          </p>
          {reply && reply.queued.length > 0 && !thinking && <p className="note" data-testid="angel-action-note">Something will stir when you close the locket.</p>}
          {STATUS_TEXT[director.status] && <p className="note" data-testid="ai-status-note">{STATUS_TEXT[director.status]}</p>}
          <form className="ai-locket-form" onSubmit={send} onKeyDown={(e) => e.stopPropagation()}>
            <input
              ref={input}
              type="text"
              value={text}
              maxLength={300}
              placeholder="Say something to the Angel…"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.code === 'Escape') onClose();
              }}
              data-testid="angel-input"
              aria-label="Your words to the Angel"
              disabled={thinking}
            />
            <button type="submit" disabled={thinking || !text.trim()} data-testid="angel-send">
              Speak
            </button>
          </form>
        </>
      )}
      <p className="note">Enter: speak · Esc: close the locket</p>
    </div>
  );
}

/** Top-left, AI mode only: a small bar and "AI credits NN%". At 0 (or budget gone) the Angel rests. */
export function CreditBadge({ director }: { director: AngelDirector }) {
  useSyncExternalStore(director.subscribe, () => `${director.status}:${director.credits?.remainingPct ?? -1}`);
  const credits: Credits | null = director.credits;
  const resting = director.status === 'budget_exhausted' || credits?.remainingPct === 0;
  const pct = resting ? 0 : (credits?.remainingPct ?? null);
  return (
    <div className="credit-badge" data-testid="credit-badge" data-status={director.status} aria-label="AI credits">
      <div className="credit-bar" aria-hidden="true">
        <div className="credit-fill" style={{ width: `${pct ?? 0}%` }} />
      </div>
      <span data-testid="credit-text">{resting ? 'Angel is resting' : pct === null ? 'AI credits …' : `AI credits ${pct}%`}</span>
      {director.status === 'degraded' || director.status === 'unavailable' ? <small> · locket dim</small> : null}
    </div>
  );
}
