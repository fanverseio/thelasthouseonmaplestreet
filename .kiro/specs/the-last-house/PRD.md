# PRD: The Last House on Maple Street

Version 2 (2026-11-06). Kiroween 2026, category **Costume Contest**.
Feature complete **2026-11-30**. Submission deadline **2026-12-04, 2:00 PM PT**.
Detail lives in `docs/`; this document is the product source of truth. Numbered requirements are in `requirements.md`.

## 1. Summary

A first-person 3D psychological horror game for desktop browsers. Elena Hart searches Maple Street for her missing son Felix on Halloween night. Her grandmother's Whispering Locket wakes the Angel, an ancient being that comments on, and in AI-Enhanced Mode influences, her journey. She learns she and Felix are the two Living Keys to a seal her grandmother made beneath the Last House.

- First playthrough ~25-30 min (target ~28.5). Experienced player ~18-22 min.
- The first ~12.5 min (beats 1-5) are what judges are most likely to see. They get priority polish.
- Two modes share one world, one story, one set of progression flags and one save format:
  - **Classic Story Mode**: fully authored, deterministic, no LLM, no network AI.
  - **AI-Enhanced Mode**: adds free-text Angel conversation, memory, validated world actions, up to two optional side quests and rare glitches.

## 2. Goals and non-goals

### Goals

- A complete, polished, atmospheric game with story, exploration, puzzles, combat, six authored horror sequences and exactly two endings.
- A safe LLM integration that changes the experience without ever breaking it.
- A hosted demo for judges, unlocked by a private access code, with bounded cost.
- A repository any person or coding agent can clone and run from the README alone.

### Non-goals (before the hackathon)

- Google OAuth, public registration, daily free credits, cloud saves, Supabase, account sync.
- Chapter select, judge start, alternative start points, shortcuts.
- BYOK or custom endpoints on the hosted build.
- Crafting, inventory screen, minimap, jump, crouch, stamina.
- Navmesh or elaborate enemy AI. Vector DBs or external memory services.
- A health-bar boss at the finale. (Two mini-bosses are in scope.)
- A large open world.

## 3. Canon

See `.kiro/steering/canon.md`. It is locked. Key points: Gartner is innocent; Felix is the first Living Key and Elena the second; Elena's magic is from her bloodline; the Angel and the smoke are separate; exactly two endings.

## 4. Critical path

Timings are design targets. Progress always comes from interactions and objectives, never from a clock. Full triggers, flags and policies: `docs/beat-sheet.md`. Map: `docs/level-manifest.md`.

| #   | Beat                                | Target  | Presentation                                                               | Unlocks                         |
| --- | ----------------------------------- | ------- | -------------------------------------------------------------------------- | ------------------------------- |
| 1   | Elena's Home                        | 2.5 min | Interactive opening, environmental storytelling, Angel introduction        | Maple Street                    |
| 2   | Seq 1 The Empty Street              | 1.5     | Fully interactive horror, no cutscene                                      | Intersection                    |
| 3   | Seq 2 Felix Beneath the Streetlight | 1.5     | 15-25 s in-engine cinematic                                                | Neighbour's garden; Arcane Bolt |
| -   | Street encounter                    | ~1      | Ordinary, skippable                                                        | -                               |
| 4   | Seq 3 The Cursed Neighbour          | 4       | Interactive transformation and mini-boss                                   | Gartner's hideout; Ward, Purify |
| 5   | Seq 4 Gartner's Confession          | 2       | Interactive dialogue, cinematic framing                                    | House 66                        |
| 6   | House 66: The Watcher               | 3       | Fetch puzzle and mini-boss                                                 | Back lane                       |
| 7   | Last House approach                 | 1.5     | Ordinary encounter (mandatory) and number lock                             | Outbuilding                     |
| 8   | Seq 5 Felix in the Mirror           | 2       | 20-30 s cinematic, then mirror-runes puzzle                                | Last House front door           |
| 9   | Interior                            | 2       | Ordinary encounter (mandatory) and talking-board puzzle                    | Ritual chamber                  |
| 10  | Seq 6 The Two Living Keys           | 1.5     | 30-45 s cinematic                                                          | Three anchor rooms              |
| 11  | Final ritual                        | 4       | Interactive climax; Felix's third appearance (15-20 s) at the first anchor | Final choice                    |
| 12  | Choice and ending                   | 2       | Choice, then a ~20-30 s ending cinematic and credits                       | -                               |

**Total ~28.5 min.**

### Quests

- **The Search**: beats 1-3.
- **The Truth**: beats 4-8 (neighbour, Gartner, House 66, approach, mirror).
- **The Last House**: beats 9-12.

### Story beats that must land

- Beat 1: Felix is gone; Elena hears his voice outside; she finds the locket in a locked drawer near the front door; the Angel wakes.
- Beat 3: Felix's spirit points to the neighbour's garden, then vanishes. Elena's magic wakes (Arcane Bolt).
- Beat 4: Both purify and destroy release Gartner's walkie-talkie, which reveals where he is hiding.
- Beat 5: Gartner was tricked. He is innocent and guilty-feeling. He says the only way to the Last House is the back lane behind House 66.
- Beat 6: The Watcher of House 66 knows Felix's name, teleports short distances and casts shadow decoys. Both outcomes drop the fence key to the lane gate.
- Beat 7: The lane loops back past Elena's own garden to the rear of the Last House.
- Beat 8: Felix appears in the mirror and warns of the broken seal and the family's link to the house.
- Beat 10: Elena learns Felix is the first Living Key, she is the second, his body is trapped, and her grandmother made the seal.
- Beat 11: Restoring the first anchor brings Felix's third appearance: he encourages her and reveals the anchors are weakening the evil's hold on him.
- Beat 12: Final choice. **The Bloodline Keeper** or **The Broken Seal** (see canon).

### Endings

- Decided only by the final choice at the central seal. Morality, AI behaviour, combat and side quests cannot remove the good ending.
- The choice has two options and a confirm step, with no timer.
- The ending is final: the save is marked finished, Continue is hidden and only New Game remains.

## 5. Gameplay

### 5.1 Controls

| Input     | Action                                                            |
| --------- | ----------------------------------------------------------------- |
| WASD      | Move                                                              |
| Mouse     | Look (pointer lock)                                               |
| Shift     | Sprint (no stamina)                                               |
| E         | Interact (hold E to skip a cinematic)                             |
| T         | Open or close the locket (after the locket is found)              |
| LMB       | Cast selected spell; hold to charge Arcane Bolt or channel Purify |
| 1 / 2 / 3 | Arcane Bolt / Purify / Ward                                       |
| Esc       | Pause, or close an overlay                                        |

### 5.2 HUD

Health, magic, current objective, selected spell. A carried-items row (max 4 icons) appears only while Elena carries a key item. No numbers for morality, ever.

### 5.3 Presentation

- First-person hands are visible and animate spell casts.
- Elena is fully voiced. All spoken lines have subtitles, always on.
- In-engine real-time cinematics only (no pre-rendered video). Total forced loss of control <= 3 min, tracked by a test. Cinematics can be skipped by holding E; skipping still sets every flag.
- Photosensitivity warning at first launch; a "reduce flashing" setting.

### 5.4 Spells

- **Arcane Bolt**: ranged damage. Unlocks when Felix vanishes (end of Seq 2). Holding LMB charges a finishing bolt.
- **Ward**: temporary shield. Unlocks at the cursed neighbour's first telegraphed attack. The neighbour cannot deal a killing blow before the Ward prompt.
- **Purify**: channelled beam that saves a stunned purifiable being. Unlocks when the neighbour is stunned.
- Numbers: `docs/combat-tuning.md`.

### 5.5 Encounters

| #   | Where               | Type                        | Required  |
| --- | ------------------- | --------------------------- | --------- |
| 1   | Maple Street        | Ordinary: cursed fox        | Skippable |
| 2   | Neighbour's garden  | Mini-boss: Mr Briggs        | Yes       |
| 3   | House 66            | Mini-boss: The Watcher      | Yes       |
| 4   | Last House approach | Ordinary: two cursed hounds | Yes       |
| 5   | Last House interior | Ordinary: cursed cat        | Yes       |
| 6   | Ritual chamber      | Final ritual vs. the smoke  | Yes       |

- Ordinary encounters ~60 s of active combat; mini-bosses ~3 min. Not a shooter.
- Ordinary enemies are cursed animals and can be purified. Smoke wraiths can only be destroyed.
- **Persistent stun**: every purifiable enemy enters a stun with no timer at ~30% HP. A stunned enemy is harmless. Its HP cannot drop below the stun threshold, so tapping Arcane Bolt cannot kill it by accident.
- **Choice**: Purify saves it (morality up). A held Arcane Bolt charge destroys it (morality down). Entering stun guarantees enough magic for either.
- If Purify is not yet unlocked (street fox), a stunned enemy can be left stunned and purified later.
- No mandatory encounter can softlock. Death respawns at the last checkpoint with full health; no lives.

### 5.6 Morality

- Hidden integer, clamped to -100..+100, starting at 0.
- Steps: mini-boss +/-30, animal +/-10, one Gartner dialogue choice +/-5. Skipping the street fox changes nothing. Angel-summoned enemies (AI mode) change nothing.
- Bands: dark <= -25, neutral, kind >= +25.
- Affects Angel tone and the locket's look only. Never the ending, never progression.

### 5.7 Puzzles

Detail: `docs/puzzles.md`. Every puzzle is solvable in Classic Mode, has authored escalating hints, and cannot softlock.

1. **Locket drawer** (home): Felix's drawing shows where the drawer key is hidden.
2. **Fuse** (fetch and place between houses): take a fuse from Mr Briggs' garage (No. 31) to House 66's fuse box. The porch lights come on and the Watcher appears.
3. **Number lock** (approach): the outbuilding padlock. The code is a date in Rosalind's journal.
4. **Mirror runes** (outbuilding): runes visible only in the mirror. Purify each.
5. **Talking board** (interior): a hangman-style word puzzle. Wrong letters trigger scares, never damage.
6. **Three anchors** (ritual): one per spell (Bolt breaks a smoke shell, Ward protects a channel, Purify cleanses).

### 5.8 Lore

Five pages of Rosalind's journal along the route, plus what the Angel and Gartner say. Pages are optional; puzzle hints cover any clue they carry.

### 5.9 Map

One compact neighbourhood laid out as a loop. The route goes round Maple Street, then the back lane returns past Elena's own garden to the rear of the Last House, which is visible from the very first scene.

## 6. The Angel

### 6.1 Classic Mode

The locket speaks authored lines chosen by beat, zone and morality band. Pressing T opens the locket and the Angel speaks. There is no text input in Classic.

### 6.2 AI-Enhanced Mode

- Pressing T opens the locket with a free-text box. Game time pauses and pointer lock is released.
- No Help/Quest/Action buttons.
- Memory: structured game snapshot, a compact summary and the last few turns. No vector DB.
- Knowledge schedule: the Angel only knows what Elena could know at the current beat.
- Personality follows the morality band. The locket's glow and ornament change with it.

### 6.3 World actions (AI mode only)

The LLM proposes structured actions; the engine validates and executes them. Allowed types: `flicker_lights`, `unlock_door`, `reveal_clue`, `restore_magic`, `stir_object`, `summon_minor_cursed`.

- A proposal must name an existing entity that declares the matching capability, be near the player, respect cooldowns and budgets, and fall outside any sequence that blocks actions.
- Critical-path entities reject every action except `flicker_lights`.
- Effects apply after the locket closes and are re-validated first.
- The Angel can never set a flag, change a quest, force an ending, consume a key item, touch an anchor or the final choice, or change morality directly.

### 6.4 Side quests (AI mode only)

At most two per run, one active at a time, from four predefined templates bound to existing places (`docs/side-quests.md`). They never gate the critical path and close quietly when Elena enters the Last House.

### 6.5 Glitches (AI mode only)

Rare, engine-triggered, at most 3 per run. A kind Angel may briefly say something malicious; a dark Angel may briefly help. They use the same validator and never touch progress.

### 6.6 Fallback

If access is invalid, the session expires, quota or the spend ceiling is reached, or the provider fails, the game falls back to Classic behaviour mid-game with no restart and no progress loss. The fallback is shown diegetically (the locket dims). When access returns, the Angel is re-primed from the current state.

### 6.7 Voice

- Authored lines are pre-generated with ElevenLabs and committed as audio files.
- Live Angel voice in AI mode is optional, off by default, and capped per access code.

## 7. Saves

- Browser localStorage only. Versioned schema with migrations.
- One autosave slot, written at checkpoints. Main menu offers Continue (if a save exists and is not finished) and New Game.
- Corrupt or incompatible saves show a message and offer New Game; never a crash.
- A "Reset progress" option in Settings clears the save.
- Saves never contain keys, codes, cookies or provider settings.

## 8. AI access and hosting

### 8.1 Hosted build (Vercel)

- Static client plus Vercel Functions.
- Classic Mode needs no login and starts immediately.
- AI-Enhanced Mode asks for an access code supplied to judges in the private Devpost form. The server checks it and issues a short-lived (2 h) AI session in a signed HttpOnly cookie.
- The provider key stays server-side. One fixed provider endpoint is configured by environment variables. No client-supplied URLs or keys are accepted.
- Server-side quotas per code and per session, rate limits, concurrency limits, and a global spend ceiling. All are stored in Upstash Redis, so they survive restarts, refreshes and cleared cookies.
- Stays online until judging ends.

### 8.2 Local build (BYOK)

- Players can pick a protocol (OpenAI-compatible or Anthropic-compatible), base URL, model and key, either in the game UI or in a local `.env`.
- UI-entered keys stay in local server memory only. They are never written to localStorage, saves, logs or git.
- A mock provider allows AI mode to be tested with no key.
- The author will test with DeepSeek, MiniMax and Grok.

## 9. Agent-friendly README and local development

- `README.md` must serve humans and any coding agent with terminal and file access. It must not depend on Kiro.
- Goal: a user can say "Read the README.md, inspect the project, install the required dependencies, configure the local environment, and run The Last House on Maple Street locally", and the agent succeeds.
- Required sections:
  - overview
  - prerequisites
  - quick start (exact commands, ports, how to stop, how to verify)
  - environment configuration
  - a section titled `For AI Coding Agents`
  - local AI configuration
  - project structure
  - testing and troubleshooting (with reset progress and a smoke-test checklist)
- One command, `npm run dev`, starts the client (5173) and the local API (3000).
- The README must stay in sync with the real scripts, ports and env vars. It must never document a command that does not exist.
- Acceptance:
  - A fresh clone runs by following only the README.
  - An agent can start Classic Mode with no AI key.
  - AI mode works locally once valid credentials are supplied.
  - A fresh-clone test is run before release.

## 10. Visual and audio direction

- Stylized realistic Halloween: fog, moonlight, strong shadows, practical flickering lights, cinematic grading.
- Greybox the whole route first, then replace it with assets bound by entity ID.
- Assets are made inside this repository. Other agents build them from `docs/asset-manifest.md`.
- Final exports are committed under `apps/client/public/assets/`. Raw generator output in `assets/raw/` is git-ignored.
- Audio: ambient beds, positional footsteps and whispers, spell SFX, stingers, music and full voice.

## 11. Success criteria

- Classic Mode completes start to finish to either ending with no network AI, in ~25-30 min.
- AI mode completes the same story, with live Angel chat and at least three distinct validated world actions shown.
- Hostile input cannot trigger a prohibited action (tested).
- AI loss and recovery mid-game keep all progress.
- 60 fps target on a mid-range desktop GPU; 30 fps on integrated graphics at the low preset.
- The hosted demo is gated by access codes, cost-capped and stays up through judging.
- A fresh clone runs by following only the README.
- Feature complete by 2026-11-30.

## 12. Risks

| Risk                                                | Mitigation                                                            |
| --------------------------------------------------- | --------------------------------------------------------------------- |
| Scope (28 min, 6 encounters, 6 puzzles, full voice) | Vertical slice by Nov 13; ordered cut list in `tasks.md`              |
| LLM cost or abuse                                   | Access codes, persisted quotas, spend ceiling, provider dashboard cap |
| LLM breaks story                                    | Proposal-only actions, validator, knowledge schedule, canon filter    |
| Providers differ in structured output               | Tool call -> JSON mode -> plain JSON with zod and one repair retry    |
| Performance with fog and shadows                    | Quality presets, light budget, instancing, lazy interior              |
| README drift                                        | README sync rule; checks at each milestone; fresh-clone test          |
| Assets missing from the repo                        | Final exports committed; placeholder fallback for any missing asset   |

## 13. Open items

- Creative drafts awaiting author approval: beat sheet, level manifest, puzzles, combat tuning, Angel persona, side quests, script, asset manifest.
- Provider and model for the hosted build (one of the author's test providers), and its prices for the spend ceiling.
- The ElevenLabs plan terms for a public, open-source project.
- The image generation tool and its output license.
