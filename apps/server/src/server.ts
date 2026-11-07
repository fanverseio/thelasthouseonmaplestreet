import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { MAX_REQUEST_BODY_BYTES } from '@tlh/shared';
import type { ServerConfig } from './config.ts';
import { errorResponse } from './handlers/json.ts';
import { handleApiRequest } from './handlers/router.ts';
import type { HandlerContext } from './handlers/types.ts';

class BodyTooLargeError extends Error {}

async function readBody(req: IncomingMessage): Promise<Uint8Array | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > MAX_REQUEST_BODY_BYTES) throw new BodyTooLargeError();
    chunks.push(buffer);
  }
  return new Uint8Array(Buffer.concat(chunks));
}

function toHeaders(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) headers.append(name, item);
  }
  return headers;
}

async function send(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, name) => res.setHeader(name, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

/** Local Node server for development. Binds to 127.0.0.1 only. */
export function createLocalServer(config: ServerConfig, now: () => number = Date.now): Server {
  const ctx: HandlerContext = { config, now, startedAt: now() };

  return createServer((req, res) => {
    void (async () => {
      try {
        const url = new URL(req.url ?? '/', `http://${config.host}:${config.port}`);
        if (!url.pathname.startsWith('/api/')) {
          await send(res, errorResponse('not_found', 404));
          return;
        }
        let body: Uint8Array | undefined;
        try {
          body = await readBody(req);
        } catch (error) {
          if (error instanceof BodyTooLargeError) {
            await send(res, errorResponse('bad_request', 413));
            return;
          }
          throw error;
        }
        const request = new Request(url, {
          method: req.method ?? 'GET',
          headers: toHeaders(req),
          ...(body ? { body } : {}),
        });
        await send(res, await handleApiRequest(request, ctx));
      } catch {
        if (!res.headersSent) await send(res, errorResponse('provider_error', 500));
        else res.end();
      }
    })();
  });
}
