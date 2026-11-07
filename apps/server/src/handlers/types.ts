import type { ServerConfig } from '../config.ts';

/** Everything a handler may depend on. Injected so handlers stay testable. */
export interface HandlerContext {
  config: ServerConfig;
  /** Milliseconds since the epoch. */
  now: () => number;
  /** When the server started, in milliseconds since the epoch. */
  startedAt: number;
}

/** Framework-free handler shared by the local server and (later) Vercel Functions. */
export type Handler = (request: Request, ctx: HandlerContext) => Response | Promise<Response>;
