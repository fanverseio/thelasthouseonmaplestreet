import { z } from 'zod';
import { ActionLedgerSchema } from './angel-actions.ts';
import { ChatTurnSchema } from './api.ts';
import { GameEventSchema, MAX_EVENT_LOG } from './events.ts';
import {
  CheckpointIdSchema,
  EntityIdSchema,
  ItemIdSchema,
  ModeSchema,
  PuzzleIdSchema,
  SpellIdSchema,
} from './ids.ts';
import { ProgressFlagListSchema } from './flags.ts';
import { MoralityValueSchema } from './morality.ts';

/** Browser storage keys. Settings are never stored inside the save. */
export const SAVE_STORAGE_KEY = 'tlh.save';
export const SETTINGS_STORAGE_KEY = 'tlh.settings';
export const CURRENT_SAVE_VERSION = 1;
export const MAX_CARRIED_ITEMS = 4;

/**
 * Save file version 1. docs/contracts.md section 8.
 * zod strips unknown keys, so stray fields (for example an API key) never survive a parse.
 */
export const SaveFileV1Schema = z.object({
  version: z.literal(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  finished: z.boolean(),
  preferredMode: ModeSchema,
  checkpointId: CheckpointIdSchema,
  progress: z.object({
    flags: ProgressFlagListSchema,
    morality: z.object({
      value: MoralityValueSchema,
      history: z.array(
        z.object({ at: z.number().nonnegative(), delta: z.number().int(), reason: z.string().max(80) }),
      ),
    }),
    carried: z.array(ItemIdSchema).max(MAX_CARRIED_ITEMS),
    puzzles: z.partialRecord(
      PuzzleIdSchema,
      z.object({
        solved: z.boolean(),
        hintLevel: z.number().int().nonnegative(),
        data: z.record(z.string(), z.unknown()),
      }),
    ),
  }),
  player: z.object({
    hp: z.number().min(0).max(100),
    magic: z.number().min(0).max(100),
    spellsUnlocked: z.array(SpellIdSchema),
    pos: z.tuple([z.number(), z.number(), z.number()]),
    yaw: z.number(),
  }),
  world: z.record(EntityIdSchema, z.record(z.string(), z.unknown())),
  /** Optional: client world-runtime snapshot (played lines, hints, fired triggers, timers). Added in task 4.1. */
  runtime: z.record(z.string(), z.unknown()).optional(),
  angel: z.object({
    summary: z.string().max(1500),
    recent: z.array(ChatTurnSchema).max(10),
    eventLog: z.array(GameEventSchema).max(MAX_EVENT_LOG),
    actionLedger: ActionLedgerSchema,
    sideQuests: z
      .array(
        z.object({
          templateId: z.string().max(40),
          targetId: EntityIdSchema,
          state: z.enum(['active', 'done', 'closed']),
        }),
      )
      .max(2),
    sideQuestsOffered: z.number().int().min(0).max(2),
    glitchesUsed: z.number().int().min(0).max(3),
    simTime: z.number().nonnegative(),
  }),
});
export type SaveFileV1 = z.infer<typeof SaveFileV1Schema>;
