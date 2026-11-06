---
inclusion: always
---
# Repository Structure

```
apps/client/src/
  game/      # headless systems: player, collision, interaction, spells, enemies, combat,
             # quests, dialogue, morality, horror, angel, save, audio-logic
  scene/     # R3F components (view only)
  ui/        # HUD, menus, locket UI
  store/     # Zustand slices
  content/   # world manifest, quests, dialogue, sequences, sidequests (typed data)
  services/  # api client, audio engine, storage
apps/server/src/  routes/ auth/ llm/ limits/
packages/shared/  schemas, types, constants
assets/           # .blend sources and exported GLB
.kiro/steering/   # always-on project rules
.kiro/specs/      # specs and design docs
```

## Naming
- Entity IDs: `kind.zone.name`, lowercase, e.g. `door.home.front`, `light.street.03`, `clue.garden.diary`.
- Zone IDs: `home`, `street`, `neighbour_garden`, `gartner_hideout`, `last_house_exterior`, `last_house_interior` (may be revised by the level manifest).
- Files: kebab-case. Types: PascalCase. Constants: UPPER_SNAKE.
- One system per file in `game/`, each exports a pure `step(state, dt, input)` style function where practical.