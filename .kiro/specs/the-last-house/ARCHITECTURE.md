# Architecture: The Last House on Maple Street

Version 2 (2026-11-06). Detailed contracts: `docs/contracts.md`. Angel detail: `docs/angel-technical.md`. Hosting: `docs/hosting-ops.md`. Sequences: `docs/cinematic-controller.md`.

## 1. Stack
| Layer | Choice |
|---|---|
| Client | React + Vite + TypeScript (strict), Three.js via React Three Fiber + drei, Zustand, @react-three/postprocessing, plain WebAudio |
| Server handlers | TypeScript, framework-free (`Request -> Response` style), in `apps/server/src/handlers/` |
| Hosted runtime | Vercel: static client + Vercel Functions in `/api` (Node runtime, fluid compute) |
| Local runtime | Node `http` server in `apps/server/src/local.ts` on port 3000; Vite dev server on 5173 proxies `/api` |
| Usage store | Upstash Redis (hosted). In-memory implementation of the same interface (local) |
| LLM | Generic adapters: `openai` (Chat Completions format), `anthropic` (Messages format), `mock` |
| Voice | ElevenLabs: offline generation for authored lines; optional live TTS route |
| Validation | zod in `packages/shared` |
| Tests | Vitest (`vitest --run`), Playwright |
| Assets | Blender -> GLB (meshopt, KTX2); committed under `apps/client/public/assets/` |
| Runtime versions | Node 24 LTS recommended, Node 22.18 minimum (built-in TypeScript type stripping), npm 10+. Verify Vercel's supported Node versions before deploying |

## 2. Repository layout
See `.kiro/steering/structure.md`. Summary:
```
api/                      # Vercel entry points -> import handlers
apps/client/              # Vite app; src/game is headless logic
apps/server/src/          # handlers/, llm/, limits/, store/, local.ts
packages/shared/          # zod schemas, types, constants
scripts/dev.mjs           # starts client + local API with one command
tools/                    # asset generation, access-code hashing
assets/src, assets/raw    # sources (committed if small), raw output (ignored)
```

## 3. Core principles
1. **Deterministic core.** The authored story is a set of progression flags driven by beats, sequences and puzzles. No LLM dependency.
2. **LLM proposes, engine disposes.** AI output is parsed by schema and validated against world state before any effect.
3. **One state, two modes.** `preferredMode` and `activeMode` are the only mode fields. All systems, flags and the save format are shared.
4. **Logic separate from rendering.** `apps/client/src/game/` has no React or Three imports and runs headless in tests.
5. **Stable IDs and capabilities.** Every interactive object is declared in `content/world/` with an ID, kind, zone, capabilities, a critical flag and an optional owner.
6. **Flags open gates.** No gate opens any other way.
7. **Same handlers everywhere.** Hosted and local entry points call the same handler code; only configuration differs.

## 4. Client

### 4.1 Game loop
Fixed 60 Hz simulation from R3F `useFrame` (accumulator). Systems run in order:
`Input -> Player -> Interaction -> Puzzles -> Enemies -> Combat -> Progression -> Sequences -> Angel Director -> World Effects -> Audio logic`.
The phases `paused`, `locket` and `overlay` halt the simulation (sim time stops). `sequence` runs only scripted motion. Rendering always runs.

### 4.2 Systems (`apps/client/src/game/`)
| System | Responsibility |
|---|---|
| `input` | DOM events -> `InputState`; pointer lock state machine |
| `player` | Movement, sprint, look, hands state, collision response |
| `collision` | Static AABB and cylinder colliders per scene; spatial grid for dynamic entities |
| `world-registry` | Entities by ID: kind, zone, capabilities, critical, owner, state; startup validation |
| `interaction` | Nearest interactable, prompt, E handling, pickups and sockets |
| `carried-items` | Up to 4 key items; pickup and socket rules; no inventory screen |
| `progression` | The flag set; flag rules; gate evaluation; checkpoint writes; Angel knowledge level |
| `gates` | Opens and closes gates and doors from flags (veil recede effects) |
| `sequences` | The sequence and cinematic runner (`docs/cinematic-controller.md`) |
| `puzzles` | Puzzle state machines P1-P6, hint schedule, overlay requests |
| `spells` | Bolt (tap and charge), Purify (channel), Ward; costs, cooldowns, unlocks |
| `enemies` | FSM plus abilities layer (see 4.3) |
| `combat` | Hits, damage, stun threshold floor, purify and destroy outcomes |
| `morality` | Value, clamping, bands, history |
| `dialogue` | Authored line selection by beat, zone, band and hint level (Classic and fallback) |
| `angel` | Director, memory, prompt snapshot, action dispatcher and validator, glitch scheduler, side quests |
| `save` | Serialise, migrate, load through a `SaveStorage` interface |
| `world-effects` | Shared effect functions used by authored content and (through a restricted API) the Angel |

### 4.3 Enemies
- FSM states: `idle`, `patrol`, `chase`, `attack`, `stunned`, `purified`, `destroyed`. Stunned has no timer for purifiable enemies.
- HP floor: while not stunned, damage cannot take HP below the stun threshold in one hit; reaching it enters `stunned`. While stunned, only a charged Bolt (destroy) or Purify (save) changes state.
- Abilities layer (data-driven, per enemy): `telegraphedAttack`, `groundSlam`, `smokePuff`, `teleport(nodes, interval, telegraph)`, `spawnDecoys(thresholds, count)`, `voiceAtHp(thresholds)`. The Watcher uses teleport, decoys and voice lines; Briggs uses telegraphedAttack, smokePuff and groundSlam.
- Movement: steer towards the target, raycast against static colliders, slide along walls. Leash radius for animals. No navmesh.
- The smoke in the finale is not an FSM enemy. It is a pattern director (rings, pools, wraith spawns) scaled by anchors restored.

### 4.4 Progression and gates
- `ProgressFlag` is a closed string union (`docs/contracts.md`). The flag set only grows.
- Each beat, sequence and puzzle declares which flags it sets. The progression system is the only writer.
- Gates are data: `{ gate: EntityId, opensWhen: ProgressFlag[] }`. Evaluated on every flag change.
- Checkpoints are data: `{ id, writtenWhen, spawn }`. Writing a checkpoint triggers an autosave.
- The central seal's interaction is chosen from its state table (beat sheet).
- Angel knowledge level is a pure function of flags.

### 4.5 State (Zustand slices)
- `game`: phase, preferredMode, activeMode, aiStatus, checkpointId.
- `player`: hp, magic, selected spell, unlocked spells, position, yaw.
- `progress`: flags, morality, puzzle states, carried items.
- `world`: entity states by ID (doors, gates, lights, clues, enemies, anchors, sockets).
- `angel`: memory (summary, recent, eventLog), action ledger, side quest state, glitch count.
- `settings`: separate store, separate localStorage key, never in saves.
Systems change state only through store actions. Hot data (projectiles, positions, particles) lives in mutable structures inside systems and is snapshotted on save.

### 4.6 Rendering
- Two scenes: `exterior` (loaded at start) and `last_house` (lazy, preloaded during beat 7).
- Greybox first: each entity kind has a coloured debug shape. GLB nodes named by entity ID replace the greybox without logic changes. A missing asset falls back to greybox.
- Fog (`FogExp2`), one shadowed directional moonlight, a budget of shadowed spots, post-processing (vignette, grain, bloom, colour grade), quality presets.
- Mirror: a render target from a mirrored camera, used for Felix's reflection and the rune puzzle.
- First-person hands: a separate camera layer rendered over the scene, with FOV-independent framing.
- Instancing for trees, fences, gravestones, leaves.

## 5. World model
Entities, zones, gates and owners are defined in `docs/level-manifest.md`. Kinds: `door`, `gate`, `light`, `clue`, `pickup`, `socket`, `prop`, `enemy`, `npc`, `trigger`, `spawn`, `node`, `puzzle`, `rune`, `mirror`, `anchor`, `seal`.
Capabilities are the only source of truth for what the Angel may touch. Content validation runs in tests and at startup in development.

## 6. Angel
Summary here; detail in `docs/angel-technical.md` and `docs/angel-persona.md`.

### 6.1 Modes and status
- `preferredMode` is what the player chose (saved). `activeMode` is what runs now (not saved).
- `aiStatus`: `unavailable`, `ready`, `degraded`, `budget_exhausted`.
- Classic: the `dialogue` system answers T with authored lines. No text input.
- AI: the Angel Director sends a request to `/api/angel/chat`. On failure it falls back to the `dialogue` system for that turn and updates `aiStatus` per the error mapping in `contracts.md`.

### 6.2 Memory
Structured snapshot (built from flags, zone, morality band, nearby entities, knowledge level) + deterministic running summary (from the event log, <= 1500 chars) + last 10 turns. All serialisable and saved. No vector DB.

### 6.3 Prompt
Built server-side: system rules -> canon rules -> persona for the band -> facts for knowledge levels <= current -> state -> action catalogue -> the player's message as untrusted data. The client never sends prompt text, only data.

### 6.4 World actions (promoted from `refinement/angel-world-actions`)
Pipeline per proposal (max 2 per response):
1. Parse into the typed `AngelWorldAction` union; strip unknown keys; reject bad IDs.
2. Mode is `ai`.
3. Type is whitelisted.
4. Target exists and its kind matches the action.
5. Target declares the matching capability (`angelFlicker`, `angelUnlock`, `angelReveal`, `angelStir`, `angelSummon`).
6. Target is not critical, unless the action is `flicker_lights`.
7. Player is in the target's zone and within range; the zone allows Angel actions.
8. No sequence owns the target; no sequence or encounter is active; not in the finale lock (from `ritual_active` to the end).
9. Cooldown, per-run budget and caps (`docs/combat-tuning.md` section 8).
10. Story-safety check (defence in depth): a pure check that the critical path and the good ending stay reachable.
Accepted proposals are queued. When the locket closes they are re-validated (steps 4-10) and applied through the restricted `AngelEffectApi`, which exposes only the six effect functions. The action ledger (cooldowns, counts, live summons) is saved. Rejections change no state and are recorded in an in-memory ring buffer for tests. Pending effects are discarded if `aiStatus` becomes degraded.

### 6.5 Side quests and glitches
- Side quests: templates in `content/sidequests/` (`docs/side-quests.md`). The Angel can only offer `templateId` + a registered target. The engine enforces max 2 per run and 1 active, and closes them on entering the Last House.
- Glitches: the engine's `GlitchScheduler` decides (AI mode only, outside sequences, max 3 per run, >= 4 min apart). It adds a `glitch` hint to the next request. Any glitch world effect goes through the same dispatcher.

### 6.6 Safety
- Player text is wrapped and labelled as untrusted in the prompt.
- Output is schema-validated; unknown fields are dropped.
- Authority lives in the validator, so prompt injection cannot cause a prohibited effect.
- Speech passes a length cap and a canon filter; violations are replaced with a stock line.

## 7. Content pipeline
Typed data in `apps/client/src/content/`: `world/` (entities), `flags.ts`, `beats.ts`, `sequences/`, `dialogue/` (authored lines keyed by `vo_` IDs), `puzzles/`, `sidequests/`, `journal/`. Content tests check: IDs resolve; gates open from critical-path flags; no `angelUnlock` on the critical path; both endings reachable from every checkpoint; forced-control budget <= 180 s; every line ID has text and, when available, audio.

## 8. Saves
- `SaveStorage` interface; `LocalStorageSaveStorage` is the only implementation before the hackathon. Key `tlh.save`. Settings use `tlh.settings`.
- One autosave slot written at checkpoints. Versioned schema (`SaveFileV1`) with a migration chain. Zod validation on load. Corrupt or newer-version saves are rejected with a message, never crash.
- A finished save (`finished: true`) hides Continue.
- No keys, codes, cookies or provider settings are ever saved. A test asserts no key-like patterns appear in a serialised save.

## 9. Server

### 9.1 Endpoints (handlers shared by hosted and local)
| Route | Mode | Purpose |
|---|---|---|
| `GET /api/health` | both | Version, uptime, mode |
| `GET /api/config/status` | both | AI availability, session state, coarse remaining quota |
| `POST /api/access/redeem` | hosted | Validate an access code, issue a signed HttpOnly session cookie (2 h) |
| `POST /api/config/llm` | local only | Set protocol, base URL, model, key in memory (404 when hosted) |
| `DELETE /api/config/llm` | local only | Clear the in-memory provider |
| `POST /api/angel/chat` | both | Angel completion (schema-constrained) |
| `POST /api/angel/tts` | both, flagged | Live Angel voice, capped (off by default) |
Request and error shapes: `docs/contracts.md`.

### 9.2 Hosted access, quotas and spend
- Access codes: 8 by default, high-entropy, stored only as `label:sha256` pairs in `ACCESS_CODE_HASHES`. Constant-time comparison. Redeem throttled per IP.
- Session: random ID in a cookie signed with `SESSION_SECRET` (HttpOnly, Secure, SameSite=Lax, 2 h). Session data in Redis with a TTL.
- Quotas are keyed by the code label, so refreshes and cleared cookies do not reset them: chats per code, chats per session, TTS characters per code.
- Rate limit per session and IP. Concurrency per code (1) and global (8) via Redis counters with TTL.
- Spend ceiling: each response's reported token usage x configured prices is added to a global spend counter. At `AI_SPEND_CEILING_USD`, AI stops for everyone (`ceiling_reached`).
- Fail closed: if Redis is unavailable, AI is unavailable and the game plays Classic.
- No client-supplied URL or key is accepted in hosted mode. The provider is fixed by env.

### 9.3 Local mode and BYOK
- `APP_MODE=local` (default). Binds to 127.0.0.1.
- Provider from `.env` (`LLM_*`) or from the UI via `POST /api/config/llm`, held in memory only. A UI-set provider overrides `.env` until the server restarts.
- The local in-memory usage store applies the rate limit only; no access code is needed.
- `LLM_PROTOCOL=mock` returns scripted responses with no network.

### 9.4 LLM adapters
`LlmAdapter.complete(request): Promise<{ output: unknown; usage: { inputTokens, outputTokens } }>`.
- `openai`: `POST {baseUrl}/chat/completions`. Tries tool calling, then `response_format: json_object`, then plain JSON.
- `anthropic`: `POST {baseUrl}/v1/messages` (or `{baseUrl}/messages` if the base already ends in `/v1`). Tries tool use, then plain JSON.
- Output is validated with zod; one repair retry on invalid JSON; otherwise `invalid` and speech-only fallback.
- Errors are classified: `auth`, `quota`, `timeout`, `refused`, `invalid`, `provider_error`.
- Timeout 8 s total. Vercel function `maxDuration` set to 30 s, well inside current limits (verify at deploy time).

### 9.5 Security
- Keys only from env or local server memory. Never logged, never echoed, never sent to the client.
- Logs include request ID, route, status, latency and token counts only.
- CORS: same origin only. Security headers. Body limit 16 KB.
- `.env*` ignored (except `.env.example`). A secret scan runs before commits.

## 10. Local development
- `npm run dev` runs `scripts/dev.mjs`, which starts the Vite dev server (5173) and the local API server (3000) as child processes, prefixes their logs, and stops both on Ctrl+C. No extra dependency.
- Vite proxies `/api` to `http://127.0.0.1:3000`.
- Other scripts: `build`, `test`, `typecheck`, `lint`, `preview`, `test:e2e`. Exact definitions land in Phase 0 and the README is updated in the same change.
- With no `.env`, the game runs in Classic Mode; AI-Enhanced Mode shows the local provider form.

## 11. Performance budget
60 fps mid-range desktop; 30 fps integrated at low. Under ~300 draw calls, up to ~6 shadowed lights, initial download under ~40 MB, interior lazy. Pool projectiles, particles and enemies. No allocation in the frame loop.

## 12. Testing strategy
- Unit: spells, FSM, stun floor, morality, flags and gates, puzzles, validator (every rejection reason), save migration, schemas, canon filter, LLM output parsing.
- Content: IDs, gates, reachability of both endings from every checkpoint, forced-control budget, line IDs.
- Property: seeded loops of random Angel actions never make the good ending unreachable (no new dependency).
- Integration: headless Classic playthroughs to each ending; AI mode with the mock provider including failure and recovery.
- Server: access redeem, cookie, quotas, concurrency, ceiling, fail-closed, key redaction, BYOK rejected in hosted mode.
- Browser: boot, menu, Classic start, locket, save and load round trip.
- Manual: pacing, scares, audio mix, performance, fresh-clone setup from the README.

## 13. Key decisions
| Decision | Rationale |
|---|---|
| Headless TS logic + R3F view | Testable; avoids React render cost |
| Flags as the only progress | Same in both modes; easy to validate and save |
| Capabilities + critical + owner | Makes Angel validation simple and safe |
| Client-side authoritative validator | Single-player; the server only shapes text |
| Shared handlers for Vercel and local | One code path; fewer bugs |
| Upstash for hosted quotas | Vercel has no persistent disk |
| Access codes, no OAuth | Minimal auth for judges; quotas per code |
| Generic OpenAI/Anthropic adapters | Works with DeepSeek, MiniMax, Grok and others |
| localStorage saves only | No infrastructure; cloud saves later through `SaveStorage` |