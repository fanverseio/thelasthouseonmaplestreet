import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

type Env = Record<string, string | undefined>;

/**
 * AI login: two passphrases that must BOTH match one account. Accounts are stored as
 * `label:sha256hex` where the hash is sha256(passphrase1 + "\n" + passphrase2).
 *
 * Sources, all merged:
 * - ACCESS_CODE_HASHES: comma-separated `label:sha256hex` (preferred on Vercel: no plain passphrases in env).
 * - passphrase_01 + passphrase_02 (or PASSPHRASE_01/02): one plain pair, label `judges`. Hashed at start-up.
 * Plain passphrases never leave this module and are never logged.
 */
export interface Account {
  label: string;
  hash: Buffer;
}

export function pairHash(p1: string, p2: string): Buffer {
  return createHash('sha256').update(`${p1.trim()}\n${p2.trim()}`, 'utf8').digest();
}

export function pairHashHex(p1: string, p2: string): string {
  return pairHash(p1, p2).toString('hex');
}

const LABEL = /^[a-z0-9_-]{1,32}$/i;

export function loadAccounts(env: Env): Account[] {
  const accounts: Account[] = [];
  for (const entry of (env.ACCESS_CODE_HASHES ?? '').split(',')) {
    const [label, hex] = entry.trim().split(':');
    if (label && hex && LABEL.test(label) && /^[0-9a-f]{64}$/i.test(hex)) accounts.push({ label, hash: Buffer.from(hex, 'hex') });
  }
  const p1 = (env.passphrase_01 ?? env.PASSPHRASE_01 ?? '').trim();
  const p2 = (env.passphrase_02 ?? env.PASSPHRASE_02 ?? '').trim();
  if (p1 && p2) accounts.push({ label: 'judges', hash: pairHash(p1, p2) });
  return accounts;
}

/** Constant-time check against every account (no early exit). Returns the label, or null. */
export function matchAccount(accounts: readonly Account[], p1: string, p2: string): string | null {
  const candidate = pairHash(p1, p2);
  let found: string | null = null;
  for (const a of accounts) {
    if (timingSafeEqual(a.hash, candidate) && found === null) found = a.label;
  }
  return found;
}

// ---- Signed session cookie -----------------------------------------------------------------

export const SESSION_COOKIE = 'tlh_session';

export interface Session {
  sid: string;
  label: string;
  /** Expiry, ms since the epoch. */
  exp: number;
}

const b64url = (buf: Buffer) => buf.toString('base64url');

function sign(payload: string, secret: string): string {
  return b64url(createHmac('sha256', secret).update(payload).digest());
}

export function newSessionId(): string {
  return b64url(randomBytes(16));
}

/** Cookie value: base64url(JSON payload) "." base64url(HMAC-SHA256). */
export function encodeSession(session: Session, secret: string): string {
  const payload = b64url(Buffer.from(JSON.stringify(session), 'utf8'));
  return `${payload}.${sign(payload, secret)}`;
}

export type SessionCheck = { ok: true; session: Session } | { ok: false; error: 'access_invalid' | 'session_expired' };

export function decodeSession(value: string | undefined, secret: string, now: number): SessionCheck {
  if (!value) return { ok: false, error: 'access_invalid' };
  const [payload, mac] = value.split('.');
  if (!payload || !mac) return { ok: false, error: 'access_invalid' };
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, error: 'access_invalid' };
  let session: Session;
  try {
    session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Session;
  } catch {
    return { ok: false, error: 'access_invalid' };
  }
  if (typeof session.sid !== 'string' || typeof session.label !== 'string' || typeof session.exp !== 'number') {
    return { ok: false, error: 'access_invalid' };
  }
  if (session.exp <= now) return { ok: false, error: 'session_expired' };
  return { ok: true, session };
}

export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return undefined;
}

export function sessionCookie(value: string, maxAgeSec: number, secure: boolean): string {
  return `${SESSION_COOKIE}=${value}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure ? '; Secure' : ''}`;
}

/** Client IP: Vercel sets x-forwarded-for (first entry is the client). Local requests are 127.0.0.1. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return fwd || request.headers.get('x-real-ip')?.trim() || '127.0.0.1';
}
