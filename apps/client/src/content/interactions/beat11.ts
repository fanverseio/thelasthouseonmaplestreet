import type { ProgressFlag, SpellId } from '@tlh/shared';
import type { InteractionContent, InteractionDef } from './types.ts';

const ANCHOR_FLAGS = ['anchor_north', 'anchor_east', 'anchor_west'] as const satisfies readonly ProgressFlag[];

/**
 * Beats 11-12: the central seal's `activate`, `inert` and `choice` states (the `reveal` state is Beat 10) and the
 * three anchors. The `show` conditions mirror game/progression.ts `sealState`, so exactly one seal def is shown.
 *
 * Anchors (any order; docs/puzzles.md P6, task 5.10): pressing E hands the press to the ritual director
 * (game/ritual.ts), which owns the three mechanics: north = break the smoke shell with Arcane Bolt, then hold E 3 s;
 * east = hold E 6 s while the smoke strikes (Ward blocks); west = channel Purify on the anchor for 4 s. The flag
 * (`anchor_<dir>`) is set by the director when the task is done. Pressing E selects the spell the anchor needs
 * when it is unlocked (Q14). Anchors, `ritual_active` and the other flags are flags, so death and respawn keep them.
 */
const anchor = (dir: 'north' | 'east' | 'west', prompt: string, spell: SpellId): InteractionDef => ({
  id: `anchor.ritual.${dir}`,
  prompt,
  show: { flags: ['ritual_active'], notFlags: [`anchor_${dir}`] },
  autoSelect: spell,
  actions: [{ do: 'anchor', dir }],
});

export const BEAT11: InteractionContent = {
  interactions: [
    // activate: seq6_done and not ritual_active
    {
      id: 'seal.ritual.central',
      prompt: 'Wake the seal',
      show: { flags: ['seq6_done'], notFlags: ['ritual_active'] },
      actions: [
        { do: 'setFlag', flag: 'ritual_active' },
        { do: 'say', line: 'vo_elena_b11_01' },
        { do: 'say', line: 'vo_angel_b11_01', after: 3 },
      ],
    },
    // inert: ritual_active and not anchors_all
    {
      id: 'seal.ritual.central',
      prompt: 'Restore the anchors',
      show: { flags: ['ritual_active'], notFlags: ['anchors_all'] },
      actions: [{ do: 'say', line: 'vo_angel_b11_01' }],
    },
    // choice: anchors_all and no ending flag (Beat 12)
    {
      id: 'seal.ritual.central',
      prompt: 'Decide the seal',
      show: { flags: ['anchors_all'], notFlags: ['ending_keeper', 'ending_broken'] },
      actions: [{ do: 'finale', op: 'choice' }],
    },
    anchor('north', 'Restore the north anchor (break the smoke shell first)', 'arcane_bolt'),
    anchor('east', 'Restore the east anchor (hold)', 'ward'),
    anchor('west', 'Restore the west anchor (Purify it)', 'purify'),
  ],
  triggers: [],
  hints: [],
  onFlag: [
    // The first anchor restored brings Felix's spirit (cin_felix_anchor sets felix3_done).
    ...ANCHOR_FLAGS.map((flag) => ({
      flag,
      when: { flags: ['ritual_active'], notFlags: ['felix3_done'] } as const,
      actions: [{ do: 'startSequence', sequence: 'cin_felix_anchor' }] as const,
    })),
  ],
  // The third anchor, whichever it is, completes the ritual (and the smoke stops).
  onCond: [
    {
      id: 'ritual_anchors_all',
      when: { flags: [...ANCHOR_FLAGS] },
      actions: [
        { do: 'setFlag', flag: 'anchors_all' },
        { do: 'say', line: 'vo_elena_b11_02' },
      ],
    },
  ],
};
