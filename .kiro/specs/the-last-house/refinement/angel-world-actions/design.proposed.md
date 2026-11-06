# Design (proposed): Angel World Actions

Status: proposal. Everything here is **(proposed)** unless it cites the PRD or ARCHITECTURE. Authoritative decisions stay in ARCHITECTURE.md 6.4 and the Key Decisions Log. Do not duplicate them; this document refines them.

## 1. Responsibilities and modules

| Module (path, all proposed unless noted) | Responsibility |
| ---------------------------------------- | -------------- |
| `packages/shared/src/angel-actions.ts` | zod wire schema, `AngelWorldAction` union, `RejectionReason`, constants. Used by client, server prompt builder and tests. |
| `apps/client/src/content/world/` (existing location, per ARCH 2) | Entity data including capabilities, `critical`, optional `angelRange`. |
| `apps/client/src/game/angel/action-config.ts` | Cooldowns, budgets, caps, ranges (AWA-N5). |
| `apps/client/src/game/angel/action-validator.ts` | Pure `validateAngelAction`. Checks 1 to 8. |
| `apps/client/src/game/angel/story-safety.ts` | Pure `isStoryPathSafe`. Depends on the QuestSystem graph. |
| `apps/client/src/game/world-effects.ts` | Shared effect functions used by authored events and the Angel. |
| `apps/client/src/game/angel/action-dispatcher.ts` | Takes untrusted proposals, validates, queues, re-validates and applies. |
| `apps/client/src/store/angel-store.ts` (existing slice, ARCH 4.4) | Adds `actionLedger`. |
| `AngelDirector` (existing, ARCH 4.2) | Calls the dispatcher with each chat response. No validation logic of its own. |

Game logic stays in `game/` with no React or Three imports (tech rule). R3F components only render the resulting state.

## 2. Data flow

```
POST /api/angel/chat -> AngelResponse (zod, server) -> zod re-parse (client)
  -> AngelDirector: speech -> canon filter -> locket transcript   (always shown)
  -> AngelDirector: proposedActions (unknown[]) -> dispatcher
        for each of first 2:
          parse -> validate (checks 1-8, pure, reads snapshot)
            ok  -> queue PendingEffect
            no  -> ring buffer entry, nothing else
  -> sim tick (World Effects stage, ARCH 4.1):
        for each PendingEffect: re-validate -> apply via world-effects -> ledger update -> eventLog
```

Rejection never throws to the player. A thrown exception inside the dispatcher is caught, logged to the ring buffer as `internal_error`, and treated as a rejection.

## 3. Interfaces (proposed)

### 3.1 Action union and wire schema

ARCH 6.3's wire shape `{ type; targetId?; params? }` stays. The dispatcher normalises it into a typed union so downstream code never touches `params`.

```ts
export const ANGEL_ACTION_TYPES = [
  "flicker_lights", "unlock_door", "reveal_clue",
  "restore_magic", "stir_object", "summon_minor_cursed",
] as const;
export type AngelActionType = (typeof ANGEL_ACTION_TYPES)[number];

export type AngelWorldAction =
  | { type: "flicker_lights"; targetId: EntityId }
  | { type: "unlock_door"; targetId: EntityId }
  | { type: "reveal_clue"; targetId: EntityId }
  | { type: "restore_magic"; amount: number }
  | { type: "stir_object"; targetId: EntityId }
  | { type: "summon_minor_cursed"; spawnId: EntityId };
```

Parsing uses a zod `discriminatedUnion` on `type` with `.strict()` or an explicit strip so unknown keys are removed. `amount` is `z.number().int().min(1).max(25)`.

### 3.2 Validation

```ts
export type RejectionReason =
  | "schema_invalid" | "wrong_mode" | "target_not_found" | "target_kind_mismatch"
  | "capability_missing" | "entity_critical" | "wrong_zone" | "out_of_range"
  | "scripted_lock" | "cooldown_active" | "budget_exhausted" | "cap_reached"
  | "amount_out_of_range" | "already_applied" | "story_safety_violation" | "internal_error";

export interface ValidationContext {
  mode: "classic" | "ai";
  simTime: number;                       // seconds, fixed-step
  registry: ReadonlyWorldRegistry;
  player: { zone: ZoneId; position: Vec3; magic: number; maxMagic: number };
  scriptedLockActive: boolean;           // sequence | cutscene | finale lock
  ledger: Readonly<ActionLedger>;
  questGraph: QuestGraphView;
  config: AngelActionConfig;
}

export type ValidationResult =
  | { ok: true; action: AngelWorldAction; effect: PendingEffect }
  | { ok: false; reason: RejectionReason };

export function validateAngelAction(raw: unknown, ctx: ValidationContext): ValidationResult;
```

`validateAngelAction` must not mutate `ctx`. A second proposal in the same response is validated against a ledger that already includes the first (the dispatcher passes an updated read-only ledger copy).

### 3.3 Capability and kind map

| Action | Target kind | Capability (PA-1) | Range | Extra rules |
| ------ | ----------- | ----------------- | ----- | ----------- |
| `flicker_lights` | `light` | `angelFlicker` | zone only | Allowed on critical lights (cosmetic). |
| `unlock_door` | `door` | `angelUnlock` | OQ-3 | Door must be locked. Not `critical` (OQ-2). |
| `reveal_clue` | `clue` | `angelReveal` | OQ-3 | Clue must be unrevealed. Not `critical` (OQ-2). |
| `restore_magic` | none | none | none | `amount` in 1..25. Result clamped to `maxMagic`. If already full, reject `already_applied`. |
| `stir_object` | `prop` | `angelStir` | OQ-3 | Cosmetic only. |
| `summon_minor_cursed` | `spawn` | `angelSummon` | zone | Spawn zone allowed list. Cap on live summoned. Not in `last_house_interior`. |

Capability names `angelFlicker` and `angelUnlock` come from ARCH 5.2 and 6.4. `angelReveal`, `angelStir`, `angelSummon` are proposed. PRD 5.3 says doors "flagged `angelUnlockable`": treated as the same declaration (PA-1).

### 3.4 Config

```ts
export interface AngelActionConfig {
  maxProposalsPerResponse: 2;
  perType: Record<AngelActionType, {
    cooldownSec: number;      // sim time
    maxPerRun: number;
    rangeM?: number;
  }>;
  restoreMagic: { maxAmount: 25; cooldownSec: 90 };   // ARCH 6.4 step 7
  summon: { maxAlive: 1; allowedZones: ZoneId[] };
}
```

Proposed defaults, all tunable and awaiting approval (PA-4): flicker 10 s / 20 per run; unlock_door 30 s / 3; reveal_clue 60 s / 3; stir_object 20 s / 6; summon_minor_cursed 120 s / 2.

### 3.5 Ledger and persistence

```ts
export interface ActionLedger {
  lastUsedSimTime: Partial<Record<AngelActionType, number>>;
  useCount: Partial<Record<AngelActionType, number>>;
  liveSummonedIds: EntityId[];
}
```

Owner: `angelStore.actionLedger`, mutated only by store actions called from the dispatcher. Saved under `SaveFile.angel` as an addition to `AngelMemory` **(proposed)**. Because save schema v1 is not yet implemented (TASKS 4.2), the field can be included in v1 without a migration (PA-3).

### 3.6 Effects and the restricted API

```ts
export interface AngelEffectApi {
  flickerLights(id: EntityId): void;
  unlockDoor(id: EntityId): void;
  revealClue(id: EntityId): void;
  restoreMagic(amount: number): void;
  stirObject(id: EntityId): void;
  spawnMinorCursed(spawnId: EntityId): void;
}
```

The full `WorldEffects` module may expose more (used by authored content), but the executor is given only this subset. Tests assert the executor's imports and parameter types expose nothing else.

## 4. State transitions

Per proposal: `received -> parsed | dropped -> validated | rejected -> queued -> revalidated | dropped -> applied`. Only `applied` writes state: world entity state via `worldStore`, magic via `playerStore`, ledger via `angelStore`, event via `eventLog`. `summon_minor_cursed` registers a new enemy through `EnemySystem` using the existing enemy FSM (ARCH 4.3), and records its ID in `liveSummonedIds`; the ID is removed when the enemy is purified or destroyed.

## 5. Error and fallback behaviour

| Failure | Behaviour |
| ------- | --------- |
| Response fails zod | Speech-only fallback (ARCH 6.3). No dispatcher call. |
| Proposal fails parse or any check | Dropped silently; speech still shown. |
| Exception in validator or effect | Caught; treated as rejection; no partial state. Effect functions must apply atomically (compute then commit). |
| AI becomes degraded with pending effects | Discard pending effects (PA-6). |
| Save loaded mid-queue | Pending effects are not saved. Only the ledger is. |

## 6. Security

- Authority lives only in the validator (ARCH 6.7). Client-side validation is acceptable because the game is single-player and local state is the player's own.
- Untrusted strings are never interpolated into code, selectors, regexes or log format strings. IDs are compared by exact lookup in the registry.
- Reject IDs that are not own-properties of the registry map (guards `__proto__`, `constructor`).
- Ring buffer entries contain action type and reason code only.
- No API key or request body is available to this module.

## 7. Performance

Pure checks over small data. No per-frame work except draining the (usually empty) pending queue in the World Effects stage. `isStoryPathSafe` must not deep-clone stores: it takes a minimal view (completed events, quest step, relevant entity states) and a function that applies the effect to a copy of that view.

## 8. Integration points and dependencies

- `WorldRegistry` (TASKS 1.3), `QuestSystem` graph (3.1), `HorrorDirector` lock query (3.4), `EnemySystem` (2.3), zod shared schemas (0.5), stores (0.4), save schema (4.2), `AngelDirector` (5.6), `/api/angel/chat` response schema (5.5).
- Glitches (ARCH 6.6): any glitch that causes a world change must call this dispatcher, not the effect functions directly. "Authored glitch effects" such as false warning text change no world state and bypass it; this must be confirmed (OQ-5).

## 9. Risks to the design

- The story-safety simulation is only as strong as the quest graph's modelling of entity state. If a gate depends on an entity state the graph does not model, the check passes wrongly. Mitigation: AWA-R6 (critical entities untouchable) as the primary defence, simulation as defence in depth, plus the property test.
- Cooldowns in sim time stop while the locket is open. Intentional, but means chatting does not "recharge" abilities (PA-2).
