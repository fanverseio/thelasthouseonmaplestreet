import type { GateDef } from '../../game/world-registry.ts';

/** level-manifest.md section 3. opensOn: null means the gate never opens. */
export const GATES: readonly GateDef[] = [
  { id: 'door.home.front', opensOn: 'home_done' },
  { id: 'gate.street.veil_east', opensOn: 'seq1_done' },
  { id: 'gate.street.veil_garden', opensOn: 'seq2_done' },
  { id: 'gate.street.veil_north', opensOn: 'seq3_done' },
  { id: 'door.garden.garage', opensOn: 'seq3_done' },
  { id: 'gate.street.veil_house66', opensOn: 'seq4_done' },
  { id: 'gate.house66.lane', opensOn: 'lane_open' },
  { id: 'door.grounds.outbuilding', opensOn: 'padlock_open' },
  { id: 'door.grounds.last_house_front', opensOn: 'runes_done' },
  { id: 'door.interior.ritual', opensOn: 'board_solved' },
  { id: 'door.ritual.north', opensOn: 'seq6_done' },
  { id: 'door.ritual.east', opensOn: 'seq6_done' },
  { id: 'door.ritual.west', opensOn: 'seq6_done' },
  { id: 'gate.street.last_house_road', opensOn: null },
];
