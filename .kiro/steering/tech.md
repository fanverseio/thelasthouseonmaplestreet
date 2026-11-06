---
inclusion: always
---
# Tech Stack and Conventions

- Monorepo (npm workspaces): `apps/client`, `apps/server`, `packages/shared`.
- Client: React + Vite + TypeScript (strict), Three.js via React Three Fiber + drei, Zustand, @react-three/postprocessing.
- Server: Node.js + TypeScript, serves the built client and the Angel API. LLM provider adapters for OpenAI and Gemini. ElevenLabs is optional behind a flag.
- Validation: zod schemas in `packages/shared`, used by client, server and saves.
- Tests: Vitest (unit, property, headless simulation), Playwright (browser smoke). Use `vitest --run`, never watch mode, in automated runs.
- Assets: Blender -> GLB (meshopt/Draco, KTX2 textures).

## Rules
- Game logic is plain TypeScript in `apps/client/src/game/` with no React or Three imports, so it runs headless in tests. R3F components only render and forward input.
- Simulation runs at a fixed 60 Hz timestep. Hot data (projectiles, positions) stays out of Zustand.
- Every interactive object has a stable string ID (`kind.zone.name`) and declared capabilities in `content/world/`.
- Authored and Angel-triggered world changes use the same effect functions.
- Content (quests, dialogue, sequences) is typed data, validated by tests at startup and in CI.
- Pin exact dependency versions. Do not add dependencies without need.
- Never log request bodies containing keys or the key itself. Never write secrets to files tracked by git.
- Never add `.kiro/` to `.gitignore` (hackathon rule).

Details: #[[file:.kiro/specs/the-last-house/ARCHITECTURE.md]]