import { defineConfig } from '@playwright/test';

/**
 * Browser smoke tests live in apps/client/e2e. They start the Vite dev server themselves
 * (or reuse one already running on port 5173). The local API is not needed for the smoke test.
 */
export default defineConfig({
  testDir: 'apps/client/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5173' },
  webServer: {
    command: 'npm run dev --workspace @tlh/client -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
