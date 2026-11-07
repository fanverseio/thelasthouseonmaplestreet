/**
 * Checkpoints (docs/beat-sheet.md "Checkpoints"). Data plus pure lookups.
 * Writing a checkpoint triggers an autosave (hooked up by the save system, section 4).
 * Death respawns at the last checkpoint with full HP and magic; flags never roll back.
 */
import type { CheckpointId, ProgressFlag, SceneId } from '@tlh/shared';
import { HOME_PORCH, HOME_START } from '../content/world/home-layout.ts';

export interface CheckpointDef {
  id: CheckpointId;
  /** Written when this flag is set; null for checkpoints written by a game event instead. */
  onFlag: ProgressFlag | null;
  /** Written by this named event (entering a trigger or a scene), when `onFlag` is null. */
  onEvent: string | null;
  scene: SceneId;
  /** Respawn point in scene coordinates (metres) and facing. */
  spawn: { x: number; z: number; yaw: number };
  /** Where it is, for design notes. */
  note: string;
}

export const CHECKPOINTS: readonly CheckpointDef[] = [
  { id: 'cp_home_start', onFlag: null, onEvent: 'new_game', scene: 'exterior', spawn: { ...HOME_START }, note: "Felix's bedroom doorway" },
  { id: 'cp_street', onFlag: 'home_done', onEvent: null, scene: 'exterior', spawn: { ...HOME_PORCH }, note: 'Front porch, outside the door' },
  { id: 'cp_intersection', onFlag: 'seq2_done', onEvent: null, scene: 'exterior', spawn: { x: 58, z: 30, yaw: 0 }, note: 'Under the streetlight' },
  { id: 'cp_garden', onFlag: null, onEvent: 'enter:trg.garden.enter', scene: 'exterior', spawn: { x: 58, z: 20, yaw: 0 }, note: 'Garden gate (mini-boss reset)' },
  { id: 'cp_garden_after', onFlag: 'seq3_done', onEvent: null, scene: 'exterior', spawn: { x: 58, z: 5, yaw: 0 }, note: 'Garden path' },
  { id: 'cp_house66', onFlag: 'seq4_done', onEvent: null, scene: 'exterior', spawn: { x: 50, z: -35, yaw: 0 }, note: 'Outside the shed' },
  { id: 'cp_watcher', onFlag: 'fuse_placed', onEvent: null, scene: 'exterior', spawn: { x: -56, z: -32, yaw: 0 }, note: 'House 66 gate (mini-boss reset)' },
  { id: 'cp_lane', onFlag: 'lane_open', onEvent: null, scene: 'exterior', spawn: { x: -58, z: -20, yaw: Math.PI }, note: 'Lane gate' },
  { id: 'cp_outbuilding', onFlag: 'padlock_open', onEvent: null, scene: 'exterior', spawn: { x: -52, z: 25.5, yaw: Math.PI }, note: 'Outbuilding door' },
  { id: 'cp_interior', onFlag: null, onEvent: 'enter:last_house', scene: 'last_house', spawn: { x: 0, z: 20, yaw: 0 }, note: 'Entrance hall' },
  { id: 'cp_ritual', onFlag: 'board_solved', onEvent: null, scene: 'last_house', spawn: { x: 0, z: -12, yaw: 0 }, note: 'Ritual chamber centre' },
];

const BY_ID = new Map<CheckpointId, CheckpointDef>(CHECKPOINTS.map((c) => [c.id, c]));

export function getCheckpoint(id: CheckpointId): CheckpointDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Unknown checkpoint: ${id}`);
  return def;
}

/** Checkpoint written when this flag is set, or null. */
export function checkpointForFlag(flag: ProgressFlag): CheckpointDef | null {
  return CHECKPOINTS.find((c) => c.onFlag === flag) ?? null;
}

/** Checkpoint written by this named event, or null. */
export function checkpointForEvent(event: string): CheckpointDef | null {
  return CHECKPOINTS.find((c) => c.onEvent === event) ?? null;
}

/**
 * The checkpoint a loaded or respawning player should use for a given flag set:
 * the latest one whose trigger has happened. Event checkpoints count once their flag-dependent
 * successors are set (they come earlier in the list).
 */
export function checkpointForFlags(flags: readonly ProgressFlag[]): CheckpointDef {
  let best = CHECKPOINTS[0]!;
  for (const c of CHECKPOINTS) {
    if (c.onFlag && flags.includes(c.onFlag)) best = c;
  }
  return best;
}

/** What a respawn restores. Resolved enemies and flags are untouched by design. */
export interface RespawnPlan {
  checkpoint: CheckpointDef;
  hp: number;
  magic: number;
}

export function respawnPlan(id: CheckpointId, maxHp = 100, maxMagic = 100): RespawnPlan {
  return { checkpoint: getCheckpoint(id), hp: maxHp, magic: maxMagic };
}
