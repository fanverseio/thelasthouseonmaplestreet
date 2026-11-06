# Tasks (proposed): Angel World Actions

Status: proposal. Replaces nothing. Original TASKS.md items 5.8, 5.9 and 5.10 are kept as-is; the tasks below split them and add missing prerequisites. Mapping is in `refinement-report.md`.

Verification convention: the tech steering rule says to run Vitest with `vitest --run` (never watch mode). The repository has no `package.json` or test scripts yet (created by TASKS 0.1), so each "Verification" names the test file and the invocation `vitest --run <test file>`; confirm the exact script name once 0.1 lands. All file paths are **proposed** unless stated.

Order: AWA-01 -> 02 -> 03 -> 04 -> 05 -> 06 -> 07 -> 08 -> 09 -> 10 -> 11 -> 12 -> 13 -> 14. Tasks 02, 03 and 04 can run in either order after 01.

---

## AWA-01 Shared action schema and union
- **Objective:** `AngelWorldAction` union, wire schema, normaliser, `RejectionReason` in the shared package.
- **Prerequisites:** TASKS 0.1, 0.5.
- **Files:** `packages/shared/src/angel-actions.ts` (proposed), `packages/shared/src/angel-actions.test.ts` (proposed).
- **Steps:** 1. Define the union and constants (design 3.1). 2. Build the zod wire schema matching ARCH 6.3 (`type`, `targetId?`, `params?`) with `proposedActions` max 2. 3. Implement `parseProposal(raw: unknown)` returning the union or `schema_invalid`; strip unknown keys; reject IDs over 64 chars and the keys `__proto__`, `constructor`. 4. Export types to client and server.
- **Acceptance:** AWA-R1, AWA-R3 cases pass: valid per type; unknown type; extra keys stripped; amount 0, 26, 1.5, NaN, Infinity; 3 proposals truncated to 2.
- **Verification:** `vitest --run packages/shared/src/angel-actions.test.ts`; `tsc --noEmit` in `packages/shared`.
- **Completion evidence:** test summary, list of exported symbols.

## AWA-02 Entity capability and range metadata
- **Objective:** World content declares Angel capabilities and optional range; startup validation rejects unknown capability names.
- **Prerequisites:** AWA-01, TASKS 1.3.
- **Files:** `apps/client/src/game/world-registry.ts` (existing per TASKS 1.3, edit), `apps/client/src/content/world/*.ts` (proposed content), registry validation test.
- **Steps:** 1. Add the Angel capability names to the `Capability` type (design 3.3). 2. Add optional `angelRange` to `WorldEntity`. 3. Registry validation fails startup if a capability string is unknown or an Angel capability is on the wrong `kind`. 4. Add one example entity per kind in a test fixture.
- **Acceptance:** Invalid capability or kind pairing throws a descriptive error naming the entity ID. Entity IDs match `kind.zone.name`.
- **Verification:** `vitest --run apps/client/src/game/world-registry.test.ts`.
- **Completion evidence:** test summary; one example of the validation error text.

## AWA-03 Action config
- **Objective:** Single typed config for cooldowns, budgets, caps, ranges.
- **Prerequisites:** AWA-01. Approval of PA-4 values (or keep as defaults).
- **Files:** `apps/client/src/game/angel/action-config.ts`, `action-config.test.ts`.
- **Steps:** 1. Implement `AngelActionConfig` (design 3.4) with proposed defaults. 2. Export a frozen default. 3. Test that `restoreMagic` equals 25 per call and 90 s (ARCH 6.4).
- **Acceptance:** Every action type has an entry (exhaustiveness test); values are positive; config is frozen.
- **Verification:** `vitest --run apps/client/src/game/angel/action-config.test.ts`.
- **Completion evidence:** the final defaults table.

## AWA-04 Shared world-effect functions (new; not in TASKS.md)
- **Objective:** Effect functions for flicker, stir, unlock door, reveal clue, used by both authored events and the Angel.
- **Prerequisites:** TASKS 0.4, 1.3.
- **Files:** `apps/client/src/game/world-effects.ts` (proposed), `world-effects.test.ts`.
- **Steps:** 1. Implement each function as compute-then-commit against `worldStore` actions. 2. No-ops on missing entity return a result object, they do not throw. 3. Make idempotence explicit: unlocking an unlocked door returns `already_applied`.
- **Acceptance:** Each function changes only the target entity's state; state is JSON-serialisable; repeated calls are safe.
- **Verification:** `vitest --run apps/client/src/game/world-effects.test.ts`.
- **Completion evidence:** test summary.

## AWA-05 Magic restore and minor-cursed spawn effects
- **Objective:** `restoreMagic` and `spawnMinorCursed` effects.
- **Prerequisites:** AWA-04, TASKS 2.1 (magic), 2.3 (enemy FSM).
- **Files:** `world-effects.ts`, `world-effects.test.ts`.
- **Steps:** 1. `restoreMagic` clamps to `maxMagic`. 2. `spawnMinorCursed` registers an enemy via `EnemySystem` at a registered spawn ID and returns its entity ID. 3. Mark spawn as the **cut-list** part (TASKS cut list item 3); `restoreMagic` is not cut-list.
- **Acceptance:** Magic never exceeds max; spawned enemy follows the existing FSM; no spawn on an unregistered ID.
- **Verification:** `vitest --run apps/client/src/game/world-effects.test.ts`.
- **Completion evidence:** test summary.

## AWA-06 Action ledger in angelStore and save schema
- **Objective:** Persisted cooldown and budget state.
- **Prerequisites:** TASKS 0.4, 4.2 (or edit the v1 schema if 4.2 is in progress), AWA-01.
- **Files:** `apps/client/src/store/angel-store.ts` (existing slice), shared save schema (proposed field `angel.actionLedger`), tests.
- **Steps:** 1. Add `actionLedger` and store actions `recordApplied`, `registerSummoned`, `unregisterSummoned`. 2. Add to the zod save schema. 3. Test round trip.
- **Acceptance:** AWA-R15 passes; ledger contains numbers and ID strings only; a save blob test (TASKS 4.5) finds no key-like data.
- **Verification:** `vitest --run` on the store test and the save round-trip test.
- **Completion evidence:** before/after save blob excerpt (no secrets).

## AWA-07 Context queries for the validator
- **Objective:** Read-only queries for scripted lock, player zone and distance.
- **Prerequisites:** TASKS 1.5 (phases), 3.4 (HorrorDirector). If 3.4 is not done, ship an interface plus a test double and a TODO linked to 3.4.
- **Files:** `apps/client/src/game/angel/validation-context.ts`, test.
- **Steps:** 1. `buildValidationContext(stores, systems)` returns the `ValidationContext` snapshot. 2. `scriptedLockActive` = sequence active OR phase `cutscene` OR finale lock. 3. Document the finale-lock source after OQ-6 is answered.
- **Acceptance:** Context object is frozen; building it does not mutate stores.
- **Verification:** `vitest --run apps/client/src/game/angel/validation-context.test.ts`.
- **Completion evidence:** test summary.

## AWA-08 Validator checks 1 to 7 (split from TASKS 5.8)
- **Objective:** Pure `validateAngelAction` covering mode, whitelist, target, kind, capability, critical, zone, range, scripted lock, cooldown, budget, caps.
- **Prerequisites:** AWA-01, 02, 03, 06, 07.
- **Files:** `apps/client/src/game/angel/action-validator.ts`, `action-validator.test.ts`.
- **Steps:** 1. Implement checks in the order of design 2. 2. Return the first failing `RejectionReason`. 3. Table-driven tests: one row per reason plus boundary rows. 4. Test that `ctx` is deep-equal before and after.
- **Acceptance:** AWA-R2 to R9, AWA-R12 (no mutation), AWA-N1, AWA-N4.
- **Verification:** `vitest --run apps/client/src/game/angel/action-validator.test.ts`.
- **Completion evidence:** coverage of every `RejectionReason` by name.

## AWA-09 Story-safety check (split from TASKS 5.10)
- **Objective:** `isStoryPathSafe` and its integration in the validator as check 8.
- **Prerequisites:** AWA-08, TASKS 3.1, 3.14.
- **Files:** `apps/client/src/game/angel/story-safety.ts`, test.
- **Steps:** 1. Implement against `QuestGraphView` with a minimal state view. 2. Cosmetic actions skip it. 3. Fixture graph with a gate door; verify `unlock_door` on it is rejected by AWA-R6 first and, with the `critical` flag removed in the fixture, by this check.
- **Acceptance:** AWA-R10; a fixture effect that strands the good ending is rejected with `story_safety_violation`.
- **Verification:** `vitest --run apps/client/src/game/angel/story-safety.test.ts`.
- **Completion evidence:** the fixture graph and both rejection paths.

## AWA-10 Dispatcher and executor (split from TASKS 5.8)
- **Objective:** Queue, re-validate at apply, execute via `AngelEffectApi`, update ledger and eventLog.
- **Prerequisites:** AWA-04, 05, 06, 08, 09.
- **Files:** `apps/client/src/game/angel/action-dispatcher.ts`, test.
- **Steps:** 1. `dispatchProposals(raw: unknown, deps)` handles at most 2. 2. Queue `PendingEffect`s. 3. `drainPending(simTime)` re-validates and applies. 4. Catch exceptions as `internal_error`. 5. Write ring buffer entries. 6. Append applied actions to `eventLog`. 7. Discard queue on `aiStatus === 'degraded'`.
- **Acceptance:** AWA-R11 to R14, R16, R17. The executor's `AngelEffectApi` type is the only effect access (compile-time test).
- **Verification:** `vitest --run apps/client/src/game/angel/action-dispatcher.test.ts`.
- **Completion evidence:** test summary including the re-validation case.

## AWA-11 AngelDirector integration (maps to TASKS 5.9 wiring)
- **Objective:** Chat response handling calls the dispatcher; initial four actions work end to end.
- **Prerequisites:** AWA-10, TASKS 5.5, 5.6.
- **Files:** `apps/client/src/game/angel/angel-director.ts` (existing per TASKS 5.6, edit), test.
- **Steps:** 1. After the canon filter, pass `proposedActions` to the dispatcher. 2. Enable `flicker_lights`, `unlock_door`, `reveal_clue`, `restore_magic` first. 3. Enable `stir_object` and `summon_minor_cursed` behind a config switch (cut-list friendly).
- **Acceptance:** Speech is shown even when all actions are rejected. Classic mode never reaches the dispatcher.
- **Verification:** `vitest --run apps/client/src/game/angel/angel-director.test.ts` with a mocked provider.
- **Completion evidence:** test summary.

## AWA-12 Adversarial and injection tests (split from TASKS 5.10, overlaps 5.13)
- **Objective:** Prove hostile input cannot cause a prohibited outcome.
- **Prerequisites:** AWA-11.
- **Files:** `apps/client/src/game/angel/action-adversarial.test.ts`.
- **Steps:** 1. Corpus: injection strings in `playerText` and `speech`; proposals for `force_ending`, `set_flag`, `delete_item`, `skip_quest`, `restore_magic` with huge amounts; prototype-pollution keys; 100 proposals in one response. 2. For each, snapshot all stores before and after. 3. Assert only whitelisted, valid effects differ.
- **Acceptance:** PRD 9: hostile input cannot trigger a prohibited action. Flags, quest state, ending, anchors, morality, items are unchanged in every case.
- **Verification:** `vitest --run apps/client/src/game/angel/action-adversarial.test.ts`.
- **Completion evidence:** corpus size and pass count.

## AWA-13 Seeded randomised reachability test (split from TASKS 5.10)
- **Objective:** Random sequences of actions never make the good ending unreachable.
- **Prerequisites:** AWA-09, AWA-11, TASKS 3.14.
- **Files:** `apps/client/src/game/angel/action-property.test.ts`.
- **Steps:** 1. Seeded PRNG loop (no new dependency; adding `fast-check` would be a new dependency and needs approval). 2. Random valid and invalid proposals across checkpoints. 3. After each step assert both main-path and good-ending reachability.
- **Acceptance:** At least 1,000 seeded runs pass; seed printed on failure for replay.
- **Verification:** `vitest --run apps/client/src/game/angel/action-property.test.ts`.
- **Completion evidence:** seed list and run count.

## AWA-14 Integration and demonstration of three actions
- **Objective:** Meet PRD 9: at least three distinct validated world actions demonstrated.
- **Prerequisites:** AWA-11, TASKS 5.15.
- **Files:** `apps/client/src/game/angel/angel-actions.integration.test.ts`; manual checklist.
- **Steps:** 1. Mocked provider returns valid actions for three types plus hostile ones. 2. Assert only the valid ones apply. 3. Include AI loss and recovery mid-queue. 4. Manual procedure: in an AI-mode build, ask the Angel to flicker a nearby streetlight, reveal an unrevealed non-critical clue, and restore magic; confirm each, then confirm a refusal request (for example "end the game") produces speech but no effect.
- **Acceptance:** Automated test green; manual procedure recorded with pass/fail per step.
- **Verification:** `vitest --run apps/client/src/game/angel/angel-actions.integration.test.ts`; manual steps above.
- **Completion evidence:** test summary and the completed manual checklist.
