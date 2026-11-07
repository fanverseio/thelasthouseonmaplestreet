# Level Manifest

Status: DRAFT, needs author approval.
Map, zones, gates and every interactive entity. Entity IDs follow `kind.zone.name`. Flags and beats: `beat-sheet.md`.

## 1. Map (loop layout, not to scale)

```
                              NORTH
     [House 66 yard]-------- Maple Street (north arc) --------[No. 40 Gartner's shed]
      |  gate.house66.lane          |   veil_house66     veil_north   |
      |                             |                                 |
   back lane                    [ Maple Green ]                 [No. 31 Briggs'
   (behind west gardens)        old oak, bandstand,              garden + garage]
      |                         swing, lamp                        |  veil_garden
      |                             |                                 |
   [Elena's back garden]            |                          [Intersection:
      | (atm_home_window)           |                           the streetlight]
      |                             |                                 |  veil_east
   [Last House grounds] ==iron gate== [No. 12 Elena's home] -- Maple Street (south arc) --+
    outbuilding (mirror)   (never opens)    start
    Last House (front door)
```

- Route: home -> south arc east -> intersection -> No. 31 -> north arc -> No. 40 -> back to No. 31 garage for the fuse -> House 66 -> back lane south -> past Elena's back garden -> Last House grounds (rear).
- The Last House is visible beyond a chained iron gate at the west end of the south arc from the first moment. That gate never opens (`gate.street.last_house_road`).
- Approximate footprint: 140 m x 90 m exterior. Walking pace 4 m/s, sprint 7 m/s. Full loop ~90 s at a walk.
- Smoke veils are the diegetic gates. They are thick black smoke walls that recede when their flag is set. No invisible walls on the route.
- Outer boundary: dense fog plus garden fences and hedges. Colliders stop the player 2 m inside the fog wall.

## 2. Scenes and zones

| Scene      | Zones                                                               | Load                          |
| ---------- | ------------------------------------------------------------------- | ----------------------------- |
| exterior   | `home`, `street`, `garden`, `hideout`, `house66`, `lane`, `grounds` | At start                      |
| last_house | `interior`, `ritual`                                                | Lazy, preloaded during beat 7 |

Zone rules:
| Zone | Angel actions | Summon allowed | Notes |
|---|---|---|---|
| home | never | no | The opening stays fully authored |
| street | yes (outside sequences and encounters) | yes | Includes the intersection and green |
| garden | yes after `seq3_done` | no | |
| hideout | yes after `seq4_done` | no | |
| house66 | yes, except during `enc_watcher` | no | Compact sub-area, no separate load |
| lane | yes | yes | |
| grounds | yes, except during `enc_approach` and on sequence entities | no | |
| interior | yes, except during `enc_interior` | no | |
| ritual | never | no | Finale lock |

## 3. Gates

| Gate                                  | Opens on                                      | Blocks                       |
| ------------------------------------- | --------------------------------------------- | ---------------------------- |
| `door.home.front`                     | `locket_taken` (interaction sets `home_done`) | Leaving home                 |
| `gate.street.veil_east`               | `seq1_done`                                   | Intersection                 |
| `gate.street.veil_garden`             | `seq2_done`                                   | No. 31                       |
| `gate.street.veil_north`              | `seq3_done`                                   | North arc to No. 40          |
| `door.garden.garage`                  | `seq3_done`                                   | Mr Briggs' garage (the fuse) |
| `gate.street.veil_house66`            | `seq4_done`                                   | North-west to House 66       |
| `gate.house66.lane`                   | `fence_key_taken` + use (sets `lane_open`)    | Back lane                    |
| `door.grounds.outbuilding`            | `padlock_open`                                | Mirror                       |
| `door.grounds.last_house_front`       | `runes_done`                                  | Interior                     |
| `door.interior.ritual`                | `board_solved`                                | Ritual chamber               |
| `door.ritual.north`, `.east`, `.west` | `seq6_done`                                   | Anchor rooms                 |
| `gate.street.last_house_road`         | never                                         | Front road to the Last House |

Every gate is opened by a flag the critical path sets. No gate has `angelUnlock`.

## 4. Entity table

Columns: **Crit** = critical (rejects every Angel action except `flicker_lights`). **Owner** = the sequence or encounter that owns the entity while it runs (Angel actions on it are blocked then). Capabilities: `interactable`, `inspectable`, `pickup`, `socket`, `angelFlicker`, `angelUnlock`, `angelReveal`, `angelStir`, `angelSummon`.

### home

| ID                        | Kind    | Capabilities | Crit | Owner             |
| ------------------------- | ------- | ------------ | ---- | ----------------- |
| `spawn.home.start`        | spawn   | -            | yes  | -                 |
| `trg.home.bedroom`        | trigger | -            | yes  | -                 |
| `clue.home.drawing`       | clue    | inspectable  | yes  | -                 |
| `clue.home.costume`       | clue    | inspectable  | no   | -                 |
| `prop.home.pumpkin_jar`   | prop    | interactable | yes  | -                 |
| `pickup.home.drawer_key`  | pickup  | pickup       | yes  | -                 |
| `socket.home.drawer`      | socket  | socket       | yes  | -                 |
| `clue.home.journal_1`     | clue    | inspectable  | no   | -                 |
| `door.home.front`         | door    | interactable | yes  | -                 |
| `light.home.hall`         | light   | -            | no   | -                 |
| `light.home.felix_window` | light   | -            | yes  | `atm_home_window` |

### street

| ID                                             | Kind           | Capabilities              | Crit | Owner                    |
| ---------------------------------------------- | -------------- | ------------------------- | ---- | ------------------------ |
| `trg.street.seq1`, `trg.street.seq1_end`       | trigger        | -                         | yes  | `seq1_empty_street`      |
| `light.street.01`..`light.street.06`           | light          | angelFlicker              | no   | `seq1_empty_street`      |
| `prop.street.window_14`                        | prop           | -                         | no   | `seq1_empty_street`      |
| `gate.street.veil_east`                        | gate           | -                         | yes  | -                        |
| `trg.street.streetlight`                       | trigger        | -                         | yes  | `seq2_felix_streetlight` |
| `light.street.intersection`                    | light          | angelFlicker              | yes  | `seq2_felix_streetlight` |
| `clue.street.candy_bag`                        | clue           | inspectable               | no   | -                        |
| `gate.street.veil_garden`                      | gate           | -                         | yes  | -                        |
| `trg.street.fox`, `enemy.street.fox`           | trigger, enemy | -                         | no   | `enc_street`             |
| `gate.street.veil_north`                       | gate           | -                         | yes  | -                        |
| `gate.street.veil_house66`                     | gate           | -                         | yes  | -                        |
| `gate.street.last_house_road`                  | gate           | -                         | yes  | -                        |
| `light.street.green_lamp`                      | light          | angelFlicker              | no   | -                        |
| `prop.street.swing`                            | prop           | angelStir                 | no   | -                        |
| `prop.street.wind_chimes`                      | prop           | angelStir                 | no   | -                        |
| `door.street.no22_gate`                        | door           | interactable, angelUnlock | no   | -                        |
| `clue.street.no22_letter`                      | clue           | inspectable, angelReveal  | no   | -                        |
| `pickup.street.toy_rabbit`                     | pickup         | pickup, angelReveal       | no   | side quest               |
| `socket.street.candle_1`..`_3`                 | socket         | interactable, angelStir   | no   | side quest               |
| `spawn.street.angel_1`, `spawn.street.angel_2` | spawn          | angelSummon               | no   | -                        |

### garden (No. 31)

| ID                         | Kind    | Capabilities             | Crit | Owner                   |
| -------------------------- | ------- | ------------------------ | ---- | ----------------------- |
| `trg.garden.enter`         | trigger | -                        | yes  | `seq3_cursed_neighbour` |
| `enemy.garden.briggs`      | enemy   | -                        | yes  | `seq3_cursed_neighbour` |
| `clue.garden.walkie`       | clue    | inspectable              | yes  | `seq3_cursed_neighbour` |
| `door.garden.garage`       | door    | -                        | yes  | -                       |
| `pickup.garden.fuse`       | pickup  | pickup                   | yes  | -                       |
| `light.garden.porch`       | light   | angelFlicker             | no   | -                       |
| `clue.garden.photo`        | clue    | inspectable, angelReveal | no   | side quest              |
| `socket.garden.porch_step` | socket  | socket                   | no   | side quest              |

### hideout (No. 40)

| ID                        | Kind  | Capabilities | Crit | Owner                     |
| ------------------------- | ----- | ------------ | ---- | ------------------------- |
| `door.hideout.shed`       | door  | interactable | yes  | `seq4_gartner_confession` |
| `npc.hideout.gartner`     | npc   | interactable | yes  | `seq4_gartner_confession` |
| `clue.hideout.journal_2`  | clue  | inspectable  | no   | -                         |
| `light.hideout.shed_bulb` | light | angelFlicker | no   | `seq4_gartner_confession` |

### house66

| ID                             | Kind   | Capabilities             | Crit | Owner         |
| ------------------------------ | ------ | ------------------------ | ---- | ------------- |
| `socket.house66.fusebox`       | socket | socket                   | yes  | -             |
| `light.house66.porch`          | light  | -                        | yes  | `enc_watcher` |
| `enemy.house66.watcher`        | enemy  | -                        | yes  | `enc_watcher` |
| `node.house66.tp_1`..`tp_6`    | node   | -                        | yes  | `enc_watcher` |
| `pickup.house66.fence_key`     | pickup | pickup                   | yes  | -             |
| `gate.house66.lane`            | gate   | socket                   | yes  | -             |
| `clue.house66.upstairs_window` | clue   | inspectable, angelReveal | no   | side quest    |
| `prop.house66.rocking_chair`   | prop   | angelStir                | no   | -             |

### lane

| ID                     | Kind    | Capabilities | Crit | Owner             |
| ---------------------- | ------- | ------------ | ---- | ----------------- |
| `clue.lane.journal_3`  | clue    | inspectable  | no   | -                 |
| `trg.lane.home_window` | trigger | -            | yes  | `atm_home_window` |
| `light.lane.lamp_1`    | light   | angelFlicker | no   | -                 |
| `spawn.lane.angel_1`   | spawn   | angelSummon  | no   | -                 |

### grounds

| ID                                              | Kind         | Capabilities | Crit | Owner               |
| ----------------------------------------------- | ------------ | ------------ | ---- | ------------------- |
| `trg.grounds.enter`                             | trigger      | -            | yes  | `enc_approach`      |
| `enemy.grounds.hound_1`, `hound_2`              | enemy        | -            | yes  | `enc_approach`      |
| `puzzle.grounds.padlock`                        | puzzle       | interactable | yes  | -                   |
| `door.grounds.outbuilding`                      | door         | -            | yes  | -                   |
| `mirror.grounds.antique`                        | mirror       | interactable | yes  | `seq5_felix_mirror` |
| `puzzle.grounds.runes`, `rune.grounds.r1`..`r3` | puzzle, rune | -            | yes  | `seq5_felix_mirror` |
| `door.grounds.last_house_front`                 | door         | interactable | yes  | -                   |
| `light.grounds.lantern`                         | light        | angelFlicker | no   | -                   |
| `prop.grounds.weathervane`                      | prop         | angelStir    | no   | -                   |

### interior

| ID                              | Kind   | Capabilities              | Crit | Owner          |
| ------------------------------- | ------ | ------------------------- | ---- | -------------- |
| `spawn.interior.entry`          | spawn  | -                         | yes  | -              |
| `enemy.interior.cat`            | enemy  | -                         | yes  | `enc_interior` |
| `clue.interior.journal_4`       | clue   | inspectable               | no   | -              |
| `puzzle.interior.board`         | puzzle | interactable              | yes  | -              |
| `door.interior.ritual`          | door   | -                         | yes  | -              |
| `door.interior.study`           | door   | interactable, angelUnlock | no   | -              |
| `clue.interior.rosalind_letter` | clue   | inspectable, angelReveal  | no   | -              |
| `light.interior.chandelier`     | light  | angelFlicker              | no   | -              |
| `prop.interior.piano`           | prop   | angelStir                 | no   | -              |

### ritual

| ID                                      | Kind   | Capabilities | Crit | Owner  |
| --------------------------------------- | ------ | ------------ | ---- | ------ |
| `seal.ritual.central`                   | seal   | interactable | yes  | finale |
| `door.ritual.north`, `.east`, `.west`   | door   | -            | yes  | finale |
| `anchor.ritual.north`, `.east`, `.west` | anchor | interactable | yes  | finale |
| `npc.ritual.felix`                      | npc    | -            | yes  | finale |
| `clue.ritual.journal_5`                 | clue   | inspectable  | no   | -      |
| `spawn.ritual.wraith_1`..`_4`           | spawn  | -            | yes  | finale |

## 5. Content checks (automated, see `tasks.md`)

1. Every ID is unique and matches `^[a-z]+\.[a-z0-9_]+\.[a-z0-9_]+$` (ranges like `_1`..`_6` expand to separate IDs).
2. Every gate in section 3 opens on a flag set by a beat in `beat-sheet.md`.
3. No entity with `angelUnlock` is a gate or on the critical path.
4. Every entity referenced by a main-path step is `critical`.
5. `angelSummon` spawns exist only in zones that allow summons.
6. Every visual entity has an asset entry in `asset-manifest.md` or an explicit greybox-only note.
