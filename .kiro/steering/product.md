---
inclusion: always
---

# Product: The Last House on Maple Street

First-person 3D psychological horror game for desktop browsers. Kiroween 2026 entry, category **Costume Contest**. Submit by **2026-12-04 2:00 PM PT**. Feature complete **2026-11-30**.

## Length and start

- First playthrough ~25-30 min (target ~28.5). Experienced ~18-22 min.
- Beats 1-5 (~first 12.5 min) are demo-critical and get priority polish.
- Everyone starts at Elena's home. No chapter select, no judge start, no shortcuts. Continue resumes a save.
- Progress comes from interactions and objectives, never from clocks. Timings are design targets.

## Two modes, one world

- **Classic**: fully authored and deterministic. No LLM, no network AI. The locket speaks authored lines; no typing. Must feel complete.
- **AI-Enhanced**: free-text Angel chat, memory, validated world actions, at most 2 optional side quests (1 active), rare engine-triggered glitches. The main story, six horror sequences and two endings never change.
- Same systems, progression flags and save format. Any AI failure falls back to Classic mid-game with no progress loss.

## Hard product rules

- Exactly two endings, decided only by the final choice. The ending is final: the save is marked finished.
- The good ending is always achievable, whatever the morality, AI or randomness.
- Morality (-100..+100) is hidden. It changes Angel tone and locket visuals only.
- The LLM proposes, the engine validates. The LLM never executes code or mutates state.
- Hosted AI is unlocked by a private access code (Devpost form). Classic needs no login.
- Saves live in browser localStorage only.
- BYOK and custom endpoints only in the local build. The hosted build uses one fixed server-side provider.
- No API keys in saves, localStorage, logs or git.
- The README must let any coding agent install, configure and run the game locally.

## Out of scope before the hackathon

Google OAuth, public registration, daily free credits, cloud saves, Supabase, chapter select, hosted BYOK, crafting, inventory screen, minimap, jump, crouch, stamina, navmesh, vector DBs, a health-bar final boss.

## Controls

WASD move, mouse look, Shift sprint, E interact (hold to skip a cinematic), T locket, LMB cast (hold to charge Arcane Bolt or channel Purify), 1/2/3 spell, Esc pause.

Full details: #[[file:.kiro/specs/the-last-house/PRD.md]]
