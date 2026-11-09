import { useGame } from './index.ts';
import { angelRgbFor, type Rgb } from '../game/angel-look.ts';

/** The Angel's HUD colour. Lives outside ui/ so UI files never touch the hidden value behind it. */
export function useAngelRgb(): Rgb {
  return useGame((s) => angelRgbFor(s.progress.morality.value));
}

/** True once the Angel has woken (the cluster is hidden before). */
export function useAngelAwake(): boolean {
  return useGame((s) => s.progress.flags.includes('angel_awake'));
}
