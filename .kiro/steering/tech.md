---
inclusion: always
---
# Tech Stack and Conventions

- Monorepo (npm workspaces): `apps/client`, `apps/server`, `packages/shared`. Node 24 LTS recommended, Node 22 minimum. npm 10+.
- Client: React + Vite + TypeScript (strict), Three.js via React Three Fiber + drei, Zustand, @react-three/postprocessing. Plain WebAudio.
- Server: TypeScript request handlers in `apps/server/src/handlers/`, shared by two entry points: Vercel Functions in `/api` (hosted) and a small Node `http` server (local, port 3000).
- LLM: generic adapters for the OpenAI Chat Completions format and the Anthropic Messages format, configured by protocol, base URL, model and key. A `mock` protocol works with no key. No vendor-specific adapters.
- Hosted usage store: Upstash Redis (Vercel Marketplace). Local mode uses an in-memory store with the same interface.
- Validation: zod schemas in `packages/shared`, used by client, server and saves.
- Tests: Vitest (unit, property via seeded loops, headless simulation), Playwright (browser smoke). Always `vitest --run`, never watch mode, in automated runs.
- Assets: Blender -> GLB (meshopt, KTX2). Final exports in `apps/client/public/assets/` (committed). Raw output in `assets/raw/` (ignored).

## Rules
- Game logic is plain TypeScript in `apps/client/src/game/` with no React or Three imports, so it runs headless.
- Fixed 60 Hz simulation. Hot data stays out of Zustand.
- Every interactive object has a stable ID (`kind.zone.name`) and declared capabilities in `content/world/`.
- Progress is a single set of progression flags shared by both modes. Gates open only from flags.
- Authored and Angel-triggered world changes use the same effect functions. The Angel gets a restricted effect API.
- Content is typed data, validated by tests and at startup.
- BYOK and custom LLM endpoints exist only when `APP_MODE=local`. Hosted handlers never accept a URL or key from the client.
- Pin exact dependency versions. No new dependency without need; flag it for approval.
- Never log keys, cookies, access codes or full request bodies. Never write secrets to tracked files.
- Never add `.kiro/` to `.gitignore`.
- **README sync**: any change to scripts, ports, env vars, prerequisites or setup updates `README.md` and `.env.example` in the same change. Never document a command that does not exist.

Details: #[[file:.kiro/specs/the-last-house/ARCHITECTURE.md]]