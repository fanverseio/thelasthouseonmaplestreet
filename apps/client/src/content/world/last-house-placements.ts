/**
 * Placements for the Last House scene (zones `interior` and `ritual`, interior-layout.ts frame) plus the
 * one exterior row Beat 9 needs: the front door. Spread into PLACEMENTS (placements.ts); a later explicit
 * row for the same ID there wins. Tests check every row stands on free ground of its own scene.
 */
import type { EntityId } from '@tlh/shared';
import type { Placement } from './placements.ts';

export const LAST_HOUSE_PLACEMENTS: Readonly<Record<EntityId, Placement>> = {
  // Beat 8/9 hand-over: the front door of the Last House (house.last box x -68..-56, z 36..44)
  'door.grounds.last_house_front': { x: -62, z: 34.6, r: 0.5 },
  // Beat 9: entrance hall, cellar landing, ritual door
  'spawn.interior.entry': { x: 0, z: 20, r: 0.5 },
  'clue.interior.journal_4': { x: -6, z: 14, r: 0.3 },
  'puzzle.interior.board': { x: 6, z: 6, r: 0.6 },
  'enemy.interior.cat': { x: 0, z: -3, r: 0.5 },
  'door.interior.ritual': { x: 0, z: -5, r: 0.5 },
  // Beat 10: ritual chamber (seal collider at 0,-18 radius 1.5)
  'seal.ritual.central': { x: 0, z: -15, r: 0.8 },
  'clue.ritual.journal_5': { x: 4, z: -14, r: 0.3 },
};
