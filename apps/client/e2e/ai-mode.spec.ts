import { expect, test, type Page } from '@playwright/test';
import { handleApiRequest } from '../../server/src/handlers/router.ts';
import { makeCtx } from '../../server/src/test-fixtures.ts';

/**
 * AI-Enhanced Mode in a real browser, with the real server handlers (mock provider) answering /api in-process.
 * No network, no key. Test passphrases only.
 */
const PAIR = { passphrase_01: 'e2e-moon-over-maple', passphrase_02: 'e2e-silver-locket' };

async function serveApi(page: Page, env: Record<string, string>) {
  const { ctx } = makeCtx(env);
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const body = req.postData();
    const res = await handleApiRequest(
      new Request(req.url(), { method: req.method(), headers: await req.allHeaders(), ...(body ? { body } : {}) }),
      ctx,
    );
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => (headers[k] = v));
    await route.fulfill({ status: res.status, headers, body: Buffer.from(await res.arrayBuffer()) });
  });
}

async function startAi(page: Page) {
  await page.goto('/?start=street');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.getByTestId('ai-mode')).toBeEnabled();
  await page.getByTestId('ai-mode').click();
}

async function play(page: Page) {
  const view = page.getByTestId('game-view');
  await expect(view).toBeVisible();
  await page.mouse.click(80, 80); // pointer lock -> playing (a corner: the pause menu buttons sit in the middle)
  await expect(view).toHaveAttribute('data-phase', 'playing', { timeout: 10_000 });
}

test('login with two passphrases (wrong then right), T, chat, reply, credit badge', async ({ page }) => {
  test.setTimeout(120_000); // a cold dev server under parallel tests is slow to serve the game scene
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await serveApi(page, { LLM_PROTOCOL: 'mock', ...PAIR });
  await startAi(page);

  await expect(page.getByTestId('ai-login-screen')).toBeVisible();
  await page.getByTestId('pass1').fill(PAIR.passphrase_01);
  await page.getByTestId('pass2').fill('wrong');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('login-error')).toBeVisible();
  await page.getByTestId('pass2').fill(PAIR.passphrase_02);
  await page.getByTestId('login-submit').click();

  await play(page);
  await expect(page.getByTestId('credit-text')).toHaveText(/AI credits \d+%/);
  await page.keyboard.press('KeyT');
  await expect(page.getByTestId('ai-locket')).toBeVisible();
  await expect(page.getByTestId('game-view')).toHaveAttribute('data-phase', 'locket');
  await page.getByTestId('angel-input').fill('Where is Felix?');
  await page.getByTestId('angel-send').click();
  await expect(page.getByTestId('angel-reply')).toContainText('The Angel:');
  await expect(page.getByTestId('angel-reply')).toHaveAttribute('data-source', 'ai');
  await expect(page.getByTestId('ai-locket')).toHaveAttribute('data-dim', 'false');

  // A provider failure dims the locket and the Angel speaks an authored Classic line.
  await page.getByTestId('angel-input').fill('[[mock:error]]');
  await page.getByTestId('angel-send').click();
  await expect(page.getByTestId('angel-reply')).toHaveAttribute('data-source', 'classic');
  await expect(page.getByTestId('ai-locket')).toHaveAttribute('data-dim', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByText('Click to resume')).toBeVisible();
  expect(errors).toEqual([]);
});

test('no login is asked locally when no passphrases are configured; Classic still works with no API', async ({ page }) => {
  await serveApi(page, { LLM_PROTOCOL: 'mock' });
  await startAi(page);
  await play(page);
  await expect(page.getByTestId('credit-badge')).toBeVisible();
});
