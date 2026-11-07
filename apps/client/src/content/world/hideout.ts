import type { EntityDef } from '../../game/world-registry.ts';
import { ent } from './define.ts';

const SEQ4 = 'seq4_gartner_confession';

export const HIDEOUT_ENTITIES: readonly EntityDef[] = [
  ent('door', 'hideout', 'shed', { caps: ['interactable'], crit: true, owner: SEQ4 }),
  ent('npc', 'hideout', 'gartner', { caps: ['interactable'], crit: true, owner: SEQ4 }),
  ent('clue', 'hideout', 'journal_2', { caps: ['inspectable'], crit: false }),
  ent('light', 'hideout', 'shed_bulb', { caps: ['angelFlicker'], crit: false, owner: SEQ4 }),
];
