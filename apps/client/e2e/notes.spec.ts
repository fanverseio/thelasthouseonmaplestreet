import { existsSync, readFileSync, rmSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/** Playtest notes (dev server, ?notes=1): N opens a note, Enter saves it with a screenshot, Shift+N saves the JSON. */
test('playtest notes: N adds a note with a screenshot, Shift+N saves the JSON', async ({ page }) => {
  test.setTimeout(90_000); // the software GPU in CI is slow to read the frame back
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console.log(`[browser ${m.type()}] ${m.text()}`);
  });

  await page.goto('/?notes=1');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByRole('button', { name: 'Classic Story Mode' }).click();
  const view = page.getByTestId('game-view');
  await expect(view).toHaveAttribute('data-phase', 'paused');
  // The notes UI is a lazy chunk (never loaded unless ?notes=1); a cold dev server can be slow to serve it.
  await expect(page.getByTestId('notes-badge')).toContainText('0 notes', { timeout: 30_000 });
  await page.waitForTimeout(1500); // let a few frames render

  const dialog = page.getByRole('dialog', { name: 'New playtest note' });
  // Under parallel load the first frames are slow; press again if the first N lands before the panel listens.
  await expect(async () => {
    if (!(await dialog.isVisible())) await page.keyboard.press('KeyN');
    await expect(dialog).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 30_000 });
  await expect(view).toHaveAttribute('data-phase', 'overlay');
  await dialog.getByRole('button', { name: 'visual' }).click();
  await dialog.getByRole('textbox', { name: 'Comment' }).fill('E2E: the porch light is too bright');
  await expect(dialog.getByRole('img', { name: 'Screenshot of this moment' })).toBeVisible({ timeout: 20_000 });
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(view).toHaveAttribute('data-phase', 'paused');
  await expect(page.getByTestId('notes-badge')).toContainText('1 note');

  await page.keyboard.press('Shift+KeyN');
  const list = page.getByRole('dialog', { name: 'Playtest notes' });
  await expect(list).toContainText('E2E: the porch light is too bright');
  const download = page.waitForEvent('download');
  await list.getByRole('button', { name: 'Save JSON file' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^tlh-notes-\d{8}-\d{4}\.json$/);
  const json = JSON.parse(readFileSync((await file.path())!, 'utf8')) as { notes: { tag: string; text: string; image: string | null; context: { scene: string } }[] };
  expect(json.notes).toHaveLength(1);
  const note = json.notes[0]!;
  expect(note).toMatchObject({ tag: 'visual', text: 'E2E: the porch light is too bright', context: { scene: 'exterior' } });
  expect(note.image).toMatch(/test-image[\\/]\d{8}-\d{4}-n1\.jpg$/);
  expect(existsSync(note.image!)).toBe(true);
  rmSync(note.image!); // leave no test screenshot behind

  // Esc closes the list (a click works by hand too; Playwright's hit check misreads it right after a download).
  await page.keyboard.press('Escape');
  await expect(list).toBeHidden();
  await expect(view).toHaveAttribute('data-phase', 'paused');
  expect(errors).toEqual([]);
});
