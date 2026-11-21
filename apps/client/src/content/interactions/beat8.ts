import type { EntityId } from '@tlh/shared';
import type { InteractionContent, InteractionDef } from './types.ts';

const RUNES = ['rune.grounds.r1', 'rune.grounds.r2', 'rune.grounds.r3'] as const;
const purified = (id: EntityId) => ({ id, key: 'purified', is: true }) as const;
const revealed = (id: EntityId) => ({ id, key: 'revealed', is: true }) as const;

/** A rune can be finished with E once Purify has woken it (game/runes.ts), until it is purified. */
const rune = (id: EntityId): InteractionDef => ({
  id,
  prompt: 'Purify the rune',
  show: { flags: ['seq5_done'], notFlags: ['runes_done'], entities: [revealed(id)], notEntities: [purified(id)] },
  actions: [{ do: 'setEntity', id, key: 'purified', value: true }],
});

/**
 * Beat 8: Rosalind's family painting and the P4 runes (beat-sheet.md, puzzles.md). Looking at the painting plays
 * seq5_felix_mirror, one video step (content/sequences/beat8.ts; the clip id keeps its old name). The runes are
 * hidden paint on the inside walls: a Purify cast at the wall wakes a rune (it glows), finishing the channel purifies
 * it, and a woken rune can also be finished with E (game/runes.ts). Purify on a rune costs no magic. Progress is
 * per-rune entity state (saved); runes_done is set once all three are purified. It opens
 * door.grounds.last_house_front (gate). Entering the house is not part of this beat.
 */
export const BEAT8: InteractionContent = {
  interactions: [
    {
      id: 'clue.grounds.painting',
      prompt: 'Look at the painting',
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
      near: { entity: 'clue.grounds.painting', radius: 14 },
      startFlag: 'seq5_done',
      cancelFlag: 'runes_done',
      steps: [
        { atSeconds: 30, say: 'vo_felix_p4_h1', highlight: 'clue.grounds.painting' },
        { atSeconds: 60, say: 'vo_angel_p4_h2' },
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
