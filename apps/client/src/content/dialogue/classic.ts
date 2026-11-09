import type { ClassicLine } from '../../game/dialogue.ts';

/**
 * Classic Mode catalogue for beats 1-12 (docs/angel-persona.md section 7, task 4.11). `beat` is the stage
 * `beatOfFlags` reports (game/world-runtime.ts). `minK` keeps a line below the Angel's knowledge level
 * (K0-K6, derived from flags) from ever being picked. Beats 1-3 need only `any` lines (the score is neutral
 * until the cursed neighbour is resolved); from beat 4 every beat has at least two lines per band.
 * Puzzle hints use `when.puzzle` + `hintLevel`; the level numbers match the hint steps/lines of P1-P6.
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
  // Beat 3 (the streetlight, then the walk to No. 31): the first two lines state K1 facts
  { id: 'vo_angel_b3_c0', beat: 3, band: 'any', when: { notFlags: ['seq2_done'] }, priority: 1 },
  { id: 'vo_angel_b3_c1', beat: 3, band: 'any', priority: 10, once: true, minK: 1 },
  { id: 'vo_angel_b3_c2', beat: 3, band: 'any', priority: 5, minK: 1 },
  // Beat 4, before the fight is resolved (placeholder text)
  { id: 'vo_angel_b4_c0', beat: 4, band: 'any', when: { notFlags: ['seq3_done'] }, priority: 1 },
  // Beat 4, after `seq3_done`
  { id: 'vo_angel_b4_kind_c1', beat: 4, band: 'kind', when: { flags: ['seq3_done'] }, priority: 10, once: true, minK: 2 },
  { id: 'vo_angel_b4_kind_c2', beat: 4, band: 'kind', when: { flags: ['seq3_done'] }, priority: 5, minK: 2 },
  { id: 'vo_angel_b4_neutral_c1', beat: 4, band: 'neutral', when: { flags: ['seq3_done'] }, priority: 10, once: true, minK: 2 },
  { id: 'vo_angel_b4_neutral_c2', beat: 4, band: 'neutral', when: { flags: ['seq3_done'] }, priority: 5, minK: 2 },
  { id: 'vo_angel_b4_dark_c1', beat: 4, band: 'dark', when: { flags: ['seq3_done'] }, priority: 10, once: true, minK: 2 },
  { id: 'vo_angel_b4_dark_c2', beat: 4, band: 'dark', when: { flags: ['seq3_done'] }, priority: 5, minK: 2 },
  // Beat 5: Gartner told her (K3); the fuse hunt (P2)
  { id: 'vo_angel_b6_hint1', beat: 5, band: 'any', when: { puzzle: 'p2_fuse', hintLevel: 1 }, priority: 20, minK: 3 },
  { id: 'vo_angel_p2_h2', beat: 5, band: 'any', when: { puzzle: 'p2_fuse', hintLevel: 2 }, priority: 20, minK: 3 },
  { id: 'vo_angel_b5_any_c1', beat: 5, band: 'any', priority: 1, minK: 3 },
  { id: 'vo_angel_b5_kind_c1', beat: 5, band: 'kind', priority: 10, once: true, minK: 3 },
  { id: 'vo_angel_b5_kind_c2', beat: 5, band: 'kind', priority: 5, minK: 3 },
  { id: 'vo_angel_b5_neutral_c1', beat: 5, band: 'neutral', priority: 10, once: true, minK: 3 },
  { id: 'vo_angel_b5_neutral_c2', beat: 5, band: 'neutral', priority: 5, minK: 3 },
  { id: 'vo_angel_b5_dark_c1', beat: 5, band: 'dark', priority: 10, once: true, minK: 3 },
  { id: 'vo_angel_b5_dark_c2', beat: 5, band: 'dark', priority: 5, minK: 3 },
  // Beat 6: House 66 and the Watcher; the band lines wait for the key (`fence_key_taken`, both outcomes)
  { id: 'vo_angel_b6_any_c1', beat: 6, band: 'any', priority: 5, minK: 3 },
  { id: 'vo_angel_b6_kind_c1', beat: 6, band: 'kind', when: { flags: ['fence_key_taken'] }, priority: 10, once: true, minK: 3 },
  { id: 'vo_angel_b6_kind_c2', beat: 6, band: 'kind', when: { flags: ['fence_key_taken'] }, priority: 5, minK: 3 },
  { id: 'vo_angel_b6_neutral_c1', beat: 6, band: 'neutral', when: { flags: ['fence_key_taken'] }, priority: 10, once: true, minK: 3 },
  { id: 'vo_angel_b6_neutral_c2', beat: 6, band: 'neutral', when: { flags: ['fence_key_taken'] }, priority: 5, minK: 3 },
  { id: 'vo_angel_b6_dark_c1', beat: 6, band: 'dark', when: { flags: ['fence_key_taken'] }, priority: 10, once: true, minK: 3 },
  { id: 'vo_angel_b6_dark_c2', beat: 6, band: 'dark', when: { flags: ['fence_key_taken'] }, priority: 5, minK: 3 },
  // Beat 7: the back lane and the grounds (P3); the hounds line waits for the grounds
  { id: 'vo_angel_p3_h1', beat: 7, band: 'any', when: { puzzle: 'p3_padlock', hintLevel: 1 }, priority: 20, minK: 3 },
  { id: 'vo_angel_p3_h2', beat: 7, band: 'any', when: { puzzle: 'p3_padlock', hintLevel: 2 }, priority: 20, minK: 3 },
  { id: 'vo_angel_p3_h3', beat: 7, band: 'any', when: { puzzle: 'p3_padlock', hintLevel: 3 }, priority: 20, minK: 3 },
  { id: 'vo_angel_p3_h4', beat: 7, band: 'any', when: { puzzle: 'p3_padlock', hintLevel: 4 }, priority: 20, minK: 3 },
  { id: 'vo_angel_b7_02', beat: 7, band: 'any', when: { zone: 'grounds' }, priority: 20, once: true, minK: 3 },
  { id: 'vo_angel_b7_kind_c1', beat: 7, band: 'kind', priority: 10, once: true, minK: 3 },
  { id: 'vo_angel_b7_kind_c2', beat: 7, band: 'kind', priority: 5, minK: 3 },
  { id: 'vo_angel_b7_neutral_c1', beat: 7, band: 'neutral', priority: 10, once: true, minK: 3 },
  { id: 'vo_angel_b7_neutral_c2', beat: 7, band: 'neutral', priority: 5, minK: 3 },
  { id: 'vo_angel_b7_dark_c1', beat: 7, band: 'dark', priority: 10, once: true, minK: 3 },
  { id: 'vo_angel_b7_dark_c2', beat: 7, band: 'dark', priority: 5, minK: 3 },
  // Beat 8: the mirror (P4); the band lines are K4 (after `seq5_done`)
  { id: 'vo_angel_p4_h1', beat: 8, band: 'any', when: { puzzle: 'p4_runes', hintLevel: 1 }, priority: 20, minK: 4 },
  { id: 'vo_angel_p4_h2', beat: 8, band: 'any', when: { puzzle: 'p4_runes', hintLevel: 2 }, priority: 20, minK: 4 },
  { id: 'vo_angel_p4_h3', beat: 8, band: 'any', when: { puzzle: 'p4_runes', hintLevel: 3 }, priority: 20, minK: 4 },
  { id: 'vo_angel_b8_any_c1', beat: 8, band: 'any', priority: 1, minK: 3 },
  { id: 'vo_angel_b8_kind_c1', beat: 8, band: 'kind', priority: 10, once: true, minK: 4 },
  { id: 'vo_angel_b8_kind_c2', beat: 8, band: 'kind', priority: 5, minK: 4 },
  { id: 'vo_angel_b8_neutral_c1', beat: 8, band: 'neutral', priority: 10, once: true, minK: 4 },
  { id: 'vo_angel_b8_neutral_c2', beat: 8, band: 'neutral', priority: 5, minK: 4 },
  { id: 'vo_angel_b8_dark_c1', beat: 8, band: 'dark', priority: 10, once: true, minK: 4 },
  { id: 'vo_angel_b8_dark_c2', beat: 8, band: 'dark', priority: 5, minK: 4 },
  // Beat 9: the Last House interior (P5)
  { id: 'vo_angel_p5_h1', beat: 9, band: 'any', when: { puzzle: 'p5_board', hintLevel: 1 }, priority: 20, minK: 4 },
  { id: 'vo_angel_p5_h2', beat: 9, band: 'any', when: { puzzle: 'p5_board', hintLevel: 2 }, priority: 20, minK: 4 },
  { id: 'vo_angel_p5_h3', beat: 9, band: 'any', when: { puzzle: 'p5_board', hintLevel: 3 }, priority: 20, minK: 4 },
  { id: 'vo_angel_b9_01', beat: 9, band: 'any', when: { engaged: ['enemy.interior.cat'] }, priority: 20, once: true, minK: 4 },
  { id: 'vo_angel_b9_kind_c1', beat: 9, band: 'kind', priority: 10, once: true, minK: 4 },
  { id: 'vo_angel_b9_kind_c2', beat: 9, band: 'kind', priority: 5, minK: 4 },
  { id: 'vo_angel_b9_neutral_c1', beat: 9, band: 'neutral', priority: 10, once: true, minK: 4 },
  { id: 'vo_angel_b9_neutral_c2', beat: 9, band: 'neutral', priority: 5, minK: 4 },
  { id: 'vo_angel_b9_dark_c1', beat: 9, band: 'dark', priority: 10, once: true, minK: 4 },
  { id: 'vo_angel_b9_dark_c2', beat: 9, band: 'dark', priority: 5, minK: 4 },
  // Beat 10: the seal (board solved) and the two Living Keys (K5 after `seq6_done`)
  { id: 'vo_angel_b10_any_c1', beat: 10, band: 'any', priority: 1, minK: 4 },
  // Q17: between `board_solved` and `seq6_done` (K4 at most, placeholder)
  { id: 'vo_angel_b10_board_c1', beat: 10, band: 'any', when: { flags: ['board_solved'], notFlags: ['seq6_done'] }, priority: 15, once: true, minK: 4 },
  { id: 'vo_angel_b10_board_c2', beat: 10, band: 'any', when: { flags: ['board_solved'], notFlags: ['seq6_done'] }, priority: 6, minK: 4 },
  { id: 'vo_angel_b10_kind', beat: 10, band: 'kind', when: { flags: ['seq6_done'] }, priority: 10, once: true, minK: 5 },
  { id: 'vo_angel_b10_kind_c2', beat: 10, band: 'kind', when: { flags: ['seq6_done'] }, priority: 5, minK: 5 },
  { id: 'vo_angel_b10_neutral', beat: 10, band: 'neutral', when: { flags: ['seq6_done'] }, priority: 10, once: true, minK: 5 },
  { id: 'vo_angel_b10_neutral_c2', beat: 10, band: 'neutral', when: { flags: ['seq6_done'] }, priority: 5, minK: 5 },
  { id: 'vo_angel_b10_dark', beat: 10, band: 'dark', when: { flags: ['seq6_done'] }, priority: 10, once: true, minK: 5 },
  { id: 'vo_angel_b10_dark_c2', beat: 10, band: 'dark', when: { flags: ['seq6_done'] }, priority: 5, minK: 5 },
  // Beat 11: the ritual (K6). P6 hint level = the first anchor not yet restored (north 1, east 2, west 3)
  { id: 'vo_angel_p6_h_north', beat: 11, band: 'any', when: { puzzle: 'p6_anchors', hintLevel: 1, notFlags: ['anchor_north'] }, priority: 20, minK: 6 },
  { id: 'vo_angel_p6_h_east', beat: 11, band: 'any', when: { puzzle: 'p6_anchors', hintLevel: 2, notFlags: ['anchor_east'] }, priority: 20, minK: 6 },
  { id: 'vo_angel_p6_h_west', beat: 11, band: 'any', when: { puzzle: 'p6_anchors', hintLevel: 3, notFlags: ['anchor_west'] }, priority: 20, minK: 6 },
  { id: 'vo_angel_b11_01', beat: 11, band: 'any', priority: 20, once: true, minK: 6 },
  { id: 'vo_angel_b11_any_c1', beat: 11, band: 'any', priority: 1, minK: 6 },
  { id: 'vo_angel_b11_kind_c1', beat: 11, band: 'kind', priority: 10, once: true, minK: 6 },
  { id: 'vo_angel_b11_kind_c2', beat: 11, band: 'kind', priority: 5, minK: 6 },
  { id: 'vo_angel_b11_neutral_c1', beat: 11, band: 'neutral', priority: 10, once: true, minK: 6 },
  { id: 'vo_angel_b11_neutral_c2', beat: 11, band: 'neutral', priority: 5, minK: 6 },
  { id: 'vo_angel_b11_dark_c1', beat: 11, band: 'dark', priority: 10, once: true, minK: 6 },
  { id: 'vo_angel_b11_dark_c2', beat: 11, band: 'dark', priority: 5, minK: 6 },
  // Beat 12: the choice (the Angel argues, never decides)
  { id: 'vo_angel_b12_any_c1', beat: 12, band: 'any', priority: 1, minK: 6 },
  { id: 'vo_angel_b12_kind', beat: 12, band: 'kind', priority: 10, once: true, minK: 6 },
  { id: 'vo_angel_b12_kind_c2', beat: 12, band: 'kind', priority: 5, minK: 6 },
  { id: 'vo_angel_b12_neutral', beat: 12, band: 'neutral', priority: 10, once: true, minK: 6 },
  { id: 'vo_angel_b12_neutral_c2', beat: 12, band: 'neutral', priority: 5, minK: 6 },
  { id: 'vo_angel_b12_dark', beat: 12, band: 'dark', priority: 10, once: true, minK: 6 },
  { id: 'vo_angel_b12_dark_c2', beat: 12, band: 'dark', priority: 5, minK: 6 },
];
