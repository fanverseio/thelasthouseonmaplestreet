# Development Log (append-only)

One entry per significant event: a decision, a milestone, a resolved gotcha, a spec change, or a failed approach worth remembering. Newest at the bottom. Keep each entry to 2-5 lines. No secrets, keys, codes or personal data. Curated highlights are promoted into `MEMORY.md`.

Entry format:
`## YYYY-MM-DD HH:MM | type | short title` then lines for what happened, why, and any follow-up. Types: decision, milestone, gotcha, spec-change, failed-approach, handoff.

## 2026-11-06 | milestone | Spec v2 merged
Rewrote PRD, architecture, steering, Kiro-native requirements/design/tasks, creative drafts and the agent-friendly README. Merged to `main` as fa7c50e. No code written. Follow-up: author review of draft docs, then start tasks.md section 1.

## 2026-11-06 | decision | Memory is plain markdown in the repo
Did not install claude-mem: Kiro is not a listed supported agent and its installer needs an interactive sign-in and writes outside the repo. Use `.kiro/memory/` plus a steering rule and a hook instead. Compatible with claude-mem if the author installs it later.
## 2026-11-06 | handoff | Checkpoint: specs done, awaiting author approval
State: main = fa7c50e (spec v2). Memory files, memory steering and record-dev-memory hook exist but are uncommitted. No app code, no package.json.
Agreed design (all in specs): ~28.5 min path; 12 beats; encounters = street fox (skippable), Briggs mini-boss, Watcher of House 66 mini-boss, approach hounds, interior cat, final ritual. Persistent stun at ~30% HP; purify (+) or held-bolt destroy (-); both drop the progression item. Spells: Bolt after Seq 2, Ward at Briggs' first telegraphed attack, Purify at his stun. Felix 3rd appearance at first anchor (15-20 s).
Next: author approves draft docs (beat sheet, level manifest, puzzles, tuning, persona, side quests, scripts, asset manifest) and the @gltf-transform/cli dependency; then start tasks.md section 1. API keys are not needed until AI work (~Nov 18) and voice generation (~Nov 15).
Open: ElevenLabs/image-tool licence terms; padlock code 1966 and board word KEEPER; Seq 4 dialogue excluded from forced-control budget.
## 2026-11-07 | milestone | Phase 1 foundations done (uncommitted)
tasks.md 1.1-1.6 and 1.8 done on branch feat/phase1-foundations; 1.7 (CI) waits for a green PR run. typecheck, lint, 121 tests, check, build and e2e all pass. `npm run dev` serves a boot-check page; the game is not playable yet. Follow-up: commit, open a PR so CI runs, then start tasks.md section 2.

## 2026-11-07 | gotcha | Toolchain constraints found in Phase 1
TypeScript pinned to 6.0.3: typescript-eslint 8.72.1 rejects TS 7 (ERESOLVE). TS 6 defaults `types` to [], so each tsconfig lists its types. Node >=22.18 is required: the server runs .ts via built-in type stripping (no build step; imports need .ts extensions, no enums). packages/shared has no Node types on purpose (it runs in the browser); Node-only tests go in apps/server.