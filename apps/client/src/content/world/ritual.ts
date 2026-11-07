import type { EntityDef } from '../../game/world-registry.ts';
import { ent, range } from './define.ts';

export const RITUAL_ENTITIES: readonly EntityDef[] = [
  ent('seal', 'ritual', 'central', { caps: ['interactable'], crit: true, owner: 'finale' }),
  ...range('door', 'ritual', ['north', 'east', 'west'], { crit: true, owner: 'finale' }),
  ...range('anchor', 'ritual', ['north', 'east', 'west'], {
    caps: ['interactable'],
    crit: true,
    owner: 'finale',
  }),
  ent('npc', 'ritual', 'felix', { crit: true, owner: 'finale' }),
  ent('clue', 'ritual', 'journal_5', { caps: ['inspectable'], crit: false }),
  ...range('spawn', 'ritual', ['wraith_1', 'wraith_2', 'wraith_3', 'wraith_4'], {
    crit: true,
    owner: 'finale',
  }),
];
