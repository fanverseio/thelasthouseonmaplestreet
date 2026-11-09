# Shared Contracts (v2)

Single source of truth for types shared by client, server and saves. Implement as zod schemas in `packages/shared`. IDs and flags must match `beat-sheet.md` and `level-manifest.md`.

## 1. Identifiers

```ts
type ZoneId =
  | "home"
  | "street"
  | "garden"
  | "hideout"
  | "house66"
  | "lane"
  | "grounds"
  | "interior"
  | "ritual";
type SceneId = "exterior" | "last_house";
type EntityId = string; // /^[a-z]+\.[a-z0-9_]+\.[a-z0-9_]+$/, max 64 chars
type EntityKind =
  | "door"
  | "gate"
  | "light"
  | "clue"
  | "pickup"
  | "socket"
  | "prop"
  | "enemy"
  | "npc"
  | "trigger"
  | "spawn"
  | "node"
  | "puzzle"
  | "rune"
  | "mirror"
  | "anchor"
  | "seal";
type Capability =
  | "interactable"
  | "inspectable"
  | "pickup"
  | "socket"
  | "angelFlicker"
  | "angelUnlock"
  | "angelReveal"
  | "angelStir"
  | "angelSummon";
type SpellId = "arcane_bolt" | "purify" | "ward";
type MoralityBand = "dark" | "neutral" | "kind";
type KnowledgeLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type CheckpointId =
  | "cp_home_start"
  | "cp_street"
  | "cp_intersection"
  | "cp_garden"
  | "cp_garden_after"
  | "cp_house66"
  | "cp_watcher"
  | "cp_lane"
  | "cp_grounds"
  | "cp_outbuilding"
  | "cp_interior"
  | "cp_ritual";
type SequenceId =
  | "seq1_empty_street"
  | "seq2_felix_streetlight"
  | "seq3_cursed_neighbour"
  | "seq4_gartner_confession"
  | "seq5_felix_mirror"
  | "seq6_two_keys"
  | "cin_felix_anchor"
  | "cin_ending_keeper"
  | "cin_ending_broken"
  | "atm_home_window"
  | "angel_intro";
type EncounterId =
  | "enc_street"
  | "enc_watcher"
  | "enc_approach"
  | "enc_interior"
  | "enc_ritual";
type PuzzleId =
  | "p1_drawer"
  | "p2_fuse"
  | "p3_padlock"
  | "p4_runes"
  | "p5_board"
  | "p6_anchors";
type ItemId = "drawer_key" | "fuse" | "fence_key" | "toy_rabbit" | "photo";
```

## 2. Progression flags

```ts
type ProgressFlag =
  // beat 1
  | "bed_seen"
  | "drawing_seen"
  | "drawer_key_taken"
  | "locket_taken"
  | "angel_awake"
  | "home_done"
  // beats 2-3
  | "seq1_done"
  | "seq2_done"
  | "spell_bolt"
  // optional street encounter
  | "enc_street_resolved"
  // beat 4
  | "seq3_started"
  | "spell_ward"
  | "spell_purify"
  | "briggs_purified"
  | "briggs_destroyed"
  | "walkie_found"
  | "seq3_done"
  // beat 5
  | "seq4_done"
  | "gartner_comforted"
  | "gartner_pressed"
  // beat 6
  | "fuse_taken"
  | "fuse_placed"
  | "watcher_started"
  | "watcher_purified"
  | "watcher_destroyed"
  | "fence_key_taken"
  | "lane_open"
  // beats 7-8
  | "enc_approach_resolved"
  | "padlock_open"
  | "seq5_done"
  | "runes_done"
  // beat 9
  | "enc_interior_resolved"
  | "board_solved"
  // beats 10-11
  | "seq6_done"
  | "ritual_active"
  | "anchor_north"
  | "anchor_east"
  | "anchor_west"
  | "felix3_done"
  | "anchors_all"
  // beat 12
  | "ending_keeper"
  | "ending_broken"
  | "game_finished"
  // optional lore
  | "journal_1"
  | "journal_2"
  | "journal_3"
  | "journal_4"
  | "journal_5";
```

Rules: the set only grows. Mutually exclusive pairs (`briggs_purified`/`briggs_destroyed`, `watcher_*`, `gartner_*`, `ending_*`) are validated. Only the progression system writes flags. The Angel can never write one.

Knowledge level from flags: `ritual_active` 6, `seq6_done` 5, `seq5_done` 4, `seq4_done` 3, `seq3_done` 2, `seq2_done` 1, `locket_taken` 0. Before `locket_taken` there is no Angel.

## 3. Modes and status

```ts
type Mode = "classic" | "ai";
interface ModeState {
  preferredMode: Mode; // saved
  activeMode: Mode; // runtime only
  aiStatus: "unavailable" | "ready" | "degraded" | "budget_exhausted";
}
```

| Server error                                                  | aiStatus         | Client behaviour                                                                |
| ------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------- |
| `not_configured`, `access_invalid`, `session_expired`, `auth` | unavailable      | Classic; in hosted mode the next locket open offers to re-enter the access code |
| `quota_exhausted`, `ceiling_reached`                          | budget_exhausted | Classic for the rest of the session; no retry                                   |
| `rate_limited`, `concurrency_limited`                         | ready            | Stock line this turn; retry after `retryAfterSec`                               |
| `timeout`, `provider_error`, network failure                  | degraded         | Classic; backoff retry 5 s, 15 s, 45 s, then every 2 min                        |
| `refused`                                                     | ready            | Stock in-character line; no state change                                        |
| `invalid` (unparseable after repair)                          | ready            | Speech-only stock line; actions ignored                                         |

## 4. Game events (feed the Angel's memory)

```ts
type GameEvent = { at: number } & (
  | { t: "flag"; flag: ProgressFlag }
  | { t: "clue_found"; id: EntityId }
  | { t: "met"; character: "felix" | "gartner" | "briggs" | "watcher" }
  | {
      t: "enemy_resolved";
      enemyId: EntityId;
      outcome: "purified" | "destroyed";
    }
  | { t: "spell_unlocked"; spell: SpellId }
  | { t: "puzzle_solved"; puzzle: PuzzleId }
  | { t: "angel_action"; type: AngelActionType; targetId?: EntityId }
  | {
      t: "side_quest";
      templateId: string;
      state: "offered" | "active" | "done" | "closed";
    }
  | { t: "player_died"; zone: ZoneId }
);
```

## 5. State snapshot (sent to the server; small; no secrets)

```ts
interface StateSnapshot {
  zone: ZoneId;
  beat: number; // 1..12
  objective: string;
  knowledgeLevel: KnowledgeLevel;
  flags: ProgressFlag[];
  cluesFound: EntityId[];
  moralityBand: MoralityBand;
  hp: number;
  magic: number;
  spellsUnlocked: SpellId[];
  carried: ItemId[];
  nearby: Array<{ id: EntityId; kind: EntityKind; capabilities: Capability[] }>; // max 12
  puzzle?: { id: PuzzleId; hintLevel: number };
  sideQuest: { active: string | null; offered: number };
  inEncounter: boolean;
}
```

## 6. Angel world actions (promoted from refinement)

```ts
type AngelActionType =
  | "flicker_lights"
  | "unlock_door"
  | "reveal_clue"
  | "restore_magic"
  | "stir_object"
  | "summon_minor_cursed";
type AngelWorldAction =
  | { type: "flicker_lights"; targetId: EntityId }
  | { type: "unlock_door"; targetId: EntityId }
  | { type: "reveal_clue"; targetId: EntityId }
  | { type: "restore_magic"; amount: number } // integer 1..25
  | { type: "stir_object"; targetId: EntityId }
  | { type: "summon_minor_cursed"; spawnId: EntityId };
interface ActionDescriptor {
  type: AngelActionType;
  validTargets: EntityId[];
  note: string;
}
type RejectionReason =
  | "schema_invalid"
  | "wrong_mode"
  | "target_not_found"
  | "target_kind_mismatch"
  | "capability_missing"
  | "entity_critical"
  | "zone_blocked"
  | "wrong_zone"
  | "out_of_range"
  | "scripted_lock"
  | "cooldown_active"
  | "budget_exhausted"
  | "cap_reached"
  | "amount_out_of_range"
  | "already_applied"
  | "story_safety_violation"
  | "internal_error";
interface ActionLedger {
  lastUsedSimTime: Partial<Record<AngelActionType, number>>;
  useCount: Partial<Record<AngelActionType, number>>;
  liveSummonedIds: EntityId[];
}
```

Wire shape from the LLM: `{ type: string; targetId?: string; params?: { amount?: number } }`, normalised into the union. Limits: `combat-tuning.md` section 8.

## 7. HTTP API

All JSON. Body limit 16 KB. Errors: `{ error: ErrorCode; fallback: 'classic' | 'in_character' | 'none'; retryAfterSec?: number }`.

```ts
type ErrorCode =
  | "bad_request"
  | "not_configured"
  | "access_invalid"
  | "session_expired"
  | "quota_exhausted"
  | "concurrency_limited"
  | "ceiling_reached"
  | "rate_limited"
  | "auth"
  | "quota"
  | "timeout"
  | "refused"
  | "invalid"
  | "provider_error"
  | "not_found";
```

### `GET /api/health`

200 `{ ok: true, version: string, mode: 'local' | 'hosted', uptimeSec: number }`

### `GET /api/config/status`

200 `{ mode: 'local' | 'hosted', aiAvailable: boolean, provider: { protocol: 'openai' | 'anthropic' | 'mock', model: string } | null, session: { active: boolean, expiresAt?: string, chatsRemaining?: number } }`
In hosted mode `provider` is `null` (the provider is not disclosed). Never includes keys or base URLs.

### `POST /api/access/redeem` (hosted only)

Request `{ code: string }` (8-64 chars). 200 sets the cookie `tlh_session` and returns `{ expiresAt: string, chatsRemaining: number }`.
Errors: 401 `access_invalid`, 429 `rate_limited`, 503 `not_configured` or `ceiling_reached`. In local mode: 404 `not_found`.

### `POST /api/config/llm` (local only)

Request `{ protocol: 'openai' | 'anthropic' | 'mock', baseUrl?: string /* https, or http://localhost */, model?: string, apiKey?: string }`. 200 `{ ok: true }`. The key is held in memory only and never echoed. Hosted mode: 404 `not_found`.

### `DELETE /api/config/llm` (local only)

200 `{ ok: true }`. Hosted mode: 404.

### `POST /api/angel/chat`

Request:

```ts
{ playerText: string /* 1..300 */, snapshot: StateSnapshot, summary: string /* <=1500 */,
  recent: Array<{ role: 'player' | 'angel'; text: string }> /* <=10, each <=400 */,
  actions: ActionDescriptor[], glitch?: 'malicious_suggestion' | 'unexpected_help',
  systemNote?: 'connection_restored' }
```

200 response:

```ts
{ speech: string /* <=400 */, tone: 'warm' | 'wry' | 'cold' | 'urgent' | 'playful',
  proposedActions?: Array<{ type: string; targetId?: string; params?: { amount?: number } }> /* <=2 */,
  sideQuestOffer?: { templateId: string; targetId: EntityId },
  usage: { chatsRemaining?: number } }
```

Errors: 400 `bad_request`; 401 `access_invalid` / `session_expired`; 429 `rate_limited` / `concurrency_limited` (with `retryAfterSec`); 503 `quota_exhausted` / `ceiling_reached` / `not_configured` / `provider_error`; 504 `timeout`. A provider refusal returns 200 with `{ error: 'refused', fallback: 'in_character' }` instead of the success body.

### `POST /api/angel/tts` (optional, `FEATURE_LIVE_TTS=true`)

Request `{ text: string /* <=400 */ }`. 200 `audio/mpeg`. Errors as chat, plus 404 `not_found` when the feature is off. Counted against `QUOTA_TTS_CHARS_PER_CODE`.

## 8. Save file

localStorage key `tlh.save`. Settings use `tlh.settings` (never in the save).

```ts
interface SaveFileV1 {
  version: 1;
  createdAt: string;
  updatedAt: string;
  finished: boolean; // true after the ending; hides Continue
  preferredMode: Mode;
  checkpointId: CheckpointId;
  progress: {
    flags: ProgressFlag[];
    morality: {
      value: number /* -100..100 */;
      history: Array<{ at: number; delta: number; reason: string }>;
    };
    carried: ItemId[]; // max 4
    puzzles: Partial<
      Record<
        PuzzleId,
        { solved: boolean; hintLevel: number; data: Record<string, unknown> }
      >
    >;
  };
  player: {
    hp: number;
    magic: number;
    spellsUnlocked: SpellId[];
    pos: [number, number, number];
    yaw: number;
  };
  world: Record<EntityId, Record<string, unknown>>; // doors, gates, lights, clues, enemies, anchors, sockets
  runtime?: RuntimeState; // optional, see below; saved as a plain record (z.record(z.string(), z.unknown()))
  angel: {
    summary: string;
    recent: Array<{ role: "player" | "angel"; text: string }>;
    eventLog: GameEvent[]; // capped at 200
    actionLedger: ActionLedger;
    sideQuests: Array<{
      templateId: string;
      targetId: EntityId;
      state: "active" | "done" | "closed";
    }>;
    sideQuestsOffered: number;
    glitchesUsed: number;
    simTime: number;
  };
}
```

Never included: API keys, base URLs, access codes, session cookies, provider settings.

### The `runtime` field

`runtime` is optional and holds the client world runtime's snapshot (`game/world-runtime.ts` `getState()`), written with every autosave and handed back to `restore()` on Continue. A save without it (older files) still loads: the runtime then starts fresh. Sequence progress is not saved; a loaded game restarts the active sequence from the last checkpoint. It is plain JSON, scrubbed like the rest of the save.

```ts
interface RuntimeState {
  simTime: number; // sim seconds since the game view started (drives every timer below)
  firedTriggers: string[]; // trigger volumes that already fired, plus `flag:<flag>` / `cond:<id>` rule keys
  scheduled: Array<{
    // delayed lines and tutorial prompts not yet due
    at: number; // sim time when due
    line?: string; // voice line id
    tut?: { textId: string; seconds: number };
  }>;
  hints: Record<string, { elapsed: number; fired: number; cancelled: boolean }>; // idle puzzle hint clocks, by hint id
  played: Record<string, number>; // Classic locket lines already played, by line id (count)
  subtitle: {
    // the subtitle on screen, if any
    lineId: string;
    speaker: string;
    text: string;
    until: number; // sim time when it hides
  } | null;
}
```n
Not in `runtime` (rebuilt after a load): the P6 anchor hint clock (45 s without anchor progress), encounter wind-up and stun timers, and the sequence runner. Encounter state lives in `world` (`enemy.*` entries: `state`, `engaged`, `outcome`).

## 9. Correctness properties (tested)

1. Morality stays in [-100, 100] for any event sequence.
2. Any sequence of validated Angel actions leaves the critical path and the good ending reachable.
3. Rejected Angel actions change no state.
4. save -> load -> save is identical and preserves all gameplay state.
5. A serialised save never matches key-like patterns (`sk-`, `xai-`, `AIza`, `Bearer `, a long hex or base64 secret).
6. At most 2 side quests are offered per run; at most 1 is active.
7. Mode changes and AI fallback never change flags, world state or morality.
8. The ending is a pure function of the final choice.
9. Every gate opens only from flags set on the critical path; no `angelUnlock` entity is critical.
10. Purify and destroy of each mini-boss lead to the same next critical-path flag.
11. The forced-control total for one playthrough is <= 180 s.
12. Hosted handlers reject any client-supplied base URL or key.
