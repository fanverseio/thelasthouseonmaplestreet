import { z } from 'zod';
import { AngelActionTypeSchema } from './angel-actions.ts';
import { EntityIdSchema, PuzzleIdSchema, SpellIdSchema, ZoneIdSchema } from './ids.ts';
import { ProgressFlagSchema } from './flags.ts';

/** Typed game events that feed the Angel's memory. docs/contracts.md section 4. */
const at = z.number().nonnegative();

export const GameEventSchema = z.discriminatedUnion('t', [
  z.object({ t: z.literal('flag'), at, flag: ProgressFlagSchema }),
  z.object({ t: z.literal('clue_found'), at, id: EntityIdSchema }),
  z.object({ t: z.literal('met'), at, character: z.enum(['felix', 'gartner', 'briggs', 'watcher']) }),
  z.object({
    t: z.literal('enemy_resolved'),
    at,
    enemyId: EntityIdSchema,
    outcome: z.enum(['purified', 'destroyed']),
  }),
  z.object({ t: z.literal('spell_unlocked'), at, spell: SpellIdSchema }),
  z.object({ t: z.literal('puzzle_solved'), at, puzzle: PuzzleIdSchema }),
  z.object({
    t: z.literal('angel_action'),
    at,
    type: AngelActionTypeSchema,
    targetId: EntityIdSchema.optional(),
  }),
  z.object({
    t: z.literal('side_quest'),
    at,
    templateId: z.string().max(40),
    state: z.enum(['offered', 'active', 'done', 'closed']),
  }),
  z.object({ t: z.literal('player_died'), at, zone: ZoneIdSchema }),
]);
export type GameEvent = z.infer<typeof GameEventSchema>;

export const MAX_EVENT_LOG = 200;
