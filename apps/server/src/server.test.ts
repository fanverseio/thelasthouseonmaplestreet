import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadServerConfig } from './config.ts';
import { createLocalServer } from './server.ts';

let server: Server;
let base: string;

beforeAll(async () => {
  server = createLocalServer(loadServerConfig({}));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('local server', () => {
  it('serves /api/health over HTTP', async () => {
    const response = await fetch(`${base}/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, mode: 'local' });
  });

  it('returns 404 for non-API paths', async () => {
    expect((await fetch(`${base}/index.html`)).status).toBe(404);
  });

  it('rejects bodies over 16 KB with 413', async () => {
    const response = await fetch(`${base}/api/health`, { method: 'POST', body: 'x'.repeat(17 * 1024) });
    expect(response.status).toBe(413);
  });
});
