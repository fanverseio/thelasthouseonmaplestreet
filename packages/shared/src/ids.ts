import { z } from 'zod';

/** Zones of the neighbourhood. See docs/level-manifest.md section 2. */
export const ZONE_IDS = [
  'home',
  'street',
  'garden',
  'hideout',
  'house66',
  'lane',
  'grounds',
  'interior',
  'ritual',
] as const;
export const ZoneIdSchema = z.enum(ZONE_IDS);
export type ZoneId = z.infer<typeof ZoneIdSchema>;

export const SCENE_IDS = ['exterior', 'last_house'] as const;
export const SceneIdSchema = z.enum(SCENE_IDS);
export type SceneId = z.infer<typeof SceneIdSchema>;

export const ENTITY_KINDS = [
  'door',
  'gate',
  'light',
  'clue',
  'pickup',
  'socket',
  'prop',
  'enemy',
  'npc',
  'trigger',
  'spawn',
  'node',
  'puzzle',
  'rune',
  'mirror',
  'anchor',
  'seal',
] as const;
export const EntityKindSchema = z.enum(ENTITY_KINDS);
export type EntityKind = z.infer<typeof EntityKindSchema>;

export const CAPABILITIES = [
  'interactable',
  'inspectable',
  'pickup',
  'socket',
  'angelFlicker',
  'angelUnlock',
  'angelReveal',
  'angelStir',
  'angelSummon',
] as const;
export const CapabilitySchema = z.enum(CAPABILITIES);
export type Capability = z.infer<typeof CapabilitySchema>;

export const SPELL_IDS = ['arcane_bolt', 'purify', 'ward'] as const;
export const SpellIdSchema = z.enum(SPELL_IDS);
export type SpellId = z.infer<typeof SpellIdSchema>;

export const CHECKPOINT_IDS = [
  'cp_home_start',
  'cp_street',
  'cp_intersection',
  'cp_garden',
  'cp_garden_after',
  'cp_house66',
  'cp_watcher',
  'cp_lane',
  'cp_grounds',
  'cp_outbuilding',
  'cp_interior',
  'cp_ritual',
] as const;
export const CheckpointIdSchema = z.enum(CHECKPOINT_IDS);
export type CheckpointId = z.infer<typeof CheckpointIdSchema>;

export const SEQUENCE_IDS = [
  'seq1_empty_street',
  'seq2_felix_streetlight',
  'seq3_cursed_neighbour',
  'seq4_gartner_confession',
  'seq5_felix_mirror',
  'seq6_two_keys',
  'cin_felix_anchor',
  'cin_ending_keeper',
  'cin_ending_broken',
  'atm_home_window',
  'angel_intro',
] as const;
export const SequenceIdSchema = z.enum(SEQUENCE_IDS);
export type SequenceId = z.infer<typeof SequenceIdSchema>;

export const ENCOUNTER_IDS = [
  'enc_street',
  'enc_watcher',
  'enc_approach',
  'enc_interior',
  'enc_ritual',
] as const;
export const EncounterIdSchema = z.enum(ENCOUNTER_IDS);
export type EncounterId = z.infer<typeof EncounterIdSchema>;

export const PUZZLE_IDS = [
  'p1_drawer',
  'p2_fuse',
  'p3_padlock',
  'p4_runes',
  'p5_board',
  'p6_anchors',
] as const;
export const PuzzleIdSchema = z.enum(PUZZLE_IDS);
export type PuzzleId = z.infer<typeof PuzzleIdSchema>;

export const ITEM_IDS = ['drawer_key', 'fuse', 'fence_key', 'toy_rabbit', 'photo'] as const;
export const ItemIdSchema = z.enum(ITEM_IDS);
export type ItemId = z.infer<typeof ItemIdSchema>;

/** Entity IDs are `kind.zone.name`, lowercase. See .kiro/steering/structure.md. */
export const ENTITY_ID_PATTERN = /^[a-z]+\.[a-z0-9_]+\.[a-z0-9_]+$/;
export const ENTITY_ID_MAX_LENGTH = 64;
export const EntityIdSchema = z.string().max(ENTITY_ID_MAX_LENGTH).regex(ENTITY_ID_PATTERN);
export type EntityId = string;

export function isEntityId(value: unknown): value is EntityId {
  return EntityIdSchema.safeParse(value).success;
}

/** The Angel's knowledge level, 0..6 (docs/angel-persona.md section 3). */
export const KnowledgeLevelSchema = z.number().int().min(0).max(6);
export type KnowledgeLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const MODES = ['classic', 'ai'] as const;
export const ModeSchema = z.enum(MODES);
export type Mode = z.infer<typeof ModeSchema>;

export const AI_STATUSES = ['unavailable', 'ready', 'degraded', 'budget_exhausted'] as const;
export const AiStatusSchema = z.enum(AI_STATUSES);
export type AiStatus = z.infer<typeof AiStatusSchema>;

export const APP_MODES = ['local', 'hosted'] as const;
export const AppModeSchema = z.enum(APP_MODES);
export type AppMode = z.infer<typeof AppModeSchema>;
