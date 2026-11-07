# Combat and Morality Tuning

Status: DRAFT, needs author approval. All values are starting points for playtesting. They live in one typed config file in code, never as scattered literals.

## 1. Elena
| Stat | Value |
|---|---|
| Max HP | 100 |
| HP regen | none in combat; 5/s after 6 s without taking damage |
| Max magic | 100 |
| Magic regen | 6/s; 12/s when no hostile enemy is active; 15/s during the ritual |
| Walk / sprint | 4.0 / 7.0 m/s |
| Interact range | 2.5 m |
| Invulnerability after a hit | 0.6 s |

## 2. Spells
| Spell | Key | Cost | Cast | Effect | Cooldown | Range |
|---|---|---|---|---|---|---|
| Arcane Bolt (tap) | 1 + LMB | 8 | instant | 20 damage, projectile 30 m/s | 0.35 s | 40 m |
| Arcane Bolt (charged) | 1 + hold LMB 1.2 s | 25 | release | 45 damage to a hostile enemy; destroys a stunned enemy | 1.5 s | 40 m |
| Purify | 2 + hold LMB | 30 on start | 2.5 s channel beam | Saves a stunned purifiable enemy; cleanses runes and the west anchor | 1.0 s | 8 m |
| Ward | 3 + LMB | 25 | instant | Blocks all damage for 4 s; enemies that hit it stagger 0.5 s | 6 s | self |

- A tap Bolt on a stunned enemy does 0 damage, plays a shimmer, and shows the prompt "Hold to destroy | 2: Purify".
- Purify on a hostile (non-stunned) enemy fizzles at no cost with the hint "It must be weakened first."
- Purify on runes costs 0. Leaving the 8 m range during a channel cancels it with a 50% refund.
- Spell unlocks: Bolt at the end of Seq 2; Ward at Briggs' first telegraphed attack; Purify when Briggs is stunned.

## 3. Persistent stun and the choice
- Every purifiable enemy enters `stunned` at 30% HP. HP cannot drop below this threshold except by a charged Bolt.
- Stunned: harmless, no timer, kneeling idle animation, soft light. It stays stunned through saves and loads.
- Entering stun raises Elena's magic to at least 60, so either choice is always possible.
- Outcomes: purified (morality up, the being is freed and stays as a calm NPC or flees as a normal animal) or destroyed (morality down, it dissolves into smoke).

## 4. Enemy roster
| Enemy | Where | HP | Speed | Attack | Telegraph | Purifiable | Morality |
|---|---|---|---|---|---|---|---|
| Cursed fox | street (skippable) | 60 | 5.0 | bite 8, cd 1.5 s | 0.4 s crouch | yes | +/-10 |
| Cursed hound x2 | grounds | 80 | 5.5 | bite 10, cd 1.6 s | 0.5 s snarl | yes | +/-10 each |
| Cursed cat | interior | 50 | 6.0 | pounce 10, cd 2.0 s | 0.6 s hiss | yes | +/-10 |
| Mr Briggs (mini-boss) | garden | 300 | 3.0 | swipe 12; slam 20 (AoE 3 m, phase 2) | 1.0 s swipe, 1.2 s slam | yes | +/-30 |
| The Watcher (mini-boss) | house66 | 280 | 3.5 | grab 15 | 0.8 s | yes | +/-30 |
| Shadow decoy | house66 | 1 | 4.0 | touch 6 | none | no (dies in one hit) | 0 |
| Smoke wraith | ritual | 20 | 4.5 | claw 8 | 0.4 s | no (destroy only) | 0 |
| Angel-summoned minor cursed (AI only) | street, lane | 40 | 4.5 | bite 6 | 0.4 s | yes | 0 |

Animals: leash radius 20 m from their spawn; aggro radius 12 m. They lose interest if Elena leaves the leash area.

## 5. Mini-boss behaviour
### Mr Briggs
- Phase 1 (100-60%): circles, swipes, releases a smoke puff that obscures vision for 2 s.
- Scripted first attack: a 1.5 s telegraph; the Ward prompt appears at its start; the hit is capped so Elena keeps at least 30 HP.
- Phase 2 (60-30%): adds a ground slam with a visible ring.
- Stun at 30%.
- Target duration about 3 min including the choice.

### The Watcher of House 66
- Moves in jerky, stop-motion steps (animation played at 12 fps).
- Teleport every 6-9 s to one of `node.house66.tp_1`..`tp_6`. A smoke puff marks the destination 0.8 s before he arrives. He never teleports while stunned, or within 2 m of Elena.
- Decoys: 2 at 60% HP and 2 at 40% HP. They look like him, one hit kills them, and they deal 6 damage on touch.
- Says Felix's name at fixed HP thresholds (90%, 50%, 30%) via authored lines.
- Stun at 30%. Target duration about 3 min.

### The smoke (final ritual)
- No HP and no health bar.
- Attacks: ground rings (1.2 s telegraph, 15 damage, radius 2.5 m); hazard pools (5 damage/s, drift slowly); wraiths (2 alive at a time, respawn after 8 s).
- Pressure by anchors restored: 0 -> 1 wraith and rings every 4 s; 1 -> 2 wraiths, every 3.5 s; 2 -> 2 wraiths, every 3 s plus pools; 3 -> all attacks stop.

## 6. Morality
| Event | Delta |
|---|---|
| Purify a mini-boss | +30 |
| Destroy a mini-boss | -30 |
| Purify an animal | +10 |
| Destroy an animal | -10 |
| Gartner: comfort / press | +5 / -5 |
| Angel-summoned enemy (either outcome) | 0 |
| Skip the street fox, leave it stunned | 0 |
- Clamp to [-100, +100]. Start at 0. Maximum reachable: 30 + 30 + 4 x 10 + 5 = 105, clamped to 100.
- Bands: **dark** <= -25, **neutral** -24..+24, **kind** >= +25.
- Locket visuals: kind = warm gold glow, smooth silver, slow motes; neutral = pale moonlight, slight tarnish; dark = violet-red glow, hairline cracks, fast restless motes. The continuous value drives glow hue between bands.
- Morality never affects progression or the ending.

## 7. Death and checkpoints
- At 0 HP: a 1.5 s fade, then respawn at the last checkpoint with full HP and magic.
- Resolved enemies stay resolved. An active mini-boss resets to full HP. Flags never roll back. Restored anchors persist.
- No lives, no game over screen.

## 8. Angel action limits (AI mode)
| Action | Cooldown (sim s) | Max per run | Range | Notes |
|---|---|---|---|---|
| `flicker_lights` | 10 | 20 | same zone | Allowed on critical lights when no sequence owns them |
| `unlock_door` | 30 | 3 | 15 m | Only `angelUnlock` doors (never critical) |
| `reveal_clue` | 60 | 3 | 15 m | Only unrevealed `angelReveal` clues |
| `restore_magic` | 90 | 6 | - | Amount 1-25; over 25 is rejected; rejected if magic is full |
| `stir_object` | 20 | 6 | 15 m | Cosmetic |
| `summon_minor_cursed` | 120 | 2 | same zone | Max 1 alive; street and lane only; morality 0 |
- Max 2 proposals per response. Glitches: max 3 per run, at least 4 min of sim time apart.