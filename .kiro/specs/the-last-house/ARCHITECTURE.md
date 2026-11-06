# Architecture: The Last House on Maple Street

## 1. Stack

- **Client**: React + Vite + TypeScript, Three.js via React Three Fiber (+ drei), Zustand, Howler or WebAudio for sound.
- **Server**: Node.js + TypeScript (Fastify or Express), serves the built client and the Angel API.
- **LLM**: provider adapters (OpenAI, Gemini). Optional ElevenLabs TTS.
- **Assets**: Blender -> glTF/GLB (Draco/meshopt compressed).
- **Tests**: Vitest (unit), Playwright (browser smoke/e2e).
- **Monorepo** (npm workspaces).

## 2. Repository Layout

```
/
  apps/
    client/            # Vite React app
      src/
        game/          # engine-side systems (no React)
        scene/         # R3F components
        ui/            # HUD, menus, locket UI
        store/         # Zustand stores
        content/       # authored data (quests, dialogue, events, world)
        services/      # API client, audio, storage
    server/            # Node API + static host
      src/
        routes/ auth/ llm/ validation/ limits/
  packages/
    shared/            # types, zod schemas, constants (client + server)
  assets/              # Blender sources (.blend), exports
  .kiro/specs/the-last-house/
```

## 3. Core Principles

1. **Deterministic core**. The authored story runs on a data-driven state machine with no dependency on the LLM.
2. **LLM proposes, engine disposes**. All AI output is parsed against a schema and validated before any effect.
3. **One state, two modes**. `mode` is a flag (`classic | ai`); both use identical systems and save format.
4. **Systems separate from rendering**. Game logic is plain TypeScript (testable headless); R3F only renders and feeds input.
5. **Everything interactive has a stable ID and declared capabilities.**

## 4. Client Architecture

### 4.1 Game Loop

A fixed-timestep simulation (60 Hz) driven from R3F `useFrame`, with systems run in order:
`Input -> Player -> Interaction -> Enemy AI -> Combat -> Quests -> Horror Director -> Angel Director -> World Effects -> Audio`.
Pause (`locket`, `pause`, `cutscene`) halts the simulation but not rendering.

### 4.2 Systems (in `game/`)

| System              | Responsibility                                                                          |
| ------------------- | --------------------------------------------------------------------------------------- |
| `PlayerController`  | Pointer lock, WASD/sprint, capsule vs. simple colliders (AABB/cylinder), no jump/crouch |
| `Collision`         | Static AABB list per zone, spatial grid for dynamic entities                            |
| `InteractionSystem` | Ray/sphere query for nearest interactable, prompt, `E` handling                         |
| `WorldRegistry`     | Registry of entities by stable ID with capabilities and state                           |
| `SpellSystem`       | Spell defs, cooldown, magic cost, projectiles, ward                                     |
| `EnemySystem`       | Per-enemy state machine (see 4.3)                                                       |
| `CombatSystem`      | Damage, hit resolution, weaken threshold, purify/destroy outcomes                       |
| `QuestSystem`       | Main quest graph + optional quest templates, objective evaluation                       |
| `DialogueSystem`    | Authored lines selected by quest, zone, morality band                                   |
| `MoralitySystem`    | Hidden value, event deltas, bands (dark/neutral/kind), exposes to locket visuals        |
| `HorrorDirector`    | Authored sequence runner + atmosphere effect library + AI-mode variation hook           |
| `AngelDirector`     | Mode switching, request orchestration, glitch scheduler, action validator/executor      |
| `SaveSystem`        | Serialise/migrate/load via `SaveStorage` interface                                      |
| `AudioSystem`       | Buses, positional audio, ambient layers, stingers                                       |

### 4.3 Enemy State Machine

`idle | patrol -> chase -> attack`, with `stunned` (entered at HP <= weakenThreshold), then `purified` or `destroyed`. Stunned has a timer long enough for a choice (default 8 s, reset on repeated hit, paused while locket is open). Movement: steer toward target, raycast against static colliders, slide along walls. Smoke entity in the finale uses a separate projectile/zone pattern, not this FSM.

### 4.4 State (Zustand)

Slices, with the pure game data kept serialisable:

- `gameStore`: mode, phase (menu/playing/paused/locket/cutscene/ended), checkpoint id, flags.
- `playerStore`: hp, magic, selected spell, unlocked spells, position/yaw (for checkpoint).
- `worldStore`: entity states by ID (opened doors, revealed clues, lights, enemy states, anchor states).
- `questStore`: main quest step, objectives, optional quest state, completed events.
- `moralityStore`: value, history of deltas (for the summary).
- `angelStore`: memory (see 6), chat history, connection status, glitch cooldowns.
- `settingsStore`: graphics preset, volumes, sensitivity (separate from saves).

Systems read/write via store actions; no component mutates state directly. Simulation-hot data (projectiles, positions) lives in plain mutable structures inside systems, not in Zustand, and is snapshotted on save.

## 5. World Model

### 5.1 Zones

`home`, `street`, `neighbour_garden`, `gartner_hideout`, `last_house_exterior`, `last_house_interior`. Each zone: bounds, collider set, spawn points, light rig, ambient audio bed. Zones are lazy-loaded (GLB + data JSON).

### 5.2 Entity Registry

```ts
type EntityId = string; // e.g. "door.home.front", "light.street.03", "clue.garden.diary"
interface WorldEntity {
  id: EntityId;
  kind:
    | "door"
    | "light"
    | "clue"
    | "item"
    | "enemy"
    | "anchor"
    | "mirror"
    | "spawn"
    | "prop";
  zone: ZoneId;
  capabilities: Capability[]; // e.g. 'interactable', 'angelFlicker', 'angelUnlock'
  critical: boolean; // critical entities are immune to destructive Angel actions
  state: Record<string, unknown>; // serialisable
}
```

Capabilities are the single source of truth for what the Angel may touch. World content is authored in `content/world/*.ts` (typed, validated at startup).

### 5.3 Rendering

- Greybox first (boxes with a debug material), swapped for GLB by entity/prop ID without logic changes.
- Fog (`FogExp2`), single directional moon light with a shadow map, a few point lights per zone (budgeted), post-processing (vignette, film grain, light bloom, colour grade) via `@react-three/postprocessing`.
- Quality presets (low/med/high): shadow map size, post FX, render scale, light count.
- Instancing for trees, fences, gravestones. Draco/meshopt + KTX2 textures.

## 6. Angel AI

### 6.1 Modes and Fallback

```
mode: 'classic' | 'ai'
aiStatus: 'unavailable' | 'ready' | 'degraded'
```

`AngelDirector.respond(playerText)`:

- classic: `DialogueSystem` picks a prewritten line by (quest step, zone, morality band, last trigger). Free text is mapped by simple keyword/intent matching to a small set of authored responses with a graceful "the locket stays quiet" default.
- ai: calls server; on timeout/error/credit exhaustion sets `aiStatus='degraded'`, falls through to classic, shows a subtle in-fiction message. A background retry with backoff flips back to `ready`; on recovery the next request carries a full state snapshot.

### 6.2 Memory

```ts
interface AngelMemory {
  facts: StateSnapshot; // structured: clues found, characters met, quests, choices, location, morality band
  summary: string; // compact running summary, <= ~800 tokens, rewritten every N events
  recent: ChatTurn[]; // last ~10 turns
  eventLog: GameEvent[]; // short typed log feeding the summarizer
  sideQuestsOffered: number;
}
```

Summary update is deterministic first (template from event log); in AI mode an optional cheap LLM pass compresses it. Everything is serialisable and stored in the save.

### 6.3 Request/Response Contract

Client -> Server `POST /api/angel/chat`:

```ts
{ playerText, snapshot: StateSnapshot, summary, recent, allowedActions: ActionDescriptor[], mode }
```

Server prompt = **canon block** (immutable facts, including Gartner's innocence and the prohibitions) + persona by morality band + snapshot + summary + recent + action catalog + output schema. Response, validated with zod server-side and re-validated client-side:

```ts
{
  speech: string,                 // max length enforced
  tone: 'warm'|'wry'|'cold'|'urgent'|'playful',
  proposedActions?: Array<{ type: ActionType; targetId?: string; params?: Record<string, number|string> }>, // max 2
  sideQuestOffer?: { templateId: string; targetId: string }
}
```

Use provider JSON-schema / function-calling modes. Reject and fall back to speech-only on parse failure.

### 6.4 Action Validator (client-side, authoritative)

Pipeline for each proposed action; failure of any check drops the action silently (speech still shown):

1. Type is in the whitelist and mode is `ai`.
2. Target entity exists in `WorldRegistry`.
3. Entity declares the matching capability (`angelFlicker`, `angelUnlock`, ...).
4. Entity is not `critical` for destructive types; item/quest consumption is never an allowed action type.
5. Player is in the entity's zone and within range (if range-limited).
6. Not inside a scripted sequence / cutscene / finale-lock window.
7. Cooldown and per-playthrough budget respected (e.g. restore_magic <= 25, 1 per 90 s).
8. **Story-safety check**: simulate the effect against the quest graph - the main path and the good ending must remain reachable (pure function over state; run in tests).
9. Execute through the same world-effect functions used by authored events (no separate code path).

No action can: set flags, change quest state, select an ending, alter morality directly, or touch finale anchors/choice.

### 6.5 Side Quests

Template library in `content/sidequests/` (e.g. `find_item`, `investigate_location`) with fixed target IDs. Angel can only reference `templateId` + a registered target; the engine checks the cap (2 per run, 1 active) and instantiates. Completion and rewards are engine-driven (small, non-critical rewards).

### 6.6 Glitches

`GlitchScheduler` (client engine): eligible only in AI mode, outside scripted sequences, with min interval and max count per run (e.g. <= 3). When it triggers, it sets a `glitch` hint in the next request (`'malicious_suggestion' | 'unexpected_help'`) or applies an authored glitch effect. The LLM only supplies flavour, and the actions still go through the validator. Glitch effects are from a safe list (e.g. brief light flicker, false warning text, a minor help action).

### 6.7 Prompt-Injection Defence

- Player text is delimited and labelled as untrusted in the prompt.
- Output is schema-validated; unknown fields dropped.
- Authority is entirely in the validator, so jailbreaks cannot cause prohibited effects.
- Speech passes a length cap and a canon-violation filter (simple deny patterns, e.g. Gartner "betrayed/helped the evil") that falls back to a canned line on a hit.
- Server strips/limits history size to cap token cost.

### 6.8 Locket Visuals

`MoralitySystem` exposes a band and a continuous value; the locket mesh/UI reads it for glow colour (warm gold <-> cold violet/red), crack/ornament variants and particle behaviour. No number is exposed to UI.

### 6.9 Voice (Optional)

`POST /api/angel/tts` (ElevenLabs) behind a feature flag, with cached audio keyed by hash for authored lines (pre-generated offline where possible). Text is always shown; voice failure is silent.

## 7. Content Pipeline

- **Quests**: declarative graph (`steps`, `trigger`, `onComplete` effects), typed and validated.
- **Dialogue**: keyed tables `(speaker, context) -> lines[]` with morality-band variants.
- **Horror sequences**: timeline scripts (array of timed/conditional steps: lights, audio, entity spawns, camera nudges, dialogue) run by `HorrorDirector`; each has a stable ID and a completion flag.
- **Content tests**: validate all IDs referenced exist, every main quest step is reachable, both endings are reachable from every checkpoint, no dangling references.

## 8. Save System

```ts
interface SaveFile {
  version: number;              // schema version
  createdAt: string; updatedAt: string;
  mode: 'classic' | 'ai';
  checkpointId: string;
  player: {...}; quests: {...}; morality: {...};
  inventory: string[];
  world: Record<EntityId, unknown>;    // enemy states, doors, clues, anchors
  completedEvents: string[];
  angel: AngelMemory;
}
interface SaveStorage { list(); load(slot); save(slot, file); delete(slot); }
```

- `LocalStorageSaveStorage` (IndexedDB if size demands) is the first implementation; a future `CloudSaveStorage` implements the same interface.
- Migrations: `migrations[v] = (old) => new`, chained on load; unknown future versions refuse to load with a message.
- Autosave at checkpoints. Zod validation on load; corrupt saves are rejected, not crashed on.
- **No secrets, ever**: the schema has no key fields, and a test asserts the serialised blob contains no key-like patterns.

## 9. Server

### 9.1 Endpoints

| Route                       | Purpose                                               |
| --------------------------- | ----------------------------------------------------- |
| `GET /api/health`           | Liveness                                              |
| `POST /api/auth/login`      | Judge login (hosted mode) -> HTTP-only session cookie |
| `POST /api/config/key`      | Local mode: set provider and key (memory only)        |
| `GET /api/config/status`    | Provider, availability, remaining budget (coarse)     |
| `POST /api/angel/chat`      | Angel completion (schema-constrained)                 |
| `POST /api/angel/summarize` | Optional summary compression                          |
| `POST /api/angel/tts`       | Optional voice                                        |

### 9.2 Deployment Modes (`APP_MODE`)

- `local`: no auth; user-supplied key held in process memory; bound to localhost by default.
- `hosted`: login required; server env key; limits enforced.

### 9.3 Security and Cost Control

- Keys only from env or in-memory; log redaction on all key-like values and request bodies' secrets; never echoed to the client.
- Judge credentials: hashed (argon2/scrypt) in env/config; session cookies `HttpOnly`, `Secure`, `SameSite=Lax`; login throttling.
- Rate limits per session and per IP; per-session and global token/request budgets; hard `max_tokens`; request timeout; history size cap.
- When budgets are exhausted, return `503 { fallback: 'classic' }`, which the client handles as a degraded state.
- CORS locked to own origin; helmet headers; body size limit.
- `.env*` git-ignored; secret scanning pre-commit check.

### 9.4 Provider Adapters

`LlmProvider { complete(req): Promise<StructuredResult> }` with `OpenAIProvider` and `GeminiProvider`; selection by config. Retry once on transient errors; classify errors into `quota | auth | timeout | invalid | unknown` for client fallback logic.

## 10. Performance Budget

- Target 60 fps on a mid-range GPU, 30 fps on integrated at the low preset.
- Draw calls < ~300 per frame, max ~6 shadowed lights (1 directional + a few spots), total initial download < ~40 MB, with the Last House interior lazy-loaded.
- Pool projectiles, particles and enemies. Avoid allocations in the frame loop.

## 11. Testing Strategy

- **Unit (Vitest)**: spell/combat math, enemy FSM transitions, quest graph reachability, morality deltas and bands, action validator (including adversarial cases), save migration, schema validation, canon filter.
- **Property/adversarial**: random sequences of validated Angel actions never make the good ending unreachable.
- **Integration**: headless simulation of a full Classic playthrough to each ending; AI-mode run with a mocked provider including failure and recovery.
- **Server**: auth, rate limiting, key redaction, fallback signalling.
- **Browser (Playwright)**: boot, pointer-lock-free smoke path, locket open/close, save/load round trip.
- **Manual**: performance, scare pacing, audio mix, full playthrough on the hosted build.

## 12. Key Decisions Log

| Decision                                             | Rationale                                                   |
| ---------------------------------------------------- | ----------------------------------------------------------- |
| Plain-TS simulation + R3F as view                    | Testable, avoids React render-loop cost                     |
| Registry + capabilities for Angel targets            | Makes validation tractable and safe                         |
| Client-side authoritative validator                  | Game state lives on the client; server only shapes text     |
| Structured snapshot + summary memory                 | Meets the "no vector DB" requirement, cheap and predictable |
| Same effect functions for authored and Angel actions | One code path, fewer bugs                                   |
| Zod shared schemas                                   | One contract for server, client, saves                      |
