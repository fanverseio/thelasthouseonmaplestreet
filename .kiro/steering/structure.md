---
inclusion: always
---
# Repository Structure

```
api/                    # Vercel Function entry points (thin wrappers over handlers)
apps/client/
  public/assets/        # final optimised assets (committed): models, textures, audio, vo
  src/
    game/               # headless systems: player, collision, interaction, progression, gates,
                        # cinematics, spells, enemies, combat, puzzles, morality, angel, save
    scene/              # R3F components (view only)
    ui/                 # HUD, menus, locket, puzzle overlays
    store/              # Zustand slices
    content/            # world manifest, flags, beats, sequences, dialogue, puzzles, sidequests
    services/           # api client, audio engine, storage
apps/server/src/
  handlers/             # shared request handlers (health, access, config, angel)
  llm/                  # openai/anthropic/mock adapters
  limits/               # quotas, rate, concurrency, spend ceiling
  store/                # usage store: upstash (hosted), memory (local)
  local.ts              # local Node http server entry
packages/shared/        # zod schemas, types, constants
assets/raw/             # raw generator output (git-ignored)
assets/src/             # .blend sources (committed if reasonably sized)
tools/                  # asset generation and access-code scripts
scripts/                # dev runner and repo checks
.kiro/steering/  .kiro/specs/
```

## Zones
`home`, `street`, `garden`, `hideout`, `house66`, `lane`, `grounds`, `interior`, `ritual`.
Two scenes: **exterior** (all zones except interior and ritual) and **last_house** (interior, ritual), lazy-loaded.

## Naming
- Entity IDs: `kind.zone.name`, lowercase, e.g. `door.home.front`, `light.street.intersection`, `gate.house66.lane`.
- Progression flags: lowercase snake case, e.g. `locket_taken`, `seq3_done`.
- Voice lines: `vo_<character>_<id>`. Audio: `amb_`, `sfx_`, `mus_`.
- Files kebab-case. Types PascalCase. Constants UPPER_SNAKE.
- One system per file in `game/`, exporting pure functions where practical.