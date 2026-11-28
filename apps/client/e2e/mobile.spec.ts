import { devices, expect, test, type CDPSession, type Page } from '@playwright/test';
import { handleApiRequest } from '../../server/src/handlers/router.ts';
import { makeCtx } from '../../server/src/test-fixtures.ts';

/**
 * Mobile browser mode in Chromium's phone emulation (touch, isMobile, landscape). Real touches go in through
 * CDP Input.dispatchTouchEvent, so the game sees the same pointer events a phone sends. This is emulation:
 * no real phone GPU, no real on-screen keyboard. Screenshots go to test-image/ (gitignored).
 */
/** A device descriptor without its browser type (test.use cannot switch browsers; only Chromium is installed). */
const emulate = (name: string) => {
  const d: Partial<(typeof devices)[string]> = { ...devices[name] };
  delete d.defaultBrowserType;
  return d;
};
const PIXEL_7_LANDSCAPE = emulate('Pixel 7 landscape');
const IPHONE_LANDSCAPE = emulate('iPhone 14 landscape');
const SHOTS = 'test-image/mobile';

async function touch(cdp: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd', points: { x: number; y: number; id: number }[]) {
  await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : points });
}

/** One finger: down at (x, y), slide by (dx, dy) in steps, hold for `holdMs`, then lift. */
async function drag(page: Page, cdp: CDPSession, x: number, y: number, dx: number, dy: number, holdMs = 0, steps = 10) {
  await touch(cdp, 'touchStart', [{ x, y, id: 1 }]);
  for (let i = 1; i <= steps; i++) {
    await touch(cdp, 'touchMove', [{ x: x + (dx * i) / steps, y: y + (dy * i) / steps, id: 1 }]);
    await page.waitForTimeout(16);
  }
  if (holdMs) await page.waitForTimeout(holdMs);
  await touch(cdp, 'touchEnd', []);
}

async function pressHold(page: Page, cdp: CDPSession, testId: string, holdMs: number) {
  const box = (await page.getByTestId(testId).boundingBox())!;
  const p = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 2 };
  await touch(cdp, 'touchStart', [p]);
  await page.waitForTimeout(holdMs);
  await touch(cdp, 'touchEnd', []);
}

const readout = async (page: Page) => (await page.locator('.position-readout').innerText()).split('\n')[0]!;
const parse = (s: string) => {
  const m = /x (-?[\d.]+)\s+z (-?[\d.]+)\s+facing \w+ (\d+)°/.exec(s);
  return m ? { x: Number(m[1]), z: Number(m[2]), heading: Number(m[3]) } : null;
};

async function startClassic(page: Page, start: string) {
  await page.goto(`/?start=${start}`);
  await page.getByRole('button', { name: 'Continue' }).tap();
  await page.getByRole('button', { name: 'New Game' }).tap();
  await page.getByRole('button', { name: 'Classic Story Mode' }).tap();
  await resume(page);
}

async function resume(page: Page) {
  const view = page.getByTestId('game-view');
  await expect(view).toBeVisible();
  await expect(view).toHaveAttribute('data-mobile', 'true');
  await expect(page.getByTestId('resume-overlay')).toContainText('Tap to resume');
  await page.getByTestId('resume-overlay').tap({ position: { x: 30, y: 30 } });
  await expect(view).toHaveAttribute('data-phase', 'playing', { timeout: 10_000 });
  await expect(page.getByTestId('touch-controls')).toHaveAttribute('data-hidden', 'false');
}

test.describe('Pixel 7 landscape', () => {
  test.use({ ...PIXEL_7_LANDSCAPE });

  test('auto-detects mobile, moves with the stick, looks with a drag, T speaks, pause, portrait pauses', async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await startClassic(page, 'street');
    await expect(page.getByTestId('touch-controls')).toBeVisible();
    const cdp = await page.context().newCDPSession(page);
    const vp = page.viewportSize()!;
    await page.screenshot({ path: `${SHOTS}/pixel7-playing.png` });

    const before = parse(await readout(page))!;
    await drag(page, cdp, vp.width * 0.18, vp.height * 0.7, 0, -60, 1200);
    const moved = parse(await readout(page))!;
    expect(Math.hypot(moved.x - before.x, moved.z - before.z)).toBeGreaterThan(1);

    await drag(page, cdp, vp.width * 0.6, vp.height * 0.4, -120, 0);
    const turned = parse(await readout(page))!;
    expect(turned.heading).not.toBe(moved.heading);

    // T: Classic plays one Angel line in the panel; play goes on.
    await pressHold(page, cdp, 'touch-t', 80);
    await expect(page.locator('.angel-panel .angel-text')).not.toBeEmpty({ timeout: 5000 });
    await expect(page.getByTestId('game-view')).toHaveAttribute('data-phase', 'playing');

    // Pause button, then tap to resume.
    await pressHold(page, cdp, 'touch-pause', 60);
    await expect(page.getByTestId('game-view')).toHaveAttribute('data-phase', 'paused');
    await resume(page);

    // Upright phone: rotate screen and the game pauses; turning back and tapping resumes.
    await page.evaluate(() => (document.fullscreenElement ? document.exitFullscreen() : undefined)); // the first tap went full screen
    await page.setViewportSize({ width: vp.height, height: vp.width });
    await expect(page.getByTestId('rotate-overlay')).toBeVisible();
    await expect(page.getByTestId('game-view')).toHaveAttribute('data-phase', 'paused');
    await page.screenshot({ path: `${SHOTS}/pixel7-portrait.png` });
    await page.setViewportSize(vp);
    await expect(page.getByTestId('rotate-overlay')).toHaveCount(0);
    await resume(page);
    expect(errors).toEqual([]);
  });

  test('E on an interactable (walk into the outbuilding until an action shows)', async ({ page }) => {
    test.setTimeout(120_000);
    await startClassic(page, 'grounds');
    const cdp = await page.context().newCDPSession(page);
    const vp = page.viewportSize()!;
    for (let i = 0; i < 12 && (await page.locator('.hud-actions').count()) === 0; i++) {
      await drag(page, cdp, vp.width * 0.18, vp.height * 0.7, 0, -40, 250, 4);
    }
    await expect(page.locator('.hud-actions')).toBeVisible();
    const prompt = await page.locator('.hud-actions').innerText();
    await page.screenshot({ path: `${SHOTS}/pixel7-action.png` });
    await pressHold(page, cdp, 'touch-e', 80);
    await expect
      .poll(
        async () =>
          (await page.getByTestId('game-view').getAttribute('data-phase')) !== 'playing' ||
          (await page.locator('.hud-actions').count()) === 0 ||
          (await page.locator('.hud-actions').innerText()) !== prompt ||
          (await page.locator('.subtitles, .angel-panel .angel-text').count()) > 0,
        { timeout: 5000 },
      )
      .toBe(true);
    await page.screenshot({ path: `${SHOTS}/pixel7-after-e.png` });
  });

  test('a cinematic plays and a touch hold skips it', async ({ page }) => {
    test.setTimeout(120_000);
    await startClassic(page, 'ritual-door');
    const cdp = await page.context().newCDPSession(page);
    const vp = page.viewportSize()!;
    await drag(page, cdp, vp.width * 0.18, vp.height * 0.6, 0, 60, 1200); // back towards the cellar door (the trigger)
    const video = page.getByTestId('video-player').or(page.locator('.video-placeholder'));
    await expect(video).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('touch-controls')).toHaveAttribute('data-hidden', 'true'); // hidden in cinematics
    await page.screenshot({ path: `${SHOTS}/pixel7-cinematic.png` });
    await drag(page, cdp, vp.width / 2, vp.height / 2, 0, 0, 1600, 1);
    await expect(video).toHaveCount(0, { timeout: 10_000 });
  });

  test('settings fit the phone screen and the Touch controls switch is there', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Continue' }).tap();
    await page.getByRole('button', { name: 'Settings' }).tap();
    await expect(page.getByTestId('mobile-mode')).toHaveValue('auto');
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflowX).toBe(false);
    await page.screenshot({ path: `${SHOTS}/pixel7-settings.png` });
  });
});

test.describe('iPhone landscape size (Chromium with the iPhone user agent)', () => {
  test.use({ ...IPHONE_LANDSCAPE });

  test('AI login screen and the locket text box work with touch and the keyboard', async ({ page }) => {
    test.setTimeout(120_000);
    const PAIR = { passphrase_01: 'e2e-moon-over-maple', passphrase_02: 'e2e-silver-locket' };
    const { ctx } = makeCtx({ LLM_PROTOCOL: 'mock', ...PAIR });
    await page.route('**/api/**', async (route) => {
      const req = route.request();
      const body = req.postData();
      const res = await handleApiRequest(new Request(req.url(), { method: req.method(), headers: await req.allHeaders(), ...(body ? { body } : {}) }), ctx);
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => (headers[k] = v));
      await route.fulfill({ status: res.status, headers, body: Buffer.from(await res.arrayBuffer()) });
    });
    await page.goto('/?start=street');
    await page.getByRole('button', { name: 'Continue' }).tap();
    await page.getByRole('button', { name: 'New Game' }).tap();
    await expect(page.getByTestId('ai-mode')).toBeEnabled();
    await page.getByTestId('ai-mode').tap();
    await expect(page.getByTestId('ai-login-screen')).toBeVisible();
    await page.getByTestId('pass1').tap();
    await page.keyboard.type(PAIR.passphrase_01);
    await page.getByTestId('pass2').tap();
    await page.keyboard.type(PAIR.passphrase_02);
    await page.screenshot({ path: `${SHOTS}/iphone-login.png` });
    await page.getByTestId('login-submit').tap();
    await resume(page);

    const cdp = await page.context().newCDPSession(page);
    await pressHold(page, cdp, 'touch-t', 80);
    await expect(page.getByTestId('ai-locket')).toBeVisible();
    await page.getByTestId('angel-input').tap();
    await page.keyboard.type('Where is Felix?');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('angel-reply')).toContainText('The Angel:', { timeout: 10_000 });
    // A short visual viewport (the keyboard) keeps the text box on screen.
    await page.evaluate(() => document.documentElement.style.setProperty('--vvh', `${Math.round(window.innerHeight * 0.55)}px`));
    const box = (await page.getByTestId('angel-input').boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height * 0.55 + 1);
    await page.screenshot({ path: `${SHOTS}/iphone-locket-keyboard.png` });
    await page.getByTestId('locket-close').tap();
    await expect(page.getByTestId('game-view')).toHaveAttribute('data-phase', 'paused');
  });
});

test.describe('desktop stays desktop', () => {
  test('no touch controls and Click to resume on a desktop browser', async ({ page }) => {
    await page.goto('/?start=street');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'New Game' }).click();
    await page.getByRole('button', { name: 'Classic Story Mode' }).click();
    await expect(page.getByTestId('game-view')).toHaveAttribute('data-mobile', 'false');
    await expect(page.getByText('Click to resume')).toBeVisible();
    await expect(page.getByTestId('touch-controls')).toHaveCount(0);
  });
});
