import type { EntityDef } from '../../game/world-registry.ts';
import { ent } from './define.ts';

const SEQ3 = 'seq3_cursed_neighbour';

export const GARDEN_ENTITIES: readonly EntityDef[] = [
  ent('trigger', 'garden', 'enter', { crit: true, owner: SEQ3 }),
  ent('enemy', 'garden', 'briggs', { crit: true, owner: SEQ3 }),
  ent('clue', 'garden', 'walkie', { caps: ['inspectable'], crit: true, owner: SEQ3 }),
  ent('door', 'garden', 'garage', { crit: true }),
  ent('pickup', 'garden', 'fuse', { caps: ['pickup'], crit: true }),
  ent('light', 'garden', 'porch', { caps: ['angelFlicker'], crit: false }),
  ent('clue', 'garden', 'photo', {
    caps: ['inspectable', 'angelReveal'],
    crit: false,
    owner: 'side_quest',
  }),
  ent('socket', 'garden', 'porch_step', { caps: ['socket'], crit: false, owner: 'side_quest' }),
];
