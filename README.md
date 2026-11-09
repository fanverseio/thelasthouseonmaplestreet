# The Last House on Maple Street

> **Project status: foundations (as of 2026-11-07).** The monorepo, dev runner, local API (`/api/health`, `/api/config/status`), shared schemas, tests and repo checks work. **The game is an early greybox:** `npm run dev` opens the photosensitivity warning and main menu; New Game > Classic plays beats 1 to 4 on grey boxes: Elena's home, the empty street, Felix at the streetlight and Mr Briggs. Later beats, real art and AI mode are not built yet. Features marked **Planned, not yet available** do not exist yet. Coding agents: read [For AI Coding Agents](#for-ai-coding-agents) before running anything.

A first-person 3D psychological horror game for desktop browsers, built for the **Kiroween 2026** hackathon (category: Costume Contest).

It is Halloween night. Elena Hart's eight-year-old son Felix has vanished, and Maple Street is wrong: empty, silent, the streetlights failing one by one. Elena finds her grandmother's Whispering Locket and wakes the Angel inside it. Following Felix's trail round the street, she learns her family's magic is real, that an ancient smoke is sealed beneath the Last House, and that she and Felix are the two keys it needs.

## Overview

### Features (planned)

- First-person exploration of one compact neighbourhood laid out as a loop, with fog, moonlight and real-time in-engine cinematics.
- About 25-30 minutes for a first playthrough. Everyone starts at Elena's home and follows the same story.
- Six authored horror sequences. Felix's spirit appears three times.
- Three spells: **Arcane Bolt**, **Purify** and **Ward**. Weakened enemies kneel and wait: save them with Purify, or destroy them with a charged bolt. Your choices quietly shape the Angel.
- Two mini-bosses (the cursed neighbour and the Watcher of House 66) and a final ritual instead of a health-bar boss.
- Six puzzles: a hidden key, a fetch-and-place fuse, a number lock, mirror runes, a hangman-style talking board and three ritual anchors.
- Full voice acting and subtitles.
- Exactly two endings, decided only by your final choice: **The Bloodline Keeper** or **The Broken Seal**.

### Two modes, one story

|                                    | Classic Story Mode                             | AI-Enhanced Mode                                                               |
| ---------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| Needs an AI key or login           | No                                             | Yes (your own key locally; an access code on the hosted demo)                  |
| Story, sequences, puzzles, endings | Fully authored                                 | Identical                                                                      |
| The Angel                          | Speaks authored lines when you open the locket | Free-text conversation with memory and a personality that follows your choices |
| Extras                             | None                                           | Validated world actions, up to two optional side quests, rare "glitches"       |

If AI fails mid-game (bad key, quota, network), the game falls back to Classic behaviour without losing progress.

### Safety by design

The Angel's LLM can only _propose_ structured actions. The game engine checks every proposal against the world (does the target exist, is it allowed, is it nearby, is it off the critical path) before anything happens. The Angel can never set story flags, force an ending or block the good ending.

### Technology

React, Vite, TypeScript, Three.js with React Three Fiber, Zustand, zod, Node.js, Vitest, Playwright. Hosted on Vercel (static client plus Vercel Functions) with Upstash Redis for AI quotas. LLM access through generic OpenAI-compatible and Anthropic-compatible adapters. Voice by ElevenLabs (pre-generated). Models made in Blender.

## Prerequisites

| Tool    | Version                                      | Notes                                   |
| ------- | -------------------------------------------- | --------------------------------------- |
| Node.js | 24 LTS recommended, 22.18 minimum            | Check with `node -v` (`.nvmrc` says 24) |
| npm     | 10 or newer (ships with Node)                | Check with `npm -v`                     |
| Git     | any recent version                           |                                         |
| Browser | Desktop Chrome, Edge or Firefox with WebGL 2 | Safari and mobile are not supported     |
| OS      | Windows 10/11, macOS, Linux                  |                                         |

No other global tools are needed. Blender, ElevenLabs and image generation are only needed to _create_ assets, not to run the game.

## Quick start

```bash
git clone https://github.com/fanverseio/thelasthouseonmaplestreet.git
cd thelasthouseonmaplestreet
npm install
npm run dev
```

- `npm run dev` starts both services with one command:
  - the game client (Vite) on **http://localhost:5173**
  - the local API server on **http://127.0.0.1:3000** (the client proxies `/api` to it)
- Open **http://localhost:5173** in a desktop browser.
- **Verify it is running**:
  - The terminal shows `[client] ... Local: http://localhost:5173/` and `[api] Listening on http://127.0.0.1:3000`.
  - `http://localhost:5173` shows the content warning. Continue opens the main menu. `http://localhost:5173/?bootcheck` shows the developer check page with **API: ok**, the AI provider status, WebGL 2 status and a small foggy test scene.
  - `http://127.0.0.1:3000/api/health` returns `{"ok":true,"version":"0.1.0","mode":"local",...}`.
  - Developer shortcuts (dev server only, never in a built game): open one of these URLs before choosing New Game, then Classic Story Mode: `?start=street`, `?start=garden`, `?start=house66`, `?start=lane`, `?start=grounds`, `?start=interior`, `?start=ritual-door`, `?start=ritual`, `?start=ritual-choice` or `?start=training` (all three spells unlocked and a practice hound about 6 m from the spawn, to try Purify and Ward; it changes no progress). Each lands at the matching checkpoint of the story (see `.kiro/specs/the-last-house/docs/playtest-plan.md` for what each one sets). In the dev server, F9 sets Elena's health to 0 so death and respawn can be tested by hand (it does nothing in a built game).
- In the game, click the screen to capture the mouse (WASD, Shift, mouse look, Esc to pause).
- **Stop**: press `Ctrl+C` in the terminal running `npm run dev`. Both services stop. If one service crashes, the runner stops the other.
- **No `.env` is needed.** Without one, the game runs with default ports and Classic Mode only.

## Environment configuration

Copy the example file only if you want AI mode, custom ports or asset tools:

```bash
cp .env.example .env            # macOS / Linux
Copy-Item .env.example .env     # Windows PowerShell
```

Never commit `.env` (it is git-ignored). Never paste real keys into issues, logs or chat transcripts.

| Variable                                                                                                                                       | Needed for                                             | Required?                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------- |
| `APP_MODE`                                                                                                                                     | `local` (default) or `hosted`                          | Optional locally                             |
| `PORT`, `CLIENT_PORT`                                                                                                                          | API and client ports (3000, 5173)                      | Optional                                     |
| `LLM_PROTOCOL`                                                                                                                                 | `openai`, `anthropic` or `mock`                        | Optional locally (can be set in the game UI) |
| `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`                                                                                                     | Your AI provider                                       | Optional locally; required for hosted AI     |
| `LLM_PRICE_INPUT_PER_MTOK`, `LLM_PRICE_OUTPUT_PER_MTOK`                                                                                        | Spend ceiling on hosted                                | Hosted only                                  |
| `ACCESS_CODE_HASHES`, `SESSION_SECRET`, `SESSION_TTL_MINUTES`                                                                                  | Hosted access codes and sessions                       | Hosted only                                  |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`                                                                                           | Hosted quota storage                                   | Hosted only                                  |
| `AI_SPEND_CEILING_USD`, `QUOTA_CHAT_PER_CODE`, `QUOTA_CHAT_PER_SESSION`, `RATE_LIMIT_PER_MINUTE`, `CONCURRENCY_PER_CODE`, `CONCURRENCY_GLOBAL` | Hosted limits                                          | Hosted (rate limit also local)               |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_MODEL_ID`, `ELEVENLABS_VOICE_ID_*`                                                                           | Generating voice lines; optional live Angel voice      | Asset tools (and optional live voice)        |
| `FEATURE_LIVE_TTS`, `QUOTA_TTS_CHARS_PER_CODE`                                                                                                 | Optional live Angel voice                              | Optional                                     |
| `IMAGE_GEN_API_KEY`, `IMAGE_GEN_BASE_URL`, `IMAGE_GEN_MODEL`                                                                                   | Generating images                                      | Asset tools only                             |
| `RAW_ASSET_DIR`                                                                                                                                | Where raw generated files go (`./assets/raw`, ignored) | Asset tools only                             |

`.env.example` documents every variable with safe placeholder values.

## For AI Coding Agents

This section is for any coding agent with terminal and file access (Kiro, Claude Code, Cursor, Copilot, Codex, Aider or similar). Nothing here requires Kiro.

**Check the current state first.** Read the project status at the top of this file and the checkboxes in `.kiro/specs/the-last-house/tasks.md`. Only features that exist can be run; anything marked **Planned, not yet available** cannot. Do not scaffold missing parts or invent commands to fill the gap; report what is missing instead.

Follow these steps in order:

1. **Read** this `README.md`, then `.kiro/specs/the-last-house/PRD.md`, `.kiro/specs/the-last-house/ARCHITECTURE.md`, `.kiro/specs/the-last-house/tasks.md`, and the relevant files in `.kiro/steering/` (`product.md`, `tech.md`, `structure.md`).
2. **Inspect before acting**: read the `package.json` scripts, `.env.example`, the workspace folders and the lockfile. Only use scripts that actually exist.
3. **Check the tools**: `node -v` (22.18 or newer, 24 recommended; the server runs TypeScript directly, which needs 22.18+) and `npm -v` (10 or newer). If Node is too old, tell the user how to upgrade; do not change project files to work around it.
4. **Install only if needed**: if `node_modules` is missing or `package-lock.json` changed, run `npm install` (or `npm ci` for a clean, exact install). Do not delete `node_modules` or the lockfile unless an install error requires it, and say so.
5. **Environment**: if `.env` does not exist and the user wants AI mode, copy `.env.example` to `.env`. **Never overwrite an existing `.env`.** Never print, log or commit its values.
6. **Credentials**: Classic Mode needs none; start it without asking. For AI mode, ask the user for their provider protocol, base URL, model and API key. Never invent credentials, and never use keys found elsewhere on the machine. `LLM_PROTOCOL=mock` lets you test AI mode with no key.
7. **Run** `npm run dev`. It is long-running: start it as a background process if your environment supports that, or ask the user to run it in their own terminal.
8. **Diagnose ordinary setup errors** (port in use, missing dependency, wrong Node version, proxy errors) using [Troubleshooting](#troubleshooting). Do not change the approved architecture, gameplay, specs or steering to make setup pass.
9. **Verify**: `http://127.0.0.1:3000/api/health` returns `ok: true`, and `http://localhost:5173/?bootcheck` shows the check page with **API: ok**. Optionally run `npm run typecheck`, `npm run lint`, `npm test` and `npm run check`; all should pass.
10. **Report** to the user: the local game URL, which services are running and on which ports, whether AI mode is configured, and anything still missing.
11. **Never** deploy, publish, commit or push as part of setup.

## Local AI configuration (bring your own key)

**Planned, not yet available.** BYOK works only in the local build. The hosted demo uses one fixed server-side provider and an access code.

Two ways to configure a provider locally:

1. **In the game**: New Game -> AI-Enhanced Mode -> enter protocol, base URL, model and API key. The key is sent to your local API server and kept **in memory only** until the server stops.
2. **In `.env`**: set `LLM_PROTOCOL`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`, then restart `npm run dev`.

Supported protocols (any provider that speaks them):

| Protocol    | API format                   | Example base URLs (check your provider's current docs)                         |
| ----------- | ---------------------------- | ------------------------------------------------------------------------------ |
| `openai`    | OpenAI Chat Completions      | `https://api.deepseek.com`, `https://api.x.ai/v1`, `https://api.minimax.io/v1` |
| `anthropic` | Anthropic Messages           | `https://api.deepseek.com/anthropic`                                           |
| `mock`      | No network; scripted replies | (none)                                                                         |

Base URLs must use `https://`, or `http://localhost` / `http://127.0.0.1` for a model server on your own machine.

**Where your key goes**: only into your local server's memory (UI) or your local `.env` file. It is never written to game saves, browser localStorage, logs or git.

**Test the Angel**: start AI-Enhanced Mode, leave the house, press **T** and type. Near a streetlight, try "Can you make that light flicker?": the light should flicker after you close the locket. Ask it to "end the game": it answers, but nothing happens.

**Classic Mode without AI**: choose Classic Story Mode at New Game. No key, no network AI, no login.

## Controls

| Key               | Action                                                                 |
| ----------------- | ---------------------------------------------------------------------- |
| W A S D           | Move                                                                   |
| Mouse             | Look                                                                   |
| Shift             | Sprint                                                                 |
| E                 | Interact (hold to skip a cinematic)                                    |
| T                 | Open or close the Whispering Locket                                    |
| Left mouse button | Cast the selected spell (hold to charge Arcane Bolt or channel Purify) |
| 1 / 2 / 3         | Arcane Bolt / Purify / Ward                                            |
| Esc               | Pause or close an overlay                                              |

## Project structure

```
apps/client/                Game client (Vite + React + R3F)
  src/ui/                   Screens, HUD and boot check; locket later
  src/scene/                3D view components (test scene now)
  src/store/                Zustand stores (game state, settings)
  src/services/             API client
  src/game/                 Headless game systems (no React/Three imports)          
  src/content/              Authored data: world, flags, beats, dialogue            
  public/assets/            Final game assets (committed)                   [planned]
  e2e/                      Playwright browser tests                                
apps/server/src/            Local API server and shared request handlers
  handlers/                 health, config/status (access, chat, tts later)
  local.ts                  Local server entry point (port 3000)
packages/shared/src/        zod schemas and types shared by client, server and saves
scripts/                    dev.mjs (runs both services), check-secrets.mjs, check-readme-sync.mjs
api/                        Vercel Function entry points (hosted)           [planned]
tools/                      Asset generation and access-code tools          [planned]
assets/src/  assets/raw/    Blender sources; raw generator output (ignored)
.github/workflows/ci.yml    CI: typecheck, lint, test, check, build
.kiro/steering/             Always-on project rules (product, tech, structure, canon, story flow, memory)
.kiro/specs/the-last-house/ PRD, architecture, requirements, design, tasks, docs/
.kiro/hooks/                Kiro agent hooks
.kiro/memory/               Development memory (decisions, gotchas, handoffs)
```

Unit tests live next to the code they test (`*.test.ts`, `*.test.mjs`). Playwright tests live in `apps/client/e2e/`.

## Testing and troubleshooting

### Scripts

These match `package.json` exactly (`npm run check` fails if they drift).

| Command             | What it does                                                                            |
| ------------------- | --------------------------------------------------------------------------------------- |
| `npm run dev`       | Client on 5173 and API on 3000, with `[client]`/`[api]` log prefixes; Ctrl+C stops both |
| `npm run build`     | Production build of the client into `apps/client/dist`                                  |
| `npm run preview`   | Serve the production client build locally (static files only, no API)                   |
| `npm test`          | Unit tests for shared, server, client stores and scripts (`vitest --run`)               |
| `npm run test:e2e`  | Playwright browser smoke test (starts the client itself; run `npx playwright install chromium` once first)        |
| `npm run typecheck` | TypeScript checks for the root configs and every workspace                              |
| `npm run lint`      | ESLint for the whole repository                                                         |
| `npm run check`     | Secret scan of tracked and staged files, plus the README/`.env.example` sync check      |

To scan only staged files before a commit: `node scripts/check-secrets.mjs --staged`.

### Troubleshooting

| Problem                                              | Fix                                                                                                         |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `EADDRINUSE` on 3000 or 5173                         | Another process uses the port. Stop it, or set `PORT` / `CLIENT_PORT` in `.env`.                            |
| `node: command not found`, or syntax errors on start | Install Node 24 LTS (22.18 minimum). `[dev] Node ... is too old` means the same.                            |
| `[dev] Dependencies are missing`                     | Run `npm install` in the repository root.                                                                   |
| `[api] Configuration error: ...`                     | A value in `.env` is invalid (for example `APP_MODE` or `PORT`); the message names it.                      |
| `npm install` fails with `ERESOLVE`                  | Use the pinned versions in `package.json` and `npm ci`; do not add `--force` or `--legacy-peer-deps`.       |
| Black screen                                         | Your browser or GPU lacks WebGL 2. Use desktop Chrome, Edge or Firefox and update graphics drivers.         |
| No sound                                             | Click once on the warning screen; browsers block audio until you interact.                                  |
| Mouse look stops after Esc                           | Expected: click the game to resume. Browsers block re-locking the mouse for about a second.                 |
| AI mode says the locket is cold                      | Check the `LLM_*` values or re-enter them in the game; try `LLM_PROTOCOL=mock`; check `/api/config/status`. |
| `/api` requests fail in dev                          | Make sure the API started (`[api]` lines in the terminal) and nothing else uses port 3000.                  |

This list will grow with real errors met during development.

### Reset local game progress

Settings -> Reset progress. Or, in the browser devtools console on the game page: `localStorage.removeItem('tlh.save')`. Settings are stored separately under `tlh.settings`.

### Smoke-test checklist

Works now:

- [ ] `npm run dev` starts both services with no errors.
- [ ] `/api/health` returns `ok: true`, directly on port 3000 and through the client at `http://localhost:5173/api/health`.
- [ ] `/?bootcheck` shows **API: ok** and **WebGL 2: available**, and the foggy test scene renders.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` and `npm run check` all pass.

Planned, not yet available:

- [ ] The warning screen and main menu appear; audio starts after the first click.
- [ ] New Game -> Classic starts in Felix's bedroom; WASD, mouse look and E work.
- [ ] The locket can be found and opened with T.
- [ ] Quitting to the menu shows Continue; Continue resumes at the last checkpoint.
- [ ] AI mode with `LLM_PROTOCOL=mock` answers in the locket.

## How Kiro is used

- **Steering** (`.kiro/steering/`): product rules, tech conventions, structure and story canon (always loaded), and a story-flow summary (loaded for content files).
- **Specs** (`.kiro/specs/the-last-house/`): `requirements.md`, `design.md` and `tasks.md` (Kiro-native, with traceability), plus the PRD, architecture and detailed docs (beat sheet, level manifest, contracts, puzzles, tuning, cinematics, Angel, hosting, assets, scripts).
- **Hooks** (`.kiro/hooks/`): a canon consistency review on story files and a TypeScript quality check on save.
- **Refinement workflow** (`.kiro/steering/spec-implementation-refiner.md`): reviews a feature spec before coding.

## Assets and credits

Final game assets are committed under `apps/client/public/assets/` so a fresh clone runs. Raw generator output in `assets/raw/` is git-ignored. Third-party and generated assets will be listed in `CREDITS.md`.

## License

MIT. See [LICENSE](LICENSE).
