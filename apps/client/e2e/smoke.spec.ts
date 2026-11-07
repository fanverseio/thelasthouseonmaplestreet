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
