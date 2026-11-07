import type { EntityDef } from '../../game/world-registry.ts';
import { ent } from './define.ts';

export const INTERIOR_ENTITIES: readonly EntityDef[] = [
  ent('spawn', 'interior', 'entry', { crit: true }),
  ent('enemy', 'interior', 'cat', { crit: true, owner: 'enc_interior' }),
  ent('clue', 'interior', 'journal_4', { caps: ['inspectable'], crit: false }),
  ent('puzzle', 'interior', 'board', { caps: ['interactable'], crit: true }),
  ent('door', 'interior', 'ritual', { crit: true }),
  ent('door', 'interior', 'study', { caps: ['interactable', 'angelUnlock'], crit: false }),
  ent('clue', 'interior', 'rosalind_letter', {
    caps: ['inspectable', 'angelReveal'],
    crit: false,
  }),
  ent('light', 'interior', 'chandelier', { caps: ['angelFlicker'], crit: false }),
  ent('prop', 'interior', 'piano', { caps: ['angelStir'], crit: false }),
];
