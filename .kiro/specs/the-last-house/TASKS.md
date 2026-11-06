# Tasks: The Last House on Maple Street

Dates: planning started 2026-11-06. **Feature complete: 2026-11-30. Submission: 2026-12-04.**
Legend: `[ ]` todo, `[x]` done. Tasks marked **(cut)** are the first to drop if time runs short.
Refs: PRD.md (requirements), ARCHITECTURE.md (design).

## Phase 0: Foundations (Nov 6-8)

- [ ] 0.1 Init npm-workspaces monorepo: `apps/client`, `apps/server`, `packages/shared`; TS strict, ESLint, Prettier, Vitest
- [ ] 0.2 `.gitignore` for `.env*`, `node_modules`, builds, `.blend1`; add secret-scan check (pre-commit or CI)
- [ ] 0.3 Vite + React + R3F boilerplate rendering a lit test scene with fog
- [ ] 0.4 Zustand store slices (game, player, world, quest, morality, angel, settings)
- [ ] 0.5 Shared zod schemas package (save, angel request/response, actions)
- [ ] 0.6 CI: typecheck, lint, unit tests

## Phase 1: Core Player and World (Nov 8-12)

- [ ] 1.1 PlayerController: pointer lock, WASD, sprint, mouse look
- [ ] 1.2 Collision: static AABB colliders, slide response
- [ ] 1.3 WorldRegistry with entity IDs, kinds, capabilities, `critical` flag
- [ ] 1.4 InteractionSystem: nearest interactable, prompt UI, `E`
- [ ] 1.5 Game phases + pause (Esc), locket phase stub (T) releasing pointer lock
- [ ] 1.6 Minimal HUD: health, magic, objective, selected spell
- [ ] 1.7 Greybox all six zones with colliders, spawn points, doors, streetlights, mirror, anchors
- [ ] 1.8 Zone loading/transition (lazy), checkpoints data
- [ ] 1.9 Tests: collision, interaction selection, registry validation

## Phase 2: Magic and Combat (Nov 12-16)

- [ ] 2.1 SpellSystem: Arcane Bolt (projectile), Purify (beam/cone on stunned), Ward (shield + duration), costs/cooldowns, 1/2/3 select, LMB cast
- [ ] 2.2 Magic regen + gradual spell unlock hooks
- [ ] 2.3 Enemy FSM: idle/patrol, chase, attack, stunned, purified, destroyed
- [ ] 2.4 Weaken threshold and stun window (paused during locket); Purify vs. destroy choice resolution
- [ ] 2.5 Enemy feedback: hit reactions, dissolve/purify VFX, SFX hooks
- [ ] 2.6 Player damage, death, respawn at checkpoint
- [ ] 2.7 Morality system: deltas, bands, history; purify/destroy events feed it
- [ ] 2.8 Tests: FSM transitions, damage math, stun timing, morality bands

## Phase 3: Story Backbone, Classic Mode (Nov 14-20)

- [ ] 3.1 Quest graph engine + the three main quests with steps/triggers
- [ ] 3.2 DialogueSystem: authored tables by (quest, zone, morality band)
- [ ] 3.3 Locket UI (free-text input, transcript, no action buttons) wired to Classic responder with intent/keyword matching + graceful default
- [ ] 3.4 Horror sequence runner (timeline scripts) + atmosphere library: flicker, whispers, shadows, doors, footsteps, smoke
- [ ] 3.5 Sequence 1: The Empty Street
- [ ] 3.6 Sequence 2: Felix Beneath the Streetlight
- [ ] 3.7 Sequence 3: The Cursed Neighbour (first combat + moral choice)
- [ ] 3.8 Sequence 4: Gartner's Confession (innocence preserved)
- [ ] 3.9 Sequence 5: The Mirror Warning
- [ ] 3.10 Sequence 6: The Two Living Keys
- [ ] 3.11 Interior of the Last House: Felix appearance 3, the three seal anchors, smoke attack patterns
- [ ] 3.12 Final choice UI and both endings (Bloodline Keeper / Broken Seal), end cards
- [ ] 3.13 Locket visual changes driven by morality band
- [ ] 3.14 Content validation test: IDs resolve, main path reachable, both endings reachable from every checkpoint
- [ ] 3.15 Headless full-playthrough test for each ending (Classic)
- [ ] **Milestone M1 (Nov 20): Classic Mode greybox playable start to finish**

## Phase 4: Save/Load (Nov 18-21)

- [ ] 4.1 `SaveStorage` interface + localStorage/IndexedDB implementation
- [ ] 4.2 Save schema v1 with zod validation and migration chain
- [ ] 4.3 Autosave at checkpoints, Continue/New Game menu, manual slot
- [ ] 4.4 Round-trip tests (all state incl. enemies, world changes, Angel memory); corrupt/future-version handling
- [ ] 4.5 Test asserting saves contain no key-like data

## Phase 5: Server and AI Mode (Nov 18-26)

- [ ] 5.1 Server skeleton (Fastify/Express), health route, static hosting, `APP_MODE`
- [ ] 5.2 Provider adapters (OpenAI, Gemini) with structured output, timeouts, error classification
- [ ] 5.3 Local key config route (memory-only), log redaction, tests
- [ ] 5.4 Prompt builder: canon block, persona by morality band, snapshot, summary, recent, action catalog
- [ ] 5.5 `/api/angel/chat` with zod validation of output and fallback payloads
- [ ] 5.6 AngelDirector: mode switch, degraded fallback, backoff retry, re-prime on recovery
- [ ] 5.7 Memory: event log, deterministic summary, recent window, optional LLM compression
- [ ] 5.8 Action validator pipeline (all 9 checks) + executor using shared world-effect functions
- [ ] 5.9 Initial actions: flicker_lights, unlock_door, reveal_clue, restore_magic; then stir_object / summon_minor_cursed
- [ ] 5.10 Story-safety simulation check + adversarial/property tests (good ending always reachable)
- [ ] 5.11 Side-quest templates, caps (2 per run, 1 active), rewards
- [ ] 5.12 GlitchScheduler with safe effects and limits
- [ ] 5.13 Canon-violation filter and prompt-injection tests
- [ ] 5.14 Mode selection UI, AI status indicator (diegetic), key entry UI for local mode
- [ ] 5.15 Integration test: AI mode with mocked provider incl. failure and recovery
- [ ] **Milestone M2 (Nov 26): AI-Enhanced Mode complete**

## Phase 6: Hosted Judge Demo (Nov 24-28)

- [ ] 6.1 Judge login: hashed credentials, HttpOnly session cookie, login throttling
- [ ] 6.2 Per-session and global rate/token budgets; 503 fallback signalling to Classic
- [ ] 6.3 Security headers, CORS lock, body limits
- [ ] 6.4 Deploy (Render/Fly/Railway or VPS), env secrets, HTTPS, smoke test from a clean browser
- [ ] 6.5 Prepare judge credentials and usage notes for Devpost
- [ ] 6.6 **(cut)** ElevenLabs TTS route + client playback, cached lines, feature flag

## Phase 7: Art, Audio and Polish (runs Nov 14-30, parallel)

- [ ] 7.1 Lighting/fog/post-processing pass (moon, grading, grain, vignette); quality presets
- [ ] 7.2 Blender hero assets: Last House (exterior+interior), mirror, seal anchors, locket
- [ ] 7.3 Blender/pack props: gravestones, fences, trees, street props, cars (instanced)
- [ ] 7.4 Enemy, Felix spirit, Gartner, smoke entity visuals (stylised, simple rigs/shaders)
- [ ] 7.5 Spell VFX (bolt, purify, ward) and smoke/dissolve shaders
- [ ] 7.6 Audio: ambient beds per zone, footsteps, whispers, spell SFX, stingers, music
- [ ] 7.7 Swap greybox for assets by ID; asset freeze **Nov 27**
- [ ] 7.8 Performance pass: instancing, draw-call/light budget, texture compression, lazy-load interior

## Phase 8: Stabilisation (Nov 28-Dec 4)

- [ ] 8.1 **Feature freeze Nov 30**
- [ ] 8.2 Full manual playthroughs: Classic good, Classic bad, AI good, AI bad, AI with outage mid-game
- [ ] 8.3 Pacing pass: 10-15 minute target, scare timing, objective clarity
- [ ] 8.4 Bug fixing, browser checks (Chrome, Edge, Firefox), low-end GPU check
- [ ] 8.5 Playwright smoke suite on the hosted build
- [ ] 8.6 README (setup, local key flow, modes, controls, no-secrets note), LICENSE check
- [ ] 8.7 Record demo video; capture screenshots
- [ ] 8.8 Devpost write-up (include Kiro usage), submit before **Dec 4**

## Suggested Cut List (in order, if behind)

1. ElevenLabs voice (6.6)
2. Optional side quests (5.11) beyond one template
3. `summon_minor_cursed` and `stir_object` actions
4. Custom Blender props (use free packs/greybox with good lighting)
5. Glitch variety (keep a single glitch type)

## Definition of Done (Release)

- Classic and AI modes both reach both endings.
- All tests green; adversarial action tests prove the good ending is always reachable.
- No secrets in repo, saves or logs.
- Hosted build accessible to judges with caps verified.
