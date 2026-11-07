import type { ClassicLine } from '../../game/dialogue.ts';

/**
 * Classic Mode catalogue for beats 1-4 (docs/angel-persona.md section 7). Beats 1-3 need only `any`
 * lines (the hidden score is neutral until the cursed neighbour is resolved); beat 4 adds band lines.
 */
export const CLASSIC_LINES: readonly ClassicLine[] = [
  // Beat 1
  { id: 'vo_elena_b1_h1', beat: 1, band: 'any', when: { puzzle: 'p1_drawer', hintLevel: 1 }, priority: 20 },
  { id: 'vo_angel_b1_c1', beat: 1, band: 'any', priority: 10, once: true },
  { id: 'vo_angel_b1_c2', beat: 1, band: 'any', when: { flags: ['angel_awake'] }, priority: 5 },
  // Beat 2
  { id: 'vo_angel_b2_c1', beat: 2, band: 'any', priority: 10, once: true },
  { id: 'vo_angel_b2_c2', beat: 2, band: 'any', priority: 5 },
  { id: 'vo_angel_b2_h1', beat: 2, band: 'any', when: { notFlags: ['seq1_done'] }, priority: 3 },
  // Beat 3
  { id: 'vo_angel_b3_c1', beat: 3, band: 'any', priority: 10, once: true },
  { id: 'vo_angel_b3_c2', beat: 3, band: 'any', priority: 5 },
  // Beat 4, before the fight is resolved (placeholder text)
  { id: 'vo_angel_b4_c0', beat: 4, band: 'any', when: { notFlags: ['seq3_done'] }, priority: 1 },
  // Beat 4, after `seq3_done`
  { id: 'vo_angel_b4_kind_c1', beat: 4, band: 'kind', when: { flags: ['seq3_done'] }, priority: 10, once: true },
  { id: 'vo_angel_b4_kind_c2', beat: 4, band: 'kind', when: { flags: ['seq3_done'] }, priority: 5 },
  { id: 'vo_angel_b4_neutral_c1', beat: 4, band: 'neutral', when: { flags: ['seq3_done'] }, priority: 10, once: true },
  { id: 'vo_angel_b4_neutral_c2', beat: 4, band: 'neutral', when: { flags: ['seq3_done'] }, priority: 5 },
  { id: 'vo_angel_b4_dark_c1', beat: 4, band: 'dark', when: { flags: ['seq3_done'] }, priority: 10, once: true },
  { id: 'vo_angel_b4_dark_c2', beat: 4, band: 'dark', when: { flags: ['seq3_done'] }, priority: 5 },
];
