import { z } from 'zod';

/** Hidden morality. Never shown as a number. See docs/combat-tuning.md section 6. */
export const MORALITY_MIN = -100;
export const MORALITY_MAX = 100;
export const MORALITY_DARK_MAX = -25;
export const MORALITY_KIND_MIN = 25;

export const MORALITY_BANDS = ['dark', 'neutral', 'kind'] as const;
export const MoralityBandSchema = z.enum(MORALITY_BANDS);
export type MoralityBand = z.infer<typeof MoralityBandSchema>;

export const MoralityValueSchema = z.number().int().min(MORALITY_MIN).max(MORALITY_MAX);

export function clampMorality(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.round(Math.min(MORALITY_MAX, Math.max(MORALITY_MIN, value)));
}

export function moralityBand(value: number): MoralityBand {
  const clamped = clampMorality(value);
  if (clamped <= MORALITY_DARK_MAX) return 'dark';
  if (clamped >= MORALITY_KIND_MIN) return 'kind';
  return 'neutral';
}
