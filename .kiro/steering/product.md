---
inclusion: always
---
# Product: The Last House on Maple Street

First-person 3D psychological horror game for desktop browsers, 10-15 minutes, built for Kiroween 2026 (submit by 2026-12-04 2:00 PM PT; feature complete 2026-11-30).

## Two modes, one world
- **Classic**: fully authored, no LLM, no network AI. Must feel complete.
- **AI-Enhanced**: adds live Angel chat, memory, validated world actions, up to 2 optional side quests, rare glitches. The main story stays authored.
- Both modes use the same systems and the same save format. If AI fails, fall back to Classic mid-game with no progress loss.

## Hard product rules
- Exactly two endings. Only the player's final choice decides the ending. Never morality, the LLM or randomness.
- The good ending must always be achievable.
- The morality value (-100..+100) is never shown as a number.
- The LLM proposes, the engine validates. The LLM never executes code or mutates state directly.
- No API keys in saves, logs, git or browser storage.
- Out of scope: crafting, inventory UI, minimap, jump, crouch, stamina, navmesh, vector DBs, boss fight.

## Controls
WASD move, mouse look, Shift sprint, E interact, T locket, LMB cast, 1/2/3 spell, Esc pause.

Full details: #[[file:.kiro/specs/the-last-house/PRD.md]]