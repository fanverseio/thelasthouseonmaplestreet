# Playtest plan: The Last House on Maple Street (Classic mode, greybox)

Status: written 2026-11-07 for the author's single test session. Checked against the code on branch `feat/phase1-foundations`.

This plan merges and supersedes the five earlier fragments `playtest/beat-7-8.md`, `playtest/beat-9-10.md`, `playtest/beat-11-12.md`, `playtest/fox-skip-sound.md` and `playtest/locket-lines-spells.md`. Those files were removed with `git rm`. Beats 1 to 6 are new. Where a fragment disagreed with the code, the code won (for example: spell keys 1/2/3 now work, respawn now moves the body, and the Classic locket now has lines for beats 7 to 12).

How to use it:

- Every step is `ID. do X -> expect Y`. Fill in section 7 as you go. IDs never change.
- Lines named `N` (for example `B4.N1`) are "should NOT happen" checks. Mark them fail if the bad thing happens.
- Play with the sound on. All voice lines are subtitles only (no voice audio exists yet). Sounds are synthesised beeps and noise.
- The game is a greybox. Boxes stand in for people, houses and monsters. Colours: hostile enemy red, stunned enemy blue-grey, purified green, destroyed a flat dark patch.
- A full run (section 1) takes about 30 to 40 minutes with the test shortcuts. Section 2 is a second run for the other outcomes.

---

## 0. Setup

- S0.1. In a terminal in the repo root run `npm install`, then `npm run dev`. -> The terminal shows `[client] ... Local: http://localhost:5173/` and `[api] Listening on http://127.0.0.1:3000`.
- S0.2. Open `http://localhost:5173` in desktop Chrome, Edge or Firefox. -> The "Before you play" warning shows. Click Continue. The main menu shows New Game, Settings and Credits. There is no Continue button on a clean browser profile.
- S0.3. Open `http://localhost:5173/?bootcheck`. -> The developer page shows API: ok and WebGL 2: available, and a small foggy test scene.
- S0.4. Open Settings from the main menu. -> Set "Scene brightness" to `Bright (testing)` and "Highlight interactive things" to `Bright (testing)`. These are the defaults. Keep them for the whole first run. Go Back.
- S0.5. Choose New Game, then Classic Story Mode. -> "AI-Enhanced Mode" is greyed out ("Not available yet"). The game opens with "Click to resume". Click the game once to capture the mouse.

Settings are not saved when you reload the page (see section 5), so set them again after a reload. The warning screen also comes back after a reload.

### Dev start URLs (dev server only)

Open the URL first, then pick New Game, Classic Story Mode. The shortcut is read when you press Classic Story Mode. Each shortcut sets the real flags in order, so checkpoints and gates are honest. Morality is not changed by a shortcut, so the Angel sounds neutral after a jump.

| URL | Where you land | State |
|---|---|---|
| `http://localhost:5173/` | Hall of No. 12, facing the bedroom (-22, 39) | New game, Beat 1 |
| `http://localhost:5173/?start=street` | Front porch (-19.5, 32.5) | Locket taken, `home_done` |
| `http://localhost:5173/?start=garden` | Under the intersection streetlight (58, 30) | `seq2_done`, Arcane Bolt unlocked |
| `http://localhost:5173/?start=house66` | North arc, outside No. 40 (50, -35) | `seq4_done`, Briggs purified, all three spells, fuse not taken |
| `http://localhost:5173/?start=lane` | Lane gate (-58, -20) | `lane_open`, nothing from Beat 7 done |
| `http://localhost:5173/?start=grounds` | Outbuilding door (-52, 25.5) | `padlock_open`, hounds counted as done |
| `http://localhost:5173/?start=interior` | Entrance hall of the Last House (0, 20) | Runes done, cat and board not done |
| `http://localhost:5173/?start=ritual-door` | Ritual chamber centre (0, -12) | Cat and board done, `board_solved` |
| `http://localhost:5173/?start=ritual` | Ritual chamber centre (0, -12) | `seq6_done`, seal ready to wake |
| `http://localhost:5173/?start=ritual-choice` | Ritual chamber centre (0, -12) | All anchors restored, `anchors_all` |

Other dev URLs: `?bootcheck` (developer page) and `?scene=last_house` (opens the interior greybox on a new game, used by the browser smoke test). None of these exist in a built game.

Beat 5 (Gartner) has no shortcut. Reach it with `?start=garden` and play Beat 4.

### Controls

| Key | Action |
|---|---|
| W A S D | Move |
| Mouse | Look (click the game first to capture the mouse) |
| Shift | Sprint |
| E | Use the highlighted action. Tap to interact. Hold on an anchor to restore it. Hold 1 s during a video clip to skip it |
| Q | Switch the selected action in the Actions side panel (only when two or more actions are in range and in front of you) |
| T | Open the locket (the Angel). T or E plays the next line. T closes at the last line. Esc closes at any time |
| 1 / 2 / 3 | Select Arcane Bolt / Purify / Ward. Only spells you have unlocked can be selected |
| 3 | During Briggs' first attack wind-up (1.5 s) casts Ward |
| 2 | On a stunned enemy: Purify it |
| Hold Enter (0.7 s) | On a stunned enemy: Destroy it |
| Left mouse button | A whoosh sound once Arcane Bolt is unlocked. It does no damage in this build |
| 1 / 2 | In Gartner's talk and in the final choice: pick option 1 or 2 |
| Esc | Pause (then "Click to resume", Settings, Quit to menu). Closes an overlay. Backs out of the final confirm |
| Puzzle overlays | Padlock: W/S or wheel change a digit, A/D move, E tries, Esc closes. Talking board: click a letter, or arrows then E, Esc closes |

The mouse is locked while you play, so buttons on screen can only be clicked after Esc. Use the keys.

### What the screen shows

- Top left: the objective line. Bottom left: health and magic bars. Bottom centre: the selected spell (glyph and name). Bottom right: carried items.
- Right side: the Actions panel lists what E can do now, with "Q: switch action" when there are two or more. Lower middle: movement tutorial hints.
- Yellow pulsing columns mark things you can use (doors and the seal are taller). Pale blue columns mark leads: Felix's window, the upstairs window at No. 14 and the intersection streetlight. Enemies and trigger areas never glow.
- Bottom centre: subtitles. Every line shows its speaker.

---

## 1. Full run, in story order

Play Beats 1 to 12 once, in order. Play kindly: Purify everything, comfort Gartner. Section 2 covers the other choices. If you want to test one beat on its own, use its start URL and ignore the steps before it.

Beat 1 to 6 positions are metres, x east and z south. Houses: No. 12 (home) south-west, No. 31 (Briggs) east, No. 40 (Gartner's shed) north-east, House 66 north-west, the Last House far west.

### Beat 1. Elena's home (about 3 min)

Start: `http://localhost:5173/` (no shortcut). Quest: The Search. Checkpoint written at the end: `cp_street`.

- B1.1. Press New Game, Classic Story Mode, click the game. -> You stand in the hall of No. 12 facing west into Felix's bedroom. Objective "Find Felix." Health and magic bars are full. The spell label shows "✦ Arcane Bolt".
- B1.2. Press 1, 2, 3. -> The spell label does not change (nothing is unlocked yet).
- B1.3. Press T. -> Nothing happens (the Angel is still asleep).
- B1.4. Look around the house. -> Yellow pulsing columns mark the drawing in the bedroom, the drawer table by the front door and the front door itself. A pale blue column marks Felix's window (bedroom). The kitchen jar has no marker.
- B1.5. Walk west into the bedroom (-25, 39). -> Elena says "Felix? It's past nine, love. Your costume's still on the chair." About 3 s later: "The window's open. Why is the window open?" The objective changes to "Look for clues about Felix."
- B1.6. Go east into the kitchen and look at the pumpkin jar (-14.2, 36.5). -> No prompt and no glow. It is not offered before you have seen the drawing.
- B1.7. Go to the front door (-19.5, 34.8) and press E. -> Elena says "Not yet. He left me something. He always leaves me clues." The door stays shut and you cannot walk out.
- B1.8. Stand between the drawer table (-17.8, 37) and the front door, looking at both. -> The Actions panel lists "Open the front door" and "Drawer (locked)", with "Q: switch action". Press Q. -> The E marker jumps to the other action. Press Q again. -> It jumps back.
- B1.9. With "Drawer (locked)" selected press E. -> Nothing happens. No line, no change.
- B1.10. Go back to the bedroom, face the drawing (-26, 37.6) and press E. -> Elena says "'My secret hiding place.' The pumpkin. Of course it's the pumpkin." Objective "Find the key Felix drew." The drawing prompt is gone.
- B1.11. Wait 45 s without moving to the jar. -> Elena says "The pumpkin... he hides everything in that pumpkin." Wait to 90 s in total. -> The jar in the kitchen starts to glow and pulse more brightly.
- B1.12. Press E at the jar. -> Elena says "A key? What have you been up to... the hall drawer." A key icon shows bottom right. Objective "Open the drawer by the front door." The jar marker is gone.
- B1.13. At the drawer table the prompt reads "Unlock the drawer". Press E. -> Elena says "Gran's locket. I locked this away years ago. It used to... whisper." The key icon is gone. A short wavering creak plays once (the front door gate opens). Objective "Leave the house."
- B1.14. Do not press anything and listen. -> The Angel wakes by itself. Subtitles in order: Angel "Ahh. Air. Moonlight...", Elena "Who said that?", Angel "The locket, child...", Angel "Something old is awake...", Felix "Mum?", Elena "Felix! Stay there, I'm coming!", Angel "Take me with you...". It lasts about 28 s. You can walk and look the whole time.
- B1.15. Press T during the Angel's speech. -> The locket does not open.
- B1.16. Press E at the front door during the speech. -> Nothing visible happens and the objective stays "Leave the house." The doorway is open, but the door does not count as used until the speech ends.
- B1.17. After the speech press T. -> A dark full-screen panel shows "Angel: Rosalind's granddaughter. You have her chin. Let's hope you have her nerve." and "T or E: next · Esc: close". Press T. -> Next line "The boy's voice came from the street. So will the answers, I suspect." Press T at the last line. -> The panel closes. Press Esc in another opening. -> It closes at once and "Click to resume" shows. The game is frozen while the panel is open.
- B1.18. Press T several more times, closing and reopening. -> You get a different line each time until the lines are used up, then they repeat. Nothing refers to events you have not seen.
- B1.19. At the drawer table press E on "Read the note in the drawer". -> The note is read ("To whoever opens this drawer after me... R.V."). The prompt goes away. It is optional.
- B1.20. Stand at the front door and press E on "Open the front door". -> The objective becomes "Follow Felix's voice down Maple Street." Three hints appear lower middle, about 4.5 s apart: "WASD: move · Mouse: look", "Shift: sprint", "E: interact". You can now go out onto the porch. The autosave runs (checkpoint `cp_street`).
- B1.21. Optional edge case: on a second run, walk out through the open doorway during the Angel's speech, before pressing E on the door. -> Nothing in the street happens until you go back and press E on the door after the speech. Report if you get stuck outside.

Should NOT happen in Beat 1:

- B1.N1. The front door lets you out before the drawer is opened.
- B1.N2. The jar shows a prompt before the drawing is seen.
- B1.N3. The Angel speaks, or T opens the locket, before the drawer is opened.
- B1.N4. Any number, score or the word "morality" on screen.
- B1.N5. A second door creak after step B1.13.

Placeholders in Beat 1: all boxes, no voice audio, the costume on the chair is not usable, Felix's "Mum?" is a subtitle only (not a sound from the street). Angel hint `vo_angel_p1_h2` cannot be reached (see question Q21).

### Beat 2. Sequence 1: the empty street (about 1.5 min)

Start: `?start=street`, or continue from Beat 1. Checkpoint before: `cp_street`. Sets `seq1_done`.

- B2.1. You stand on the porch. -> Objective "Follow Felix's voice down Maple Street." The movement hints show (they also show after a shortcut).
- B2.2. Walk east along the street (z about 27 to 32). When you pass x = -17 the sequence starts. -> Elena says "Where is everyone? It's Halloween. There should be kids. Noise."
- B2.3. Keep walking east. -> The streetlights flicker one after another towards the intersection, each with a short stuttering buzz (check the sound).
- B2.4. Keep walking. -> Three slow dull thuds play once, behind you. Elena says "Hello? Is someone there?"
- B2.5. Look at the upstairs window of the house south of the road around x = 5 (No. 14). It is a lit yellow panel with a pale blue marker. -> A dark upright shape crosses the panel for a few seconds, then is gone. Elena says "The Parkers are away. So who's in their house?"
- B2.6. Walk to the smoke wall at x = 36. -> The wall blocks you until the sequence is finished. Walk into the end area (x about 26 to 37, z about 30). -> Elena says "That smoke's moving against the wind." The wall fades out over about 2.5 s. The objective becomes "Go to the streetlight."
- B2.7. Run the street again on another try, sprinting all the way (Shift). -> The sequence still finishes when you arrive. The lines and lights may still be playing as you pass. Report if the wall never opens.
- B2.8. Hold E anywhere on the street. -> No "Hold E to skip" ring. This sequence cannot be skipped.
- B2.9. During the sequence press T. -> The locket opens (allowed here). Lines: "Listen. No dogs, no doors, no children. Silence like this is made, not found." then "Walk towards the light at the corner..." and, until the wall opens, "The street only goes one way tonight, Elena. Follow the lights." Esc closes.
- B2.10. Press 1, 2, 3. -> Still nothing changes (Arcane Bolt comes in Beat 3).

Should NOT happen in Beat 2:

- B2.N1. Trick-or-treaters or any person in the street.
- B2.N2. The footsteps or the flicker buzz repeating after the sequence is over.
- B2.N3. Losing control of the camera or movement.
- B2.N4. Being able to go past x = 36 before the wall fades.

Placeholders in Beat 2: boxes for houses, a flat dark box as the window shape, no ambience ducking (there is no ambience yet), the sounds are beeps and thuds.

### Beat 3. Sequence 2: Felix beneath the streetlight (about 1.5 min)

Start: continue from Beat 2. There is no separate shortcut (`?start=garden` lands after this beat). Sets `seq2_done` and `spell_bolt`. Checkpoint: `cp_intersection`.

- B3.1. Walk east past the open wall to the intersection streetlight (58, 27); the trigger is the circle around (57, 29.5). -> A black panel with the text `seq2_felix_streetlight` and "cinematic placeholder" covers the screen. You cannot move. This is the Felix clip placeholder; it lasts 20 s.
- B3.2. Look at the bottom right. -> A ring with "Hold E to skip", empty.
- B3.3. Tap E quickly. -> Nothing skips. The ring stays empty or shows a sliver and resets.
- B3.4. Hold E, release halfway. -> The ring fills, then empties again. The panel stays.
- B3.5. Press T during the panel. -> The locket does not open.
- B3.6. Hold E for a full second. -> The panel disappears at once and you can move.
- B3.7. After the clip (skipped or not). -> Elena says "My hands... what's happening to my hands?" About 3.5 s later the Angel says "That isn't my doing. That light is yours. Rosalind's blood, waking up at last." About 8 s after the clip: "Point. Will it. Let it go." A hint "LMB: Arcane Bolt" shows for 10 s. Objective "Search the garden at No. 31."
- B3.8. Press LMB. -> A short whoosh. Nothing is damaged. Press 1. -> The spell label stays "✦ Arcane Bolt". Press 2 and 3. -> No change (not unlocked).
- B3.9. Run this beat again from a save made before the streetlight (see section 3) and watch the whole panel without skipping. -> After about 20 s the panel ends by itself with exactly the same result as skipping.
- B3.10. Run it once more and keep E held down before you step into the circle. -> It does not skip until you release E and press it again.
- B3.11. Walk to Felix's sweets bag (62, 32) and press E. -> Elena says "His sweets bag. He never puts this down." The wall to the garden (north, z = 24) is gone.
- B3.12. Press T. -> Lines: "The boy's spirit walks without his body. His body is somewhere else, and alive. Hold on to that." then "Your gift has teeth now. Use it on what the smoke has taken, not on the frightened."
- B3.13. Try the locket before the streetlight on another run (after `seq1_done`). -> A vague placeholder line "light at the corner" appears, and nothing about Felix's spirit or the smoke by name.

Should NOT happen in Beat 3:

- B3.N1. Skipping with a tap of E.
- B3.N2. A different end state when skipped or watched (bolt available, wall open, objective changed either way).
- B3.N3. A skip ring in a scene with no clip.

Placeholders in Beat 3: the Felix clip is a black panel (clip id `seq2_felix_streetlight`, manifest in `content/video/clips.ts`). Felix's four lines in the clip are not subtitled. The bolt has a sound only.

### Beat 3b. Street fox (optional, about 1 min)

Start: `?start=garden`. The fox is a small box that appears after `seq2_done` at about (42, 31), 15 m west of the intersection. Trigger circle around (42, 28), radius 4.

- BF.1. Walk west from the intersection towards x = 42. -> A small red box (the fox) is already there. Inside the circle it turns hostile and the Encounter panel shows "Weaken (E)". It does not move or hurt you.
- BF.2. Press T while it is red. -> The locket does not open.
- BF.3. Stand within 2.5 m, face it and press E ("Approach the fox"). -> It turns blue-grey about 1 s later and stays that way for ever. The panel now shows "Purify (2)" and "Destroy (hold Enter)".
- BF.4. Press T. -> The locket opens normally.
- BF.5. Press 2. -> Nothing happens. The fox stays blue-grey. No sound. (Purify is only taught in Beat 4.)
- BF.6. Walk more than 20 m away (east past the intersection) and back. -> The fox is still blue-grey. The panel only shows within 20 m.
- BF.7. Hold Enter for about 0.7 s next to the stunned fox. -> It shrinks to a dark flat patch. The prompt "Approach the fox" is gone.
- BF.8. Skip ending: on another run never enter the circle. -> Nothing happens and the story goes on.
- BF.9. Leave ending: let it turn red, then walk east more than 20 m. -> It turns back to calm brown and the locket works. Walking back and pressing E engages it again.
- BF.10. Purify ending (needs Beat 4 done; use `?start=house66`, then walk to the fox): stun it, press 2. -> A soft rising whoosh and a green box.
- BF.11. Go on to the garden with the fox stunned. -> Beat 4 works exactly as without the fox. The fox does not follow.
- BF.N1. The fox blocks movement, the locket or the story in any case.
- BF.N2. Any score, number or "+10" on screen.

Placeholders for the fox: a box, no animation, no spoken lines (three fox lines exist in content but are not used).

### Beat 4. Sequence 3: the cursed neighbour (about 4 min)

Start: `?start=garden`. Quest: The Truth. Checkpoints: `cp_garden` on entering the garden, `cp_garden_after` at the end. Sets `seq3_started`, `spell_ward`, `spell_purify`, `briggs_purified` or `briggs_destroyed`, `walkie_found`, `seq3_done`.

- B4.1. From the intersection go north through the opened wall into the garden. Cross the circle at the garden gate (58, 20). -> The game saves (checkpoint `cp_garden`). Nothing visible happens.
- B4.2. Walk on towards Mr Briggs, a box at (57, 6). Press T before you are close. -> You get the Beat 3 lines again ("The boy's spirit walks without his body..."). Nothing about Briggs yet.
- B4.3. Come within 4 m of him. -> Elena says "Mr Briggs? Have you seen Felix? Mr Briggs?" He turns red and gets taller. Briggs says "Lovely night. Lovely... night. It said you'd come." then "It's warm in here, Elena. Come inside." The Encounter panel appears.
- B4.4. Press T now. -> The locket does not open (he is hostile).
- B4.5. Press E at him before the Ward. -> Prompt "Speak to Mr Briggs"; E does nothing yet.
- B4.6. After about 6 s the Angel says "Raise your arm! Like a door closing. Now!" and the panel shows a "Ward (3)" button for 1.5 s. Press 3 within that time. -> A whoosh. Magic drops by 25. Your health does not change.
- B4.7. On another run do not press 3. -> The health bar drops once by 12 (never below 30) after the 1.5 s. The Ward is still unlocked afterwards (spell label can show "⛉ Ward" on key 3).
- B4.8. After the hit Briggs says "It wants the boy's mother. It wants..." The prompt reads "Weaken Mr Briggs". Stand within 2.5 m and press E. -> He turns blue-grey about 1.5 s later. Purify is unlocked now. The panel shows "Purify (2)" and "Destroy (hold Enter)". The Angel says by itself "There. He's weakened. You can cleanse the man inside, or finish what the smoke started. Choose, Elena. I'll be watching."
- B4.9. Press T. -> The locket opens now (it is allowed while he is stunned). Placeholder line: "Be careful, child. The man you knew may still be in there, somewhere beneath the smoke."
- B4.10. Press 1, 2, 3. -> The spell label follows: 3 Ward, 2 Purify, 1 Arcane Bolt. All three are selectable. The label always shows glyph and name.
- B4.11. Press 2 (Purify). -> A soft rising whoosh. Briggs turns green and sits. Elena says "Come back, Harold. Come back." About 3.5 s later Briggs says "The boy... Gartner's boy came running past. Crying. I think I frightened him." The panel closes.
- B4.12. A walkie-talkie marker shows at (55.5, 4.5) with the prompt "Pick up the walkie-talkie". Press E. -> Gartner's voice crackles: "Felix? Felix, are you there? Please answer. I'm in the shed. Number forty. I'm not coming out." About 7 s later Elena says "Gartner. He's at forty." The sequence ends at once. Objective "Find Gartner at No. 40."
- B4.13. The wall at the north of the garden (z = -22) is gone and the garage door at No. 31 (60.9, 14) is open. -> A creak plays once.
- B4.14. Press T. -> A line in the Angel's tone for your play style (kind: "You gave him back to himself"). A second line on the next press.
- B4.15. Take the other route (run 2, section 2): destroy instead of purify. -> See R2.2 to R2.4.
- B4.N1. The scripted hit takes you below 30 health, or kills you.
- B4.N2. Briggs hurts you any other way, or follows you out of the garden.
- B4.N3. The locket opens while he is red.
- B4.N4. The numbers 30 or -30, or a morality bar, anywhere on screen.
- B4.N5. The walkie being picked up before Briggs is dealt with.
- B4.N6. The Ward prompt (3) being missed so easily that you cannot see it. Report if the 1.5 s window feels too short.

Placeholders for Beat 4: Briggs is a box with no real combat (the stub weakens him with E and stuns him on a timer). Angel line `vo_angel_b4_c0` is invented. The panel's small hint text mentions "LMB", but in this build the keys are 2 and Enter.
- B4.16. Death: cannot be tested by hand. Nothing in this build can bring health to 0 (see question Q22). Mark N/A. -> The headless tests cover it: respawn at `cp_garden` with full health and magic, Briggs back to full, flags and spells kept.

### Beat 5. Sequence 4: Gartner's confession (about 2 min)

Start: there is no shortcut. Use `?start=garden`, play Beat 4 and walk to the shed, or continue from Beat 4. The shed is at No. 40, north-east: door (62, -31.9), Gartner's box (64.2, -32). Sets `gartner_comforted` or `gartner_pressed`, then `seq4_done`. Checkpoint: `cp_house66`.

- B5.1. Walk north out of the garden (the wall at z = -22 is gone) and east to the shed. -> The objective says "Find Gartner at No. 40." The shed door and Gartner both have a yellow marker.
- B5.2. Stand at about (63, -31), facing both. -> The Actions panel lists "Knock on the shed door" and "Talk to Gartner". Q switches between them. Both start the same scene.
- B5.3. Press E. -> The scene starts. You cannot move or look around (limited control). Elena: "Gartner? It's Elena. Felix's mum. You're safe. Open the door." Then Gartner: "Is it really you? It does voices. It did Felix's voice." The talk continues for about 30 s with Gartner's confession ("There was a voice on the walkies...", "...the back lane behind sixty-six", "The door of the old house was open...", "I banged on it. I did. Then I ran. I'm sorry. I didn't know.").
- B5.4. Press T and press E again during the talk. -> The locket does not open. E does not restart or break the scene.
- B5.5. When the talk reaches the choice. -> Two buttons show low in the middle: "Comfort him (1)" and "Press him (2)". Wait 30 s. -> Nothing happens. There is no timer.
- B5.6. Press 1 (comfort). -> Elena: "Hey. Hey. You didn't do this. Something used you, and it lied to you. That's not your fault." About 4.5 s later Gartner: "...Okay."
- B5.7. Wait. -> About 8 s later Gartner hands over the page: "Felix found this in the lane. He said it was a treasure map. It's not a map." then "The lane gate's locked now. Mr Corwin at sixty-six has the key. He took the fuses out of all his lights. He says the dark lets him see.", "Mr Briggs had loads of fuses. For his Halloween lights.", Elena "Stay here. Lock the door. I'll bring him back.", Gartner "Tell him I'm sorry." The whole scene takes about a minute.
- B5.8. When it ends. -> You can move again. Objective "Find a fuse for House 66." The wall at x = -12 on the north arc fades out. The game saves (`cp_house66`).
- B5.9. Press E at the journal page (63, -31), "Read the journal page". -> It is read once (optional). The prompt goes away.
- B5.10. Press T. -> A line in your tone: kind "That boy is a victim, the same as your neighbour. The smoke chose him because he was kind." A second, invented line on the next press.
- B5.11. Compare with run 2 (press him, key 2). -> See R2.5.
- B5.N1. Any line that blames Gartner, or says he helped the smoke on purpose, in either choice.
- B5.N2. A timer on the choice, or the choice being auto-picked.
- B5.N3. Different information after the two choices (only the two choice lines differ).
- B5.N4. Control stuck after the scene ends.

Placeholders for Beat 5: Gartner is a box, the shed bulb has no light, the Gartner lines in `content/dialogue/beat5.ts` wait for your approval (Q19).

### Beat 6. House 66: the Watcher (about 3 min)

Start: `?start=house66` (outside No. 40 at (50, -35), all three spells, fuse not taken), or continue. Sets `fuse_taken`, `fuse_placed`, `watcher_started`, `watcher_purified` or `watcher_destroyed`, `fence_key_taken`, `lane_open`. Checkpoints: `cp_watcher` (fuse placed), `cp_lane`.

- B6.1. Objective at the start: "Find a fuse for House 66." -> Shown.
- B6.2. Walk west along the north arc to House 66 (the wall at x = -12 is open). Go to the fuse box (-52, -35) beside the house. Press E on "Look at the fuse box". -> Elena: "Empty. He really did take them all." Nothing else changes.
- B6.3. Stay within 22 m of the fuse box for 60 s without a fuse. -> The Angel says by itself "Your neighbour with the garish lights, perhaps?" (invented line). Press T. -> Same hint. At 120 s: T gives "That light at number thirty-one is flickering for a reason, child. Go and look." (invented line; the flicker itself is not drawn).
- B6.4. Go to No. 31's garage (60.9, 17). The prompt is "Take the fuse". Press E. -> A fuse icon (⚡) shows bottom right. Objective "Bring the fuse to House 66." You cannot drop it.
- B6.5. Go back to the fuse box. The prompt is "Place the fuse". Press E. -> Elena: "Let's see you, then." The fuse icon is gone. Objective "Face the Watcher." The game saves (`cp_watcher`). About 3 s later the Watcher says "Felix. Felix went by. Little feet, little lantern. I watched."
- B6.6. Walk to within 4 m of the Watcher's box (-58, -28). -> He turns red and says "I watch for it. I watch for it. Sixty years I watch." The Encounter panel appears. T does not open.
- B6.7. Within 2.5 m press E on "Face the Watcher". -> He turns blue-grey about 2.5 s later. The Watcher says "Let me watch. Let me watch!" About 2.5 s later the Angel says "The watcher, unwatched at last. Mercy or ending, Elena. The key falls either way." The panel shows Purify (2) and Destroy (hold Enter).
- B6.8. Press T. -> The locket opens (allowed while he is stunned): "He moves when you blink. Watch the smoke, not the man."
- B6.9. Press 2 (Purify). -> Whoosh, green box. The Watcher says "I was meant to watch the house. Somewhere along the way I started watching for it. The key. Go." (lore line, invented, needs your approval).
- B6.10. A fence key marker shows at (-56.5, -28): "Take the fence key". Press E. -> Elena: "The lane gate." A key icon shows. Objective "Unlock the lane gate."
- B6.11. Walk to the lane gate (-59.5, -23.6) before taking the key (on run 2, section 2). -> The prompt reads "The lane gate is locked". E does nothing. The smoke wall at z = -22 blocks you.
- B6.12. At the gate with the key the prompt is "Unlock the lane gate". Press E. -> The key icon is gone. The wall fades out over about 2.5 s. Objective "Follow the back lane to the Last House." The game saves (`cp_lane`).
- B6.13. After taking the key and before unlocking the gate, press T. -> A line in your tone about the lane (kind: "Your light is warmer than it was an hour ago..."). After the gate opens, T gives the Beat 7 lines instead.
- B6.14. Death: cannot be tested by hand (Q22). Mark N/A. -> Headless tests cover: respawn at `cp_watcher`, fuse stays placed, Watcher back to full.
- B6.N1. The Watcher teleporting or hurting you (not built).
- B6.N2. The fence key opening anything except the lane gate.
- B6.N3. The lane wall opening before the key is used.
- B6.N4. Taking the fuse twice, or a second fuse.
- B6.N5. A score or number on screen.

Placeholders for Beat 6: the Watcher is a box that stands in the yard from the start (not only after the fuse). He does not teleport or spawn decoys. The House 66 porch light does not turn on. The fuse is taken from a pick-up marker beside No. 31's garage. The flicker hint at 120 s is not drawn.

### Beat 7. The back lane and the grounds (about 3 min)

Start: `?start=lane`. Sets `journal_3` (optional), `enc_approach_resolved`, `padlock_open`. Checkpoint: `cp_outbuilding`.

- B7.1. Stand at the lane gate (-58, -20) and walk south down the lane (x about -59). -> A dark lane. The Last House shows as a big dark shape far to the south. Objective "Follow the back lane to the Last House."
- B7.2. Look for a small yellow-marked box on the fence near (-64.4, 10) and press E on "Read the journal page". -> Rosalind: "Thirty-first of October, nineteen sixty-six. The night I closed it..." Read once. Optional.
- B7.3. Walk south past z = 1 (circle around (-59, 6)). -> Elena whispers "That's our house. That's Felix's window." To the south-east, a window in No. 12 (about -26, 40) turns warm yellow with a small dark shape for about 5 s, then goes dark. You keep control. It happens once only.
- B7.4. Press T in the lane. -> A line about the house in your tone (neutral: "The house is showing you what you want. Houses do that.").
- B7.5. Walk to the grounds entrance (-57, 20). -> The Angel says "Hounds. The smoke has run out of neighbours." Two boxes, at about (-58, 24) and (-54, 23.5), turn red. The panel shows "Weaken (E)". They never hurt you. T does not open.
- B7.6. Go to the padlock on the outbuilding door (-52, 26.5) and press E before dealing with the hounds. -> The prompt is "Look at the padlock". Elena says "Gran's old carriage house. Locked." No dial overlay.
- B7.7. Go to the first hound, press E on "Face the hound" within 2.5 m. -> It turns blue-grey about 1.5 s later. The panel shows Purify (2) and Destroy (hold Enter). Press 2. -> Green box, whoosh.
- B7.8. Press E at the padlock with one hound left. -> Same refusal as B7.6.
- B7.9. Do the second hound the same way (try hold Enter once, on run 2). -> The objective becomes "Open the outbuilding padlock." T works again.
- B7.10. Press E at the padlock. -> A dark "Padlock" overlay with four dials at 0. The mouse cursor is free.
- B7.11. Use W/S (or the wheel) to change a digit and A/D to move to the next dial, E to try a wrong code (for example 1965). -> The text says "The padlock rattles." Wrong tries cost nothing.
- B7.12. Make more wrong tries. -> 1st wrong: "Your grandmother was fond of dates." 3rd wrong: "The page in the lane. The year." 5th wrong: "Look closely. The first two dials are glowing. Nineteen." and the first two dials glow (1 and 9). 7th wrong: "Every dial is glowing now. Follow them in order." and all four dials glow.
- B7.13. Press Esc, then click the game, then press E at the padlock again. -> The dials are where you left them.
- B7.14. Enter 1966 and press E. -> "The padlock clicks open." Press Esc and click. A creak plays once. Objective "Look into the mirror." The game saves (`cp_outbuilding`).
- B7.15. Walk into the doorway of the outbuilding (x -53.5 to -50.5, z about 27). -> You can walk in. Before the code it was a solid brown block.
- B7.16. Try a run where the first hound is purified and the second destroyed (hold Enter). -> Same result: the approach is cleared only after both are done.
- B7.17. Death: cannot be tested by hand (Q22). Mark N/A. -> Headless tests: respawn at the lane gate (`cp_lane`, about 41 m from the grounds), resolved hounds stay resolved.
- B7.N1. A smoke wall inside the lane or grounds.
- B7.N2. The padlock overlay opening before both hounds are done.
- B7.N3. Being damaged by a hound.
- B7.N4. The window event repeating or taking control away.
- B7.N5. A number such as +10 or -10.

Placeholders for Beat 7: hounds are boxes that do not move or growl. Felix's window is a flat lit plane with a dark box. The padlock rattle is text only (no sound).

### Beat 8. Sequence 5: Felix in the mirror (about 2 min)

Start: `?start=grounds` (outbuilding door (-52, 25.5), padlock open). Sets `seq5_done`, then `runes_done`. Opens the Last House front door.

- B8.1. Walk through the doorway to the south wall (-52, 31). A mirror 3 m wide hangs on it (centre -52, 32.2). Face it. -> Prompt "Look into the antique mirror". You see a reflection of the room. There are no glowing marks in the room or in the reflection yet.
- B8.2. Press E. -> A black panel with `seq5_felix_mirror` and "cinematic placeholder" for 25 s. You cannot move. T does not open. The ring "Hold E to skip" shows.
- B8.3. Hold E for 1 s, or wait the full 25 s (try both on different runs). -> The same end state: objective "Find the three runes in the mirror."
- B8.4. Face the mirror again. -> Three violet glyphs (a ring and a cross) show in the reflection only: two on the north wall either side of the door gap (about (-54.5, 28) and (-49.5, 28)) and one on the east wall near the south corner (about (-48.8, 31.5)); that one shows only from the west half of the room. Report exactly what you see: this reflection is the least tested visual.
- B8.5. Turn round to the real walls. -> Bare walls. No glyphs on the real walls.
- B8.6. Stand within 2.5 m of one real spot and face it. -> The prompt is "Purify the rune". Press E. -> That glyph turns pale blue in the mirror and a faint blue ring stays lit on the real wall. Your magic bar does not drop (try with magic low). E again does nothing.
- B8.7. Purify the other two in any order. -> After the third: objective "Enter the Last House." A creak plays once (the front door gate opens).
- B8.8. On run 2 stand near the mirror (within 14 m) after the clip and wait. -> At 30 s Felix whispers "Look where I was." At 60 s the Angel says "The glass sees what you can't. Use it." and the mirror pulses. At 90 s the Angel says "There. By your shoulder. Can you feel it?" and the runes you have not found pulse faintly on the real walls (the one place a rune shows outside the mirror).
- B8.9. Press T before the mirror scene. -> A placeholder line about a mirror in a carriage house. After the scene, T gives a line in your tone ("He blames himself. Children always do..." for kind) and then a second one. During the idle hints T gives the hint in order (an invented line at 30 s).
- B8.10. Quit to the menu after purifying one rune and press Continue (section 3). -> The purified rune is still purified.
- B8.N1. Runes in the real room before the 90 s hint, or after you purify them.
- B8.N2. A smoke wall inside the grounds.
- B8.N3. Any damage from the mirror.
- B8.N4. A way into the Last House from the front door before the runes are done (the door says "The front door will not open").

Placeholders for Beat 8: the clip is a black panel; the cracking mirror and Felix's three lines exist only in the future clip. Runes are flat marks. Hit-testing is "near it and facing it, press E", not a spell cast.

### Beat 9. The Last House interior (about 3 min)

Start: `?start=grounds`, do Beat 8, then step B9.1; or `?start=interior` and skip B9.1 to B9.4. Quest: The Last House. Sets `journal_4` (optional), `enc_interior_resolved`, `board_solved`. Checkpoints: `cp_interior` on entering, `cp_ritual` when the board is solved.

- B9.1. Walk to the front door of the Last House, west end of the garden at about (-62, 34.6). It has a tall yellow glow. -> Before the runes are done the prompt reads "The front door will not open" and E does nothing. After the runes: "Enter the Last House".
- B9.2. Press E. -> The view switches to a dim brown interior; you stand at the south end of a long hall facing north. A short "Opening the Last House…" screen may show first if the house has not preloaded (walking the back lane preloads it). Two seconds later Elena says "Gran's house. I was here once, when I was little. I don't remember this hall."
- B9.3. Turn round and press E at the south wall. -> Nothing happens. There is no door back out (Q13).
- B9.4. Press Esc, Quit to menu, Continue, click. -> You are back in the entrance hall (checkpoint `cp_interior`), not outside.
- B9.5. Walk north down the hall. -> Warm orange lights, a dark red rug, a black box (piano) on the left wall, a glowing ball (chandelier) overhead, brown walls. You cannot walk through walls.
- B9.6. At the small gold box with a yellow glow on the left side (-6, 14) press E on "Read the journal page". -> Rosalind: "This house does not need a lock. It needs a... A lock can be broken. What I am can only be handed on, and only by choice." Read once. Optional.
- B9.7. Go to the board on the right (6, 6): prompt "Look at the talking board". Press E. -> Elena: "A talking board. Six letters." The board overlay does not open yet.
- B9.8. Press T before you meet the cat. -> The locket gives "A cat. The smoke has a sense of humour." before any cat is in sight (Q16).
- B9.9. Walk north to the end of the hall, where two short walls make a narrow passage to a brown door (cellar). A box stands in it (0, -3). Come within 4 m. -> The box turns red. The Angel says "A cat. The smoke has a sense of humour." The Encounter panel shows "Weaken (E)". Your health never drops.
- B9.10. Press T while the cat is red. -> The locket does not open.
- B9.11. Press E on "Face the cat" within 2.5 m. -> It turns blue-grey about 2 s later. The panel shows Purify (2) and Destroy (hold Enter).
- B9.12. Press 2. -> Green box, whoosh. The panel closes and T works again. (Destroy on run 2: the box shrinks to a flat dark patch.)
- B9.13. Press T. -> A line in your tone (kind: "She kept roses by that window. I'd forgotten. Thank you for bringing me back here.").
- B9.14. Press E at the cellar door (0, -5). -> The prompt is "The cellar door is locked". Nothing happens.
- B9.15. Go back to the board and press E on "Use the talking board". -> A full-screen "Talking board" overlay: six blanks and the alphabet in a grid of seven columns. The mouse cursor is free.
- B9.16. Click wrong letters on purpose (for example Z, X, Q). -> One scare text per wrong letter, in order: "A door slams somewhere in the house.", "Whispers crawl along the walls.", "The chandelier sways, though there is no wind." Close the overlay (Esc) and check the health bar. -> Unchanged.
- B9.17. Make six wrong letters in one round. -> The board resets, and one letter is already filled in: K first, then P, then E on later resets. An Angel line shows after each reset: "What does a house that holds something need?", then "Someone who keeps it.", then "Keeper, child."
- B9.18. Press Esc. -> The overlay closes and "Click to resume" shows. Click, then press E at the board again. -> The letters you found and your wrong-letter count are still there.
- B9.19. Click "Reset board". -> This round's guesses clear. Letters revealed by earlier resets stay.
- B9.20. Spell KEEPER (K, E, P, R). -> The word fills in and the overlay says "The board goes still." Press Esc. Elena says "Keeper." once the game runs again.
- B9.21. After solving. -> The cellar door at the end of the passage disappears and the board's glow goes. A creak plays once. Objective "Approach the seal." The game saves in the ritual chamber (`cp_ritual`).
- B9.22. Death: cannot be tested by hand (Q22). Mark N/A. -> Headless tests: respawn in the entrance hall before the board is solved, in the chamber centre after.
- B9.N1. Any damage from the cat, the scares or the board.
- B9.N2. The street or garden visible through the walls, or falling through the floor.
- B9.N3. The board overlay opening before the cat is done.
- B9.N4. A stuck black loading screen when the house was preloaded.

Placeholders for Beat 9: the cat, board, piano, steps and journal are plain boxes. The scares are text only (no sound, no shake). The cat has no real combat. There is no way back out of the house (Q13).

### Beat 10. Sequence 6: the two Living Keys (about 1.5 min)

Start: `?start=ritual-door` (chamber centre (0, -12), board solved, cat counted as done), or continue from Beat 9. Sets `seq6_done`. Opens the three anchor doors.

- B10.1. Look round the chamber. -> A wide square room, bluish floor, a short dark cylinder with a violet ring in the middle (the seal, about (0, -15)), a faint blue light overhead, and three brown doors: north, east, west. They are closed.
- B10.2. At the small gold box with a glow to the right of the seal (4, -14) press E on "Read the journal page". -> Rosalind: "If you are reading this, my blood has come back to the house. Two of us can open it. One of us can carry it. Mend the anchors, and then choose what I chose, or don't." Optional, read once.
- B10.3. Press T before the seal scene. -> Only a short invented line about the seal waiting below (the one placeholder for this beat).
- B10.4. Stand about 1.5 m south of the seal. -> A tall yellow glow and the prompt "Lay your hand on the seal". The violet ring is dim.
- B10.5. Press E. -> A black panel `seq6_two_keys` with "cinematic placeholder" for 40 s. You cannot move. The ring "Hold E to skip" shows. Press T. -> The locket does not open.
- B10.6. Hold E for 1 s, or wait the full 40 s (try both on different runs). -> Same end state.
- B10.7. After it ends. -> The violet ring is much brighter. The prompt is now "Wake the seal". Objective "Activate the seal." The three doors (north, east, west) are open: you can walk through each gap. A creak plays once. Nothing else happens in the side rooms yet.
- B10.8. Press T. -> A reaction in your tone (kind: "Elena. Listen to me, not to it. Your grandmother built this, which means it can be mended."), then a second line.
- B10.N1. The seal prompt before the board is solved.
- B10.N2. The scene playing twice.
- B10.N3. The anchor doors open before the panel ends.

Placeholders for Beat 10: the Smoke's and Felix's lines (and Elena's "Felix! He's asleep. He's inside the light.") belong to the future clip and are not subtitled. The Angel's reaction is only given through T, not spoken by itself.

### Beat 11. The final ritual (about 4 min)

Start: `?start=ritual` (chamber centre, seal ready to wake). Sets `ritual_active`, `anchor_north`, `anchor_east`, `anchor_west`, `felix3_done`, `anchors_all`.

- B11.1. Walk to the seal (0, -15). -> A grey drum with a faint purple glow and the prompt "Wake the seal". No smoke warning yet and no anchor prompt anywhere.
- B11.2. Press E. -> Elena: "Three anchors. Gran, show me how." About 3 s later the Angel: "North wants force. East wants patience. West wants mercy. Go." The seal prompt becomes "Restore the anchors". Objective "Restore the three anchors." Pressing E on it again only repeats the Angel's line.
- B11.3. Wait about 4 s. -> A text bar near the top: "≈ The smoke gathers…" for about 1 s, then "≈ The smoke strikes, and passes" for about half a second. Once, the Smoke says "Little keeper. Little lock." Your health never drops.
- B11.4. Walk out of the chamber through each of the three 3 m gaps: north at (0, -30), east at (12, -18), west at (-12, -18). -> No door blocks them. Each leads to a small room with one grey box, the anchor: north (0, -40), east (20, -18), west (-20, -18).
- B11.5. NORTH anchor, with Arcane Bolt selected (the default, shown as "✦ Arcane Bolt"): stand within 2 m. -> The prompt is "Restore the north anchor (hold)". Hold E. -> A bar "Keep holding E" fills over 3 s. At the end the anchor box is gone.
- B11.6. Release E halfway. -> The bar vanishes and the progress is lost. Hold again. -> It starts from empty.
- B11.7. Step more than about 3 m away while holding. -> The bar vanishes and the progress is lost.
- B11.8. Press 2 or 3, then try the north anchor. -> The prompt reads "Smoke shell: select Arcane Bolt (1) to break it". E gives the Angel's "Break the shell. Your bolt, Elena." and nothing else. Press 1. -> The prompt is back and the hold works. Switch spell in the middle of a hold. -> The hold is cancelled. (This is Q14.)
- B11.9. The first of the three anchors you finish, at the moment it finishes. -> A black panel `cin_felix_anchor` for 15 s. You cannot move. T does not open. Hold E for 1 s skips it. Afterwards the objective is "Restore the remaining anchors."
- B11.10. EAST anchor: hold E 6 s. No spell is needed. -> The strike cues keep appearing while you hold; they do nothing.
- B11.11. WEST anchor: hold E 4 s. No spell is needed. -> Same. The second and third anchors play no clip.
- B11.12. On other runs restore the anchors in a different order (for example west, north, east). -> All six orders work.
- B11.13. After the second anchor wait a while. -> The Smoke may say "Open. Open." The strike cues come faster after each anchor (every 4 s, then 3.5, then 3).
- B11.14. After the third anchor. -> Elena: "It's quiet. It's stopped." The smoke cues stop for good. The seal prompt is "Decide the seal". Objective "Make your choice at the seal."
- B11.15. Press T between attacks. -> The Angel's hints in order: north ("Break the shell. Your bolt, Elena."), east ("Hold it, and shield yourself while you do."), west ("Purify it. The light that saves."). An anchor you have already restored is skipped. After that the lines in your tone.
- B11.16. Death: cannot be tested by hand (Q22). Mark N/A. -> Headless tests: respawn at the chamber centre (0, -12); restored anchors and `ritual_active` stay.
- B11.N1. A second Felix clip after the other anchors.
- B11.N2. The strikes hurting you or the health bar moving.
- B11.N3. A scene change away from the Last House before the credits.
- B11.N4. The word "morality", a score or a bar.
- B11.N5. An anchor finishing when you let go early.

Placeholders for Beat 11: the strikes are text cues only (no rings, pools or wraiths). The anchors are hold-E boxes. There is no smoke shell to shoot, no Ward at the east anchor, no Purify channel at the west one, and no 45 s hint timer (Q15). The Felix clip is a black panel and its two lines are not subtitled.

### Beat 12. The final choice and the endings (about 2 min)

Start: `?start=ritual-choice` (all anchors restored, neutral Angel). Sets `ending_keeper` or `ending_broken`, then `game_finished`.

- B12.1. Walk to the seal. -> The prompt is "Decide the seal". Press E. -> The game freezes behind a dark panel. The mouse is free. Only the Angel's line and a "Continue" button show. After the shortcut the line is the neutral one ("This part is yours. I could argue either side beautifully. I won't. Choose."). At the end of the kind run (section 1) it is the kind one ("She chose to keep it. You can too..."). At the end of run 2 it is the dark one ("Break it. He's right there...").
- B12.2. Wait a minute on the panel. -> Nothing happens. There is no timer. Esc does nothing here.
- B12.3. Click Continue. -> Exactly two buttons: "Restore the seal and take Felix's place as its keeper (1)" and "Break the seal and pull Felix free (2)". Keys 1 and 2 also work.
- B12.4. Pick one. -> A confirm: the option text, "This cannot be undone.", a "Yes, I am sure" button and "Back (Esc)". Press Esc. -> Back to the two options. Esc at the two-option step does nothing. Nothing is decided until you press "Yes, I am sure".
- B12.5. Press "Yes, I am sure". -> The panel closes. A black panel `cin_ending_keeper` or `cin_ending_broken` shows for about 25 s. Hold E for 1 s skips it. You get the ending you picked, whatever you did before.
- B12.6. When the panel ends. -> The credits screen with the ending card first. Keeper: "The Bloodline Keeper. Every Halloween after, Elena walks to the end of Maple Street and checks the lock. Felix walks with her." Broken: "The Broken Seal. By morning, the fog had reached the next town." Then "Credits", the credits text and a "Main menu" button.
- B12.7. Press "Main menu". -> The main menu shows New Game, Settings, Credits and no Continue. Reload the page. -> Still no Continue (the save is finished). New Game asks before overwriting.
- B12.8. Repeat B12.1 to B12.7 from `?start=ritual-choice` for the other ending. -> Both endings are reachable from the same state.
- B12.9. Pick an ending and, while the black panel is up, press Esc, then Quit to menu, then Continue. -> You come back in the chamber centre with no choice panel. After you click to resume, the ending panel plays again by itself, then the credits. Report if it does not.
- B12.10. Total time. -> Write down the total play time of the full run in section 7 (task 4.13 asks for it).
- B12.N1. Any number or hint of which way you "scored", or a timer.
- B12.N2. Both ending flags on one save.
- B12.N3. A way back into the game from the credits.
- B12.N4. Felix hurt on screen (the panels are black).
- B12.N5. Esc closing the whole choice panel.

Placeholders for Beat 12: both ending clips are black panels of 25 s. The ending lines (Elena, Felix, Smoke, Angel) are not subtitled. The credits are two lines.

---

## 2. Second run: the other outcomes

Do this as one continuous game from `?start=garden` so the dark choices add up and the Angel really turns dark. A shortcut resets the hidden score to neutral, so jumping forward would hide the dark lines. Skip every clip with hold E to save time. Everything not listed behaves as in section 1.

- R2.1. Start `?start=garden`. Walk to the fox and weaken it. Hold Enter 0.7 s on the stunned fox. -> It shrinks to a dark patch. (Same as BF.1 to BF.7.)
- R2.2. In the garden do NOT press 3 during Briggs' first attack. -> Health drops once by 12 (to 88), never below 30. The Ward still unlocks.
- R2.3. Weaken Briggs, wait for the stun, then hold Enter 0.7 s. -> He dissolves into a flat dark patch (his coat). Elena: "I'm sorry. I'm so sorry." There is no second line from him.
- R2.4. Pick up the walkie. -> Same as B4.12. Press T. -> A dark line ("Efficient. The smoke will think twice...").
- R2.5. At Gartner press 2 (press him). -> Elena: "Why didn't you get help? Why didn't you come to me?" Gartner: "I was scared it would hear me. I'm still scared." The rest of the scene is the same as the comfort route, word for word.
- R2.6. At the end of the Gartner scene press T. -> A dark line about the smoke picking the softest child.
- R2.7. Take the fuse before you visit Gartner (on this run, do it right after Briggs). -> The fuse icon shows. The objective does not mention it until the Gartner scene is done. Go on to Gartner afterwards and finish him.
- R2.8. At House 66 place the fuse, then destroy the Watcher (hold Enter). -> Elena: "Rest now." The fence key still drops. The lane opens as before.
- R2.9. Lane: destroy both hounds. Padlock: enter a wrong code three times, then 1966. Mirror: skip the clip. Runes: purify them. -> Same flags and results as section 1.
- R2.10. At the padlock make seven wrong tries on purpose. -> The same four hints as in B7.12.
- R2.11. House: enter, destroy the cat (hold Enter). On the board use "Reset board" once and a few wrong letters, then solve it. -> Same results as B9.15 to B9.21.
- R2.12. Seal scene: skip it. Wake the seal. Restore the anchors in the order west, north, east, skipping the Felix clip. -> Same results as section 1.
- R2.13. At the seal press E. -> The Angel's line is the dark one ("Break it. He's right there. Why should you pay for her bargain? Let the smoke have Maple Street. It never loved you."). It must not decide for you.
- R2.14. Choose "Break the seal and pull Felix free" (key 2), press Esc once at the confirm, then confirm. -> The ending card is "The Broken Seal." The credits follow. No Continue afterwards.
- R2.15. Start `?start=ritual-choice` again and choose "Restore the seal and take Felix's place as its keeper". -> "The Bloodline Keeper" card. The ending depends only on the choice.
- R2.16. Optional: in the kind run (section 1) at B12.3 choose Break instead of Keeper once. -> "The Broken Seal" card, even though you played kindly.
- R2.N1. Any change to the story, the clues or the gates because you were cruel (only the Angel's tone and the small lines change).
- R2.N2. Gartner coming across as guilty or knowing.

---

## 3. Save, Continue and reset tests

The game saves when a checkpoint is written, when you pause with Esc, and when you quit to the menu. It saves in the browser (`localStorage`, key `tlh.save`).

- SV.1. In Beat 1 take the drawer key (icon shows), then Esc, Quit to menu. -> The main menu now shows Continue.
- SV.2. Press Continue. -> "Click to resume". Click. -> You stand in the hall (checkpoint `cp_home_start`), the key icon is still there, and the objective is unchanged.
- SV.3. Walk back through the game and at each checkpoint below quit to the menu and Continue. -> You stand at the spawn point in the table. Flags, spells, health and magic are what they were.
- SV.4. Quit during a video panel (for example the Felix clip) and Continue. -> You are at the previous checkpoint and the scene plays again when you walk into it. Report anything else.
- SV.5. Spend 40 s on the pumpkin puzzle (Beat 1, drawing seen), quit and Continue, wait 10 s. -> The 45 s hint fires soon after (the hint clock is saved). Report if it restarts from zero.
- SV.6. Continue after you have purified one rune (Beat 8). -> The rune is still purified.
- SV.7. Settings, "Reset progress". -> "Erase saved progress?" with Erase and Cancel. Press Cancel. -> Nothing is erased. Press Reset progress again and Erase, then Back. -> No Continue on the main menu.
- SV.8. After the ending: the main menu has no Continue, and New Game shows "Starting a new game will overwrite your saved progress. This cannot be undone." with "Overwrite and continue" and "Back".
- SV.9. In the browser console run `localStorage.setItem('tlh.save','not json')` and reload. -> The menu shows "Your saved game could not be read. Start a New Game to continue." and no Continue. New Game works.
- SV.10. In the console run `localStorage.setItem('tlh.save', JSON.stringify({version: 99}))` and reload. -> The menu shows "This save was made by a newer version of the game. Start a New Game, or update the game to continue it." and New Game asks to overwrite.
- SV.11. Use a dev start, play a little, quit and Continue. -> It continues from the dev start's checkpoint like a normal save.
- SV.12. Respawn after death: cannot be tested by hand (Q22). Mark N/A. -> Headless tests: the body snaps to the checkpoint spawn, health and magic refill, flags and the selected spell stay.

Checkpoint spawn points (SV.3 checks one each):

| ID | Checkpoint | Written when | Spawn (x, z) |
|---|---|---|---|
| SV.CP1 | `cp_home_start` | New Game | (-22, 39), hall of No. 12 |
| SV.CP2 | `cp_street` | Front door used (`home_done`) | (-19.5, 32.5), porch |
| SV.CP3 | `cp_intersection` | After the Felix clip (`seq2_done`) | (58, 30), intersection |
| SV.CP4 | `cp_garden` | Garden gate circle | (58, 20), garden gate |
| SV.CP5 | `cp_garden_after` | `seq3_done` | (58, 5), garden path |
| SV.CP6 | `cp_house66` | `seq4_done` | (50, -35), outside No. 40 |
| SV.CP7 | `cp_watcher` | `fuse_placed` | (-56, -32), House 66 gate |
| SV.CP8 | `cp_lane` | `lane_open` | (-58, -20), lane gate |
| SV.CP9 | `cp_outbuilding` | `padlock_open` | (-52, 25.5), outbuilding door |
| SV.CP10 | `cp_interior` | Entering the Last House | (0, 20), entrance hall |
| SV.CP11 | `cp_ritual` | `board_solved` | (0, -12), chamber centre |

---

## 4. Settings tests

Open Settings from the main menu or from the pause screen (Esc).

- ST.1. Set Master volume to 0 and play a stretch with sounds (the door creak when you take the locket, the streetlight flicker buzz and the three thuds in Beat 2, the whoosh on LMB, key 2 and key 3). -> Complete silence for these. Restore the volume afterwards.
- ST.2. Set Effects to 0 with Master up. -> Same silence. Set Effects and Master to the maximum. -> Louder but not painful.
- ST.3. Move the Music and Voice sliders. -> No audible change yet (no music or voice audio exists).
- ST.4. Change Mouse sensitivity (0.2 to 3). -> Look speed changes at once.
- ST.5. Change Field of view (70 to 100). -> The picture widens or narrows on resume.
- ST.6. Tick Invert Y. -> Up and down look is reversed.
- ST.7. Subtitles: Normal and Large. -> Subtitles and locket text get bigger.
- ST.8. Scene brightness: Normal (dark). -> The streets and the house are much darker and foggier (mood setting). Switch back to Bright (testing). The street and the interior are readable again.
- ST.9. Highlight interactive things: Off. -> No yellow or pale blue columns anywhere. Subtle: faint columns. Bright: clear columns.
- ST.10. Glow check in each scene. -> Yellow columns on the drawing, doors, pickups and the seal; pale blue on Felix's window, the No. 14 upstairs window and the intersection streetlight; none on enemies or trigger areas.
- ST.11. Reduce flashing, Head bob, Graphics. -> No visible change in this build (known gap). Just confirm they do not break anything.
- ST.12. Reload the page. -> The settings are back to their defaults and the warning screen shows again (they are not saved, Q23).
- ST.13. Press Esc in the game. -> "Click to resume", Settings and Quit to menu. Open Settings from there and go Back. -> You return to the pause screen, not the main menu.

---

## 5. Known placeholders and gaps

This is the one list. Do not report these as bugs unless they behave differently from what is written here.

Look and sound:

- Everything is grey boxes. No models, textures, animation or real lighting mood. Enemies are boxes: hostile red, stunned blue-grey, purified green, destroyed a flat dark patch.
- No voice audio exists. Every line is a subtitle. There is no music and no ambience.
- Sounds are synthesised beeps: the door creak (when a door gate opens), the three footstep thuds and the light flicker buzz (only from sequences, so only in Beat 2), and a whoosh for LMB (after Arcane Bolt), key 3 (a Ward) and key 2 (a Purify). There are no sounds for the padlock rattle, hounds, scares, whispers, the mirror, runes, anchors or smoke strikes.
- The shed bulb, the porch of No. 31 and the porch of House 66 are not drawn as lights. The flicker hint in Beat 6 cannot be seen. The House 66 porch does not turn on when you place the fuse.
- The mirror in the outbuilding is a real reflection, but nobody has checked it by eye yet (Q7). The glyphs are flat marks.

Video clips (all black panels with the clip id and "cinematic placeholder"):

- `seq2_felix_streetlight` 20 s, `seq5_felix_mirror` 25 s, `seq6_two_keys` 40 s, `cin_felix_anchor` 15 s, `cin_ending_keeper` 25 s, `cin_ending_broken` 25 s. A run that watches every clip and one ending sees 125 s of black panels. All can be skipped with hold E (1 s).
- The lines that belong to the clips (Felix, the Smoke, the endings) are not subtitled. A manifest with a generation prompt per clip is in `apps/client/src/content/video/clips.ts`.

Combat and puzzles:

- There is no real combat. The stub weakens an enemy with E, stuns it on a short timer, then you pick Purify (2) or Destroy (hold Enter). LMB and Arcane Bolt do no damage.
- Nothing in the build can kill Elena, so respawn cannot be tested by hand (Q22). The only damage is Briggs' one scripted hit (12, never below 30).
- The Watcher does not teleport or spawn decoys. The hounds and the cat do not move. The smoke strikes in Beat 11 are text cues only.
- The anchors are hold-E stubs. Only the north anchor checks a spell (Arcane Bolt selected). There is no smoke shell, Ward block or Purify channel.
- The runes are purified by standing near and facing them, not by casting a spell.
- The panel text under Purify and Destroy mentions "LMB", but the keys are 2 and hold Enter (Q24).
- Talking board scares are text only and never hurt you.

Angel and lines:

- 39 Angel and Watcher lines are invented filler awaiting your approval (list in Q18).
- The Angel never speaks the reaction lines for Beat 10 by itself; they come only through T.
- AI-Enhanced Mode is greyed out. Classic only.

Settings, saves and dev tools:

- Settings are not saved across a reload (Q23). Reduce flashing, Head bob and Graphics change nothing yet. The Music and Voice sliders change nothing yet.
- Dev shortcuts work only on the dev server. They reset the hidden score to neutral and set no carried items.
- There is no way back out of the Last House once you enter (Q13).
- The credits are two lines.

---

## 6. Questions for the author

Each question says what the build does now and what I would do by default. Answer with the number and a word.

Fox and street

- Q1. The encounter panel shows "Purify (2)" for the stunned fox before Purify is taught. Pressing 2 does nothing. Hide the Purify option for the fox until `spell_purify`, or keep it (the unused Angel line `vo_angel_fox_c2` says "You can't cleanse it yet")? Default: hide it.
- Q2. The fox trigger (42, 28) is west of the intersection, behind Elena after the streetlight scene, while the story pulls her north to the garden. Move the fox ahead of the player (for example near the garden road), or leave it as an optional detour? Default: leave it.
- Q3. The fox leash is 20 m, but the garden gate is about 19.4 m from the fox, so a hostile fox can stay engaged (and block the locket) all the way to the garden. Shorten the leash to about 15 m, or accept it? Default: 15 m.
- Q4. The footstep thuds and the flicker buzz come only from sequences, so only Beat 2 has them. The Beat 6 flicker hint and others are silent and invisible. Add sound and light for authored hints too? Default: yes, later with real audio.
- Q5. Hold-E skip works only on video clips and locked sequences (not on Beat 2's interactive street, Briggs or Gartner). Is that right? Default: yes.

Beats 6 to 8

- Q6. The fence key counts as taken when you pick it up (`fence_key_taken`), not when the Watcher falls. The Watcher's fall alone sets `watcher_purified` or `watcher_destroyed`. Fine? Default: fine.
- Q7. The mirror reflection and the rune marks in it have never been checked by eye. If it looks wrong, do you want a simpler fake (flat panels) for now? Default: keep the real reflection if it works, otherwise fake it.
- Q8. The checkpoint at the grounds entrance is `cp_lane` at the lane gate. Dying at the hounds sends Elena back about 41 to 44 m. Add a checkpoint when she enters the grounds (the beat sheet has none)? Default: yes, `cp_grounds` at (-57, 20).
- Q9. Padlock hints 3 and 4 in content differ from the script. Hint 3 is "Look closely. The first two dials are glowing. Nineteen." (script: "Nineteen... there. You'll manage the rest."). Hint 4 is "Every dial is glowing now. Follow them in order." (script: "One, nine, six, six. Shall I turn the dials for you too?"). Which wins? Default: the script lines.
- Q10. Rune `r3` (east wall, near the south corner) shows in the mirror only from the west half of the room. Is that acceptable or should all three show from the standing spot? Default: make all three visible from the mirror's front.

Beats 9 to 12

- Q11. Talking board hint 3 in content is "Keeper, child." The script says "Keeper, child. Spell it before I do." Which wins? Default: the script line.
- Q12. `?start=ritual-door` lands in the chamber centre, already past the cellar door (the door is gone because `board_solved` is set). Should the dev start put Elena at the foot of the cellar steps instead? Default: leave it.
- Q13. There is no way back out of the Last House (no exit interaction). Add an exit door that returns to the garden, or keep it one-way? Default: keep one-way.
- Q14. The north anchor needs Arcane Bolt selected. Pressing 2 (Purify) in any fight leaves Purify selected, so the player must press 1 before the anchor. The prompt says so. Keep, or auto-select Arcane Bolt at the anchor? Default: auto-select it.
- Q15. The script wants the P6 anchor hints (`vo_angel_p6_h_north/east/west`) after 45 s without progress. Today they come only through T (and the north line when you try the north anchor without Arcane Bolt). Add the 45 s timer? Default: yes.
- Q16. `vo_angel_b9_01` ("A cat. The smoke has a sense of humour.") can play from T in the entrance hall before the cat has appeared. Hold it until the cat engages? Default: hold it.
- Q17. Between `board_solved` and `seq6_done` the locket has only one invented line (`vo_angel_b10_any_c1`). Write real lines or leave it? Default: write two real lines.

Approvals

- Q18. Approve (or rewrite) the 39 invented Angel and Watcher lines. By id:
  - Beat 3 and 4: `vo_angel_b3_c0`, `vo_angel_b4_c0`.
  - Hints: `vo_angel_p1_h2`, `vo_angel_p2_h2`, `vo_angel_p4_h1`, `vo_angel_b6_hint1`.
  - Beat 5: `vo_angel_b5_any_c1`, `vo_angel_b5_kind_c2`, `vo_angel_b5_neutral_c2`, `vo_angel_b5_dark_c2`.
  - Beat 6: `vo_angel_b6_kind_c2`, `vo_angel_b6_neutral_c2`, `vo_angel_b6_dark_c2`, `vo_watcher_b6_06`.
  - Beat 7: `vo_angel_b7_kind_c2`, `vo_angel_b7_neutral_c2`, `vo_angel_b7_dark_c2`.
  - Beat 8: `vo_angel_b8_any_c1`, `vo_angel_b8_kind_c2`, `vo_angel_b8_neutral_c2`, `vo_angel_b8_dark_c2`.
  - Beat 9: `vo_angel_b9_kind_c2`, `vo_angel_b9_neutral_c2`, `vo_angel_b9_dark_c2`.
  - Beat 10: `vo_angel_b10_any_c1`, `vo_angel_b10_kind_c2`, `vo_angel_b10_neutral_c2`, `vo_angel_b10_dark_c2`.
  - Beat 11: `vo_angel_b11_any_c1`, `vo_angel_b11_kind_c1`, `vo_angel_b11_kind_c2`, `vo_angel_b11_neutral_c1`, `vo_angel_b11_neutral_c2`, `vo_angel_b11_dark_c1`, `vo_angel_b11_dark_c2`.
  - Beat 12: `vo_angel_b12_any_c1`, `vo_angel_b12_kind_c2`, `vo_angel_b12_neutral_c2`, `vo_angel_b12_dark_c2`.
- Q19. Approve the Gartner lines in `apps/client/src/content/dialogue/beat5.ts` (his confession, the two choice replies `vo_gartner_b5_06a/06b`, and Elena's `vo_elena_b5_c1/p1`). The canon review is yours.
- Q20. `docs/contracts.md` does not describe the save file's `runtime` field (hint clocks, fired triggers, played locket lines, current subtitle). Add it to the contract? Default: yes.

Found while writing this plan

- Q21. `vo_angel_p1_h2` ("Boys hide treasure in the silliest places...") can never play: it is a locket hint for the drawer puzzle, but T works only after the Angel wakes, which happens after the key is taken and the hint is cancelled. Drop it, or let the Angel be awake earlier? Default: drop it and keep Elena's 45 s line plus the 90 s glow.
- Q22. Nothing in the build can reduce health to 0, so death and respawn cannot be tested by hand. Add a dev-only key (for example F9) that sets health to 0? Default: yes, dev builds only.
- Q23. Settings and the "I have read the warning" choice are not saved across reloads (the README says they live under `tlh.settings`). Save them now, or wait? Default: save them now.
- Q24. The Encounter panel's small text says "2 + hold LMB: Purify | Arcane Bolt, hold LMB: Destroy", but the working keys are 2 and hold Enter. Change the text, or build the LMB controls? Default: change the text for now.
- Q25. Three fox lines exist in content but are never played (`vo_angel_fox_c1`, `vo_angel_fox_c2`, `vo_elena_fox_01`). Wire them to the fox, or delete them? Default: wire them.
- Q26. The doorway of No. 12 is walkable as soon as the drawer is opened, but `home_done` (and the street events) only come when E is pressed on the door after the Angel's speech. Block the doorway until then? Default: block it.
- Q27. The clips' own dialogue (Felix in the mirror and at the anchor, the Smoke in Sequence 6, the endings) is not subtitled. Add subtitles for the placeholders now (timed lines), or wait for the real clips? Default: wait.
- Q28. Beat sheet open question 1: is it acceptable to leave Gartner's interactive dialogue out of the 180 s forced-control budget? Today it blocks movement and the locket for about a minute. Default: yes.
- Q29. Beat sheet open question 2: should a purified Watcher hint he once watched the house for good reasons (the invented line `vo_watcher_b6_06` does)? Default: keep it.
- Q30. Beat sheet open question 3: is "hold E to skip" acceptable for cinematics on a first playthrough? Default: yes.
- Q31. The Watcher box stands in the yard from the start, not only after the fuse is placed, and Briggs' Ward window is 1.5 s with a "Ward (3)" button. Is the Ward window too tight for a first-time player? Default: lengthen it to 2.5 s.

---

## 7. Results table

Fill in one row per step id. Use PASS, FAIL or N/A (and say why in the note). A row marked N/A for a death step is expected (Q22). For every FAIL write what you saw and where you stood.

| Field | Value |
|---|---|
| Date | |
| Browser and version | |
| Commit tested | |
| Total play time of the first full run (Beats 1 to 12, minutes) | |
| Time of the second run (section 2, minutes) | |
| Anything that stopped you from going on (softlock) | |

| Step id | Pass/fail | Note |
|---|---|---|
| S0.1 | | |
| S0.2 | | |
| S0.3 | | |
| S0.4 | | |
| S0.5 | | |
| B1.1 | | |
| B1.2 | | |
| B1.3 | | |
| B1.4 | | |
| B1.5 | | |
| B1.6 | | |
| B1.7 | | |
| B1.8 | | |
| B1.9 | | |
| B1.10 | | |
| B1.11 | | |
| B1.12 | | |
| B1.13 | | |
| B1.14 | | |
| B1.15 | | |
| B1.16 | | |
| B1.17 | | |
| B1.18 | | |
| B1.19 | | |
| B1.20 | | |
| B1.21 | | |
| B1.N1 | | |
| B1.N2 | | |
| B1.N3 | | |
| B1.N4 | | |
| B1.N5 | | |
| B2.1 | | |
| B2.2 | | |
| B2.3 | | |
| B2.4 | | |
| B2.5 | | |
| B2.6 | | |
| B2.7 | | |
| B2.8 | | |
| B2.9 | | |
| B2.10 | | |
| B2.N1 | | |
| B2.N2 | | |
| B2.N3 | | |
| B2.N4 | | |
| B3.1 | | |
| B3.2 | | |
| B3.3 | | |
| B3.4 | | |
| B3.5 | | |
| B3.6 | | |
| B3.7 | | |
| B3.8 | | |
| B3.9 | | |
| B3.10 | | |
| B3.11 | | |
| B3.12 | | |
| B3.13 | | |
| B3.N1 | | |
| B3.N2 | | |
| B3.N3 | | |
| BF.1 | | |
| BF.2 | | |
| BF.3 | | |
| BF.4 | | |
| BF.5 | | |
| BF.6 | | |
| BF.7 | | |
| BF.8 | | |
| BF.9 | | |
| BF.10 | | |
| BF.11 | | |
| BF.N1 | | |
| BF.N2 | | |
| B4.1 | | |
| B4.2 | | |
| B4.3 | | |
| B4.4 | | |
| B4.5 | | |
| B4.6 | | |
| B4.7 | | |
| B4.8 | | |
| B4.9 | | |
| B4.10 | | |
| B4.11 | | |
| B4.12 | | |
| B4.13 | | |
| B4.14 | | |
| B4.15 | | |
| B4.N1 | | |
| B4.N2 | | |
| B4.N3 | | |
| B4.N4 | | |
| B4.N5 | | |
| B4.N6 | | |
| B4.16 | | |
| B5.1 | | |
| B5.2 | | |
| B5.3 | | |
| B5.4 | | |
| B5.5 | | |
| B5.6 | | |
| B5.7 | | |
| B5.8 | | |
| B5.9 | | |
| B5.10 | | |
| B5.11 | | |
| B5.N1 | | |
| B5.N2 | | |
| B5.N3 | | |
| B5.N4 | | |
| B6.1 | | |
| B6.2 | | |
| B6.3 | | |
| B6.4 | | |
| B6.5 | | |
| B6.6 | | |
| B6.7 | | |
| B6.8 | | |
| B6.9 | | |
| B6.10 | | |
| B6.11 | | |
| B6.12 | | |
| B6.13 | | |
| B6.14 | | |
| B6.N1 | | |
| B6.N2 | | |
| B6.N3 | | |
| B6.N4 | | |
| B6.N5 | | |
| B7.1 | | |
| B7.2 | | |
| B7.3 | | |
| B7.4 | | |
| B7.5 | | |
| B7.6 | | |
| B7.7 | | |
| B7.8 | | |
| B7.9 | | |
| B7.10 | | |
| B7.11 | | |
| B7.12 | | |
| B7.13 | | |
| B7.14 | | |
| B7.15 | | |
| B7.16 | | |
| B7.17 | | |
| B7.N1 | | |
| B7.N2 | | |
| B7.N3 | | |
| B7.N4 | | |
| B7.N5 | | |
| B8.1 | | |
| B8.2 | | |
| B8.3 | | |
| B8.4 | | |
| B8.5 | | |
| B8.6 | | |
| B8.7 | | |
| B8.8 | | |
| B8.9 | | |
| B8.10 | | |
| B8.N1 | | |
| B8.N2 | | |
| B8.N3 | | |
| B8.N4 | | |
| B9.1 | | |
| B9.2 | | |
| B9.3 | | |
| B9.4 | | |
| B9.5 | | |
| B9.6 | | |
| B9.7 | | |
| B9.8 | | |
| B9.9 | | |
| B9.10 | | |
| B9.11 | | |
| B9.12 | | |
| B9.13 | | |
| B9.14 | | |
| B9.15 | | |
| B9.16 | | |
| B9.17 | | |
| B9.18 | | |
| B9.19 | | |
| B9.20 | | |
| B9.21 | | |
| B9.22 | | |
| B9.N1 | | |
| B9.N2 | | |
| B9.N3 | | |
| B9.N4 | | |
| B10.1 | | |
| B10.2 | | |
| B10.3 | | |
| B10.4 | | |
| B10.5 | | |
| B10.6 | | |
| B10.7 | | |
| B10.8 | | |
| B10.N1 | | |
| B10.N2 | | |
| B10.N3 | | |
| B11.1 | | |
| B11.2 | | |
| B11.3 | | |
| B11.4 | | |
| B11.5 | | |
| B11.6 | | |
| B11.7 | | |
| B11.8 | | |
| B11.9 | | |
| B11.10 | | |
| B11.11 | | |
| B11.12 | | |
| B11.13 | | |
| B11.14 | | |
| B11.15 | | |
| B11.16 | | |
| B11.N1 | | |
| B11.N2 | | |
| B11.N3 | | |
| B11.N4 | | |
| B11.N5 | | |
| B12.1 | | |
| B12.2 | | |
| B12.3 | | |
| B12.4 | | |
| B12.5 | | |
| B12.6 | | |
| B12.7 | | |
| B12.8 | | |
| B12.9 | | |
| B12.10 | | |
| B12.N1 | | |
| B12.N2 | | |
| B12.N3 | | |
| B12.N4 | | |
| B12.N5 | | |
| R2.1 | | |
| R2.2 | | |
| R2.3 | | |
| R2.4 | | |
| R2.5 | | |
| R2.6 | | |
| R2.7 | | |
| R2.8 | | |
| R2.9 | | |
| R2.10 | | |
| R2.11 | | |
| R2.12 | | |
| R2.13 | | |
| R2.14 | | |
| R2.15 | | |
| R2.16 | | |
| R2.N1 | | |
| R2.N2 | | |
| SV.1 | | |
| SV.2 | | |
| SV.3 | | |
| SV.4 | | |
| SV.5 | | |
| SV.6 | | |
| SV.7 | | |
| SV.8 | | |
| SV.9 | | |
| SV.10 | | |
| SV.11 | | |
| SV.12 | | |
| SV.CP1 | | |
| SV.CP2 | | |
| SV.CP3 | | |
| SV.CP4 | | |
| SV.CP5 | | |
| SV.CP6 | | |
| SV.CP7 | | |
| SV.CP8 | | |
| SV.CP9 | | |
| SV.CP10 | | |
| SV.CP11 | | |
| ST.1 | | |
| ST.2 | | |
| ST.3 | | |
| ST.4 | | |
| ST.5 | | |
| ST.6 | | |
| ST.7 | | |
| ST.8 | | |
| ST.9 | | |
| ST.10 | | |
| ST.11 | | |
| ST.12 | | |
| ST.13 | | |
