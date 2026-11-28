import type { ServerConfig } from '../config.ts';
import type { Services } from '../services.ts';

/** Everything a handler may depend on. Injected so handlers stay testable. */
export interface HandlerContext {
  config: ServerConfig;
  services: Services;
  /** Milliseconds since the epoch. */
  now: () => number;
  /** When the server started, in milliseconds since the epoch. */
  startedAt: number;
}

/** Framework-free handler shared by the local server and Vercel Functions. */
export type Handler = (request: Request, ctx: HandlerContext) => Response | Promise<Response>;
