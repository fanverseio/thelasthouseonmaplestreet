# Script, Acts 2-3: Beats 6-12 and both endings

Status: DRAFT, needs author approval.
Format and conventions as in `act1.md`. New voices: the Watcher (Mr Corwin, 80s, brittle, repeating), the smoke (no face; layered whisper chorus, generated then processed), Rosalind (journal).

## Beat 6. House 66: The Watcher

| ID                       | Speaker | Line                                                                                              | Delivery / trigger                                          |
| ------------------------ | ------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `vo_elena_b6_01`         | Elena   | "Empty. He really did take them all."                                                             | Inspect `socket.house66.fusebox` without a fuse             |
| `vo_elena_b6_02`         | Elena   | "Let's see you, then."                                                                            | Placing the fuse                                            |
| `vo_watcher_b6_01`       | Watcher | "Felix. Felix went by. Little feet, little lantern. I watched."                                   | Lights on; he turns                                         |
| `vo_watcher_b6_02`       | Watcher | "I watch for it. I watch for it. Sixty years I watch."                                            | Encounter start                                             |
| `vo_watcher_b6_03`       | Watcher | "Fe-lix."                                                                                         | 90% HP                                                      |
| `vo_watcher_b6_04`       | Watcher | "Mother of Felix. It's waiting for you."                                                          | 50% HP                                                      |
| `vo_watcher_b6_05`       | Watcher | "Let me watch. Let me watch!"                                                                     | 30% HP, entering stun                                       |
| `vo_angel_b6_01`         | Angel   | "The watcher, unwatched at last. Mercy or ending, Elena. The key falls either way."               | Stun                                                        |
| `vo_watcher_b6_06`       | Watcher | "I was meant to watch the house. Somewhere along the way I started watching for it. The key. Go." | Purified (lore line pending author approval)                |
| `vo_elena_b6_03`         | Elena   | "Rest now."                                                                                       | Destroyed                                                   |
| `vo_elena_b6_04`         | Elena   | "The lane gate."                                                                                  | Picking up the fence key                                    |
| `vo_angel_b6_kind_c1`    | Angel   | "Your light is warmer than it was an hour ago. I can feel it through the silver."                 | C, after `lane_open`, kind                                  |
| `vo_angel_b6_neutral_c1` | Angel   | "The lane. Children's road. Mind the nettles, and the things that aren't nettles."                | C, after `lane_open`, neutral                               |
| `vo_angel_b6_dark_c1`    | Angel   | "Doors open faster when you stop knocking politely. Remember that."                               | C, after `lane_open`, dark                                  |
| `vo_angel_b6_any_c1`     | Angel   | "He moves when you blink. Watch the smoke, not the man."                                          | C, during the encounter (locket allowed only while stunned) |

## Beat 7. The back lane and the approach

| ID                       | Speaker  | Line                                                                                                                                                                                | Delivery / trigger              |
| ------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `vo_elena_b7_01`         | Elena    | "That's our house. That's Felix's window."                                                                                                                                          | Whisper, `atm_home_window`      |
| `vo_angel_b7_kind_c1`    | Angel    | "A memory, or a lure. Either way, he loves that room. You'll see it again."                                                                                                         | C, beat 7, kind                 |
| `vo_angel_b7_neutral_c1` | Angel    | "The house is showing you what you want. Houses do that."                                                                                                                           | C, beat 7, neutral              |
| `vo_angel_b7_dark_c1`    | Angel    | "It knows where you live, Elena. Of course it does."                                                                                                                                | C, beat 7, dark                 |
| `vo_rosalind_j3`         | Rosalind | "Thirty-first of October, nineteen sixty-six. The night I closed it. I used the oldest words and the last of my courage. Let it sleep until there is no one left of us to wake it." | Journal page 3                  |
| `vo_angel_b7_02`         | Angel    | "Hounds. The smoke has run out of neighbours."                                                                                                                                      | C, entering `trg.grounds.enter` |
| `vo_elena_b7_02`         | Elena    | "Gran's old carriage house. Locked."                                                                                                                                                | Inspect the padlock             |
| `vo_angel_p3_h1`         | Angel    | "Your grandmother was fond of dates."                                                                                                                                               | H, P3 hint 1                    |
| `vo_angel_p3_h2`         | Angel    | "The page in the lane. The year."                                                                                                                                                   | H, P3 hint 2                    |
| `vo_angel_p3_h3`         | Angel    | "Nineteen... there. You'll manage the rest."                                                                                                                                        | H, P3 hint 3                    |
| `vo_angel_p3_h4`         | Angel    | "One, nine, six, six. Shall I turn the dials for you too?"                                                                                                                          | H, P3 hint 4                    |

## Beat 8. Sequence 5: Felix in the Mirror

| ID                       | Speaker | Line                                                                                                     | Delivery / trigger            |
| ------------------------ | ------- | -------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `vo_elena_b8_01`         | Elena   | "That's not right. My reflection's slow."                                                                | Cinematic start               |
| `vo_felix_b8_01`         | Felix   | "Mum. Behind you. No, don't turn round. I'm only in here."                                               | Spirit, in the reflection     |
| `vo_felix_b8_02`         | Felix   | "It's cracked. Great-gran's lock. I made it crack. I didn't mean to, I was only playing with the light." | Ashamed                       |
| `vo_felix_b8_03`         | Felix   | "It wants you too. It needs you too. Don't let it..."                                                    | The mirror cracks             |
| `vo_elena_b8_02`         | Elena   | "Felix! ...Felix."                                                                                       |                               |
| `vo_felix_p4_h1`         | Felix   | "Look where I was."                                                                                      | H, P4 hint 1, whisper         |
| `vo_angel_p4_h2`         | Angel   | "The glass sees what you can't. Use it."                                                                 | H, P4 hint 2                  |
| `vo_angel_p4_h3`         | Angel   | "There. By your shoulder. Can you feel it?"                                                              | H, P4 hint 3                  |
| `vo_angel_b8_kind_c1`    | Angel   | "He blames himself. Children always do. Tell him later it was never his fault."                          | C, after `seq5_done`, kind    |
| `vo_angel_b8_neutral_c1` | Angel   | "A lock cracked by a child playing with light. How very human."                                          | C, after `seq5_done`, neutral |
| `vo_angel_b8_dark_c1`    | Angel   | "So the boy broke it. Interesting. Then it could be broken the rest of the way, couldn't it?"            | C, after `seq5_done`, dark    |

## Beat 9. The Last House interior

| ID                       | Speaker  | Line                                                                                                                        | Delivery / trigger                                                   |
| ------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `vo_elena_b9_01`         | Elena    | "Gran's house. I was here once, when I was little. I don't remember this hall."                                             | Entering                                                             |
| `vo_rosalind_j4`         | Rosalind | "This house does not need a lock. It needs a... A lock can be broken. What I am can only be handed on, and only by choice." | Journal page 4; the key word is blotted, the reader stumbles over it |
| `vo_angel_b9_01`         | Angel    | "A cat. The smoke has a sense of humour."                                                                                   | C, `enc_interior` start                                              |
| `vo_elena_b9_02`         | Elena    | "A talking board. Six letters."                                                                                             | Inspect `puzzle.interior.board`                                      |
| `vo_angel_p5_h1`         | Angel    | "What does a house that holds something need?"                                                                              | H, P5 after reset 1                                                  |
| `vo_angel_p5_h2`         | Angel    | "Someone who keeps it."                                                                                                     | H, P5 after reset 2                                                  |
| `vo_angel_p5_h3`         | Angel    | "Keeper, child. Spell it before I do."                                                                                      | H, P5 after reset 3                                                  |
| `vo_elena_b9_03`         | Elena    | "Keeper."                                                                                                                   | Board solved; the cellar door unlocks                                |
| `vo_angel_b9_kind_c1`    | Angel    | "She kept roses by that window. I'd forgotten. Thank you for bringing me back here."                                        | C, beat 9, kind                                                      |
| `vo_angel_b9_neutral_c1` | Angel    | "Her house, her rules. Everything here was a lock once."                                                                    | C, beat 9, neutral                                                   |
| `vo_angel_b9_dark_c1`    | Angel    | "So many locks for one old woman. What was she so afraid of losing?"                                                        | C, beat 9, dark                                                      |

## Beat 10. Sequence 6: The Two Living Keys

| ID                     | Speaker  | Line                                                                                                                                                                     | Delivery / trigger              |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| `vo_smoke_b10_01`      | Smoke    | "Daughter of her daughter."                                                                                                                                              | Runes ignite                    |
| `vo_smoke_b10_02`      | Smoke    | "Two keys of her blood. The boy opened the door a crack."                                                                                                                |                                 |
| `vo_elena_b10_01`      | Elena    | "Felix! He's asleep. He's inside the light."                                                                                                                             | Seeing Felix in the seal's glow |
| `vo_smoke_b10_03`      | Smoke    | "I called him with her voice. I called you with his. Every road on this street led here."                                                                                |                                 |
| `vo_smoke_b10_04`      | Smoke    | "You will open it wide."                                                                                                                                                 | Cinematic peak                  |
| `vo_angel_b10_kind`    | Angel    | "Elena. Listen to me, not to it. Your grandmother built this, which means it can be mended."                                                                             | Authored reaction, kind         |
| `vo_angel_b10_neutral` | Angel    | "Well. Now we both know what you are. A key. Rather a lot rides on what you open."                                                                                       | Authored reaction, neutral      |
| `vo_angel_b10_dark`    | Angel    | "Two keys. You and the boy. You could walk out of here with him in a minute. Only a minute. Think about it."                                                             | Authored reaction, dark         |
| `vo_rosalind_j5`       | Rosalind | "If you are reading this, my blood has come back to the house. Two of us can open it. One of us can carry it. Mend the anchors, and then choose what I chose, or don't." | Journal page 5                  |

## Beat 11. Final ritual

| ID                    | Speaker | Line                                                                    | Delivery / trigger             |
| --------------------- | ------- | ----------------------------------------------------------------------- | ------------------------------ |
| `vo_elena_b11_01`     | Elena   | "Three anchors. Gran, show me how."                                     | Activating the seal            |
| `vo_angel_b11_01`     | Angel   | "North wants force. East wants patience. West wants mercy. Go."         | Immediately after              |
| `vo_smoke_b11_01`     | Smoke   | "Little keeper. Little lock."                                           | Ambient taunt, during pressure |
| `vo_smoke_b11_02`     | Smoke   | "Open. Open."                                                           | Ambient taunt, after 2 anchors |
| `vo_felix_b11_01`     | Felix   | "Mum! It's letting go a bit. Every time you fix one, it holds me less." | `cin_felix_anchor`             |
| `vo_felix_b11_02`     | Felix   | "You're doing it. You're really doing it. Keep going."                  | `cin_felix_anchor`             |
| `vo_angel_p6_h_north` | Angel   | "Break the shell. Your bolt, Elena."                                    | H, north anchor, 45 s          |
| `vo_angel_p6_h_east`  | Angel   | "Hold it, and shield yourself while you do."                            | H, east anchor, 45 s           |
| `vo_angel_p6_h_west`  | Angel   | "Purify it. The light that saves."                                      | H, west anchor, 45 s           |
| `vo_elena_b11_02`     | Elena   | "It's quiet. It's stopped."                                             | `anchors_all`                  |

## Beat 12. The final choice

| ID                     | Speaker | Line                                                                                                                                               | Delivery / trigger          |
| ---------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `vo_angel_b12_kind`    | Angel   | "She chose to keep it. You can too, and still walk out with him. It's a long duty. You won't carry it alone. I'll be in your pocket, complaining." | Before the overlay, kind    |
| `vo_angel_b12_neutral` | Angel   | "This part is yours. I could argue either side beautifully. I won't. Choose."                                                                      | Before the overlay, neutral |
| `vo_angel_b12_dark`    | Angel   | "Break it. He's right there. Why should you pay for her bargain? Let the smoke have Maple Street. It never loved you."                             | Before the overlay, dark    |

UI text (not voiced): option A "Restore the seal and take Felix's place as its keeper"; option B "Break the seal and pull Felix free"; confirm "This cannot be undone."

## Ending A: The Bloodline Keeper (`cin_ending_keeper`, 20-30 s)

| ID                | Speaker | Line                                                                                    | Delivery / trigger                                  |
| ----------------- | ------- | --------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `vo_elena_end_k1` | Elena   | "Felix. Let go of it, baby. I've got it now."                                           | Hands on the seal; light flows from Felix to Elena  |
| `vo_felix_end_k1` | Felix   | "Mum? It's gone heavy. Are you okay?"                                                   | Awake, physically present, in her arms              |
| `vo_elena_end_k2` | Elena   | "I'm okay. It's mine to hold now. Let's go home."                                       | Walking out of the front door into early dawn light |
| `vo_angel_end_k1` | Angel   | "The keeper walks out of her own house. Rosalind never managed that. Well done, Elena." | Over the walk out                                   |

End card text: "THE BLOODLINE KEEPER. Every Halloween after, Elena walks to the end of Maple Street and checks the lock. Felix walks with her."

## Ending B: The Broken Seal (`cin_ending_broken`, 20-30 s)

| ID                | Speaker | Line                                          | Delivery / trigger                                       |
| ----------------- | ------- | --------------------------------------------- | -------------------------------------------------------- |
| `vo_elena_end_b1` | Elena   | "I don't care what it costs. Give me my son." | Striking the seal                                        |
| `vo_felix_end_b1` | Felix   | "Mum! I'm out! ...Mum? What's that noise?"    | Free, clinging to her                                    |
| `vo_smoke_end_b1` | Smoke   | "Thank you."                                  | The smoke pours out past them                            |
| `vo_elena_end_b2` | Elena   | "Run, Felix. Don't look back."                | Running down Maple Street as streetlights die one by one |

End card text: "THE BROKEN SEAL. By morning, the fog had reached the next town."

## Canon check (acts 2-3)

- Exactly two endings; each follows only from the final choice. Pass.
- Felix first key, Elena second (`vo_smoke_b10_02`, `vo_rosalind_j5`). Pass.
- Good ending: transfer, Elena survives and leaves with Felix. Pass.
- The dark Angel tempts but cannot decide. Pass.
- Gartner not mentioned as guilty anywhere. Pass.
- Felix never harmed on screen. Pass.

Line count acts 2-3: Elena 18, Angel 36, Felix 8, Watcher 6, Smoke 7, Rosalind 3 = 78.

## Totals (both files, before Classic padding)

Elena 45; Angel 63 in the scripts plus 8 stock, 4 glitch and 3 side-quest lines = 78; Felix 12; Gartner 12; Briggs 5 (incl. the side-quest line); Watcher 6; Smoke 7; Rosalind 5. **170 voiced lines.** Classic coverage needs about 20 more repeatable Angel lines (2 per band for beats 6-12) to reach the target in `angel-persona.md`; these will be added after the author approves this draft.
