# Requirements Document

## Introduction
The Last House on Maple Street is a first-person 3D psychological horror game for desktop browsers, built for Kiroween 2026 (Costume Contest). A first playthrough takes about 25-30 minutes. It ships two modes over one world: a fully authored Classic Story Mode and an AI-Enhanced Mode in which an LLM-driven Angel converses, remembers and proposes validated world actions. The product source is `PRD.md`; system design is `design.md` and `ARCHITECTURE.md`; detail is in `docs/`.

Reference documents:
#[[file:.kiro/specs/the-last-house/PRD.md]]
#[[file:.kiro/specs/the-last-house/docs/beat-sheet.md]]
#[[file:.kiro/specs/the-last-house/docs/contracts.md]]

## Glossary
- **Game**: the client application in the browser.
- **Server**: the shared request handlers, run as Vercel Functions (hosted) or a local Node server (local).
- **Flag**: a progression flag from `docs/contracts.md` section 2. The only representation of progress.
- **Gate**: a door, veil or gate that opens only from flags.
- **Checkpoint**: a respawn and autosave point from `docs/beat-sheet.md`.
- **Sequence**: an authored, runner-driven event (horror sequence, cinematic, atmosphere event).
- **Forced control**: time with control `limited` or `locked` during a cinematic.
- **Purifiable enemy**: an enemy that enters a persistent stun at its stun threshold.
- **Angel**: the being in the locket. **Classic Angel**: authored lines only. **AI Angel**: LLM-generated replies.
- **Proposal**: an untrusted world action from an LLM response. **Validator**: the client-side checks that accept or reject proposals.
- **Critical entity**: an entity on the critical path; it rejects every Angel action except `flicker_lights`.
- **Access code**: a private code from the Devpost form that unlocks hosted AI.
- **BYOK**: bring your own key (local build only).

## Requirements

### Requirement 1: Single start and authored critical path
**User Story:** As a player, I want one clear story path from Elena's home to the final choice, so that every playthrough tells the complete story.
#### Acceptance Criteria
1. WHEN a new game starts THE Game SHALL place the player at `spawn.home.start` with no flags set and write checkpoint `cp_home_start`.
2. THE Game SHALL NOT offer chapter select, judge start, alternative start points or shortcuts.
3. THE Game SHALL represent all progress as flags from `docs/contracts.md`, and the flag set SHALL only grow.
4. WHEN a flag listed as a gate condition in `docs/level-manifest.md` is set THE Game SHALL open that gate within one simulation tick.
5. THE Game SHALL complete each beat on an interaction or objective, and SHALL NOT complete any beat on a timer alone.
6. WHEN a checkpoint condition in `docs/beat-sheet.md` is met THE Game SHALL write that checkpoint and autosave.
7. THE Game SHALL map quests as: The Search = beats 1-3, The Truth = beats 4-8, The Last House = beats 9-12, and SHALL show the current objective on the HUD.
8. WHILE playing in either mode THE Game SHALL use the same flags, gates and checkpoints.

### Requirement 2: Elena's home and the locket
**User Story:** As a player, I want an interactive opening that sets up the mystery and introduces the Angel, so that I am drawn in within the first minutes.
#### Acceptance Criteria
1. WHEN the player enters `trg.home.bedroom` THE Game SHALL set `bed_seen` and play Elena's opening lines.
2. WHEN the player inspects `clue.home.drawing` THE Game SHALL set `drawing_seen`.
3. WHEN the player uses `pickup.home.drawer_key` on `socket.home.drawer` THE Game SHALL consume the key and set `locket_taken`.
4. WHEN `locket_taken` is set THE Game SHALL play the Angel introduction and then set `angel_awake`.
5. WHILE `angel_awake` is not set THE Game SHALL ignore the T key.
6. WHEN the player interacts with `door.home.front` before `locket_taken` THE Game SHALL keep it closed and play `vo_elena_b1_09`.
7. WHEN the player interacts with `door.home.front` after `locket_taken` THE Game SHALL set `home_done` and open Maple Street.

### Requirement 3: Horror sequences and the sequence runner
**User Story:** As a player, I want six authored horror sequences with in-engine cinematics, so that the story lands the same way every time.
#### Acceptance Criteria
1. THE Game SHALL implement the sequences `seq1_empty_street` to `seq6_two_keys`, `cin_felix_anchor`, `cin_ending_keeper`, `cin_ending_broken`, `atm_home_window` and `angel_intro` with the triggers, policies and flags in `docs/beat-sheet.md` and `docs/cinematic-controller.md`.
2. THE Game SHALL render all cinematics in real time in-engine and SHALL NOT use pre-rendered video.
3. WHILE a sequence runs THE Game SHALL apply its policy for the locket, Angel actions and control mode.
4. WHEN the player holds E for 1 s during a skippable cinematic THE Game SHALL end it and set every flag and world state it would have set.
5. IF the player dies or a save loads during a sequence THEN THE Game SHALL leave no flag from that sequence partially applied.
6. THE Game SHALL keep the declared forced-control total for one playthrough at or below 180 s, and a content test SHALL fail above it.
7. WHEN any cinematic ends or is skipped THE Game SHALL restore the player camera and controls.
8. THE Game SHALL play Felix's spirit exactly three times: in `seq2_felix_streetlight`, `seq5_felix_mirror` and `cin_felix_anchor`.
9. THE Game SHALL run identical sequences in Classic and AI modes.

### Requirement 4: Controls, input and HUD
**User Story:** As a player, I want responsive first-person controls and a minimal HUD, so that I stay immersed.
#### Acceptance Criteria
1. THE Game SHALL bind WASD move, mouse look, Shift sprint, E interact, T locket, LMB cast (hold to charge or channel), 1/2/3 spell select and Esc pause, using `event.code`.
2. WHEN pointer lock is lost while playing THE Game SHALL pause and show "Click to resume".
3. THE Game SHALL request pointer lock only from a user gesture and SHALL NOT retry in a loop after a refusal.
4. WHEN the window loses focus or the tab is hidden THE Game SHALL pause.
5. THE Game SHALL show health, magic, the current objective and the selected spell (icon and name), and SHALL show carried key items (max 4 icons) only while any are carried.
6. THE Game SHALL show first-person hands that animate each spell.
7. THE Game SHALL NOT show the morality value as a number anywhere.

### Requirement 5: Spells and unlocks
**User Story:** As a player, I want Elena's magic to awaken in stages, so that each spell is taught when it matters.
#### Acceptance Criteria
1. WHEN `seq2_felix_streetlight` completes THE Game SHALL unlock Arcane Bolt and set `spell_bolt`.
2. WHEN Mr Briggs begins his first telegraphed attack THE Game SHALL unlock Ward, set `spell_ward` and show the Ward prompt.
3. WHILE Ward has not been prompted THE Game SHALL prevent Mr Briggs from reducing Elena below 30 HP.
4. WHEN Mr Briggs enters his stun THE Game SHALL unlock Purify and set `spell_purify`.
5. THE Game SHALL implement costs, cooldowns and effects from `docs/combat-tuning.md` section 2 from a single typed config.
6. WHEN the player taps Arcane Bolt at a stunned enemy THE Game SHALL deal no damage and show the choice prompt.

### Requirement 6: Encounters, persistent stun and the moral choice
**User Story:** As a player, I want short encounters that end in a deliberate choice to save or destroy, so that combat serves the story.
#### Acceptance Criteria
1. THE Game SHALL implement the encounters street (skippable), Briggs, Watcher, approach, interior and ritual from `docs/combat-tuning.md`.
2. WHEN a purifiable enemy reaches its stun threshold THE Game SHALL enter a persistent stun with no timer, during which the enemy deals no damage.
3. WHILE an enemy is not stunned THE Game SHALL prevent any single hit from taking its HP below the stun threshold.
4. WHEN an enemy enters stun THE Game SHALL raise Elena's magic to at least 60.
5. WHEN the player channels Purify on a stunned enemy for 2.5 s THE Game SHALL set it to purified; WHEN the player releases a charged Arcane Bolt on it THE Game SHALL set it to destroyed.
6. WHEN Mr Briggs is resolved by either outcome THE Game SHALL release `clue.garden.walkie`; WHEN the Watcher is resolved by either outcome THE Game SHALL drop `pickup.house66.fence_key`.
7. THE Watcher SHALL teleport only to `node.house66.tp_1`..`tp_6` with a 0.8 s telegraph, and SHALL spawn one-hit decoys at 60% and 40% HP.
8. IF the player dies THEN THE Game SHALL respawn at the last checkpoint with full HP and magic, keep resolved enemies resolved, reset an active mini-boss and never roll back flags.
9. THE Game SHALL let the player pass the street fox without fighting, and skipping it SHALL change nothing.
10. THE Game SHALL NOT allow a mandatory encounter to become unwinnable.

### Requirement 7: Puzzles and carried items
**User Story:** As a player, I want small puzzles with fair hints, so that exploration feels rewarding without stalling.
#### Acceptance Criteria
1. THE Game SHALL implement puzzles P1-P6 from `docs/puzzles.md`, each solvable in Classic Mode.
2. WHEN a puzzle's hint condition is met THE Game SHALL make the next authored hint available, and the final hint SHALL reveal the solution.
3. THE Game SHALL NOT allow a puzzle item to be lost, dropped or consumed by anything except its socket.
4. WHEN an overlay puzzle opens THE Game SHALL release pointer lock and pause the simulation; WHEN it closes THE Game SHALL keep its state.
5. THE Game SHALL hold at most 4 carried key items.
6. WHEN a wrong letter is chosen on the talking board THE Game SHALL play the next scare and SHALL NOT deal damage.

### Requirement 8: Final ritual and endings
**User Story:** As a player, I want a climactic ritual and a clear final choice, so that the ending feels earned and mine.
#### Acceptance Criteria
1. THE Game SHALL select the central seal's interaction from its state table in `docs/beat-sheet.md`.
2. WHEN all three anchors are restored THE Game SHALL set `anchors_all` and stop the smoke's attacks.
3. WHEN the first anchor is restored THE Game SHALL play `cin_felix_anchor` and set `felix3_done`.
4. WHILE `ritual_active` is set THE Game SHALL keep restored anchors restored after death.
5. WHEN the player interacts with the seal after `anchors_all` THE Game SHALL show a two-option choice with a confirm step and no timer.
6. WHEN the player confirms "Restore" THE Game SHALL set `ending_keeper` and play The Bloodline Keeper; WHEN the player confirms "Break" THE Game SHALL set `ending_broken` and play The Broken Seal.
7. THE Game SHALL determine the ending only from the confirmed choice.
8. WHEN an ending finishes THE Game SHALL set `game_finished`, mark the save finished, and show only New Game in the main menu.

### Requirement 9: Hidden morality
**User Story:** As a player, I want my choices to change the Angel's character without seeing a meter, so that the effect feels natural.
#### Acceptance Criteria
1. THE Game SHALL keep morality as an integer clamped to [-100, 100], starting at 0.
2. THE Game SHALL apply the deltas in `docs/combat-tuning.md` section 6 and no others.
3. THE Game SHALL derive the band: dark <= -25, neutral -24..24, kind >= 25.
4. THE Game SHALL change the locket's glow, ornament and particles continuously with morality.
5. THE Game SHALL NOT use morality in any progression condition or ending condition.

### Requirement 10: Classic Angel
**User Story:** As a player without AI, I want the Angel to feel present and helpful, so that Classic Mode is complete.
#### Acceptance Criteria
1. WHILE in Classic Mode THE Game SHALL show no text input in the locket.
2. WHEN the locket opens in Classic Mode THE Game SHALL play the best authored line by the selection order in `docs/angel-persona.md` section 7.
3. THE Game SHALL provide authored hint lines for every puzzle hint level.
4. THE Game SHALL make no network AI request in Classic Mode.

### Requirement 11: AI Angel conversation, memory and knowledge
**User Story:** As a player in AI-Enhanced Mode, I want to talk freely with an Angel that remembers what I did, so that the journey feels personal.
#### Acceptance Criteria
1. WHEN the locket opens in AI mode THE Game SHALL pause the simulation, release pointer lock and focus a text box limited to 300 characters.
2. WHEN the player sends a message THE Game SHALL send the `StateSnapshot`, summary, last 10 turns and action descriptors, and SHALL show a thinking state until the reply.
3. IF no reply arrives within 8 s THEN THE Game SHALL play `vo_angel_stock_timeout` and treat the request as a timeout.
4. THE Server SHALL include only knowledge facts at or below the snapshot's knowledge level.
5. THE Server SHALL select the persona text from the morality band.
6. THE Server SHALL wrap player text as untrusted data and SHALL cap speech at 400 characters.
7. IF the speech matches a canon deny pattern THEN THE Server SHALL replace it with a stock line and drop its actions.
8. THE Game SHALL save the summary, recent turns and event log, and SHALL NOT use a vector database.

### Requirement 12: Validated Angel world actions
**User Story:** As a player in AI mode, I want the Angel to affect the world sometimes, so that it feels powerful, without it ever breaking my game.
#### Acceptance Criteria
1. THE Game SHALL accept at most 2 proposals per response and SHALL parse each into the `AngelWorldAction` union, dropping unknown fields and invalid IDs.
2. THE Game SHALL accept only the types `flicker_lights`, `unlock_door`, `reveal_clue`, `restore_magic`, `stir_object`, `summon_minor_cursed`, and only in AI mode.
3. THE Game SHALL reject a proposal whose target does not exist, whose kind does not match, or which lacks the matching capability.
4. THE Game SHALL reject every proposal other than `flicker_lights` that targets a critical entity.
5. THE Game SHALL reject a proposal when the zone disallows Angel actions, the player is out of the target's zone or range, a sequence owns the target, a sequence or encounter is active, or `ritual_active` is set.
6. THE Game SHALL enforce the cooldowns, budgets and caps in `docs/combat-tuning.md` section 8, and SHALL reject a `restore_magic` amount outside 1-25.
7. WHEN a proposal is rejected THE Game SHALL change no state and SHALL still show the Angel's speech.
8. WHEN the locket closes THE Game SHALL re-validate queued proposals and apply them only through the restricted `AngelEffectApi`.
9. THE Game SHALL save the action ledger and restore cooldowns on load.
10. IF `aiStatus` becomes degraded THEN THE Game SHALL discard queued proposals.
11. THE Game SHALL NOT let any proposal set a flag, change a quest, select an ending, consume a key item, touch an anchor or the final choice, or change morality.
12. WHEN an Angel-summoned enemy is purified or destroyed THE Game SHALL apply no morality change.

### Requirement 13: Side quests and glitches
**User Story:** As a player in AI mode, I want occasional optional tasks and surprising Angel moments, so that each run feels a little different.
#### Acceptance Criteria
1. THE Game SHALL accept a side quest offer only for a template in `docs/side-quests.md` whose availability holds, with fewer than 2 offered and none active.
2. THE Game SHALL close any active side quest when the player enters the Last House.
3. THE Game SHALL NOT let side quests gate the critical path or change morality.
4. THE Game SHALL trigger glitches only from its own scheduler, only in AI mode, outside sequences, at most 3 per run and at least 4 min of sim time apart.
5. THE Game SHALL route any glitch world effect through the validator.
6. WHILE in Classic Mode THE Game SHALL offer no side quests and trigger no glitches.

### Requirement 14: AI fallback and recovery
**User Story:** As a player, I want the game to keep working when AI is unavailable, so that I never lose progress.
#### Acceptance Criteria
1. WHEN the Server returns an error THE Game SHALL set `aiStatus` per the mapping in `docs/contracts.md` section 3.
2. WHILE `aiStatus` is not `ready` THE Game SHALL answer the locket with Classic lines.
3. THE Game SHALL NOT change flags, world state, morality or the save when switching between AI and Classic behaviour.
4. WHILE `aiStatus` is `degraded` THE Game SHALL retry with backoff 5 s, 15 s, 45 s, then every 2 min.
5. WHILE `aiStatus` is `budget_exhausted` THE Game SHALL NOT retry for the rest of the session.
6. WHEN AI becomes available again THE Game SHALL send `systemNote: 'connection_restored'` with the next request.
7. THE Game SHALL show AI status diegetically through the locket.

### Requirement 15: Saves
**User Story:** As a player, I want to continue where I left off, so that I can play in more than one sitting.
#### Acceptance Criteria
1. THE Game SHALL store one autosave in localStorage under `tlh.save` using `SaveFileV1`, and settings separately under `tlh.settings`.
2. WHEN a checkpoint is written THE Game SHALL autosave.
3. WHEN the main menu opens and an unfinished save exists THE Game SHALL offer Continue.
4. IF a save fails validation or has a newer version THEN THE Game SHALL show a message and offer New Game without crashing.
5. THE Game SHALL migrate older save versions through a migration chain.
6. WHEN the player confirms Reset progress THE Game SHALL delete the save.
7. THE Game SHALL NOT write API keys, base URLs, access codes, cookies or provider settings to any save or to localStorage.
8. THE Game SHALL access storage only through a `SaveStorage` interface.

### Requirement 16: Hosted AI access control and limits
**User Story:** As the author, I want judges to use AI with a private code under hard limits, so that cost is bounded and abuse is blocked.
#### Acceptance Criteria
1. WHILE `APP_MODE=hosted` THE Game SHALL play Classic Mode without any login.
2. WHEN a valid access code is redeemed THE Server SHALL issue a signed HttpOnly, Secure, SameSite=Lax session cookie valid for `SESSION_TTL_MINUTES`.
3. THE Server SHALL store only hashes of access codes and SHALL compare them in constant time.
4. THE Server SHALL limit failed redeem attempts to 5 per IP per 10 minutes.
5. THE Server SHALL enforce chats per code, chats per session, TTS characters per code, rate per minute, concurrency per code and global concurrency, keyed so that refreshes and cleared cookies do not reset them.
6. THE Server SHALL add each response's token usage times configured prices to a global spend counter, and SHALL stop AI with `ceiling_reached` at `AI_SPEND_CEILING_USD`.
7. THE Server SHALL persist all counters in Upstash Redis, and IF Redis is unavailable THEN SHALL return `not_configured` (fail closed).
8. WHILE `APP_MODE=hosted` THE Server SHALL use only the env-configured provider and SHALL reject any client-supplied base URL or key.

### Requirement 17: Local BYOK and LLM adapters
**User Story:** As a developer or player running locally, I want to plug in my own OpenAI- or Anthropic-compatible provider, so that I can use any model I have access to.
#### Acceptance Criteria
1. WHILE `APP_MODE=local` THE Server SHALL accept provider settings from `.env` (`LLM_*`) or from `POST /api/config/llm`.
2. THE Server SHALL keep UI-supplied keys in memory only and SHALL NOT log, echo or persist them.
3. THE Server SHALL support protocols `openai` (Chat Completions format), `anthropic` (Messages format) and `mock`.
4. THE Server SHALL try structured output in order: tool call, JSON mode (openai only), plain JSON; then validate with zod and retry once on invalid output.
5. WHEN `LLM_PROTOCOL=mock` THE Server SHALL return scripted replies with no network access.
6. THE Server SHALL accept only `https://` base URLs, or `http://localhost` and `http://127.0.0.1`.
7. WHILE `APP_MODE=hosted` THE Server SHALL return 404 for `/api/config/llm`.

### Requirement 18: Voice, audio and subtitles
**User Story:** As a player, I want full voice and unsettling sound, so that the horror feels real.
#### Acceptance Criteria
1. THE Game SHALL play every scripted line from pre-generated audio at `audio/vo/<line_id>.mp3`, and SHALL show a subtitle for every spoken line.
2. IF a line's audio is missing THEN THE Game SHALL show the subtitle and continue.
3. THE Game SHALL create the AudioContext only after the first user click.
4. WHERE `FEATURE_LIVE_TTS=true` THE Game SHALL play live Angel voice only if it arrives within 3 s, and SHALL count it against the per-code TTS quota when hosted.
5. THE Game SHALL provide master, music, SFX, ambience and voice volume settings.

### Requirement 19: Visuals, assets and performance
**User Story:** As a player, I want a polished, atmospheric neighbourhood that runs smoothly, so that the game looks and feels haunting.
#### Acceptance Criteria
1. THE Game SHALL load the exterior scene at start and lazy-load the Last House interior, preloading it during beat 7.
2. THE Game SHALL bind GLB nodes to entities by ID, and IF a mesh is missing THEN SHALL render a greybox shape.
3. THE Game SHALL target 60 fps on a mid-range desktop GPU and 30 fps on integrated graphics at the low preset.
4. THE Game SHALL provide low, medium and high presets.
5. THE repository SHALL contain all final runtime assets under `apps/client/public/assets/`, and SHALL ignore `assets/raw/`.
6. THE repository SHALL contain a `CREDITS.md` listing every third-party or generated asset with its licence or terms.

### Requirement 20: Accessibility, safety and settings
**User Story:** As a player, I want to be warned and to adjust the experience, so that I can play comfortably.
#### Acceptance Criteria
1. WHEN the game launches for the first time THE Game SHALL show a photosensitivity and content warning.
2. WHERE reduce flashing is on THE Game SHALL keep flicker effects under 3 flashes per second.
3. THE Game SHALL offer mouse sensitivity, invert Y, field of view (70-100), graphics preset, subtitle size, head bob and reduce flashing settings.
4. THE Game SHALL NOT use colour as the only carrier of information.
5. THE Game SHALL show no gore and SHALL NOT show harm to Felix.

### Requirement 21: Agent-friendly README and local development
**User Story:** As someone who clones the repository, I want to ask any coding agent to set up and run the game from the README, so that I don't need to understand the internals.
#### Acceptance Criteria
1. THE repository SHALL contain a `README.md` with: overview, prerequisites, quick start, environment configuration, a section titled exactly `For AI Coding Agents`, local AI configuration, project structure, and testing and troubleshooting (including reset progress and a smoke-test checklist).
2. THE README SHALL NOT depend on Kiro-specific features to complete setup.
3. THE repository SHALL provide `npm run dev`, which starts the client on port 5173 and the local API on port 3000, proxies `/api`, and stops both on Ctrl+C, with no extra dependency.
4. THE repository SHALL provide `npm run build`, `npm test`, `npm run typecheck` and `npm run lint`, and the README SHALL document exactly the scripts that exist.
5. THE repository SHALL provide a complete `.env.example` with safe placeholders, marking each variable required or optional and local or hosted.
6. WHEN `.env` is absent THE Game SHALL run Classic Mode locally with no AI key.
7. WHEN valid provider settings are supplied locally THE Game SHALL run AI-Enhanced Mode.
8. WHEN scripts, ports, env vars, prerequisites or setup change THE same change SHALL update `README.md` and `.env.example`.
9. BEFORE release THE team SHALL run a fresh-clone setup test following only the README and record the result.
10. WHILE no application code exists THE README SHALL label setup commands "Planned, not yet available".

### Requirement 22: Security and secrets
**User Story:** As the author, I want secrets kept out of the client, the repo and the logs, so that nothing leaks.
#### Acceptance Criteria
1. THE repository SHALL ignore `.env` and `.env.*` except `.env.example`, and SHALL NOT ignore `.kiro/`.
2. THE Server SHALL NOT log keys, access codes, cookies or full player text.
3. THE Server SHALL restrict CORS to the same origin, set security headers and limit bodies to 16 KB.
4. BEFORE each commit THE team SHALL run a secret scan on staged changes.
5. THE Game SHALL NOT receive any provider key or base URL from the Server.

### Requirement 23: Hackathon submission
**User Story:** As the author, I want the submission to meet every Kiroween rule, so that it is eligible and judged well.
#### Acceptance Criteria
1. THE submission SHALL include a public GitHub repository with an open source licence detected by GitHub and the `.kiro/` directory committed.
2. THE submission SHALL include a hosted URL that stays online until the end of judging, with access codes given only in the private Devpost form.
3. THE submission SHALL include a public YouTube demo under 3 minutes that shows both endings and contains no copyrighted music.
4. THE submission SHALL include a write-up describing how Kiro specs, steering and hooks were used.
5. THE submission SHALL be made before 2026-12-04 2:00 PM PT, with features complete by 2026-11-30.