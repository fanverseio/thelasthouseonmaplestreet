# Refinement Report: Angel World Actions

> **PROMOTED (2026-11-06, spec v2).** The author approved all defaults in section 7 and the proposed assumptions in section 8. They are now part of the real specs: `requirements.md` (requirement 12), `design.md`, `ARCHITECTURE.md` 6.4, `docs/contracts.md` 6 and `docs/combat-tuning.md` 8. Open questions resolved: OQ-3 ranges 15 m (zone-wide for flicker and summon); OQ-4 effects apply after the locket closes, re-validated; OQ-6 the finale lock runs from `ritual_active` to the end; OQ-7 the locket follows the per-sequence policy in `docs/beat-sheet.md`; OQ-9 Angel-summoned enemies change no morality, spawn only in `street` and `lane`. The tasks AWA-01..AWA-14 map to `tasks.md` section 7 (tasks 7.8-7.19). This folder is kept as history; the real specs win on any difference.

**Status: PROMOTED** (was NEEDS_REVIEW)
Scope: PRD 5.3 plus ARCHITECTURE 6.4, with TASKS 5.8, 5.9, 5.10. Test run of the Spec Implementation Refiner.
Inputs read: PRD.md, ARCHITECTURE.md, TASKS.md, steering rules (tech, structure, product, canon). Not present: any source code, `package.json`, tests, or per-feature `requirements.md`/`design.md`/`tasks.md` (the spec folder uses PRD/ARCHITECTURE/TASKS names).
Outputs: `requirements.proposed.md`, `design.proposed.md`, `tasks.proposed.md` in this folder. No authoritative file was edited.

## 1. Completeness assessment

| Dimension               | Rating  | Note                                                                                                                        |
| ----------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| Intent and prohibitions | Strong  | PRD 5.3 and ARCH 6.4 are clear and consistent on what must never happen.                                                    |
| Interfaces              | Partial | Wire shape exists (ARCH 6.3). No typed action union, no result/rejection type, no validation context. Proposed in design 3. |
| State ownership         | Partial | Cooldown/budget state has no owner or persistence (ARCH 4.4 lists only "glitch cooldowns"; ARCH 8 `SaveFile` has none).     |
| Error handling          | Partial | "Drop silently" is defined. Exceptions, timing and re-validation are not.                                                   |
| Testability             | Partial | ARCH 11 names test areas, but acceptance criteria with measurable numbers are missing. Proposed in requirements.            |
| Task granularity        | Weak    | TASKS 5.8 bundles 9 checks plus executor; 5.9 bundles six actions; 5.10 bundles simulation, adversarial and property tests. |
| Dependencies            | Weak    | Required shared effect functions and context queries have no tasks (see section 5).                                         |

## 2. Ambiguities

1. Range: "within range (if range-limited)" with no range values or rule for which capabilities are range-limited (OQ-3).
2. "Finale-lock window" (ARCH 6.4 step 6) appears nowhere else (OQ-6).
3. Whether the player can open the locket (T) during a scripted sequence (PRD 4.1 allows T generally; PRD 5.3 forbids actions in sequences). If allowed, the Angel can speak but not act. Unspecified (OQ-7).
4. When an accepted effect is applied relative to the locket being open: immediately, or after it closes (OQ-4).
5. Budget numbers: only `restore_magic` has numbers (ARCH 6.4 step 7). "Per-playthrough budget" is otherwise undefined (PA-4).
6. `restore_magic(amount)` over the cap: reject or clamp (PA-5).

## 3. Contradictions and gaps between documents

| #   | Sources                                    | Finding                                                                                                                                                                                                                                                                                                                                                                         | Severity              |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| C1  | PRD 5.3 vs ARCH 5.2/6.4                    | PRD says doors "flagged `angelUnlockable`"; ARCH uses capability `angelUnlock`. Same concept, two names.                                                                                                                                                                                                                                                                        | Low                   |
| C2  | PRD 5.3 prohibitions vs ARCH 6.4 step 4    | PRD forbids skipping required quests and bypassing the seal puzzle. ARCH step 4 protects `critical` entities only from "destructive" types. `unlock_door` or `reveal_clue` on a critical entity is not destructive, so a quest gate could be opened by the Angel. Check 8 (simulation) is the only remaining guard and depends on how well the quest graph models entity state. | **High**              |
| C3  | ARCH 6.6                                   | Glitches "still go through the validator" but also "apply an authored glitch effect" (e.g. false warning text). Unclear whether the latter bypasses validation.                                                                                                                                                                                                                 | Medium                |
| C4  | TASKS 5.8 vs ARCH 6.4 step 9               | 5.8 requires "shared world-effect functions", but no task creates them. TASKS 3.4 builds the horror runner, not the effect library.                                                                                                                                                                                                                                             | **High** (blocks 5.8) |
| C5  | ARCH 6.4 step 7 vs ARCH 4.4/8              | Cooldowns and budgets are required, but no store field or save field holds them. Without persistence a reload resets them.                                                                                                                                                                                                                                                      | Medium                |
| C6  | ARCH 6.3 vs requirements for typed actions | Wire `params: Record<string, number\|string>` is loosely typed. Not a contradiction; closed by the normaliser (design 3.1).                                                                                                                                                                                                                                                     | Low                   |
| C7  | TASKS 5.8 / 5.9 order                      | 5.8 asks for "all 9 checks" before any action exists (5.9). Checks 3 to 7 cannot be tested without capabilities and effects.                                                                                                                                                                                                                                                    | Medium                |

No violation of canon (Gartner, Felix/Elena, Angel vs smoke, two endings) was found; this feature does not touch story content.

## 4. Proposed clarifications

- Use `angelUnlock` as the single capability name; treat "angelUnlockable" as prose (PA-1).
- Extend critical-entity protection to every action except `flicker_lights` (OQ-2).
- State that glitch effects that change world state must use this dispatcher (OQ-5).
- Re-validate checks 3 to 9 at apply time (AWA-R14).

## 5. Missing dependencies

| Missing                                   | Needed by     | Proposed task                                               |
| ----------------------------------------- | ------------- | ----------------------------------------------------------- |
| Shared world-effect module                | 5.8, 5.9      | AWA-04, AWA-05                                              |
| Action ledger store and save field        | 5.8 (check 7) | AWA-06                                                      |
| Scripted-lock and context queries         | 5.8 (check 6) | AWA-07 (depends on 3.4)                                     |
| Capability and range metadata on entities | 5.8           | AWA-02                                                      |
| Typed config for limits                   | 5.8           | AWA-03                                                      |
| Quest-graph reachability API              | 5.10          | AWA-09 needs 3.1 and 3.14 to expose a pure `QuestGraphView` |

## 6. Tasks split or reorganised

| Original (TASKS.md, unchanged)                            | Proposed                                                               |
| --------------------------------------------------------- | ---------------------------------------------------------------------- |
| 5.8 Action validator pipeline + executor                  | AWA-01, 02, 03, 06, 07, 08, 09 (check 8), 10                           |
| 5.9 Initial actions                                       | AWA-04, 05, 11 (stir/summon behind a config switch, cut-list friendly) |
| 5.10 Story-safety simulation + adversarial/property tests | AWA-09, 12, 13                                                         |
| 5.15 Integration test (partly)                            | AWA-14                                                                 |

Nothing deleted. 14 proposed tasks replace 3 oversized ones; new prerequisites are AWA-02, 03, 04, 06, 07.

Scheduling note: TASKS Phase 5 is Nov 18 to 26 and depends on Phase 3 reaching M1 on Nov 20. AWA-09, 12, 13 need the quest graph and content validation (3.1, 3.14). AWA-01 to 08 can start earlier, after Phase 1. Starting them before Nov 20 relieves the Nov 22 to 26 crunch. No deadline was changed.

## 7. Decisions requiring approval

| ID   | Decision                                                                               | Default if no answer           |
| ---- | -------------------------------------------------------------------------------------- | ------------------------------ |
| OQ-2 | Tighten critical-entity protection beyond "destructive" types (C2).                    | Adopt (safer).                 |
| PA-1 | Capability naming (`angelUnlock`, plus new `angelReveal`, `angelStir`, `angelSummon`). | Adopt.                         |
| PA-3 | Persist the action ledger in the save file (v1).                                       | Adopt.                         |
| PA-4 | Budget and cooldown defaults (design 3.4).                                             | Adopt, tunable.                |
| OQ-5 | Glitch effects that change world state go through the dispatcher.                      | Adopt.                         |
| OQ-8 | A new `fast-check` dependency for property tests.                                      | Do not add; use a seeded loop. |

## 8. Open Questions and Proposed Assumptions

**Open Questions**

- OQ-1: none (merged into PA-1).
- OQ-3: Range per capability, in metres.
- OQ-4: Apply effects while the locket is open, or when it closes? Design assumes queued and applied on the next simulation tick after resume, with re-validation.
- OQ-6: Definition and source of the "finale-lock window".
- OQ-7: Whether T is allowed during scripted sequences and cutscenes.
- OQ-9: `summon_minor_cursed` enemy type, spawn IDs, morality effect if the player purifies a summoned enemy (could be farmed to shift the Angel's persona; low risk because morality never affects the ending).

**Proposed Assumptions**

- PA-2: Cooldowns use simulation time, so they do not advance while the locket is open.
- PA-5: Over-cap `restore_magic` is rejected (consistent with "drop silently"), not clamped.
- PA-6: Pending effects are discarded when `aiStatus` becomes `degraded`.
- PA-7: Rejections go to a bounded in-memory ring buffer, not the save and not the player.

## 9. Remaining implementation risks

1. Story-safety simulation fidelity depends on the quest graph; mitigated by C2 tightening and the seeded test.
2. Content mistakes: a quest-gate entity not marked `critical`. Mitigation: content validation should assert every entity referenced by a main-quest step or finale is `critical` (add to TASKS 3.14).
3. Timing between validate and apply (mitigated by AWA-R14).
4. Schedule compression in Nov 22 to 26 if work starts only after M1.
5. All verification commands assume the tech-rule convention (`vitest --run`). No `package.json` exists yet, so none could be executed or confirmed in this run.

## 10. Test of this workflow

- Safe: only the four files above and the steering file were created. No source, package, hook or existing spec file was modified.
- No command was run beyond reading files, since there is no code or test setup to verify against.
