# Side Quests (AI-Enhanced Mode only)

Status: DRAFT, needs author approval.
Rules: at most 2 offered per run, 1 active at a time. The Angel offers a quest only by naming a `templateId` and a registered target. The engine checks availability, instantiates the quest, tracks completion and gives the reward. Side quests never gate the critical path, never change morality, and close quietly (state `closed`) when Elena enters the Last House. Classic Mode has none.

| Template | Available when | Target(s) | Objective | Completion | Reward |
|---|---|---|---|---|---|
| `sq_toy_rabbit` | `seq2_done`, zone `street`, not `lane_open` | `pickup.street.toy_rabbit` (hidden in the bandstand) | "Find Felix's toy rabbit" | Pick it up (carried icon `toy_rabbit`; kept to the end) | +20 magic; Angel line `vo_angel_sq_rabbit` |
| `sq_porch_candles` | `seq2_done`, zone `street` | `socket.street.candle_1`, `_2`, `_3` | "Light the three porch candles" (an old custom to keep the dead from wandering) | Interact with each candle (Arcane Bolt tap also lights it) | Street whispers soften for the rest of the exterior; +20 magic; `vo_angel_sq_candles` |
| `sq_house66_window` | `seq4_done`, zone `house66` or `street` | `clue.house66.upstairs_window` | "Look into the upstairs window of House 66" | Inspect it within 10 m (the Angel may `reveal_clue` it) | Lore: Mr. Corwin's notebook page; `vo_angel_sq_window` |
| `sq_briggs_photo` | `seq3_done`, zone `garden` | `clue.garden.photo` -> `socket.garden.porch_step` | "Return Mr. Briggs' family photo" | Find the photo in the flowerbed (carried `photo`), place it on his porch step | +20 magic; `vo_briggs_sq_photo` if he was purified, a quiet sting if not |

## Engine checks on an offer
1. Mode is `ai`; no quest active; fewer than 2 offered this run.
2. The template exists and its availability conditions hold.
3. The target is registered and belongs to that template.
4. The target is not already collected or completed.
Any failure: the offer is ignored silently; the Angel's speech still shows.

## Lines (voiced)
- `vo_angel_sq_rabbit`: "One ear chewed. He loves it terribly. Keep it close; he'll want it."
- `vo_angel_sq_candles`: "Three little lights. The dead on this street will sleep a touch easier."
- `vo_angel_sq_window`: "He wrote everything down. Sixty years of watching, and not one page about himself."
- `vo_briggs_sq_photo`: "Oh. Oh, that's Margaret. Thank you. I thought I'd lost her twice."