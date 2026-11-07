import type { EntityDef } from '../../game/world-registry.ts';
import { ent } from './define.ts';

export const HOME_ENTITIES: readonly EntityDef[] = [
  ent('spawn', 'home', 'start', { crit: true }),
  ent('trigger', 'home', 'bedroom', { crit: true }),
  ent('clue', 'home', 'drawing', { caps: ['inspectable'], crit: true }),
  ent('clue', 'home', 'costume', { caps: ['inspectable'], crit: false }),
  ent('prop', 'home', 'pumpkin_jar', { caps: ['interactable'], crit: true }),
  ent('pickup', 'home', 'drawer_key', { caps: ['pickup'], crit: true }),
  ent('socket', 'home', 'drawer', { caps: ['socket'], crit: true }),
  ent('clue', 'home', 'journal_1', { caps: ['inspectable'], crit: false }),
  ent('door', 'home', 'front', { caps: ['interactable'], crit: true }),
  ent('light', 'home', 'hall', { crit: false }),
  ent('light', 'home', 'felix_window', { crit: true, owner: 'atm_home_window' }),
];
