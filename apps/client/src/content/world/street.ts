import type { EntityDef } from '../../game/world-registry.ts';
import { ent, range } from './define.ts';

export const STREET_ENTITIES: readonly EntityDef[] = [
  ent('trigger', 'street', 'seq1', { crit: true, owner: 'seq1_empty_street' }),
  ent('trigger', 'street', 'seq1_end', { crit: true, owner: 'seq1_empty_street' }),
  ...range('light', 'street', ['01', '02', '03', '04', '05', '06'], {
    caps: ['angelFlicker'],
    crit: false,
    owner: 'seq1_empty_street',
  }),
  ent('prop', 'street', 'window_14', { crit: false, owner: 'seq1_empty_street' }),
  ent('gate', 'street', 'veil_east', { crit: true }),
  ent('trigger', 'street', 'streetlight', { crit: true, owner: 'seq2_felix_streetlight' }),
  ent('light', 'street', 'intersection', {
    caps: ['angelFlicker'],
    crit: true,
    owner: 'seq2_felix_streetlight',
  }),
  ent('clue', 'street', 'candy_bag', { caps: ['inspectable'], crit: false }),
  ent('gate', 'street', 'veil_garden', { crit: true }),
  ent('trigger', 'street', 'fox', { crit: false, owner: 'enc_street' }),
  ent('enemy', 'street', 'fox', { crit: false, owner: 'enc_street' }),
  ent('gate', 'street', 'veil_north', { crit: true }),
  ent('gate', 'street', 'veil_house66', { crit: true }),
  ent('gate', 'street', 'last_house_road', { crit: true }),
  ent('light', 'street', 'green_lamp', { caps: ['angelFlicker'], crit: false }),
  ent('prop', 'street', 'swing', { caps: ['angelStir'], crit: false }),
  ent('prop', 'street', 'wind_chimes', { caps: ['angelStir'], crit: false }),
  ent('door', 'street', 'no22_gate', { caps: ['interactable', 'angelUnlock'], crit: false }),
  ent('clue', 'street', 'no22_letter', { caps: ['inspectable', 'angelReveal'], crit: false }),
  ent('pickup', 'street', 'toy_rabbit', {
    caps: ['pickup', 'angelReveal'],
    crit: false,
    owner: 'side_quest',
  }),
  ...range('socket', 'street', ['candle_1', 'candle_2', 'candle_3'], {
    caps: ['interactable', 'angelStir'],
    crit: false,
    owner: 'side_quest',
  }),
  ent('spawn', 'street', 'angel_1', { caps: ['angelSummon'], crit: false }),
  ent('spawn', 'street', 'angel_2', { caps: ['angelSummon'], crit: false }),
];
