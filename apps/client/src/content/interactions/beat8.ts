import type { EntityId } from '@tlh/shared';
import type { InteractionContent, InteractionDef } from './types.ts';

const RUNES = ['rune.grounds.r1', 'rune.grounds.r2', 'rune.grounds.r3'] as const;
const purified = (id: EntityId) => ({ id, key: 'purified', is: true }) as const;

/** A rune only exists after seq5_done and until it is purified (it stays drawn by the view). */
const rune = (id: EntityId): InteractionDef => ({
  id,
  prompt: 'Purify the rune',
  show: { flags: ['seq5_done'], notFlags: ['runes_done'], notEntities: [purified(id)] },
  actions: [{ do: 'setEntity', id, key: 'purified', value: true }],
});

/**
 * Beat 8: the antique mirror and the P4 runes (beat-sheet.md, puzzles.md). seq5_felix_mirror is one video
 * step (content/sequences/beat8.ts). The runes are drawn only in the mirror's reflection (scene/mirror.tsx);
 * Elena finds each spot from the reflection and presses E on it. Purify on a rune costs no magic. Progress is
 * per-rune entity state (saved); runes_done is set once all three are purified. It opens
 * door.grounds.last_house_front (gate). Entering the house is not part of this beat.
 */
export const BEAT8: InteractionContent = {
  interactions: [
    {
      id: 'mirror.grounds.antique',
      prompt: 'Look into the antique mirror',
      lockedPrompt: 'The outbuilding is locked',
      show: { notFlags: ['seq5_done'] },
      requires: { flags: ['padlock_open'] },
      actions: [{ do: 'startSequence', sequence: 'seq5_felix_mirror' }],
    },
    ...RUNES.map(rune),
  ],
  triggers: [],
  hints: [
    {
      id: 'p4_runes',
      puzzle: 'p4_runes',
      near: { entity: 'mirror.grounds.antique', radius: 14 },
      startFlag: 'seq5_done',
      cancelFlag: 'runes_done',
      steps: [
        { atSeconds: 30, say: 'vo_felix_p4_h1' },
        { atSeconds: 60, say: 'vo_angel_p4_h2', highlight: 'mirror.grounds.antique' },
        { atSeconds: 90, say: 'vo_angel_p4_h3', highlight: 'rune.grounds.r1' },
        { atSeconds: 90, highlight: 'rune.grounds.r2' },
        { atSeconds: 90, highlight: 'rune.grounds.r3' },
      ],
    },
  ],
  onCond: [
    {
      id: 'runes_all_purified',
      when: { flags: ['seq5_done'], notFlags: ['runes_done'], entities: RUNES.map(purified) },
      actions: [{ do: 'setFlag', flag: 'runes_done' }],
    },
  ],
};
