---
inclusion: fileMatch
fileMatchPattern: 'apps/client/src/content/**'
---
# Story Flow: Beats, Flags and Gates (summary)

Authoritative detail: #[[file:.kiro/specs/the-last-house/docs/beat-sheet.md]] and #[[file:.kiro/specs/the-last-house/docs/level-manifest.md]].
Progress is ONLY these flags. Both modes set the same flags. The Angel can never set a flag.

| # | Beat | Key flags set (in order) | Opens | Checkpoint after |
|---|---|---|---|---|
| 1 | Home | `bed_seen`, `drawing_seen`, `drawer_key_taken`, `locket_taken`, `angel_awake`, `home_done` | `door.home.front` | `cp_street` |
| 2 | Seq 1 Empty Street | `seq1_done` | `gate.street.veil_east` | - |
| 3 | Seq 2 Felix at the streetlight | `seq2_done`, `spell_bolt` | `gate.street.veil_garden` | `cp_intersection` |
| - | Street encounter (skippable) | `enc_street_resolved` (optional) | nothing | - |
| 4 | Seq 3 Cursed Neighbour | `seq3_started`, `spell_ward`, `spell_purify`, `briggs_purified` or `briggs_destroyed`, `walkie_found`, `seq3_done` | `gate.street.veil_north` | `cp_garden_after` |
| 5 | Seq 4 Gartner's Confession | `seq4_done` (+ `gartner_comforted` or `gartner_pressed`) | `gate.street.veil_house66` | `cp_house66` |
| 6 | House 66 and the Watcher | `fuse_taken`, `fuse_placed`, `watcher_started`, `watcher_purified` or `watcher_destroyed`, `fence_key_taken`, `lane_open` | `gate.house66.lane` | `cp_lane` |
| 7 | Approach | `enc_approach_resolved`, `padlock_open` | `door.grounds.outbuilding` | `cp_outbuilding` |
| 8 | Seq 5 Felix in the Mirror | `seq5_done`, `runes_done` | `door.grounds.last_house_front` | `cp_interior` |
| 9 | Interior | `enc_interior_resolved`, `board_solved` | `door.interior.ritual` | `cp_ritual` |
| 10 | Seq 6 Two Living Keys | `seq6_done` | `door.ritual.north`, `door.ritual.east`, `door.ritual.west` | `cp_ritual` |
| 11 | Final ritual | `ritual_active`, `anchor_north`, `anchor_east`, `anchor_west` (any order), `felix3_done` (first anchor), `anchors_all` | central seal choice | `cp_ritual` (anchors persist) |
| 12 | Choice and ending | `ending_keeper` or `ending_broken`, `game_finished` | credits | save marked finished |

Rules:
- Every gate opens from a flag set on the critical path. No `angelUnlock` door is on the critical path.
- Purify and destroy outcomes both set the progression flag (`walkie_found`, `fence_key_taken`). Neither blocks progress.
- `seal.ritual.central` interaction depends on flags: before `seq6_done` -> reveal (Seq 6); after `seq6_done` and before `ritual_active` -> activate; after `anchors_all` -> final choice.
- The Angel's knowledge level is derived from flags: K0 `locket_taken`, K1 `seq2_done`, K2 `seq3_done`, K3 `seq4_done`, K4 `seq5_done`, K5 `seq6_done`, K6 `ritual_active`.
- Optional flags (journal pages `journal_1`..`journal_5`, side quests, `enc_street_resolved`) never gate the critical path.