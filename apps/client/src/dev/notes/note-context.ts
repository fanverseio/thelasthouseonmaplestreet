/**
 * Builds the automatic part of a playtest note from the game state at the moment N is pressed. Pure: the panel
 * passes the store state and the few things only the view knows (active sequence, fps, preset, window size).
 * Holds only game facts: no settings other than the graphics preset, no keys, codes or provider settings.
 */
import { objectiveFor } from '../../game/objectives.ts';
import { zoneAt } from '../../game/world-runtime.ts';
import type { GameState } from '../../store/game-store.ts';
import type { NoteContext } from './note-model.ts';

const r2 = (v: number): number => Math.round(v * 100) / 100;

export interface ViewFacts {
  sequence: string | null;
  fps: number;
  preset: string;
  viewport: [number, number];
}

export function noteContext(s: Pick<GameState, 'game' | 'player' | 'progress'>, view: ViewFacts): NoteContext {
  const [x, y, z] = s.player.pos;
  const flags = s.progress.flags;
  return {
    scene: s.game.scene,
    zone: zoneAt(x, z, s.game.scene, flags),
    pos: [r2(x), r2(y), r2(z)],
    yaw: r2(s.player.yaw),
    pitch: r2(s.player.pitch),
    objective: objectiveFor(flags),
    checkpoint: s.game.checkpointId,
    flags: [...flags],
    phase: s.game.phase,
    sequence: view.sequence,
    mode: s.game.activeMode,
    hp: Math.round(s.player.hp),
    magic: Math.round(s.player.magic),
    spell: s.player.selectedSpell,
    fps: Math.round(view.fps),
    preset: view.preset,
    viewport: view.viewport,
  };
}
