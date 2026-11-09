import type { ProgressFlag } from '@tlh/shared';
import type { InteractionContent, InteractionDef } from './types.ts';

/** Holding E on an anchor for this long restores it (sim seconds). Stub timings from docs/puzzles.md P6. */
export const ANCHOR_HOLD_SECONDS = { north: 3, east: 6, west: 4 } as const;

const ANCHOR_FLAGS = ['anchor_north', 'anchor_east', 'anchor_west'] as const satisfies readonly ProgressFlag[];

/**
 * Beats 11-12: the central seal's `activate`, `inert` and `choice` states (the `reveal` state is Beat 10) and the
 * three anchors. The `show` conditions mirror game/progression.ts `sealState`, so exactly one seal def is shown.
 *
 * Anchors (any order; docs/puzzles.md P6, greybox stub): each is a hold-E interaction. North needs Arcane Bolt
 * selected (it stands for breaking the smoke shell first); pressing E on it selects Arcane Bolt by itself when
 * it is unlocked (Q14). The smoke strikes are a harmless timed warning
 * (game/ritual.ts). Anchors, `ritual_active` and the other flags are flags, so death and respawn keep them.
 */
const anchor = (dir: 'north' | 'east' | 'west', extra: Partial<InteractionDef> = {}): InteractionDef => ({
  id: `anchor.ritual.${dir}`,
  prompt: `Restore the ${dir} anchor (hold)`,
  show: { flags: ['ritual_active'], notFlags: [`anchor_${dir}`] },
  hold: { seconds: ANCHOR_HOLD_SECONDS[dir] },
  actions: [{ do: 'setFlag', flag: `anchor_${dir}` }],
  ...extra,
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
    anchor('north', {
      lockedPrompt: 'Smoke shell: select Arcane Bolt (1) to break it',
      requires: { spell: 'arcane_bolt' },
      autoSelect: 'arcane_bolt',
      onRefuse: [{ do: 'say', line: 'vo_angel_p6_h_north' }],
    }),
    anchor('east'),
    anchor('west'),
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
