# The Last House on Maple Street

A first-person 3D psychological horror game for desktop browsers, built for the Kiroween 2026 hackathon.

It is Halloween night. Elena's eight-year-old son Felix has vanished from Maple Street, and the street is changing. Elena finds her grandmother's Whispering Locket, wakes the Angel inside it, and follows Felix's trail to the Last House, where an ancient evil is sealed beneath the floor.

> Status: **specification phase**. The specs and steering files are written. Game code has not been started.

## Planned features

- First-person exploration of one compact neighbourhood, with fog, moonlight and in-engine cinematics.
- Magic combat with three spells: **Arcane Bolt**, **Purify** and **Ward**. Purify or destroy corrupted people. Your choices shape the Angel.
- Six authored horror sequences, two mini-bosses and a final ritual encounter instead of a health-bar boss.
- Exactly two endings, decided only by your final choice: **The Bloodline Keeper** and **The Broken Seal**.
- About 25 to 30 minutes for a first playthrough.

### Two modes, one story

| | Classic Story Mode | AI-Enhanced Mode |
|---|---|---|
| Needs an LLM or API key | No | Yes (OpenAI or Gemini) |
| Story, horror sequences, endings | Fully authored | Same, unchanged |
| Angel | Prewritten dialogue, reacts to your choices | Free-text conversation, memory, personality drift |
| Extras | None | Validated world actions, up to two optional side quests, rare Angel glitches |

Both modes share the same progression flags and save format. If the AI becomes unavailable mid-game, the game falls back to Classic Mode without losing progress.

### Safety by design

The Angel can only propose structured actions. The game engine checks that the target exists, is allowed, is nearby, and is not on the critical path before anything happens. The Angel cannot force an ending, skip a quest or block the good ending.

## Controls

| Key | Action |
|---|---|
| W A S D | Move |
| Mouse | Look |
| Shift | Sprint |
| E | Interact |
| T | Open or close the Whispering Locket |
| Left mouse button | Cast the selected spell |
| 1 / 2 / 3 | Arcane Bolt / Purify / Ward |
| Esc | Pause |

## Tech stack

React, Vite, TypeScript, Three.js with React Three Fiber, Zustand, Node.js, zod, Vitest and Playwright. Models are made in Blender. The Angel's voice is optional and generated with ElevenLabs.

## Getting started (once code exists)

```bash
npm install
cp .env.example .env     # on Windows PowerShell: Copy-Item .env.example .env
npm run dev
```

Classic Mode needs no keys. For AI-Enhanced Mode on a local build, choose a provider and enter your API key in the game. The key is held in the server's memory for the session. It is never written to saves, logs or browser storage.

## Environment and generated assets

- `.env` holds local settings and keys. It is git-ignored. `.env.example` lists every variable with empty values.
- Voice lines and generated graphics are produced locally with the asset tooling and written to `assets/voice/` and `assets/generated/`. These folders are git-ignored.
- Because generated assets are not in the repository, the repo must include scripts and documentation to regenerate them, or a fallback that uses placeholders, so the project stays runnable from source.

Never commit API keys.

## How Kiro is used in this project

- **Steering** (`.kiro/steering/`): product rules, tech conventions, repository structure and story canon, loaded into every session.
- **Specs** (`.kiro/specs/the-last-house/`): requirements, design and atomic tasks, plus reference docs for the PRD, architecture, shared contracts, input and UX, the Angel's technical design, hosting and ops, asset conventions and the submission checklist.
- **Hooks** (`.kiro/hooks/`): automation for tests, content validation and secret scanning as the project grows.

## Project documents

- `.kiro/specs/the-last-house/PRD.md`: product requirements.
- `.kiro/specs/the-last-house/ARCHITECTURE.md`: system design.
- `.kiro/specs/the-last-house/docs/`: contracts, input and UX, Angel technical spec, hosting, assets, submission checklist.

## License

MIT. See [LICENSE](LICENSE).