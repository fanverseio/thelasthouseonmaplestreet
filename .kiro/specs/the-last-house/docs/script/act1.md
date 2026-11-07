# Script, Act 1: Beats 1-5 (demo-critical, ~12.5 min)

Status: DRAFT, needs author approval.
Format: `ID | Speaker | Line | Delivery / trigger`. IDs are `vo_<character>_<id>` and map to audio files `apps/client/public/assets/audio/vo/<ID>.mp3`. Every line is subtitled. `C` marks Classic Angel lines (also used as fallbacks in AI mode). `H` marks puzzle hints.
Characters and voices: Elena (adult, warm, frightened, determined), Angel (ageless, theatrical, androgynous), Felix (8, soft, echoing when a spirit), Gartner (about 9, shaky), Mr Briggs (60s; corrupted voice layered with a low echo), Rosalind (journal readings, elderly, dry wit).

## Beat 1. Elena's Home

| ID               | Speaker  | Line                                                                                                                                                        | Delivery / trigger                            |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `vo_elena_b1_01` | Elena    | "Felix? It's past nine, love. Your costume's still on the chair."                                                                                           | Soft, entering `trg.home.bedroom`             |
| `vo_elena_b1_02` | Elena    | "The window's open. Why is the window open?"                                                                                                                | Rising worry, same trigger, 3 s later         |
| `vo_elena_b1_03` | Elena    | "Felix, this isn't funny. Felix!"                                                                                                                           | Calling out, if the player leaves the bedroom |
| `vo_elena_b1_04` | Elena    | "'My secret hiding place.' The pumpkin. Of course it's the pumpkin."                                                                                        | Inspect `clue.home.drawing`                   |
| `vo_elena_b1_05` | Elena    | "A key? What have you been up to... the hall drawer."                                                                                                       | Take `pickup.home.drawer_key`                 |
| `vo_elena_b1_06` | Elena    | "Gran's locket. I locked this away years ago. It used to... whisper."                                                                                       | Open `socket.home.drawer`                     |
| `vo_angel_b1_01` | Angel    | "Ahh. Air. Moonlight. And a hand that carries her blood. Good evening, Elena."                                                                              | Intro, amused, close in the ear               |
| `vo_elena_b1_07` | Elena    | "Who said that?"                                                                                                                                            | Startled                                      |
| `vo_angel_b1_02` | Angel    | "The locket, child. Or the thing that sleeps in it. Your grandmother called me her Angel. I never corrected her."                                           | Theatrical                                    |
| `vo_angel_b1_03` | Angel    | "Something old is awake out there tonight. It pulled me out of a very long sleep. I don't yet know what it is."                                             | Lower, uneasy                                 |
| `vo_felix_b1_01` | Felix    | "Mum?"                                                                                                                                                      | Distant, outside, positional from the street  |
| `vo_elena_b1_08` | Elena    | "Felix! Stay there, I'm coming!"                                                                                                                            | Shouting                                      |
| `vo_angel_b1_04` | Angel    | "Take me with you. Hold me close whenever you need me. I listen better than I look."                                                                        | Ends the intro; T tutorial appears as UI text |
| `vo_elena_b1_09` | Elena    | "Not yet. He left me something. He always leaves me clues."                                                                                                 | Front door before `locket_taken`              |
| `vo_elena_b1_h1` | Elena    | "The pumpkin... he hides everything in that pumpkin."                                                                                                       | H, P1 hint 1                                  |
| `vo_rosalind_j1` | Rosalind | "To whoever opens this drawer after me. If the locket speaks, listen. But never let it choose for you. It is clever, and lonely, and not always kind. R.V." | Journal page 1 reading                        |
| `vo_angel_b1_c1` | Angel    | "Rosalind's granddaughter. You have her chin. Let's hope you have her nerve."                                                                               | C, beat 1, any                                |
| `vo_angel_b1_c2` | Angel    | "The boy's voice came from the street. So will the answers, I suspect."                                                                                     | C, beat 1, any, after `angel_awake`           |

## Beat 2. Sequence 1: The Empty Street

| ID               | Speaker | Line                                                                                             | Delivery / trigger                  |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------ | ----------------------------------- |
| `vo_elena_b2_01` | Elena   | "Where is everyone? It's Halloween. There should be kids. Noise."                                | Entering `trg.street.seq1`          |
| `vo_elena_b2_02` | Elena   | "Hello? Is someone there?"                                                                       | After the footsteps stop, turning   |
| `vo_elena_b2_03` | Elena   | "The Parkers are away. So who's in their house?"                                                 | Shadow at `prop.street.window_14`   |
| `vo_elena_b2_04` | Elena   | "That smoke's moving against the wind."                                                          | Approaching `gate.street.veil_east` |
| `vo_angel_b2_c1` | Angel   | "Listen. No dogs, no doors, no children. Silence like this is made, not found."                  | C, beat 2, any                      |
| `vo_angel_b2_c2` | Angel   | "Walk towards the light at the corner. Whatever wants you, wants you there. So, it seems, do I." | C, beat 2, any                      |
| `vo_angel_b2_h1` | Angel   | "The street only goes one way tonight, Elena. Follow the lights."                                | H, idle 45 s in beat 2              |

## Beat 3. Sequence 2: Felix Beneath the Streetlight

| ID               | Speaker | Line                                                                                               | Delivery / trigger                |
| ---------------- | ------- | -------------------------------------------------------------------------------------------------- | --------------------------------- |
| `vo_felix_b3_01` | Felix   | "Mum. You came."                                                                                   | Spirit, echo, cinematic           |
| `vo_elena_b3_01` | Elena   | "Felix! Baby, come here, come here..."                                                             | Breaking                          |
| `vo_felix_b3_02` | Felix   | "I can't. I'm not really here. It's counting, Mum. Don't let it count to two."                     | Whisper                           |
| `vo_felix_b3_03` | Felix   | "Mr Briggs' garden. It's inside him now. Please be careful."                                       | Pointing                          |
| `vo_elena_b3_02` | Elena   | "My hands... what's happening to my hands?"                                                        | After the bulb bursts; hands glow |
| `vo_angel_b3_01` | Angel   | "That isn't my doing. That light is yours. Rosalind's blood, waking up at last."                   | Wonder                            |
| `vo_angel_b3_02` | Angel   | "Point. Will it. Let it go."                                                                       | Arcane Bolt tutorial              |
| `vo_elena_b3_03` | Elena   | "His sweets bag. He never puts this down."                                                         | Inspect `clue.street.candy_bag`   |
| `vo_angel_b3_c1` | Angel   | "The boy's spirit walks without his body. His body is somewhere else, and alive. Hold on to that." | C, beat 3, any                    |
| `vo_angel_b3_c2` | Angel   | "Your gift has teeth now. Use it on what the smoke has taken, not on the frightened."              | C, beat 3, any                    |

## Street encounter (skippable)

| ID                | Speaker | Line                                                                                          | Delivery / trigger                     |
| ----------------- | ------- | --------------------------------------------------------------------------------------------- | -------------------------------------- |
| `vo_angel_fox_c1` | Angel   | "A fox, wearing the smoke like a collar. You could pass it by. Or you could make it rest."    | C, entering `trg.street.fox`           |
| `vo_elena_fox_01` | Elena   | "It's just lying there. Shaking."                                                             | Fox stunned, before Purify is unlocked |
| `vo_angel_fox_c2` | Angel   | "You can't cleanse it yet. Leave it, end it, or come back when you're more than you are now." | C, fox stunned, no Purify              |

## Beat 4. Sequence 3: The Cursed Neighbour

| ID                       | Speaker | Line                                                                                                                       | Delivery / trigger            |
| ------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `vo_elena_b4_01`         | Elena   | "Mr Briggs? Have you seen Felix? Mr Briggs?"                                                                               | Approach                      |
| `vo_briggs_b4_01`        | Briggs  | "Lovely night. Lovely... night. It said you'd come."                                                                       | Turning, wrong rhythm         |
| `vo_briggs_b4_02`        | Briggs  | "It's warm in here, Elena. Come inside."                                                                                   | Transformation, layered voice |
| `vo_angel_b4_01`         | Angel   | "Raise your arm! Like a door closing. Now!"                                                                                | Ward prompt, urgent           |
| `vo_briggs_b4_03`        | Briggs  | "It wants the boy's mother. It wants..."                                                                                   | Phase 2 at 60% HP             |
| `vo_angel_b4_02`         | Angel   | "There. He's weakened. You can cleanse the man inside, or finish what the smoke started. Choose, Elena. I'll be watching." | Stun                          |
| `vo_elena_b4_02`         | Elena   | "Come back, Harold. Come back."                                                                                            | Purify channel                |
| `vo_briggs_b4_04`        | Briggs  | "The boy... Gartner's boy came running past. Crying. I think I frightened him."                                            | Purified, dazed on his step   |
| `vo_elena_b4_03`         | Elena   | "I'm sorry. I'm so sorry."                                                                                                 | Destroyed                     |
| `vo_gartner_b4_01`       | Gartner | "Felix? Felix, are you there? Please answer. I'm in the shed. Number forty. I'm not coming out."                           | Walkie crackle, on interact   |
| `vo_elena_b4_04`         | Elena   | "Gartner. He's at forty."                                                                                                  | After the walkie              |
| `vo_angel_b4_kind_c1`    | Angel   | "You gave him back to himself. Rosalind would have done the same. I find I'm glad."                                        | C, after `seq3_done`, kind    |
| `vo_angel_b4_kind_c2`    | Angel   | "Mercy costs more than it looks, dear heart. You paid it anyway."                                                          | C, after `seq3_done`, kind    |
| `vo_angel_b4_neutral_c1` | Angel   | "Curious. You hesitated before you chose. I like to know what people do when it matters."                                  | C, after `seq3_done`, neutral |
| `vo_angel_b4_neutral_c2` | Angel   | "The boy on the walkie is frightened, not wicked. Number forty, he said."                                                  | C, after `seq3_done`, neutral |
| `vo_angel_b4_dark_c1`    | Angel   | "Efficient. The smoke will think twice. I confess I didn't think you had it in you."                                       | C, after `seq3_done`, dark    |
| `vo_angel_b4_dark_c2`    | Angel   | "Forty. Go and get your answers from the child. Quickly."                                                                  | C, after `seq3_done`, dark    |

## Beat 5. Sequence 4: Gartner's Confession

| ID                       | Speaker  | Line                                                                                                                                                                                   | Delivery / trigger                    |
| ------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `vo_elena_b5_01`         | Elena    | "Gartner? It's Elena. Felix's mum. You're safe. Open the door."                                                                                                                        | Knock on `door.hideout.shed`          |
| `vo_gartner_b5_01`       | Gartner  | "Is it really you? It does voices. It did Felix's voice."                                                                                                                              | Through the door, then it opens       |
| `vo_elena_b5_02`         | Elena    | "It's me. Look at me. Where's Felix?"                                                                                                                                                  | Gentle, urgent                        |
| `vo_gartner_b5_02`       | Gartner  | "There was a voice on the walkies. A nice voice. It said Felix's great-gran left him treasure. A game, just for him."                                                                  | Fast, tearful                         |
| `vo_gartner_b5_03`       | Gartner  | "It said I could help, 'cause I know the way. We go down the back lane behind sixty-six. Nobody sees you there."                                                                       |                                       |
| `vo_gartner_b5_04`       | Gartner  | "The door of the old house was open, and Felix went in, and it shut. And the voice laughed. It wasn't nice any more."                                                                  | Breaking                              |
| `vo_gartner_b5_05`       | Gartner  | "I banged on it. I did. Then I ran. I'm sorry. I didn't know."                                                                                                                         |                                       |
| `vo_elena_b5_c1`         | Elena    | "Hey. Hey. You didn't do this. Something used you, and it lied to you. That's not your fault."                                                                                         | Choice: comfort (`gartner_comforted`) |
| `vo_gartner_b5_06a`      | Gartner  | "...Okay."                                                                                                                                                                             | After comfort                         |
| `vo_elena_b5_p1`         | Elena    | "Why didn't you get help? Why didn't you come to me?"                                                                                                                                  | Choice: press (`gartner_pressed`)     |
| `vo_gartner_b5_06b`      | Gartner  | "I was scared it would hear me. I'm still scared."                                                                                                                                     | After press                           |
| `vo_gartner_b5_07`       | Gartner  | "Felix found this in the lane. He said it was a treasure map. It's not a map."                                                                                                         | Hands over journal page 2             |
| `vo_gartner_b5_08`       | Gartner  | "The lane gate's locked now. Mr Corwin at sixty-six has the key. He took the fuses out of all his lights. He says the dark lets him see."                                              |                                       |
| `vo_gartner_b5_09`       | Gartner  | "Mr Briggs had loads of fuses. For his Halloween lights."                                                                                                                              |                                       |
| `vo_elena_b5_03`         | Elena    | "Stay here. Lock the door. I'll bring him back."                                                                                                                                       |                                       |
| `vo_gartner_b5_10`       | Gartner  | "Tell him I'm sorry."                                                                                                                                                                  | Door closes                           |
| `vo_rosalind_j2`         | Rosalind | "The house at the end of the street is not mine. I only keep it. What sleeps beneath it was here before the street, before the town. I closed the door, and my blood keeps it closed." | Journal page 2 reading                |
| `vo_angel_b5_kind_c1`    | Angel    | "That boy is a victim, the same as your neighbour. The smoke chose him because he was kind."                                                                                           | C, after `seq4_done`, kind            |
| `vo_angel_b5_neutral_c1` | Angel    | "A voice that does voices. How very theatrical. I'd almost admire it."                                                                                                                 | C, after `seq4_done`, neutral         |
| `vo_angel_b5_dark_c1`    | Angel    | "The smoke picked the softest child on the street to carry its message. Don't waste your anger on the messenger. Find the hand."                                                       | C, after `seq4_done`, dark            |
| `vo_angel_p2_h1`         | Angel    | "Your neighbour with the garish lights, perhaps?"                                                                                                                                      | H, P2 hint 1                          |

## Canon check (act 1)

- Gartner: deceived, frightened, guilty-feeling, never knowingly helping. Pressing him does not change this. Pass.
- Elena's magic: named as hers and Rosalind's blood by the Angel (`vo_angel_b3_01`). Pass.
- Angel and smoke separate. Pass.
- Felix: no harm shown. Pass.

Line count act 1: Elena 27, Angel 27, Felix 4, Gartner 12, Briggs 4, Rosalind 2 = 76.
