import type { EntityDef } from '../../game/world-registry.ts';
import { ent, range } from './define.ts';

const SEQ5 = 'seq5_felix_mirror';

export const GROUNDS_ENTITIES: readonly EntityDef[] = [
  ent('trigger', 'grounds', 'enter', { crit: true, owner: 'enc_approach' }),
  ...range('enemy', 'grounds', ['hound_1', 'hound_2'], { crit: true, owner: 'enc_approach' }),
  ent('puzzle', 'grounds', 'padlock', { caps: ['interactable'], crit: true }),
  ent('door', 'grounds', 'outbuilding', { crit: true }),
  ent('mirror', 'grounds', 'antique', { caps: ['interactable'], crit: true, owner: SEQ5 }),
  ent('puzzle', 'grounds', 'runes', { crit: true, owner: SEQ5 }),
  ...range('rune', 'grounds', ['r1', 'r2', 'r3'], { crit: true, owner: SEQ5 }),
  ent('door', 'grounds', 'last_house_front', { caps: ['interactable'], crit: true }),
  ent('light', 'grounds', 'lantern', { caps: ['angelFlicker'], crit: false }),
  ent('prop', 'grounds', 'weathervane', { caps: ['angelStir'], crit: false }),
];
