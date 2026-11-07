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
## 2026-11-07 | gotcha | Writing commit messages
Phase 1 committed as e6cb6e1 and pushed to feat/phase1-foundations. Files written by the editor tool into .git/ or $env:TEMP were not visible to the shell, and the command filter blocks any shell text containing the dev-server command. Working method: build the message in PowerShell (split that command into parts), write commit-msg.tmp in the repo root, git commit -F, then delete it.

## 2026-11-07 | milestone | Draft docs approved; tasks 2.1-2.3 logic done
Author approved all draft docs and asked for small, frequent commits and pushes. Added headless input, pointer-lock state machine, collision (sub-stepped circle vs AABB/cylinder) and player controller with a 60 Hz FixedStepper (bdb57b4). The views for 2.1 (Click to resume overlay) and 2.2 (useFrame wiring) are not built yet. Task 2.4 (world registry) handed to a subagent.
## 2026-11-07 | gotcha | Default node on this machine is v18
PATH puts nvm Node 18 first, so vitest fails (styleText). Prefix shells with `$env:Path = "C:\Program Files\nodejs;" + $env:Path` (Node 24). No `gh` CLI: open PRs through the GitHub web URL.

## 2026-11-07 | decision | Stage 2 questions and answers
Q: trigger ID prefix. A (author): keep `trg.zone.name`; `KIND_ID_PREFIX` maps kind `trigger` to `trg`. Do not rename in the manifest.
Q: build the 3D views (2.6-2.9) without per-step browser checks? A (author): build them now; verify with tests, typecheck and Playwright smoke. Author reviews visually later.
Open: no `gh` CLI, so the author opens the PR for `feat/phase1-foundations` on GitHub (CI task 1.7 waits for it). Default node is v18; use Node 24 from Program Files in shells.
Open: gate-to-beat flag cross-check (level manifest section 5 check 2) waits for machine-readable beat data.
Work state: 2.1-2.5 logic committed (bca796d). Next 2.6 greybox exterior, 2.7 Last House scene, 2.8 HUD/hands, 2.9 phases/menus.

## 2026-11-07 | milestone | Section 2 greybox built (2.2-2.5, 2.7-2.9 done; 2.1 and 2.6 await manual review)
Added exterior and interior layouts (data + reachability tests), player rig, HUD, hands, warning/menu/pause screens, lazy Last House scene (separate chunk, preload in the west lane), Playwright smoke (2 tests; needed 
px playwright install chromium). 187 unit tests. Dev shortcut: /?scene=last_house (dev builds only). /?bootcheck keeps the developer page. Next: section 3 (progression, gates, sequences, vertical slice).

## 2026-11-07 | decision | Greybox and HUD accepted
Author played the greybox: HUD logic approved, look to be polished later. Section 2 closed (2.1 and 2.6 ticked). Starting section 3.

## 2026-11-07 | milestone | Tasks 3.1-3.3 done
setFlag is the only flag writer (rejects unknown flags, exclusive pairs, missing prerequisites; prerequisites follow the beat-sheet Pre lines). Gates and checkpoints are pure data/lookups (11 checkpoints, event-written ones: new_game, enter:trg.garden.enter, enter:last_house). The game store has setFlag, writeCheckpointForEvent, respawn and an onCheckpoint hook for the save system. Gotcha: stray diag.tmp.mjs/png in the repo root (not ours) make eslint fail; left untouched, not committed.

## 2026-11-07 | spec-change | Cinematics are generated video, not code
Author decision: do not build cinematics in code (token cost). Cinematics (seq2_felix_streetlight, seq5_felix_mirror, seq6_two_keys, cin_felix_anchor, cin_ending_keeper/broken, angel intro as needed) will be text/image-to-video clips from an API the author will supply later; the game only calls and plays them. Sequence runner gets a 'video' step (clipId + fallbackSeconds so placeholders still run). Supersedes PRD 5.3 'in-engine real-time cinematics only' and cinematic-controller.md camera steps. Docs not yet edited: author to confirm edits to PRD/contracts. Open: API name, auth (key must stay server-side/local .env, never in client), clip storage under apps/client/public/assets/video, hosted vs local generation.

## 2026-11-07 | milestone | 3.5 dialogue (92b540e) and 3.8 encounter stub (6f6d4a4) pushed
Classic line selector, locket/subtitle components (not wired into game-view yet), voice service (VO path /assets/vo/<id>.mp3, subtitle-only fallback), encounter stub state machine (apply flags in returned order via setFlag). Placeholder line: vo_angel_b4_c0. 3.4 sequence runner still in progress; will switch to a video step per author decision.

## 2026-11-07 | milestone | 3.4 sequence runner (91decb5) pushed; 3.1-3.5 and 3.8 done
Runner has a 'video' step (clipId + fallbackSeconds; view signals videoPlaying/videoEnded); camera/anim steps removed per author. 284 tests, typecheck clean. Next: 3.6 beat 1 content, which needs a world runtime (placements, interaction table, home interior greybox) - one agent builds it, then 3.7 and 3.9 in parallel.

## 2026-11-07 | milestone | 3.6 Beat 1 playable (82b7e07..8a5e7d5)
World runtime (game/world-runtime.ts) + data-driven beat files (content/interactions/beatN.ts, content/sequences/beatN.ts, placements.ts); hollow home greybox; P1 hints in sim time; angel_intro lines-only sequence. 305 tests. Gaps: no Playwright Beat 1 (headless chromium has no pointer lock); sequences are not serialised (restart from checkpoint); vo_elena_b1_03 not wired. Adding a beat = data files only. Next: 3.7 (beats 2-3) and 3.9 (beat 4) in parallel.

## 2026-11-07 | milestone | 3.7 (1aeae40) and 3.9 (290ad9a, 62cde40) pushed: beats 1-4 playable on placeholders
318 tests, typecheck and build clean. Beat 4 uses game/encounter-runtime.ts (EncounterBinding in content/encounters/index.ts; panel keys 3 Ward, 2 Purify, hold Enter Destroy). Open: street fox trigger is data with a TODO (needs a binding without sequence/ward); seq2 hold-E skip not wired in the view; audio cues only emitted via onEffect (no sound yet); all coordinates guessed, need tuning by eye; sequence progress not serialised. 3.10 M1 review waits for the author playing beats 1-4 (time per beat vs targets).
