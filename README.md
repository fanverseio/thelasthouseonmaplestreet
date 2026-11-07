# The Last House on Maple Street

> **Project status: specification phase (as of 2026-11-06).** The design specs, steering rules and creative drafts are written. **No application code exists yet.** Every setup command below is marked **Planned, not yet available** until it really exists. Coding agents: read [For AI Coding Agents](#for-ai-coding-agents) before running anything.

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

| Tool    | Version                                      | Notes                               |
| ------- | -------------------------------------------- | ----------------------------------- |
| Node.js | 24 LTS recommended, 22 minimum               | Check with `node -v`                |
| npm     | 10 or newer (ships with Node)                | Check with `npm -v`                 |
| Git     | any recent version                           |                                     |
| Browser | Desktop Chrome, Edge or Firefox with WebGL 2 | Safari and mobile are not supported |
| OS      | Windows 10/11, macOS, Linux                  |                                     |

No other global tools are needed. Blender, ElevenLabs and image generation are only needed to _create_ assets, not to run the game.

## Quick start

**Planned, not yet available.** These commands will work once section 1 (Foundations) of `.kiro/specs/the-last-house/tasks.md` lands.

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
- **Verify it is running**: the photosensitivity warning appears, then the main menu. `http://127.0.0.1:3000/api/health` returns `{"ok":true,"mode":"local",...}`.
- **Stop**: press `Ctrl+C` in the terminal running `npm run dev`. Both services stop.
- **No `.env` is needed for Classic Story Mode.**

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

**Check the current state first.** If there is no `package.json` at the repository root, the project is still in the specification phase. Do not invent commands, scaffold the app or install packages. Tell the user the game cannot be run yet, and point them to `.kiro/specs/the-last-house/tasks.md`.

When code exists, follow these steps in order:

1. **Read** this `README.md`, then `.kiro/specs/the-last-house/PRD.md`, `.kiro/specs/the-last-house/ARCHITECTURE.md`, `.kiro/specs/the-last-house/tasks.md`, and the relevant files in `.kiro/steering/` (`product.md`, `tech.md`, `structure.md`).
2. **Inspect before acting**: read the `package.json` scripts, `.env.example`, the workspace folders and the lockfile. Only use scripts that actually exist.
3. **Check the tools**: `node -v` (22 or newer, 24 recommended) and `npm -v` (10 or newer). If Node is too old, tell the user how to upgrade; do not change project files to work around it.
4. **Install only if needed**: if `node_modules` is missing or the lockfile changed, run `npm install`. Do not delete `node_modules` or the lockfile unless an install error requires it, and say so.
5. **Environment**: if `.env` does not exist and the user wants AI mode, copy `.env.example` to `.env`. **Never overwrite an existing `.env`.** Never print, log or commit its values.
6. **Credentials**: Classic Mode needs none; start it without asking. For AI mode, ask the user for their provider protocol, base URL, model and API key. Never invent credentials, and never use keys found elsewhere on the machine. `LLM_PROTOCOL=mock` lets you test AI mode with no key.
7. **Run** `npm run dev`. It is long-running: start it as a background process if your environment supports that, or ask the user to run it in their own terminal.
8. **Diagnose ordinary setup errors** (port in use, missing dependency, wrong Node version, proxy errors) using [Troubleshooting](#troubleshooting). Do not change the approved architecture, gameplay, specs or steering to make setup pass.
9. **Verify**: `http://127.0.0.1:3000/api/health` returns `ok: true`, and `http://localhost:5173` shows the warning screen, then the menu.
10. **Report** to the user: the local game URL, which services are running and on which ports, whether AI mode is configured, and anything still missing.
11. **Never** deploy, publish, commit or push as part of setup.

## Local AI configuration (bring your own key)

**Planned, not yet available.** BYOK works only in the local build. The hosted demo uses one fixed server-side provider and an access code.

Two ways to configure a provider locally:

1. **In the game**: New Game -> AI-Enhanced Mode -> enter protocol, base URL, model and API key. The key is sent to your local API server and kept **in memory only** until the server stops.
2. **In `.env`**: set `LLM_PROTOCOL`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`, then restart `npm run dev`.

Supported protocols (any provider that speaks them):
| Protocol | API format | Example base URLs (check your provider's current docs) |
|---|---|---|
| `openai` | OpenAI Chat Completions | `https://api.deepseek.com`, `https://api.x.ai/v1`, `https://api.minimax.io/v1` |
| `anthropic` | Anthropic Messages | `https://api.deepseek.com/anthropic` |
| `mock` | No network; scripted replies | (none) |

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
api/                        Vercel Function entry points (hosted)          [planned]
apps/client/                Game client (Vite + React + R3F)               [planned]
  public/assets/            Final game assets (committed)                  [planned]
  src/game/                 Headless game systems (no React/Three imports) [planned]
  src/scene/  src/ui/       3D view components; HUD, menus, locket         [planned]
  src/content/              Authored data: world, flags, beats, dialogue   [planned]
apps/server/src/            Shared API handlers, LLM adapters, limits      [planned]
packages/shared/            zod schemas and types shared by client/server  [planned]
scripts/                    Dev runner and repo checks                     [planned]
tools/                      Asset generation and access-code tools         [planned]
assets/src/  assets/raw/    Blender sources; raw generator output (ignored)
.kiro/steering/             Always-on project rules (product, tech, structure, canon, story flow)
.kiro/specs/the-last-house/ PRD, architecture, requirements, design, tasks, docs/
.kiro/hooks/                Kiro agent hooks
```

Tests will live next to the code they test (`*.test.ts`) plus Playwright tests in `apps/client/e2e/`.

## Testing and troubleshooting

### Scripts (planned, not yet available)

| Command             | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Client on 5173 and API on 3000                    |
| `npm run build`     | Production build of the client and server         |
| `npm run preview`   | Serve the production build locally                |
| `npm test`          | Unit, content and headless tests (`vitest --run`) |
| `npm run test:e2e`  | Playwright browser smoke tests                    |
| `npm run typecheck` | TypeScript checks for all workspaces              |
| `npm run lint`      | ESLint                                            |
| `npm run check`     | Secret scan and README/env sync checks            |

This table will be updated to match `package.json` exactly when the scripts exist.

### Troubleshooting

| Problem                                              | Fix                                                                                                         |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `EADDRINUSE` on 3000 or 5173                         | Another process uses the port. Stop it, or set `PORT` / `CLIENT_PORT` in `.env`.                            |
| `node: command not found`, or syntax errors on start | Install Node 24 LTS (22 minimum).                                                                           |
| Black screen                                         | Your browser or GPU lacks WebGL 2. Use desktop Chrome, Edge or Firefox and update graphics drivers.         |
| No sound                                             | Click once on the warning screen; browsers block audio until you interact.                                  |
| Mouse look stops after Esc                           | Expected: click the game to resume. Browsers block re-locking the mouse for about a second.                 |
| AI mode says the locket is cold                      | Check the `LLM_*` values or re-enter them in the game; try `LLM_PROTOCOL=mock`; check `/api/config/status`. |
| `/api` requests fail in dev                          | Make sure the API started (`[api]` lines in the terminal) and nothing else uses port 3000.                  |

This list will grow with real errors met during development.

### Reset local game progress

Settings -> Reset progress. Or, in the browser devtools console on the game page: `localStorage.removeItem('tlh.save')`. Settings are stored separately under `tlh.settings`.

### Smoke-test checklist

- [ ] `npm run dev` starts both services with no errors.
- [ ] `/api/health` returns `ok: true`.
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
