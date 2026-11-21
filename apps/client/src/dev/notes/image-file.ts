/**
 * Checks for the dev-server screenshot endpoint (vite-notes-plugin.ts). Pure, no Node imports, so they are
 * unit-tested with the rest of the client. The browser sends only a session id, a note id and the JPEG/PNG
 * bytes; the server builds the file name itself and writes only inside test-image/.
 */

export const NOTES_IMAGE_ROUTE = '/__notes/image';
/** Largest screenshot accepted (bytes). A 1080p JPEG is usually 150-500 KB. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const IMAGE_DIR = 'test-image';

const SESSION_RE = /^\d{8}-\d{4}$/;

/** The file name for a request, or null when the session or id is not exactly what the client generates. */
export function imageFileFor(session: string | null, id: string | null, kind: 'jpg' | 'png'): string | null {
  if (!session || !id || !SESSION_RE.test(session) || !/^[1-9]\d{0,5}$/.test(id)) return null;
  return `${session}-n${id}.${kind}`;
}

/** JPEG or PNG by magic bytes, else null. */
export function imageKind(bytes: Uint8Array): 'jpg' | 'png' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && png.every((b, i) => bytes[i] === b)) return 'png';
  return null;
}

/**
 * Same-origin only: a page on another site must not be able to write files through the dev server.
 * Browsers send Sec-Fetch-Site; when it is missing, Origin must match Host.
 */
export function isSameOrigin(headers: { origin?: string | undefined; host?: string | undefined; secFetchSite?: string | undefined }): boolean {
  if (headers.secFetchSite !== undefined) return headers.secFetchSite === 'same-origin';
  if (!headers.origin || !headers.host) return false;
  try {
    return new URL(headers.origin).host === headers.host;
  } catch {
    return false;
  }
}
