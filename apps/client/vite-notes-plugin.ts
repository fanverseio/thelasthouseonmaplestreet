import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { IMAGE_DIR, imageFileFor, imageKind, isSameOrigin, MAX_IMAGE_BYTES, NOTES_IMAGE_ROUTE } from './src/dev/notes/image-file.ts';

/**
 * Playtest note screenshots (DEV SERVER ONLY: `apply: 'serve'`, so a build, `vite preview` and Vercel have no such
 * route). POST /__notes/image?session=YYYYMMDD-HHMM&id=N with JPEG or PNG bytes writes
 * <repo>/test-image/<session>-n<id>.<ext> (git-ignored) and answers { path } with the absolute path.
 * The file name is built here from two strictly checked values; nothing from the browser becomes a path.
 */
export function notesImagePlugin(repoRoot: string): Plugin {
  const dir = join(repoRoot, IMAGE_DIR);
  return {
    name: 'tlh-notes-image',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(NOTES_IMAGE_ROUTE, (req, res) => {
        const reply = (status: number, body: Record<string, unknown>) => {
          res.statusCode = status;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.setHeader('cache-control', 'no-store');
          res.end(JSON.stringify(body));
        };
        if (req.method !== 'POST') return reply(405, { error: 'POST only' });
        const header = (n: string): string | undefined => {
          const v = req.headers[n];
          return Array.isArray(v) ? v[0] : v;
        };
        if (!isSameOrigin({ origin: header('origin'), host: header('host'), secFetchSite: header('sec-fetch-site') })) {
          return reply(403, { error: 'same origin only' });
        }
        const url = new URL(req.url ?? '/', 'http://localhost');
        const chunks: Buffer[] = [];
        let size = 0;
        let tooBig = false;
        req.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_IMAGE_BYTES) tooBig = true;
          else chunks.push(chunk);
        });
        req.on('end', () => {
          void (async () => {
            if (tooBig) return reply(413, { error: 'image too large' });
            const bytes = new Uint8Array(Buffer.concat(chunks));
            const kind = imageKind(bytes);
            if (!kind) return reply(415, { error: 'JPEG or PNG only' });
            const name = imageFileFor(url.searchParams.get('session'), url.searchParams.get('id'), kind);
            if (!name) return reply(400, { error: 'bad session or id' });
            try {
              await mkdir(dir, { recursive: true });
              const path = join(dir, name);
              await writeFile(path, bytes);
              return reply(200, { path });
            } catch {
              return reply(500, { error: 'could not write the file' });
            }
          })();
        });
        req.on('error', () => reply(400, { error: 'read error' }));
      });
    },
  };
}
