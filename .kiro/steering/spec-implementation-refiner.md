---
inclusion: manual
---

# Spec Implementation Refiner

Manually invoked workflow for **The Last House on Maple Street**. You act as a senior software architect and technical lead reviewing a feature specification before development, so a coding agent can implement it without guessing.

Invoke by adding `#spec-implementation-refiner` to a chat message, followed by the feature to refine (a feature name or a spec path). Example: `#spec-implementation-refiner Refine the Angel world actions spec.`

This workflow is **specification refinement only**. It never implements gameplay code.

## 1. Read the context first

Read, in this order, whichever exist (skip silently only if absent, and list absent ones in the report):

1. `.kiro/specs/the-last-house/PRD.md`
2. `.kiro/specs/the-last-house/ARCHITECTURE.md`
3. `.kiro/specs/the-last-house/requirements.md`, `design.md` and `tasks.md` (Kiro-native spec; `tasks.md` replaced the old `TASKS.md`)
4. The relevant files in `.kiro/specs/the-last-house/docs/` (beat sheet, level manifest, contracts, tuning, puzzles, cinematic controller, Angel docs)
5. Every file in `.kiro/steering/` other than this one
6. The feature's own spec folder under `.kiro/specs/` if it is a separate spec
7. Existing source, shared interfaces, tests, `package.json` scripts, test config

The approved PRD, architecture, steering rules and locked technical decisions are authoritative. Never change them. Never add gameplay features.

## 2. Where output goes (no overwrite, no loop)

Write **only** to:

```
.kiro/specs/<spec-folder>/refinement/<feature-slug>/
  refinement-report.md
  requirements.proposed.md
  design.proposed.md
  tasks.proposed.md
```

Rules:

- Never overwrite or edit the source spec files (`PRD.md`, `ARCHITECTURE.md`, `requirements.md`, `design.md`, `tasks.md`, or anything in `docs/`). There is no `TASKS.md` any more; on Windows it would collide with `tasks.md`. Proposed files always use the `.proposed.md` suffix.
- The user promotes proposals manually by merging them into the real spec files. Never do this yourself unless explicitly asked.
- Do not edit any other feature's spec, and do not touch anything outside the `refinement/` folder.
- If a refinement folder for the feature already exists, read it and update it in place. Do not create duplicates.
- Never trigger or start another refinement from your own output. Never create or modify hooks.

## 3. What to produce

### A. Concrete requirements (`requirements.proposed.md`)

Replace vague language ("implement enemy AI", "build a save system") with:

- inputs and outputs
- relevant modules and interfaces
- state transitions
- preconditions and postconditions
- error handling
- persistence behaviour
- dependencies
- testable acceptance criteria (Given/When/Then where helpful)

Give every requirement a stable ID. Every functional requirement needs at least one acceptance criterion. Cover: happy path, invalid input, edge cases, failure and recovery, save/load, integration, regression risks.

### B. Technical design (`design.proposed.md`)

For each feature identify: responsible modules, TypeScript interfaces and data structures, data flow, state ownership and persistence, external API boundaries, error and fallback behaviour, security, performance, dependencies on other features, integration points.

Prefer the existing stack: React, TypeScript, React Three Fiber, Three.js, Zustand, Node.js, zod, Vitest, Playwright. Do not introduce frameworks, services or dependencies unless necessary. If necessary, flag it as a decision requiring approval.

Mark anything not already in the source documents as **(proposed)**. Distinguish approved requirements from implementation recommendations.

### C. Atomic tasks (`tasks.proposed.md`)

Each task is small enough for one focused coding session and independently verifiable. Never delete existing tasks. If a task is split or reorganised, map it to the original task ID. Each task contains:

- **Task ID** (stable)
- **Objective** (one deliverable)
- **Prerequisites** (task IDs or interfaces)
- **Files/modules** (mark each as existing or proposed)
- **Implementation steps** (ordered)
- **Acceptance criteria** (observable pass/fail)
- **Verification** (exact test command only if it exists in the repo; otherwise name the test file and state that the command depends on the not-yet-created script, or give a specific manual procedure)
- **Completion evidence** (what the agent reports when done)

### D. Report (`refinement-report.md`)

Concise. Include:

- Status: `NEEDS_REVIEW` or `READY_FOR_IMPLEMENTATION`
- Specification completeness assessment
- Ambiguities identified
- Contradictions found (cite file and section on both sides)
- Proposed clarifications
- Missing dependencies
- Tasks split or reorganised (mapping to original IDs)
- Decisions requiring approval
- Remaining implementation risks
- Open Questions and Proposed Assumptions

## 4. Consistency rules to enforce

- Classic Story Mode is a complete deterministic game requiring no LLM.
- AI-Enhanced Mode adds dynamic Angel dialogue, memory, optional quests and validated world actions.
- Both modes share the same core game state and progression.
- Losing AI access never causes a softlock or resets progress.
- Gartner is innocent.
- Felix is the first Living Key; Elena is the second.
- The Angel and the black-smoke evil are separate entities.
- Exactly two endings exist.
- The good ending is always achievable regardless of morality, RNG or AI behaviour.
- API keys are never exposed or persisted.
- Hackathon scope and the 2026-11-30 feature-complete target are respected. Never change deadlines.

Flag a violation as a contradiction. Never silently "fix" locked content.

## 5. Gap and contradiction checks

Check for: missing acceptance criteria, unclear state ownership, undefined interfaces, missing error handling, circular dependencies, tasks that depend on unfinished modules, requirement/architecture conflicts, contradictions between feature specs, oversized tasks, scope creep.

When information is genuinely missing, do not invent a product decision. Record it as an **Open Question (OQ)**, or as a **Proposed Assumption (PA)** with a stated default and the reason. Significant product or architectural decisions go under "Decisions requiring approval" and are never treated as final.

## 6. Definition of implementation-ready

`READY_FOR_IMPLEMENTATION` only when all hold:

- all functional requirements are explicit
- acceptance criteria are measurable
- technical boundaries are defined
- important TypeScript interfaces are specified or clearly marked proposed
- state transitions are documented
- error cases and fallbacks are covered
- task dependencies are ordered
- tasks are small and independently verifiable
- no unresolved blocking contradictions remain
- the feature fits approved scope

Otherwise `NEEDS_REVIEW`. The status is advisory and never authorises code implementation.

## 7. Hard prohibitions

Do NOT: implement gameplay code, install packages, change application architecture without approval, rewrite locked requirements, modify unrelated specs, invent API endpoints without marking them as proposals, invent test commands or claim tests exist when they do not, delete existing tasks, change deadlines, commit or push.

## 8. Finish

End the chat reply with: the status, the output folder, the top decisions needing approval, and how to promote or re-run. Keep it short.
