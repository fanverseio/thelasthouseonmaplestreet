# Beat Sheet and Progression Flags

Status: DRAFT, needs author approval.
Authoritative for triggers, flags, unlocks and per-beat policies. Entity IDs: `level-manifest.md`. Types: `contracts.md`. Lines: `script/`.

## Conventions

- **Trigger**: what starts the beat. **Pre**: flags required. **Sets**: flags in order. **Opens**: gates or doors. **CP**: checkpoint written after.
- **Policy** per beat/sequence: `locket` (allowed, combat-blocked, blocked), `angelActions` (allowed, blocked), `control` (full, limited = camera clamped and no movement, locked = camera driven).
- "combat-blocked" means the locket is blocked while any hostile enemy is active, and allowed while every enemy is stunned or resolved. This lets the Angel speak during the purify-or-destroy choice.
- Angel actions are always blocked in zones `home` and `ritual`, during any sequence or encounter, and from `ritual_active` until the end.
- Times are design targets. No beat waits on a clock; each completes on an interaction or objective.
- **K** is the Angel knowledge level unlocked at the end of the beat (see `angel-persona.md`).

---

## Beat 1. Elena's Home (2.5 min) - Quest: The Search

- **Trigger**: New Game. Spawn `spawn.home.start` (Felix's bedroom doorway). CP `cp_home_start`.
- **Steps**:
  1. Entering `trg.home.bedroom` sets `bed_seen` (empty bed, open window, unworn costume). Elena line.
  2. Inspect `clue.home.drawing` -> `drawing_seen`. Felix's drawing shows the ceramic pumpkin in the kitchen with a key inside.
  3. Interact `prop.home.pumpkin_jar` -> pick up `pickup.home.drawer_key` -> `drawer_key_taken` (carried icon).
  4. Use the key on `socket.home.drawer` (hall table by the front door) -> key consumed, locket acquired -> `locket_taken`. `clue.home.journal_1` lies in the drawer (optional read -> `journal_1`).
  5. The locket opens itself: Angel introduction (interactive, voice and subtitles, player can move) -> `angel_awake`. T now works.
  6. Felix's voice outside: "Mom?" (positional, from the street).
  7. Interact `door.home.front` (requires `locket_taken`) -> `home_done`.
- **Puzzle**: locket drawer (`puzzles.md` P1).
- **Opens**: `door.home.front`. **CP**: `cp_street`.
- **Policy**: locket blocked until `angel_awake`, then allowed. angelActions blocked (zone). control full.
- **K**: K0.

## Beat 2. Sequence 1: The Empty Street (1.5 min)

- **Trigger**: enter `trg.street.seq1` (10 m past the porch). Pre `home_done`.
- **Steps** (sequence `seq1_empty_street`, fully interactive):
  1. Ambience ducks to near silence. No trick-or-treaters, decorations still lit.
  2. Streetlights `light.street.01`..`06` flicker in a chain toward the intersection.
  3. Footsteps behind Elena (positional), stopping when she turns.
  4. A shadow crosses the upstairs window `prop.street.window_14`.
  5. Smoke veil `gate.street.veil_east` blocks the intersection; it recedes when Elena reaches `trg.street.seq1_end`.
- **Sets**: `seq1_done`. **Opens**: `gate.street.veil_east`.
- **Policy**: locket allowed (first optional Angel conversation). angelActions blocked (the sequence owns the street lights). control full.
- **Movement tutorial**: WASD, Shift, E prompts in the first 20 m.

## Beat 3. Sequence 2: Felix Beneath the Streetlight (1.5 min)

- **Trigger**: enter `trg.street.streetlight` near `light.street.intersection`. Pre `seq1_done`.
- **Cinematic** `seq2_felix_streetlight` (15-25 s, control limited): the light steadies; Felix's spirit stands beneath it; he whispers a warning and points to No. 31's garden; he vanishes and the bulb bursts; Elena's hands glow.
- **Then**: tutorial prompt "LMB: Arcane Bolt" -> `spell_bolt`. Optional clue `clue.street.candy_bag` (Felix's Halloween bag).
- **Sets**: `seq2_done`, `spell_bolt`. **Opens**: `gate.street.veil_garden`. **CP**: `cp_intersection`.
- **Policy**: locket blocked during the cinematic, then allowed. angelActions blocked during the cinematic. control limited.
- **K**: K1.

## Street encounter (about 1 min, skippable)

- **Trigger**: enter `trg.street.fox` on the green after `seq2_done`.
- `enemy.street.fox` (cursed fox) is leashed within 20 m of the green path. The player can sprint past.
- Purify is not unlocked yet. If stunned, the fox stays stunned and harmless. It can be destroyed (held charge) or purified later.
- **Sets** (optional): `enc_street_resolved` when purified or destroyed. Skipping changes nothing.
- **Policy**: locket combat-blocked; angelActions blocked while it is hostile.

## Beat 4. Sequence 3: The Cursed Neighbor (4 min) - Quest: The Truth

- **Trigger**: enter `trg.garden.enter`. Pre `seq2_done`. CP `cp_garden` (mini-boss respawn point).
- **Steps** (sequence `seq3_cursed_neighbour`, interactive):
  1. Mr. Briggs rakes leaves with his back to Elena. Approach within 4 m or interact `enemy.garden.briggs` -> `seq3_started`.
  2. Transformation (about 6 s, player keeps control): smoke pours from his mouth and eyes; his limbs lengthen.
  3. First telegraphed attack (scripted, 1.5 s wind-up) -> Ward prompt -> `spell_ward`. The scripted hit cannot drop Elena below 30 HP.
  4. Phase 2 below 60% HP adds a ground slam.
  5. At 30% HP he enters the persistent stun -> Purify prompt -> `spell_purify`. Prompt: "2 + hold LMB: Purify | Arcane Bolt, hold LMB: Destroy".
  6. Outcome: `briggs_purified` (morality +30; he sits dazed on his step, one line) or `briggs_destroyed` (morality -30; he dissolves into smoke and leaves; his coat remains).
  7. Either way, the smoke releases `clue.garden.walkie`. It crackles with Gartner's voice. Interact -> `walkie_found`.
- **Sets**: `seq3_started`, `spell_ward`, `spell_purify`, `briggs_purified` or `briggs_destroyed`, `walkie_found`, `seq3_done`.
- **Opens**: `gate.street.veil_north`, `door.garden.garage`. **CP**: `cp_garden_after`.
- **Policy**: locket combat-blocked (allowed during the stun choice). angelActions blocked. control full.
- **Death**: respawn at `cp_garden`; Briggs resets to full HP; unlocked spells stay.
- **K**: K2.

## Beat 5. Sequence 4: Gartner's Confession (2 min)

- **Trigger**: interact `door.hideout.shed` (No. 40). Pre `walkie_found`.
- **Steps** (sequence `seq4_gartner_confession`, interactive dialogue, control limited):
  1. Gartner opens the shed when he hears Elena's voice. He is shaking, holding the other walkie.
  2. He explains: a friendly voice on the walkie offered "a treasure game" and said Felix's great-grandma left something for him. He led Felix down the back lane behind House 66 to the Last House. Felix went in, the door shut, and the voice laughed. Gartner ran.
  3. One dialogue choice: comfort him (`gartner_comforted`, +5) or press him (`gartner_pressed`, -5). Both get the same information, and his innocence is never in doubt.
  4. He gives Elena a journal page Felix found in the lane (`clue.hideout.journal_2`, optional read -> `journal_2`).
  5. He tells her Mr. Corwin at 66 took the fuses out of his lights ("he says the dark lets him see"), and Mr. Briggs had spare fuses for his Halloween lights.
- **Sets**: `seq4_done`. **Opens**: `gate.street.veil_house66`. **CP**: `cp_house66`.
- **Policy**: locket blocked. angelActions blocked. control limited (interactive dialogue, excluded from the forced-control budget, capped at 120 s).
- **K**: K3.

## Beat 6. House 66: The Watcher (3 min)

- **Objective**: "Find a fuse for House 66."
- **Steps**:
  1. Take `pickup.garden.fuse` from Mr. Briggs' open garage -> `fuse_taken` (carried icon). It can be taken any time after `seq3_done`; the objective points to it after `seq4_done`.
  2. Place it in `socket.house66.fusebox` -> `fuse_placed`. The porch light `light.house66.porch` snaps on. The Watcher stands in the yard facing the house. CP `cp_watcher`.
  3. He turns and says Felix's name -> `watcher_started`. Encounter `enc_watcher` (mini-boss, about 3 min): teleports to authored nodes `node.house66.tp_1`..`tp_6` with a 0.8 s telegraph; spawns one-hit shadow decoys at 60% and 40% HP.
  4. At 30% HP: persistent stun. Purify -> `watcher_purified` (+30) or destroy -> `watcher_destroyed` (-30).
  5. Either way he drops `pickup.house66.fence_key` -> `fence_key_taken`.
  6. Use the key on `gate.house66.lane` -> key consumed -> `lane_open`.
- **Puzzle**: fuse (`puzzles.md` P2).
- **Opens**: `gate.house66.lane`. **CP**: `cp_lane`.
- **Policy**: before `fuse_placed` and after resolution: locket allowed, angelActions allowed (non-critical targets only). During the encounter: locket combat-blocked, angelActions blocked. control full.
- **Death**: respawn at `cp_watcher`; the fuse stays placed; the Watcher resets to full HP.

## Beat 7. Last House approach (1.5 min) - still The Truth

- **Steps**:
  1. Walk the back lane. Optional `clue.lane.journal_3` pinned to a fence (dated 31 October 1966) -> `journal_3`.
  2. Passing Elena's own back garden fires atmosphere event `atm_home_window`: Felix's bedroom light turns on, a small silhouette, then dark (about 5 s, no loss of control).
  3. Enter `trg.grounds.enter`: two cursed hounds `enemy.grounds.hound_1`, `hound_2` (encounter `enc_approach`, mandatory). Each resolved by Purify (+10) or destroy (-10). When both are resolved -> `enc_approach_resolved`.
  4. The outbuilding padlock `puzzle.grounds.padlock` (number lock, code from journal page 3) can only be opened when `enc_approach_resolved` -> `padlock_open`.
- **Puzzle**: number lock (`puzzles.md` P3).
- **Opens**: `door.grounds.outbuilding`. **CP**: `cp_outbuilding`.
- **Policy**: lane: locket allowed, angelActions allowed. Grounds during the encounter: locket combat-blocked, angelActions blocked. control full.

## Beat 8. Sequence 5: Felix in the Mirror (2 min)

- **Trigger**: interact `mirror.grounds.antique`. Pre `padlock_open`.
- **Cinematic** `seq5_felix_mirror` (20-30 s, control locked): Elena's reflection lags; Felix appears behind her reflection only; he warns that the seal is cracked, that it is great-grandma's, and that it wants her too; whispers rise; the mirror cracks.
- **Then**: runes puzzle `puzzle.grounds.runes`. Three runes `rune.grounds.r1`..`r3` are visible only in the mirror. Elena finds each spot using the reflection and casts Purify on it -> `runes_done`. Locks turn across the grounds.
- **Sets**: `seq5_done`, `runes_done`. **Opens**: `door.grounds.last_house_front`.
- **Puzzle**: mirror runes (`puzzles.md` P4).
- **Policy**: cinematic: locket blocked, angelActions blocked, control locked. Runes: locket allowed, angelActions blocked (sequence-owned entities). control full.
- **K**: K4.

## Beat 9. The Last House interior (2 min) - Quest: The Last House

- **Trigger**: interact `door.grounds.last_house_front`. Pre `runes_done`. Loads scene `last_house`. CP `cp_interior`.
- **Steps**:
  1. Entrance hall. Optional `clue.interior.journal_4` (the riddle) -> `journal_4`.
  2. Cursed cat `enemy.interior.cat` (encounter `enc_interior`, mandatory) guards the cellar stairs -> `enc_interior_resolved` (Purify +10 or destroy -10).
  3. Talking board `puzzle.interior.board` (hangman-style). Pre `enc_interior_resolved`. Solved -> `board_solved`.
- **Puzzle**: talking board (`puzzles.md` P5).
- **Opens**: `door.interior.ritual`. **CP**: `cp_ritual`.
- **Policy**: locket combat-blocked. angelActions allowed outside the encounter on non-critical interior entities. control full.

## Beat 10. Sequence 6: The Two Living Keys (1.5 min)

- **Trigger**: interact `seal.ritual.central` (state: reveal). Pre `board_solved`.
- **Cinematic** `seq6_two_keys` (30-45 s, control locked): runes ignite; the smoke rises and speaks without a face; Felix is seen asleep inside the seal's light, untouched; the smoke says two keys of her blood are needed, and that the boy opened the door a crack and she will open it wide. Optional `clue.ritual.journal_5` on the altar. The Angel reacts (authored lines by band, in both modes).
- **Sets**: `seq6_done`. **Opens**: `door.ritual.north`, `door.ritual.east`, `door.ritual.west`.
- **Policy**: locket blocked, angelActions blocked, control locked.
- **K**: K5.

## Beat 11. Final ritual (4 min)

- **Trigger**: interact `seal.ritual.central` (state: activate). Pre `seq6_done` -> `ritual_active`. Smoke pressure begins.
- **Anchors** (any order, `puzzles.md` P6):
  - `anchor.ritual.north`: Arcane Bolt breaks a smoke shell, then E restores it -> `anchor_north`.
  - `anchor.ritual.east`: hold E to channel for 6 s while the smoke strikes; Ward blocks the strikes -> `anchor_east`.
  - `anchor.ritual.west`: channel Purify on the anchor for 4 s while smoke wraiths harass -> `anchor_west`.
- First anchor restored -> cinematic `cin_felix_anchor` (15-20 s, control locked): Felix's spirit appears beside the seal, encourages Elena, and says the anchors are loosening the evil's hold on him -> `felix3_done`.
- All three restored -> `anchors_all`. Smoke attacks stop.
- **Death**: respawn at `cp_ritual` (chamber centre); restored anchors persist; `ritual_active` persists.
- **Policy**: locket allowed (talk only) between attacks; angelActions blocked (finale lock). control full.
- **K**: K6 at `ritual_active`.

## Beat 12. Final choice and ending (2 min)

- **Trigger**: interact `seal.ritual.central` (state: choice). Pre `anchors_all`.
- **Steps**:
  1. Before the overlay, the Angel speaks a final authored line by band. A dark Angel tempts Elena to break the seal; a kind Angel supports her; this is dialogue only.
  2. Choice overlay (no timer): "Restore the seal and take Felix's place as its keeper" or "Break the seal and pull Felix free".
  3. Confirm: "This cannot be undone."
  4. `ending_keeper` -> `cin_ending_keeper` (20-30 s); or `ending_broken` -> `cin_ending_broken` (20-30 s).
  5. Credits -> `game_finished`. The save is marked finished; Continue is hidden.
- **Policy**: locket allowed before the overlay, blocked during it. angelActions blocked. control locked during the ending cinematic.

---

## Central seal states

| State    | Condition                             | Interaction result           |
| -------- | ------------------------------------- | ---------------------------- |
| reveal   | `board_solved` and not `seq6_done`    | Play `seq6_two_keys`         |
| activate | `seq6_done` and not `ritual_active`   | Set `ritual_active`          |
| inert    | `ritual_active` and not `anchors_all` | Prompt "Restore the anchors" |
| choice   | `anchors_all` and no ending flag      | Open the choice overlay      |

## Checkpoints

| ID                | Written when             | Respawn point                   |
| ----------------- | ------------------------ | ------------------------------- |
| `cp_home_start`   | New Game                 | Felix's bedroom doorway         |
| `cp_street`       | `home_done`              | Front porch                     |
| `cp_intersection` | `seq2_done`              | Under the streetlight           |
| `cp_garden`       | enter `trg.garden.enter` | Garden gate (mini-boss reset)   |
| `cp_garden_after` | `seq3_done`              | Garden path                     |
| `cp_house66`      | `seq4_done`              | Outside the shed                |
| `cp_watcher`      | `fuse_placed`            | House 66 gate (mini-boss reset) |
| `cp_lane`         | `lane_open`              | Lane gate                       |
| `cp_outbuilding`  | `padlock_open`           | Outbuilding door                |
| `cp_interior`     | enter the Last House     | Entrance hall                   |
| `cp_ritual`       | `board_solved`           | Ritual chamber center           |

Death: respawn at the last checkpoint with full HP and magic. Resolved enemies stay resolved. An active mini-boss resets to full HP. Flags never roll back.

## Forced-control budget

Forced = control `limited` or `locked` in a cinematic. Interactive dialogue (Seq 4) is excluded and capped separately at 120 s.
| Cinematic | Max |
|---|---|
| `seq2_felix_streetlight` | 25 s |
| `seq5_felix_mirror` | 30 s |
| `seq6_two_keys` | 45 s |
| `cin_felix_anchor` | 20 s |
| `cin_ending_keeper` or `cin_ending_broken` | 30 s |
| **Total** | **150 s** (limit 180 s) |
A content test sums the declared maximum durations and fails above 180 s.

## Pacing check (targets)

Home 2.5, Seq 1 1.5, Seq 2 1.5, street encounter 1, neighbor 4, Gartner 2, House 66 3, approach 1.5, mirror 2, interior 2, Seq 6 1.5, ritual 4, ending 2 = **28.5 min**. Beats 1-5 = 12.5 min.

## Open questions for the author

1. Is it acceptable to exclude the Seq 4 interactive dialogue from the forced-control budget? Including it would exceed 180 s.
2. Should the purified Watcher hint he was once asked to watch the house for good reasons (new lore), or stay a plain victim?
3. Is "hold E to skip" acceptable for cinematics on a first playthrough?
