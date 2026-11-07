import type { EntityDef } from '../../game/world-registry.ts';
import { ent } from './define.ts';

export const LANE_ENTITIES: readonly EntityDef[] = [
  ent('clue', 'lane', 'journal_3', { caps: ['inspectable'], crit: false }),
  ent('trigger', 'lane', 'home_window', { crit: true, owner: 'atm_home_window' }),
  ent('light', 'lane', 'lamp_1', { caps: ['angelFlicker'], crit: false }),
  ent('spawn', 'lane', 'angel_1', { caps: ['angelSummon'], crit: false }),
];
