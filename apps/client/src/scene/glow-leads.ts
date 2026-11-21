import type { EntityId, ProgressFlag } from '@tlh/shared';

/**
 * Pale "lead" glows on things worth looking at that are not usable (view only). Each lead goes away once its
 * moment has passed, so a ring never promises an E prompt that will not come (note 6: the streetlight is a
 * cinematic spot, and the ring stayed after Seq 2). The window in Felix's room is a real clue now (note 2), so it
 * has its own beacon and is not a lead any more.
 */
export const LEADS: readonly { id: EntityId; until?: ProgressFlag }[] = [
  { id: 'prop.street.window_14' as EntityId },
  { id: 'light.street.intersection' as EntityId, until: 'seq2_done' },
];

export function activeLeads(flags: readonly ProgressFlag[]): EntityId[] {
  return LEADS.filter((l) => !l.until || !flags.includes(l.until)).map((l) => l.id);
}
