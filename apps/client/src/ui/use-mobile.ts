import { useEffect, useState } from 'react';
import { detectMobile, mobileOverride, resolveMobile } from '../game/mobile-mode.ts';
import { settingsStore, useSettings } from '../store/index.ts';

/** Browser facts for game/mobile-mode.ts. Read once: they do not change while the page is open. */
let detected: boolean | null = null;
function detectedOnce(): boolean {
  if (detected === null) {
    const mq = (q: string) => typeof window !== 'undefined' && window.matchMedia?.(q).matches === true;
    detected = detectMobile({
      coarsePointer: mq('(pointer: coarse)'),
      hasFinePointer: mq('(any-pointer: fine)'),
      maxTouchPoints: typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints || 0,
      userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
    });
  }
  return detected;
}

/** Mobile mode: `?mobile=1/0`, then Settings (Auto / On / Off), then detection. */
export function useMobile(): boolean {
  const pref = useSettings((s) => s.mobileMode);
  return resolveMobile(detectedOnce(), pref, mobileOverride(window.location.search));
}

/** True while the window is taller than wide. */
export function usePortrait(): boolean {
  const [portrait, setPortrait] = useState(() => window.matchMedia?.('(orientation: portrait)').matches === true);
  useEffect(() => {
    const mq = window.matchMedia?.('(orientation: portrait)');
    if (!mq) return;
    const on = () => setPortrait(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return portrait;
}

/** A user gesture on a phone: go full screen and try to lock landscape. Both may be refused; that is fine. */
export function enterMobileLandscape(): void {
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => undefined);
  const orientation = screen.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined;
  orientation?.lock?.('landscape').catch(() => undefined);
}

/**
 * Page-wide mobile set-up while mobile mode is on: `data-mobile` on <html> for the CSS, the Low preset once,
 * full screen + landscape on the first tap, and `--vvh` (the visual viewport height) so the locket text box
 * stays above the on-screen keyboard.
 */
export function useMobileSetup(mobile: boolean): void {
  useEffect(() => {
    const root = document.documentElement;
    if (!mobile) {
      delete root.dataset.mobile;
      return;
    }
    root.dataset.mobile = 'true';
    const s = settingsStore.getState();
    if (!s.mobileDefaultsApplied) s.updateSettings({ graphicsPreset: 'low', mobileDefaultsApplied: true });
    const first = () => enterMobileLandscape();
    window.addEventListener('pointerdown', first, { once: true });
    const vv = window.visualViewport;
    const size = () => root.style.setProperty('--vvh', `${Math.round(vv?.height ?? window.innerHeight)}px`);
    size();
    vv?.addEventListener('resize', size);
    window.addEventListener('resize', size);
    return () => {
      delete root.dataset.mobile;
      window.removeEventListener('pointerdown', first);
      vv?.removeEventListener('resize', size);
      window.removeEventListener('resize', size);
    };
  }, [mobile]);
}
