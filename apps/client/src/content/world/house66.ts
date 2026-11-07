import type { EntityDef } from '../../game/world-registry.ts';
import { ent, range } from './define.ts';

export const HOUSE66_ENTITIES: readonly EntityDef[] = [
  ent('socket', 'house66', 'fusebox', { caps: ['socket'], crit: true }),
  ent('light', 'house66', 'porch', { crit: true, owner: 'enc_watcher' }),
  ent('enemy', 'house66', 'watcher', { crit: true, owner: 'enc_watcher' }),
  ...range('node', 'house66', ['tp_1', 'tp_2', 'tp_3', 'tp_4', 'tp_5', 'tp_6'], {
    crit: true,
    owner: 'enc_watcher',
  }),
  ent('pickup', 'house66', 'fence_key', { caps: ['pickup'], crit: true }),
  ent('gate', 'house66', 'lane', { caps: ['socket'], crit: true }),
  ent('clue', 'house66', 'upstairs_window', {
    caps: ['inspectable', 'angelReveal'],
    crit: false,
    owner: 'side_quest',
  }),
  ent('prop', 'house66', 'rocking_chair', { caps: ['angelStir'], crit: false }),
];
