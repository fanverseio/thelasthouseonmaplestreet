import { defineConfig } from '@playwright/test';

/**
 * Browser smoke tests live in apps/client/e2e (tasks.md task 2.9 adds the first ones).
 * Until then `npm run test:e2e` passes with no tests and needs no browsers installed.
 */
export default defineConfig({
  testDir: 'apps/client/e2e',
  fullyParallel: true,
  reporter: 'list',
});
