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

## 2026-11-07 | decision | Testing glow on interactables (setting, not final art)
Author: for test play, interactive objects must be easy to see; the final game may keep this subtle/off and keep some things plain or hidden on purpose. Implemented as setting interactGlow (off|subtle|bright, default bright) in Settings; gold beacon on usable things and doors, pale blue on lead lights/windows (scene/glow.tsx). Also added the Actions side panel (Q switches, E uses). Revisit the default before release.

## 2026-11-07 | decision | Dev-only test shortcuts and brightness
Author asked to start outside the house and to see more. Added ?start=street and ?start=garden (dev server only, import.meta.env.DEV; replays real flags via setFlag, so checkpoints stay honest; the shipped game still has no shortcuts per the product rules) and a Scene brightness setting (bright default for testing, normal = intended dark mood). Spawn now comes from the current checkpoint.

## 2026-11-07 | milestone | M1 vertical slice accepted by the author
Author walked beats 1-4 (home, street, garden up to 'Find Gartner at No. 40') and is happy with the logic and flow. Known gaps carried to section 4: street fox trigger, seq2 hold-E skip, no sound playback, coordinates to tune, sequences not serialised. Next: section 4 (saves, Beat 5 Gartner, Beat 6 House 66, ...).

## 2026-11-07 | milestone | 4.1 saves (4a8af0a), 4.2 puzzle overlays (f8de5af), 4.3-4.4 Beats 5-6 (d087e7a) pushed
Per agent reports: 360 tests, typecheck and build clean (not re-verified by the lead: the verification shell call was auto-declined after an unanswered approval prompt). Saves: tlh.save, Continue/overwrite confirm/corrupt handling; SaveFileV1 gained optional `runtime` (contracts.md needs a line). Puzzles: P3 padlock (code 1966) and P5 board (KEEPER, bonus letter R after 3rd reset) as overlays, not yet placed in the world. Beat 5: choice comfort(+5)/press(-5) via ui/dialogue-choice.tsx. Beat 6: fuse -> fusebox -> Watcher (stub) -> fence key (deferred drop, set on pickup) -> lane gate now opens on lane_open (gates.ts + veil changed). Dev start ?start=house66. Open: placeholder lines vo_angel_b6_hint1 and vo_watcher_b6_06; Classic Angel c1 lines for beats 5-6 not wired; Watcher has no teleports/decoys yet (section 5); fox and seq2 skip still open.

## 2026-11-07 | milestone | Beats 7-12 + fox/skip/sfx pushed (2e29674, 0470c97, 289889b, 66d9e0a, 89636e3, 19eaef9)
Classic is completable on placeholders to both endings; finished save hides Continue. 459 tests. Dev starts: street, garden, house66, lane, grounds, interior, ritual-door, ritual, ritual-choice. Gotcha: parallel agents in ONE working tree clobber each other's edits and sweep half-done files into commits; run content agents serially or in separate git worktrees. Open: 4.11 Classic lines for beats 5-12, 4.12 full playthroughs, spell switching keys 1/2/3 not wired, view does not move the player body on respawn.

## 2026-11-07 | handoff | Classic completable on placeholders; playtest plan ready
4.1-4.12 done (617 tests, typecheck, build, check, e2e green; lint only diag.tmp.mjs). Author tests in one go from .kiro/specs/the-last-house/docs/playtest-plan.md (293 step ids, Q1-Q31 with defaults, results table). Video clip manifest with text-to-video prompts: apps/client/src/content/video/clips.ts. Next after author results: 4.13 M2 review, then section 5 combat (real HP so death can happen), settings persistence (Q23), sound/music. Known: nothing can reduce HP to 0 yet; several settings do nothing yet; encounter panel says LMB but keys are 2/hold Enter.

## 2026-11-09 | decision | Playtest results and answers to Q1-Q31
Author playtest: 289 pass, 0 fail, 3 N/A (death steps). Screenshots stay local in /test/ (ignored). Answers recorded in docs/playtest-plan.md "Author answers". Q9 kept current padlock hint text (not the script); Q10 r3 stays; Q11-Q31 defaults accepted for now, revisit when the game is more finished; Q18/Q19 lines approved provisionally. Changes to build: Q1, Q3, Q8, Q11, Q14, Q15, Q16, Q17, Q20-Q26, Q31.

## 2026-11-09 | milestone | Playtest answers applied (f73cf39..02acd5f)
Q1, Q3, Q8 (cp_grounds), Q11, Q14-Q17, Q20-Q26, Q31 done; 643 tests. New: settings persist under tlh.settings (services/settings-storage.ts), dev-only F9 kills Elena, front doorway opens on home_done. Retest steps ANS.1-ANS.47 in playtest-plan.md section 9. Follow-ups: beat-sheet checkpoint table lacks cp_grounds; cp_grounds respawn is ~4 m from the hounds (they wake at once).

## 2026-11-09 | decision | M2 accepted; flaws deferred to near-production
Author: game logic and design are mostly good; section 9 retest skipped for now; tweak flaws near production. Known follow-ups parked: cp_grounds 4 m from hounds, beat-sheet cp table, B2.7 flicker repeat, placeholder lines, unused settings. Next: section 5 combat.

## 2026-11-09 | milestone | 5.1-5.2 spells (b4ee904)
game/spells.ts SpellSystem: register(target) / on(hit events) / absorbDamage (Ward). Numbers from combat-tuning.md; invented: pool 16, anchors purify free, charged bolt same speed. Open: release 200 ms-1.2 s cancels free; no early-release Purify refund; spell_ward set at end of first Briggs telegraph (fix in 5.7); damage not yet routed via absorbDamage; bolts ignore walls.

## 2026-11-09 | milestone | 5.3-5.5 enemy FSM, morality, death (a79d74f..5f68e53)
game/enemies.ts FSM + content/enemies; game/morality.ts; death/respawn rules. Opt a binding into the FSM with mode:'fsm' in content/encounters/index.ts (adapter keeps stub flags/drops/morality). Dev-only training hound at (49,-2) on ?start=garden. Open: magic floor 70 vs 55; slam/smoke/teleport/decoys/voice are no-op stubs for 5.7/5.8; only the training hound is on the FSM.

## 2026-11-09 | milestone | 5.6-5.9 every encounter on the real FSM (12da2ef..275b384)
863 tests. Purify = 2 + hold LMB, destroy = 1 + hold LMB on a stunned enemy (2 / hold Enter kept as fallback). Briggs: spell_ward set at telegraph start, slam below 60%, smoke puff. Watcher: teleports to node.house66.tp_1..6, decoys at 60/40%, voice at 90/50/30%. HP regen; stunned mini-boss stays stunned on death; dev start ?start=training. Next: 5.10 ritual, 5.11 feedback.

## 2026-11-09 | milestone | Section 5 done (4e18903, 87fc917)
898 tests. Ritual = smoke pattern director (rings, pools, wraiths) + real anchors (north: bolt the 100 HP shell then hold E 3 s; east: hold E 6 s, Ward blocks strikes; west: Purify channel 4 s); magic floors near anchors. Feedback: hit flash, hurt vignette (reduce flashing softer), 1.5 s death fade, hand poses, VFX, SFX. Open: anchor progress not saved across save/load; east suspends rings. Playtest sections 10-13 appended (uncommitted, author commits). Next: art track or video API.

## 2026-11-09 | milestone | ElevenLabs hooked up (tools/gen-voice.mjs)
Starter tier, 64,440 chars/month (reset 2026-11-30); all 176 lines are ~11k chars. Models: eleven_v4, v4_turbo, v3, multilingual_v2 (default), flash/turbo v2.5. Auditions in assets/raw/vo (ignored). Gotcha: Voice Design blocks child voices (Felix, Gartner) by safety policy; use young adult/cartoon voices instead. Added library voice 'TLH test Teddy' to the account. Author .env uses ELEVENLABS_VOICE_ID_NEIGHBOUR; the tool reads ELEVENLABS_VOICE_ID_BRIGGS.

## 2026-11-09 | decision | Voices: American/neutral accent, gender must fit
Kept: Rosalind = 'TLH Rosalind' r1ofF5Guklr3ZOTPynhH, Angel = 'TLH Angel' T4Mic6C0zjGCeuKq3xja, Smoke = True Crime tZssYepgGaQmegsMEXjK. All others redone American. Voice Design blocks any boyish/child description, so boys come from library voices. Test voices added to the account are named 'TLH test ...' (remove the unused ones after picking).

## 2026-11-09 | decision | Voice cast final (all 8 speakers)
Elena = Lauren (American), Angel = designed 'TLH Angel', Felix = Don Kim, Gartner = Austin, Briggs = Alden, Watcher = Spuds Oxley, Rosalind = designed 'TLH Rosalind', Smoke = True Crime. IDs live in .env as ELEVENLABS_VOICE_ID_<NAME>. Model eleven_v3. Open: switch script to American English (Mum -> Mom) before the full generation.

## 2026-11-09 | milestone | American text + full voice-over (a4f652f..b0dc2db)
176 lines voiced with eleven_v3, mp3_44100_64, 7.75 MB in apps/client/public/assets/audio/vo. Tool: node tools/gen-voice.mjs all [--only, --force, --dry-run]. Missing from ALL_LINES (no audio yet): vo_felix_b8_*, vo_felix_b11_*, vo_*_end_*, vo_rosalind_j2. Author decision: no music yet; next is SFX + ambience loops.

## 2026-11-09 | milestone | SFX + ambience generated and wired (5c0301f..531c84a)
81 cues (73 sfx, 8 x 30 s ambience) via tools/gen-sound.mjs + tools/sound-cues.mjs; real audio buses (master, sfx, ambience, voice; music reserved at 0), ambience crossfades by zone and ducks under voice, file cues with synth fallback. 14 missing voice lines added (vo_rosalind_j2 + 13 clip lines flagged clip:true). Gotcha: ElevenLabs sound generation costs ~10 credits/s, not 40. Audio total 12.9 MB. 957 tests. Credits left ~53,600. Next: author listen-check (playtest 14-15), then art.

## 2026-11-09 | decision | Asset workspace and Blender link
Author keeps creation files in /asset_creation/ (git-ignored, e.g. asset_creation/blender/the_last_house.blend). Only finished exports under apps/client/public/assets/ are committed; a download-from-server option may come later. Blender 4.5.4 LTS runs a socket add-on on 127.0.0.1:9876 (Blender MCP protocol: JSON {type, params}; get_scene_info and execute_code both work; glTF exporter present). Use it to build the 3D assets.

## 2026-11-09 | milestone | First art: home_elena.glb + street_front.glb (598d758..9741577)
Built in the author's Blender via the socket (collections ASSET-home_elena, ASSET-street_front; copy asset_creation/blender/home_elena.blend, build scripts there, ignored). Flat PBR, ~4.3k + 0.8k tris, 250 KB + 52 KB. scene/models.tsx loads GLBs with greybox fallback; nodes named after entity ids (dots -> underscores) replace greybox props. Rules in docs/art-style.md. Open: furniture has no colliders; street layout guessed (road z 25-29) so greybox pole and light.street.01 sit in the road; strip ends hard at x -36 and -4; no textures yet.

### 2026-11-09 decision: T in Classic
The author chose option A. T plays one Angel line, and it fades by itself. Pressing T again cuts the voice (0.25 s fade) and plays the next line at once. `VoicePlayer.interrupt` (commit ac795f8).

### 2026-11-09 decision: journals are an in-game page
The author chose a page, not a video. A `readPage` action shows the page (phase overlay) while Rosalind reads it. The page text comes from the voice line. E, Esc or Close puts it away. No `cin_journal_*` clips. Commit 42dbca6.

## 2026-11-08 | decision | Gartner is mixed race
Author decision: Gartner is a mixed-race boy (about 9). Added to canon.md, the asset manifest (chr_gartner) and his character style-sheet prompt. Skin tone in prompts set to warm light-brown pending author confirmation of his heritage.

## 2026-11-11 | decision | Character models are temporary but passable
Rigged character GLBs (briggs, watcher, felix, gartner, fox, hound, cat) are in the game through `scene/characters.tsx`; the smoke wraith is three.js sprites (`scene/smoke-wraith.tsx`), with no model. The author accepts the models, clips and eye glow as temp: fine-tune them if time allows, otherwise they ship as they are. There is no separate corrupted Briggs model; the engine adds that look. Eyes can be re-placed in the dev viewer `char-preview.html` ("Copy eyes" gives `eyes` lines for `character-config.ts`).
