# PRD: The Last House on Maple Street

Kiroween 2026 hackathon entry. Submission deadline: **2026-12-04**. Feature-complete target: **2026-11-30**.

## 1. Product Summary

A first-person 3D psychological horror game for desktop browsers, 10-15 minutes long. The player is Elena, searching for her missing son Felix on Halloween night. A locket-bound being called the Angel guides her. The game ships in two modes that share one world, one story and one save format:

- **Classic Story Mode**: fully authored, deterministic, no LLM, no API key, no network AI. Must feel complete.
- **AI-Enhanced Mode**: adds live Angel conversation, memory, personality drift, validated world actions, up to two optional side quests, and rare bounded glitches. The core story stays authored.

## 2. Goals and Non-Goals

### Goals

- A complete, polished, atmospheric small-scale game with a real story, exploration, combat, puzzles, six horror sequences and exactly two endings.
- A safe, engine-validated LLM integration that meaningfully changes the experience without ever breaking it.
- A hosted private demo for judges using the author's LLM key, with cost controls.

### Non-Goals

- Crafting, complex inventory, minimap, jump, crouch, stamina meter.
- Vector DBs or external memory services.
- Navmesh or elaborate enemy AI.
- Public user registration, cloud saves (design must allow them later).
- Large open world. One compact, coherent neighbourhood.
- Boss fight (final act is an anchor-restoration challenge).

## 3. Story (Canonical, Immutable Facts)

- **Elena**: protagonist, mother. Has inherited magic that awakens during play. Her magic comes from her bloodline, **not** from the Angel.
- **Felix**: age 8. First Living Key. His magic damaged the seal. Body trapped in the Last House; his spirit appears 3 times: beneath a streetlight, through a mirror, near the final seal.
- **Gartner**: Felix's friend. Deceived by the evil into bringing Felix to the house. **Innocent. Never knowingly collaborates. This must never change**, including in any LLM output.
- **Grandmother**: a witch who sealed an ancient evil beneath the Last House. The seal is bound to her bloodline and needs two bloodline members to fully open.
- **The Evil**: faceless black smoke. Cannot escape without both Living Keys. Manipulated events to bring Elena to the house. Separate from the Angel.
- **The Angel**: lives in the Whispering Locket (grandmother's object). Theatrical, curious, sometimes manipulative. Not the main villain. Does not know the full mystery at the start. Personality shifts with Elena's morality.

## 4. Gameplay Requirements

### 4.1 Controls

| Input     | Action                                                 |
| --------- | ------------------------------------------------------ |
| WASD      | Move                                                   |
| Mouse     | Look (pointer lock)                                    |
| Shift     | Sprint (no stamina)                                    |
| E         | Interact                                               |
| T         | Open/close locket (pauses game, releases pointer lock) |
| LMB       | Cast selected spell                                    |
| 1 / 2 / 3 | Select Arcane Bolt / Purify / Ward                     |
| Esc       | Pause                                                  |

### 4.2 HUD

Health, magic, current objective, selected spell. Nothing else. No morality number ever shown.

### 4.3 Magic

- **Arcane Bolt**: ranged damage to cursed enemies.
- **Purify**: saves a weakened cursed living being.
- **Ward**: temporary shield.
- Magic resource regenerates slowly; Angel (AI mode) may restore a small amount.
- Spells unlock gradually as Elena's magic awakens (authored).

### 4.4 Enemies

State machine: idle/patrol, chase, attack, stunned, purified, destroyed. Weakened enemies stay stunned long enough for a deliberate Purify vs. destroy choice. Steering by direct line plus simple obstacle avoidance; no navmesh.

### 4.5 Morality

Hidden integer in [-100, +100]. Purify raises it, destruction lowers it, other authored choices adjust it. It influences Angel dialogue (prewritten in Classic, prompt context in AI), and the locket's visual appearance (glow colour, ornament, particles). Never displayed numerically. The morality value never influences the ending.

### 4.6 Quests

Main (authored, always completable without AI):

1. **The Search**: find Felix on Maple Street.
2. **The Truth**: history of the witch, the seal, Gartner, the Living Keys.
3. **The Last House**: enter the house, face the final ritual.

Optional (AI mode only): max 2 per playthrough, 1 active at a time, from predefined templates bound to existing locations and objects. AI cannot invent locations or alter the main story.

### 4.7 Horror Sequences (all authored, in both modes)

1. The Empty Street: flickering lights, silence, footsteps.
2. Felix Beneath the Streetlight (Felix appearance 1).
3. The Cursed Neighbour: introduces combat and the moral choice.
4. Gartner's Confession: reveals he was deceived.
5. The Mirror Warning (Felix appearance 2): warns of the trap.
6. The Two Living Keys: why the evil needs both.

Felix appearance 3 happens near the final seal. Reusable atmosphere effects: whispers, moving shadows, doors, footsteps, flicker, smoke disturbances. Classic mode: optional events fire from fixed authored triggers. AI mode: additional bounded variations that never disrupt the main narrative.

### 4.8 Finale

Inside the Last House. Elena restores **three seal anchors** using existing spell and interaction mechanics while avoiding smoke attacks. Then a clear final decision:

- **Good: The Bloodline Keeper**: restores seal, frees Felix, evil contained, both leave, Elena inherits guardianship.
- **Bad: The Broken Seal**: breaks seal, Felix freed, evil escapes and spreads.

Exactly two endings. The ending is decided **only** by the final player choice. The good ending is always achievable.

## 5. The Angel (AI Feature) Requirements

### 5.1 Interaction

- Press T, type freely. No Help/Quest/Action buttons. Free-text only.
- Gameplay is paused while the locket is open.

### 5.2 Memory

Structured game state + compact running summary of key events + recent conversation window. No vector DB.

### 5.3 World Actions

LLM may **propose** structured actions only. The engine validates and executes. Initial action set:

- `flicker_lights(targetId)`
- `unlock_door(targetId)` (only doors flagged `angelUnlockable`)
- `reveal_clue(targetId)` (only existing, unrevealed clues)
- `restore_magic(amount)` (small, cooldown-limited)
- `stir_object(targetId)` / `summon_minor_cursed(spawnId)` (cap, location-restricted, never during scripted sequences)

Validation requires: target exists, capability declared, player in the right zone/range, cooldown/budget ok, not inside a scripted sequence, no story-progress break.

**Hard prohibitions**: the Angel can never force an ending, delete or consume a critical item, bypass the seal puzzle, skip required quests, block the good ending, change canonical story facts, or run arbitrary code.

### 5.4 Glitches (AI mode only)

Rare, bounded, **engine-triggered** (not LLM-random) events: e.g. benevolent Angel makes a malicious suggestion, or dark Angel helps. Rate-limited, never touch critical progress, never force a bad ending.

### 5.5 Degradation

If credits run out, the API fails, or the key is invalid, switch to Classic behaviour mid-game with no restart and no progress loss. If access returns, the Angel is re-primed from structured state and continues naturally.

## 6. Saves

Browser storage, versioned schema with migrations. Saves checkpoint, quest state, morality, inventory, enemy states, completed horror events, world changes and Angel memory. **Never save API keys.** Storage behind an interface so cloud save can be added later.

## 7. API Access and Hosting

- **Local/GitHub build**: user supplies provider and key via a local Node server; key in server memory only, never logged, never committed, never in saves.
- **Hosted judge build**: private login (credentials given via Devpost), server uses the author's key, with rate limits, per-session and global budgets, and automatic Classic fallback on exhaustion.
- Providers: OpenAI or Gemini, configurable. ElevenLabs voice is optional and behind a feature flag.

## 8. Visual and Audio Direction

Stylized realistic Halloween: fog, moonlight, strong shadows, practical flickering lights, cinematic grading. Greybox the full route first, then replace with Blender assets (Last House, gravestones, street props, fences, trees, magical objects). Audio: ambient beds, positional footsteps and whispers, spell SFX, music stingers. Quality over size.

## 9. Success Criteria

- Classic mode playable start to finish with no network, reaching either ending, in 10-15 min.
- AI mode completes the same story with live Angel conversation and at least three distinct validated world actions demonstrated.
- Prompt injection or hostile input cannot trigger a prohibited action (tested).
- Mid-session AI loss/recovery works without losing progress.
- Stable 60 fps target on a mid-range desktop; acceptable at 30 fps on integrated GPU with a low-quality preset.
- Hosted demo is accessible to judges, protected, and cost-capped.
- Feature complete by 2026-11-30.

## 10. Risks

| Risk                          | Mitigation                                                           |
| ----------------------------- | -------------------------------------------------------------------- |
| Asset scope creep             | Greybox-first, asset freeze date, free packs for filler              |
| LLM cost/abuse on hosted demo | Auth, rate limits, budget cap, fallback                              |
| LLM breaks story              | Proposal-only actions, validator, canon-locked prompt, output schema |
| Performance with fog/shadows  | Quality presets, baked/limited lights, instancing                    |
| Time                          | Vertical slice first, cut list in TASKS.md                           |

## 11. Open Decisions

- Team size and weekly hours (affects Blender scope). Assumed: solo.
- Asset sourcing. Assumed: free/CC0 packs plus a few custom Blender hero pieces.
- Hosting platform and LLM provider default. Assumed: Node on Render/Fly/Railway; provider selectable, OpenAI default.
- Judge auth model. Assumed: small hand-made list of credentials, each with its own usage cap.
