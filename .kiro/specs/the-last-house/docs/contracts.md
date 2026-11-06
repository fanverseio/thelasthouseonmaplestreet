# Shared Contracts (Draft v1)

Single source of truth for types shared by client, server and saves. Implement as zod schemas in `packages/shared`. Items marked TBD depend on the story/level/tuning docs.

## Identifiers
- `EntityId`: `kind.zone.name` (lowercase). `ZoneId`: see level manifest (TBD).
- `QuestId`, `StepId`, `SequenceId`, `SpellId = 'arcane_bolt' | 'purify' | 'ward'`.
- `MoralityBand = 'dark' | 'neutral' | 'kind'` (thresholds TBD in tuning sheet).

## Modes
```ts
type Mode = 'classic' | 'ai';
interface ModeState {
  preferredMode: Mode;   // what the player chose; saved
  activeMode: Mode;      // what is running now; derived, NOT the saved choice
  aiStatus: 'unavailable' | 'ready' | 'degraded' | 'budget_exhausted';
}
```
`budget_exhausted` does not auto-retry. `degraded` retries with backoff (5s, 15s, 45s, then every 2 min).

## GameEvent (feeds Angel memory and summaries)
```ts
type GameEvent =
  | { t: 'quest_step'; questId: string; stepId: string }
  | { t: 'sequence_done'; id: string }
  | { t: 'clue_found'; id: EntityId }
  | { t: 'met'; character: 'felix' | 'gartner' | 'neighbour' }
  | { t: 'enemy_resolved'; enemyId: EntityId; outcome: 'purified' | 'destroyed' }
  | { t: 'spell_unlocked'; spell: SpellId }
  | { t: 'angel_action'; type: ActionType; targetId?: EntityId; ok: boolean }
  | { t: 'player_died'; zone: ZoneId };
// every event carries { at: number } game-time seconds
```

## StateSnapshot (sent to the LLM; small, no secrets)
```ts
interface StateSnapshot {
  zone: ZoneId; questStep: { questId: string; stepId: string };
  objective: string;
  cluesFound: EntityId[]; charactersMet: string[];
  purifiedCount: number; destroyedCount: number;
  moralityBand: MoralityBand;
  hp: number; magic: number; spellsUnlocked: SpellId[];
  nearby: Array<{ id: EntityId; kind: string; capabilities: string[] }>; // max 12, within range
  sideQuest: { active: string | null; offered: number };
  knowledgeLevel: number; // what the Angel may know now (Angel spec, TBD)
}
```

## Angel actions
```ts
type ActionType = 'flicker_lights' | 'unlock_door' | 'reveal_clue' | 'restore_magic'
                | 'stir_object' | 'summon_minor_cursed';
interface ProposedAction { type: ActionType; targetId?: EntityId; params?: { amount?: number } }
interface ActionDescriptor { type: ActionType; validTargets: EntityId[]; note: string } // sent to LLM
type ActionRejection = 'unknown_type' | 'no_target' | 'no_capability' | 'critical_target'
  | 'wrong_zone' | 'out_of_range' | 'in_sequence' | 'cooldown' | 'budget' | 'protected_path';
```
Rules: max 2 actions per reply. Angel never targets an entity on the critical path (`critical: true`) or flagged `angelProtected`. Only entities declaring the matching capability are valid (`angelFlicker`, `angelUnlock`, `angelReveal`, `angelStir`, `angelSpawn`). Static content test: no `angelUnlock` door is required for main-path progress.

## Chat API
`POST /api/angel/chat`
```ts
// request
{ playerText: string /* <=300 chars */, snapshot: StateSnapshot, summary: string /* <=1500 chars */,
  recent: Array<{ role: 'player' | 'angel'; text: string }> /* <=10 */,
  actions: ActionDescriptor[], glitch?: 'malicious_suggestion' | 'unexpected_help' }
// response 200
{ speech: string /* <=400 chars */, tone: 'warm'|'wry'|'cold'|'urgent'|'playful',
  proposedActions?: ProposedAction[], sideQuestOffer?: { templateId: string; targetId: EntityId } }
// errors: { error: 'quota'|'auth'|'timeout'|'refused'|'invalid'|'rate_limited'|'budget_exhausted', fallback: 'classic' }
```
HTTP mapping: 200 ok, 400 invalid request, 401 not logged in, 429 rate_limited (retry after N s), 503 budget_exhausted or provider down. `refused` (provider safety refusal) returns 200 with `fallback: 'in_character'` so the client plays a stock Angel line and does not enter `degraded`.

## SaveFile v1
```ts
interface SaveFileV1 {
  version: 1; createdAt: string; updatedAt: string;
  preferredMode: Mode;
  checkpointId: string;
  player: { hp: number; magic: number; spellsUnlocked: SpellId[]; pos: [number, number, number]; yaw: number };
  quests: { main: Record<string, string>; side: Array<{ templateId: string; state: 'active'|'done'; targetId: EntityId }>; sideOffered: number };
  morality: { value: number /* -100..100 */; history: Array<{ at: number; delta: number; reason: string }> };
  world: Record<EntityId, Record<string, unknown>>;
  completedSequences: string[];
  finale: { anchorsRestored: EntityId[]; choice: 'none' | 'restore' | 'break' };
  angel: { summary: string; recent: Array<{ role: string; text: string }>; eventLog: GameEvent[]; glitchesUsed: number };
  settings?: never; // settings are stored separately, never in saves
}
```
Never include: API keys, provider config, cookies, session ids.

## Correctness properties (to be tested)
1. Morality always stays in [-100, 100] for any event sequence.
2. Any sequence of validated Angel actions leaves the good ending reachable.
3. save -> load -> save is idempotent and preserves all gameplay state.
4. Serialised saves never match key-like patterns (`sk-`, `AIza`, `Bearer `).
5. At most 2 side quests are ever offered, at most 1 active.
6. Rejected actions never mutate state.
7. Switching mode (including fallback) never changes quest, world or morality state.
8. The ending is a pure function of the final choice.