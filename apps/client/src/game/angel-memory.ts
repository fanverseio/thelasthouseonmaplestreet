/**
 * Angel memory (ARCHITECTURE 6.2): a structured snapshot from game state, a deterministic running summary
 * (<= 1500 chars, from flags and recorded Angel actions), and the last 10 turns. All plain data, all saved.
 */
import { knowledgeLevelFromFlags, moralityBand, type ChatTurn, type EntityId, type ProgressFlag, type StateSnapshot, type ZoneId } from '@tlh/shared';
import type { GameState } from '../store/game-store.ts';
import { objectiveFor } from './objectives.ts';
import { beatOfFlags } from './world-runtime.ts';
import type { WorldRegistry } from './world-registry.ts';

export const MAX_TURNS = 10;
export const MAX_SUMMARY = 1500;
const TURN_MAX = 400;

/** What Elena has lived through, in story order (one short line per milestone flag). */
const MILESTONES: readonly [ProgressFlag, string][] = [
  ['locket_taken', 'Elena found her grandmother Rosalind\'s locket and woke the Angel.'],
  ['home_done', 'She left home to search Maple Street for Felix.'],
  ['seq2_done', 'She saw Felix\'s spirit beneath the streetlight; her own magic woke.'],
  ['briggs_purified', 'She purified Mr Briggs, the corrupted neighbour.'],
  ['briggs_destroyed', 'She destroyed the smoke that wore Mr Briggs.'],
  ['seq4_done', 'Gartner, frightened and deceived, told her about the back lane behind House 66.'],
  ['watcher_purified', 'She purified the Watcher of House 66.'],
  ['watcher_destroyed', 'She destroyed the smoke in the Watcher of House 66.'],
  ['lane_open', 'She went through the back lane.'],
  ['seq5_done', 'Felix spoke to her from the painting and warned of the broken seal.'],
  ['board_solved', 'She solved the talking board inside the Last House.'],
  ['seq6_done', 'She learned she and Felix are the two Living Keys.'],
  ['ritual_active', 'The ritual has begun.'],
];

/** Deterministic: the same flags and history always give the same text. Oldest lines go first when too long. */
export function buildSummary(flags: readonly ProgressFlag[], angelActions: readonly string[] = []): string {
  const lines = MILESTONES.filter(([f]) => flags.includes(f)).map(([, text]) => text);
  if (angelActions.length > 0) lines.push(`The Angel has helped ${angelActions.length} time(s): ${angelActions.slice(-5).join(', ')}.`);
  while (lines.join(' ').length > MAX_SUMMARY && lines.length > 1) lines.shift();
  return lines.join(' ').slice(0, MAX_SUMMARY);
}

export function pushTurns(recent: readonly ChatTurn[], ...turns: ChatTurn[]): ChatTurn[] {
  return [...recent, ...turns.map((t) => ({ role: t.role, text: t.text.slice(0, TURN_MAX) }))].slice(-MAX_TURNS);
}

export interface SnapshotInput {
  state: GameState;
  zone: ZoneId;
  registry: WorldRegistry;
  nearby: readonly EntityId[];
  inEncounter: boolean;
}

export function buildSnapshot({ state, zone, registry, nearby, inEncounter }: SnapshotInput): StateSnapshot {
  const flags = state.progress.flags;
  const clues = Object.entries(state.world.entities)
    .filter(([id, v]) => id.startsWith('clue.') && (v.revealed === true || v.read === true || v.found === true))
    .map(([id]) => id as EntityId)
    .slice(0, 60);
  return {
    zone,
    beat: beatOfFlags(flags),
    objective: objectiveFor(flags).slice(0, 200),
    knowledgeLevel: knowledgeLevelFromFlags(flags) ?? 0,
    flags: [...flags],
    cluesFound: clues,
    moralityBand: moralityBand(state.progress.morality.value),
    hp: Math.max(0, Math.min(100, state.player.hp)),
    magic: Math.max(0, Math.min(100, state.player.magic)),
    spellsUnlocked: [...state.player.spellsUnlocked],
    carried: [...state.progress.carried],
    nearby: nearby
      .map((id) => registry.get(id))
      .filter((e) => e !== undefined)
      .slice(0, 12)
      .map((e) => ({ id: e.id, kind: e.kind, capabilities: [...e.capabilities] })),
    sideQuest: { active: null, offered: 0 },
    inEncounter,
  };
}
