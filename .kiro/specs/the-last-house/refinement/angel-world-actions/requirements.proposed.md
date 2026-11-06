# Requirements (proposed): Angel World Actions

Status: proposal produced by the Spec Implementation Refiner. Not merged into any authoritative spec.
Sources: PRD.md 5.3, 5.4, 4.6, 6, 9; ARCHITECTURE.md 4.4, 5.2, 6.3, 6.4, 6.6, 6.7, 8, 11; TASKS.md 5.8, 5.9, 5.10.
Items marked **(proposed)** are not in the source documents. Items marked **PA-n / OQ-n** are in `refinement-report.md`.

## 1. Scope

In scope: turning the LLM's `proposedActions` into validated, atomic, engine-executed world effects in AI mode.
Out of scope: dialogue content, server prompt design, side quests (ARCH 6.5), glitch scheduling (ARCH 6.6) except where they call this pipeline, TTS.

Glossary: **proposal** = an untrusted item from `proposedActions`. **Action** = a proposal that passed schema parsing. **Effect** = the state change produced by the shared world-effect functions. **Sim time** = fixed-timestep simulation seconds (does not advance while the locket, pause or a cutscene halts the simulation).

## 2. Functional requirements

### AWA-R1 Parse proposals into a typed union
Each proposal is parsed into the `AngelWorldAction` discriminated union (see design 3.1). Unknown fields are dropped. At most 2 proposals per response are considered, in order; extras are ignored.
- Given a response with 3 proposals, When it is handled, Then only the first 2 are evaluated.
- Given a proposal with `type: "force_ending"`, When parsed, Then it is dropped with reason `schema_invalid` and no state changes.
- Given a proposal `{type:"flicker_lights", targetId:"light.street.03", __proto__:{x:1}, extra:true}`, When parsed, Then the result contains only `type` and `targetId`.
- Given `targetId` is not a string, or longer than 64 chars, Then the proposal is dropped.

### AWA-R2 Mode gate
Actions are evaluated only when `mode === 'ai'`.
- Given `mode === 'classic'`, When a response containing valid actions reaches the dispatcher, Then no action is evaluated and no state changes. (Classic mode never calls the chat route; this is defence in depth.)

### AWA-R3 Whitelist
Only these types are valid: `flicker_lights`, `unlock_door`, `reveal_clue`, `restore_magic`, `stir_object`, `summon_minor_cursed` (PRD 5.3). Adding a type requires changing the union, the schema, the capability map and the tests together.

### AWA-R4 Target must exist
- Given `targetId` is not in `WorldRegistry`, Then reject with `target_not_found`.
- Given the target exists but its `kind` does not match the action (e.g. `unlock_door` on a `light`), Then reject with `target_kind_mismatch` **(proposed)**.

### AWA-R5 Capability must be declared
Each action requires a specific capability on the target entity (design 3.3). No capability, no effect.
- Given a door without `angelUnlock`, When `unlock_door` targets it, Then reject with `capability_missing`.

### AWA-R6 Critical entities are protected
- Given an entity with `critical: true`, When any action other than `flicker_lights` targets it, Then reject with `entity_critical` **(proposed tightening, OQ-2: ARCH 6.4 step 4 only protects critical entities from "destructive" types)**.
- No action type may remove, consume, or alter an item, quest state, flag, anchor, finale choice, morality value or ending. These effects must not exist in the effect API handed to the executor (AWA-R13).

### AWA-R7 Zone and range
- Given the player is not in the entity's zone, Then reject with `wrong_zone`.
- Given the capability declares a range and the player's distance exceeds it, Then reject with `out_of_range`.
- `restore_magic` and other targetless actions skip this check.

### AWA-R8 Scripted-sequence lock
- Given the `HorrorDirector` reports an active scripted sequence, or `phase` is `cutscene`, or the finale lock is on, When any action is evaluated, Then reject with `scripted_lock`. (The finale-lock window is undefined in the sources: OQ-6.)
- `summon_minor_cursed` additionally rejects in zones outside its allowed spawn zones (design 3.3).

### AWA-R9 Cooldowns and budgets
- Each type has a cooldown in sim time and a per-run use budget, defined in one typed config (design 3.4).
- `restore_magic` is capped at 25 per call and 1 per 90 s (ARCH 6.4 step 7). Other values are **proposed** defaults (PA-4).
- Given an amount above the cap, Then reject with `amount_out_of_range` (PA-5). Given a non-integer, NaN or non-positive amount, Then reject with `amount_out_of_range`.
- Given a cooldown is active, Then reject with `cooldown_active`. Given the run budget is spent, Then reject with `budget_exhausted`.
- `summon_minor_cursed`: at most 1 Angel-summoned enemy alive and a run total cap (PA-4). Reject with `cap_reached`.

### AWA-R10 Story-safety check
For every action that changes state (not `flicker_lights`), the pure function `isStoryPathSafe(stateAfterEffect, questGraph)` must return true: every remaining main-quest step is reachable and the good ending is reachable from the current checkpoint.
- Given an effect that makes the good ending unreachable, Then reject with `story_safety_violation` and leave state unchanged.
- `flicker_lights` and `stir_object` are classified cosmetic and skip the simulation but still pass all other checks.

### AWA-R11 Execution through shared effects
Accepted actions execute only through the world-effect functions that authored events also use (tech rule, ARCH 6.4 step 9). No Angel-specific mutation path exists.

### AWA-R12 Atomic rejection
- Given any rejection, Then the deep state of every Zustand store, the registry and the action ledger is identical to before the proposal (no partial writes, no cooldown consumed).
- The player still sees the Angel's speech. No error text mentions validation (PRD 5.3, ARCH 6.4).

### AWA-R13 Prohibited outcomes are unreachable
The executor receives a restricted `AngelEffectApi` containing only the six effect functions. It has no access to flags, quest, ending, morality, anchor or item-removal functions.
- Given an adversarial proposal in any form (see AWA-R1), Then no flag, quest state, ending, anchor or morality value changes.

### AWA-R14 Re-validate at apply time
Validation and effect application can be separated in time (the locket pauses the simulation). Checks 3 to 9 of the pipeline run again immediately before the effect is applied. If the re-check fails, the effect is dropped.
- Given an action validated while the locket is open and a scripted sequence begins before the effect applies, Then the effect is dropped (`scripted_lock`).

### AWA-R15 Ledger persistence
The action ledger (last-used sim time and use counts per type, count of live Angel-summoned enemies) is serialisable, stored in the save file, and restored on load (PA-3).
- Given `restore_magic` was used 30 s ago, When the game is saved and loaded, Then `restore_magic` is still on cooldown for about 60 s of sim time.

### AWA-R16 Mode switching and degradation
- Given the player switches Classic to AI or back, Then progress, world state and the ledger are preserved.
- Given `aiStatus` becomes `degraded` with effects queued but unapplied, Then those effects are discarded (PA-6) and no progress is lost.
- Given no AI access ever, Then the game remains completable to both endings (covered by headless Classic tests; this feature must not add a dependency on them).

### AWA-R17 Rejection diagnostics
Rejections are recorded as `{type, reason, atSimTime}` in a bounded in-memory ring buffer (size 50, proposed) for tests and debugging. It is not saved and does not include player text or any key-like value. Applied actions are appended to `AngelMemory.eventLog` as typed `GameEvent`s so the Angel knows what it did.

## 3. Non-functional requirements

| ID | Requirement |
| -- | ----------- |
| AWA-N1 | Validator and story-safety check are pure functions with no React, Three or store imports (tech rule). Time is passed in as a parameter. |
| AWA-N2 | Evaluating 2 proposals does not clone full stores and allocates no per-frame work. Target (proposed): under 1 ms on a mid-range desktop. Verified by a benchmark-style test with a generous threshold, not by a hard CI gate. |
| AWA-N3 | No secrets: no key-like value appears in the ledger, the debug buffer or logs. |
| AWA-N4 | Strict TypeScript, exhaustive `switch` over the action union (`never` check). |
| AWA-N5 | All numeric limits live in one typed config, not scattered literals. |
| AWA-N6 | Action IDs in content follow `kind.zone.name`, lowercase. |

## 4. Test obligations (what must exist; no test files exist yet)

| Area | Cases |
| ---- | ----- |
| Happy path | One accepted action per type; each runs through the shared effect function; ledger updated |
| Invalid input | Wrong type, missing/extra/oversized fields, NaN/Infinity/negative amount, prototype keys, 3+ proposals |
| Per-check rejection | One test per `RejectionReason`, each asserting zero state change |
| Edge | Exactly at range boundary; exactly at cooldown expiry; budget used up on last allowed call; two proposals where the first consumes the budget the second needs |
| Failure and recovery | AI loss with queued effects; recovery re-primes and works |
| Save/load | Ledger round trip; cooldown survives load; save blob contains no key-like data |
| Integration | Mocked provider returns a mix of valid and hostile proposals; only valid ones apply; three distinct action types demonstrated (PRD 9) |
| Adversarial / property | Prompt-injection strings in `speech` and `playerText`; seeded random sequences of actions never make the good ending unreachable (ARCH 11) |
| Regression risks | Renaming a capability; adding a quest gate door without `critical`; changing cooldown config |
