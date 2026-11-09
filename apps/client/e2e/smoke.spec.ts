import { expect, test } from '@playwright/test';

test('warning -> menu -> new Classic game shows the game view paused', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.getByTestId('warning-screen')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByTestId('main-menu')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue' })).toHaveCount(0);
  await page.getByRole('button', { name: 'New Game' }).click();

  await expect(page.getByRole('button', { name: 'AI-Enhanced Mode' })).toBeDisabled();
  await page.getByRole('button', { name: 'Classic Story Mode' }).click();

  const view = page.getByTestId('game-view');
  await expect(view).toBeVisible();
  await expect(view).toHaveAttribute('data-phase', 'paused');
  await expect(page.getByText('Click to resume')).toBeVisible();

  await page.getByRole('button', { name: 'Quit to menu' }).click();
  await expect(page.getByTestId('main-menu')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the Last House scene loads lazily in dev via ?scene=last_house', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?scene=last_house');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByRole('button', { name: 'Classic Story Mode' }).click();
  await expect(page.getByTestId('game-view')).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.locator('canvas')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the dev garden start (with the practice hound) loads without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?start=garden');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByRole('button', { name: 'Classic Story Mode' }).click();
  await expect(page.getByTestId('game-view')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('the dev training start (all spells, practice hound near the spawn) loads without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?start=training');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByRole('button', { name: 'Classic Story Mode' }).click();
  await expect(page.getByTestId('game-view')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('the first-art GLBs (home and front street) load on the street start without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const models: number[] = [];
  page.on('response', (r) => {
    if (/\/assets\/models\/(home_elena|street_front)\.glb/.test(r.url())) models.push(r.status());
  });
  await page.goto('/?start=street');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByRole('button', { name: 'Classic Story Mode' }).click();
  await expect(page.getByTestId('game-view')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(() => models.length, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
  await page.waitForTimeout(500);
  expect(models.every((s) => s === 200)).toBe(true);
  expect(errors).toEqual([]);
});
