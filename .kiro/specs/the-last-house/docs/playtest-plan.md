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

Settings are saved in the browser under `tlh.settings` since the answers of 2026-11-09 (Q23), so they and the "I have read the warning" choice survive a reload. Steps written on 2026-11-08 that say they reset (for example ST.12) are replaced by section 9.

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
| `http://localhost:5173/?start=ritual-door` | Ritual chamber center (0, -12) | Cat and board done, `board_solved` |
| `http://localhost:5173/?start=ritual` | Ritual chamber center (0, -12) | `seq6_done`, seal ready to wake |
| `http://localhost:5173/?start=ritual-choice` | Ritual chamber center (0, -12) | All anchors restored, `anchors_all` |

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
| R | Face front: look level and turn to the nearest of the 8 compass directions (testing aid, see section 8) |
| F9 | Dev server only (never in a built game): sets Elena's health to 0, so death and respawn can be tested (see section 9). Works only while playing |
| T | Open the locket (the Angel). T or E plays the next line. T closes at the last line. Esc closes at any time |
| 1 / 2 / 3 | Select Arcane Bolt / Purify / Ward. Only spells you have unlocked can be selected |
| 3 | During Briggs' first attack wind-up (2.5 s since the answers of 2026-11-09, was 1.5 s) casts Ward |
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
- B1.5. Walk west into the bedroom (-25, 39). -> Elena says "Felix? It's past nine, honey. Your costume's still on the chair." About 3 s later: "The window's open. Why is the window open?" The objective changes to "Look for clues about Felix."
- B1.6. Go east into the kitchen and look at the pumpkin jar (-14.2, 36.5). -> No prompt and no glow. It is not offered before you have seen the drawing.
- B1.7. Go to the front door (-19.5, 34.8) and press E. -> Elena says "Not yet. He left me something. He always leaves me clues." The door stays shut and you cannot walk out.
- B1.8. Stand between the drawer table (-17.8, 37) and the front door, looking at both. -> The Actions panel lists "Open the front door" and "Drawer (locked)", with "Q: switch action". Press Q. -> The E marker jumps to the other action. Press Q again. -> It jumps back.
- B1.9. With "Drawer (locked)" selected press E. -> Nothing happens. No line, no change.
- B1.10. Go back to the bedroom, face the drawing (-26, 37.6) and press E. -> Elena says "'My secret hiding place.' The pumpkin. Of course it's the pumpkin." Objective "Find the key Felix drew." The drawing prompt is gone.
- B1.11. Wait 45 s without moving to the jar. -> Elena says "The pumpkin... he hides everything in that pumpkin." Wait to 90 s in total. -> The jar in the kitchen starts to glow and pulse more brightly.
- B1.12. Press E at the jar. -> Elena says "A key? What have you been up to... the hall drawer." A key icon shows bottom right. Objective "Open the drawer by the front door." The jar marker is gone.
- B1.13. At the drawer table the prompt reads "Unlock the drawer". Press E. -> Elena says "Grandma's locket. I locked this away years ago. It used to... whisper." The key icon is gone. A short wavering creak plays once (the front door gate opens). Objective "Leave the house."
- B1.14. Do not press anything and listen. -> The Angel wakes by itself. Subtitles in order: Angel "Ahh. Air. Moonlight...", Elena "Who said that?", Angel "The locket, child...", Angel "Something old is awake...", Felix "Mom?", Elena "Felix! Stay there, I'm coming!", Angel "Take me with you...". It lasts about 28 s. You can walk and look the whole time.
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

Placeholders in Beat 1: all boxes, no voice audio, the costume on the chair is not usable, Felix's "Mom?" is a subtitle only (not a sound from the street). Angel hint `vo_angel_p1_h2` cannot be reached (see question Q21).

### Beat 2. Sequence 1: the empty street (about 1.5 min)

Start: `?start=street`, or continue from Beat 1. Checkpoint before: `cp_street`. Sets `seq1_done`.

- B2.1. You stand on the porch. -> Objective "Follow Felix's voice down Maple Street." The movement hints show (they also show after a shortcut).
- B2.2. Walk east along the street (z about 27 to 32). When you pass x = -17 the sequence starts. -> Elena says "Where is everyone? It's Halloween. There should be kids. Noise."
- B2.3. Keep walking east. -> The streetlights flicker one after another toward the intersection, each with a short stuttering buzz (check the sound).
- B2.4. Keep walking. -> Three slow dull thuds play once, behind you. Elena says "Hello? Is someone there?"
- B2.5. Look at the upstairs window of the house south of the road around x = 5 (No. 14). It is a lit yellow panel with a pale blue marker. -> A dark upright shape crosses the panel for a few seconds, then is gone. Elena says "The Parkers are away. So who's in their house?"
- B2.6. Walk to the smoke wall at x = 36. -> The wall blocks you until the sequence is finished. Walk into the end area (x about 26 to 37, z about 30). -> Elena says "That smoke's moving against the wind." The wall fades out over about 2.5 s. The objective becomes "Go to the streetlight."
- B2.7. Run the street again on another try, sprinting all the way (Shift). -> The sequence still finishes when you arrive. The lines and lights may still be playing as you pass. Report if the wall never opens.
- B2.8. Hold E anywhere on the street. -> No "Hold E to skip" ring. This sequence cannot be skipped.
- B2.9. During the sequence press T. -> The locket opens (allowed here). Lines: "Listen. No dogs, no doors, no children. Silence like this is made, not found." then "Walk toward the light at the corner..." and, until the wall opens, "The street only goes one way tonight, Elena. Follow the lights." Esc closes.
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
- B3.7. After the clip (skipped or not). -> Elena says "My hands... what's happening to my hands?" About 3.5 s later the Angel says "That isn't my doing. That light is yours. Rosalind's blood, waking up at last." About 8 s after the clip: "Point. Will it. Let it go." A hint "LMB: Arcane Bolt" shows for 10 s. Objective "Search the yard at No. 31."
- B3.8. Press LMB. -> A short whoosh. Nothing is damaged. Press 1. -> The spell label stays "✦ Arcane Bolt". Press 2 and 3. -> No change (not unlocked).
- B3.9. Run this beat again from a save made before the streetlight (see section 3) and watch the whole panel without skipping. -> After about 20 s the panel ends by itself with exactly the same result as skipping.
- B3.10. Run it once more and keep E held down before you step into the circle. -> It does not skip until you release E and press it again.
- B3.11. Walk to Felix's candy bag (62, 32) and press E. -> Elena says "His candy bag. He never puts this down." The wall to the garden (north, z = 24) is gone.
- B3.12. Press T. -> Lines: "The boy's spirit walks without his body. His body is somewhere else, and alive. Hold on to that." then "Your gift has teeth now. Use it on what the smoke has taken, not on the frightened."
- B3.13. Try the locket before the streetlight on another run (after `seq1_done`). -> A vague placeholder line "light at the corner" appears, and nothing about Felix's spirit or the smoke by name.

Should NOT happen in Beat 3:

- B3.N1. Skipping with a tap of E.
- B3.N2. A different end state when skipped or watched (bolt available, wall open, objective changed either way).
- B3.N3. A skip ring in a scene with no clip.

Placeholders in Beat 3: the Felix clip is a black panel (clip id `seq2_felix_streetlight`, manifest in `content/video/clips.ts`). Felix's four lines in the clip are not subtitled. The bolt has a sound only.

### Beat 3b. Street fox (optional, about 1 min)

Start: `?start=garden`. The fox is a small box that appears after `seq2_done` at about (42, 31), 15 m west of the intersection. Trigger circle around (42, 28), radius 4.

- BF.1. Walk west from the intersection toward x = 42. -> A small red box (the fox) is already there. Inside the circle it turns hostile and the Encounter panel shows "Weaken (E)". It does not move or hurt you.
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

### Beat 4. Sequence 3: the cursed neighbor (about 4 min)

Start: `?start=garden`. Quest: The Truth. Checkpoints: `cp_garden` on entering the garden, `cp_garden_after` at the end. Sets `seq3_started`, `spell_ward`, `spell_purify`, `briggs_purified` or `briggs_destroyed`, `walkie_found`, `seq3_done`.

- B4.1. From the intersection go north through the opened wall into the garden. Cross the circle at the garden gate (58, 20). -> The game saves (checkpoint `cp_garden`). Nothing visible happens.
- B4.2. Walk on toward Mr. Briggs, a box at (57, 6). Press T before you are close. -> You get the Beat 3 lines again ("The boy's spirit walks without his body..."). Nothing about Briggs yet.
- B4.3. Come within 4 m of him. -> Elena says "Mr. Briggs? Have you seen Felix? Mr. Briggs?" He turns red and gets taller. Briggs says "Lovely night. Lovely... night. It said you'd come." then "It's warm in here, Elena. Come inside." The Encounter panel appears.
- B4.4. Press T now. -> The locket does not open (he is hostile).
- B4.5. Press E at him before the Ward. -> Prompt "Speak to Mr. Briggs"; E does nothing yet.
- B4.6. After about 6 s the Angel says "Raise your arm! Like a door closing. Now!" and the panel shows a "Ward (3)" button for 1.5 s. Press 3 within that time. -> A whoosh. Magic drops by 25. Your health does not change.
- B4.7. On another run do not press 3. -> The health bar drops once by 12 (never below 30) after the 1.5 s. The Ward is still unlocked afterwards (spell label can show "⛉ Ward" on key 3).
- B4.8. After the hit Briggs says "It wants the boy's mother. It wants..." The prompt reads "Weaken Mr. Briggs". Stand within 2.5 m and press E. -> He turns blue-grey about 1.5 s later. Purify is unlocked now. The panel shows "Purify (2)" and "Destroy (hold Enter)". The Angel says by itself "There. He's weakened. You can cleanse the man inside, or finish what the smoke started. Choose, Elena. I'll be watching."
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
- B5.3. Press E. -> The scene starts. You cannot move or look around (limited control). Elena: "Gartner? It's Elena. Felix's mom. You're safe. Open the door." Then Gartner: "Is it really you? It does voices. It did Felix's voice." The talk continues for about 30 s with Gartner's confession ("There was a voice on the walkies...", "...the back lane behind sixty-six", "The door of the old house was open...", "I banged on it. I did. Then I ran. I'm sorry. I didn't know.").
- B5.4. Press T and press E again during the talk. -> The locket does not open. E does not restart or break the scene.
- B5.5. When the talk reaches the choice. -> Two buttons show low in the middle: "Comfort him (1)" and "Press him (2)". Wait 30 s. -> Nothing happens. There is no timer.
- B5.6. Press 1 (comfort). -> Elena: "Hey. Hey. You didn't do this. Something used you, and it lied to you. That's not your fault." About 4.5 s later Gartner: "...Okay."
- B5.7. Wait. -> About 8 s later Gartner hands over the page: "Felix found this in the lane. He said it was a treasure map. It's not a map." then "The lane gate's locked now. Mr. Corwin at sixty-six has the key. He took the fuses out of all his lights. He says the dark lets him see.", "Mr. Briggs had tons of fuses. For his Halloween lights.", Elena "Stay here. Lock the door. I'll bring him back.", Gartner "Tell him I'm sorry." The whole scene takes about a minute.
- B5.8. When it ends. -> You can move again. Objective "Find a fuse for House 66." The wall at x = -12 on the north arc fades out. The game saves (`cp_house66`).
- B5.9. Press E at the journal page (63, -31), "Read the journal page". -> It is read once (optional). The prompt goes away.
- B5.10. Press T. -> A line in your tone: kind "That boy is a victim, the same as your neighbor. The smoke chose him because he was kind." A second, invented line on the next press.
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
- B6.3. Stay within 22 m of the fuse box for 60 s without a fuse. -> The Angel says by itself "Your neighbor with the garish lights, perhaps?" (invented line). Press T. -> Same hint. At 120 s: T gives "That light at number thirty-one is flickering for a reason, child. Go and look." (invented line; the flicker itself is not drawn).
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
- B7.2. Look for a small yellow-marked box on the fence near (-64.4, 10) and press E on "Read the journal page". -> Rosalind: "October thirty-first, nineteen sixty-six. The night I closed it..." Read once. Optional.
- B7.3. Walk south past z = 1 (circle around (-59, 6)). -> Elena whispers "That's our house. That's Felix's window." To the south-east, a window in No. 12 (about -26, 40) turns warm yellow with a small dark shape for about 5 s, then goes dark. You keep control. It happens once only.
- B7.4. Press T in the lane. -> A line about the house in your tone (neutral: "The house is showing you what you want. Houses do that.").
- B7.5. Walk to the grounds entrance (-57, 20). -> The Angel says "Hounds. The smoke has run out of neighbors." Two boxes, at about (-58, 24) and (-54, 23.5), turn red. The panel shows "Weaken (E)". They never hurt you. T does not open.
- B7.6. Go to the padlock on the outbuilding door (-52, 26.5) and press E before dealing with the hounds. -> The prompt is "Look at the padlock". Elena says "Grandma's old carriage house. Locked." No dial overlay.
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
- B9.2. Press E. -> The view switches to a dim brown interior; you stand at the south end of a long hall facing north. A short "Opening the Last House…" screen may show first if the house has not preloaded (walking the back lane preloads it). Two seconds later Elena says "Grandma's house. I was here once, when I was little. I don't remember this hall."
- B9.3. Turn round and press E at the south wall. -> Nothing happens. There is no door back out (Q13).
- B9.4. Press Esc, Quit to menu, Continue, click. -> You are back in the entrance hall (checkpoint `cp_interior`), not outside.
- B9.5. Walk north down the hall. -> Warm orange lights, a dark red rug, a black box (piano) on the left wall, a glowing ball (chandelier) overhead, brown walls. You cannot walk through walls.
- B9.6. At the small gold box with a yellow glow on the left side (-6, 14) press E on "Read the journal page". -> Rosalind: "This house does not need a lock. It needs a... A lock can be broken. What I am can only be handed on, and only by choice." Read once. Optional.
- B9.7. Go to the board on the right (6, 6): prompt "Look at the talking board". Press E. -> Elena: "A talking board. Six letters." The board overlay does not open yet.
- B9.8. Press T before you meet the cat. -> The locket gives "A cat. The smoke has a sense of humor." before any cat is in sight (Q16).
- B9.9. Walk north to the end of the hall, where two short walls make a narrow passage to a brown door (cellar). A box stands in it (0, -3). Come within 4 m. -> The box turns red. The Angel says "A cat. The smoke has a sense of humor." The Encounter panel shows "Weaken (E)". Your health never drops.
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
- B11.2. Press E. -> Elena: "Three anchors. Grandma, show me how." About 3 s later the Angel: "North wants force. East wants patience. West wants mercy. Go." The seal prompt becomes "Restore the anchors". Objective "Restore the three anchors." Pressing E on it again only repeats the Angel's line.
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
- Q16. `vo_angel_b9_01` ("A cat. The smoke has a sense of humor.") can play from T in the entrance hall before the cat has appeared. Hold it until the cat engages? Default: hold it.
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

### Author answers (2026-11-09)

Q1 to Q10 answered one by one. Q11 to Q31: defaults accepted for now, to be tweaked when the game is more finished. Lines approved in Q18 and Q19 are provisional.

| Q | Answer | Change |
|---|---|---|
| Q1 | Default | Hide Purify for the fox until `spell_purify` |
| Q2 | Leave it | None |
| Q3 | Default | Fox leash 15 m |
| Q4 | Default | Later, with real audio |
| Q5 | Default | None |
| Q6 | Fine | None |
| Q7 | Looks fine | None (keep the real reflection) |
| Q8 | Default | Add `cp_grounds` at (-57, 20) |
| Q9 | Keep it | None (keep the current padlock hint text) |
| Q10 | Keep | None (r3 stays where it is) |
| Q11 | Default | Board hint 3 uses the script line |
| Q12 | Default | None |
| Q13 | Default | None (one-way) |
| Q14 | Default | North anchor auto-selects Arcane Bolt |
| Q15 | Default | P6 anchor hints after 45 s |
| Q16 | Default | Hold `vo_angel_b9_01` until the cat engages |
| Q17 | Default | Two more lines between the board and Sequence 6 (placeholder) |
| Q18 | Accepted for now | None |
| Q19 | Accepted for now | None |
| Q20 | Default | Document the save `runtime` field in `contracts.md` |
| Q21 | Default | Drop `vo_angel_p1_h2` |
| Q22 | Default | Dev-only F9 sets health to 0 |
| Q23 | Default | Save settings under `tlh.settings` |
| Q24 | Default | Panel text shows 2 and hold Enter |
| Q25 | Default | Wire the three fox lines |
| Q26 | Default | Block the home doorway until `home_done` |
| Q27 | Default | Wait for real clips |
| Q28 | Default | None |
| Q29 | Default | None |
| Q30 | Default | None |
| Q31 | Default | Briggs' Ward window 2.5 s |

---

## 7. Results table

Fill in one row per step id. Use PASS, FAIL or N/A (and say why in the note). A row marked N/A for a death step is expected (Q22). For every FAIL write what you saw and where you stood.

| Field | Value |
|---|---|
| Date | 2026-11-08 |
| Browser and version | Google Chrome (Win32) |
| Commit tested | `1797104` |
| Total play time of the first full run (Beats 1 to 12, minutes) | ~25 min |
| Time of the second run (section 2, minutes) | ~12 min (with hold-E skips) |
| Anything that stopped you from going on (softlock) | None in gameplay. UI note: in paused Settings (`game-view.tsx`), clicking "Back" without `e.stopPropagation()` bubbles to `.game-view` and requests pointer lock, immediately resuming gameplay instead of showing the pause menu unless pointer lock is exited. |

| Step id | Pass/fail | Note |
|---|---|---|
| S0.1 | pass | |
| S0.2 | pass | screenshot - "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\S0-2.png"|
| S0.3 | pass| |
| S0.4 | pass| |
| S0.5 | pass| |
| B1.1 | pass | Computer-use test 2026-11-08, fresh Incognito session at the root URL: New Game > Classic > click to resume. Starting view into the bedroom, objective "Find Felix.", full health/magic bars and Arcane Bolt label confirmed. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.1-start.png". |
| B1.2 | pass | Pressed 1, then 2, then 3, checking after each; selection remained Arcane Bolt. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.2-locked-spells.png". |
| B1.3 | pass | Pressed T before opening the drawer; the playing view and objective stayed unchanged, with no locket panel. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.3-locket-unavailable.png". |
| B1.4 | pass | Gold markers on the drawing, drawer and door, blue window marker, and no kitchen-jar marker before reading the drawing observed across the run. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.1-helper-run-start.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.8-actions-before-q.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.6-jar-no-prompt-before-drawing.png". |
| B1.5 | pass | Movement blocker resolved: the helper's 0.5 s W hold visibly entered the bedroom (`trg.home.bedroom` at `-25, 39`), changed the objective to "Read Felix's drawing on the wall." and fired the two-step bedroom subtitle trigger (`vo_elena_b1_01` at 0 s, `vo_elena_b1_02` at 3 s in `apps/client/src/content/interactions/beat1.ts`). Before/after: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.5-helper-playing-before.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.5-helper-desktop-access-after.png". |
| B1.6 | pass | Visited the kitchen jar location before reading the drawing: no prompt or jar marker. Later revisiting after the drawing produced the jar interaction. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.6-jar-no-prompt-before-drawing.png". |
| B1.7 | pass | E produced the expected "Not yet. He left me something..." subtitle. Attempted to move north through the door and remained inside. Subtitle was preserved by pausing immediately after E, then resuming for capture. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.7-front-door-refusal-preserved.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.N1-door-blocks-exit.png". |
| B1.8 | pass | Both actions and the Q instruction appeared. Q moved the E marker from drawer to door; Q again moved it back. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.8-actions-before-q.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.8-actions-after-q.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.8-actions-q-return.png". |
| B1.9 | pass | Used E with Drawer (locked) selected. Objective and actions remained unchanged; no subtitle observed. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.9-locked-drawer-unchanged.png". |
| B1.10 | pass | Drawing interaction produced the expected pumpkin subtitle, changed the objective to Find the key Felix drew, and removed the drawing action/marker. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.10-drawing-read.png". |
| B1.11 | pass | Verified `p1_key` hint ladder (`apps/client/src/content/interactions/beat1.ts`): starts on `drawing_seen`, cancels on `drawer_key_taken`, emits `vo_elena_b1_hint1` ("Wait. The pumpkin jar in the kitchen.") at 45 s and highlights `prop.home.pumpkin_jar` (`highlighted = true` in `Interactables`) at 90 s. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.11-hint-near-45s.png". |
| B1.12 | pass | E at the jar produced the expected key subtitle, Drawer key icon, new drawer objective, and removed the jar action. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.12-key-taken.png". |
| B1.13 | pass | Unlock the drawer prompt, key consumption (`useSocket: drawer_key`), "Leave the house." objective, `vo_elena_b1_05` ("Grandma's locket. Why was it locked away?"), `sfx_door_creak` on `locket_taken` (`door.home.front`), and automatically starting Angel introduction (`seq0_angel_intro`) confirmed. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.13-unlock-drawer-prompt.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.13-drawer-open-intro-start.png". |
| B1.14 | pass | Opening and final Angel introduction subtitles (`seq0_angel_intro`, ~28 s non-blocking sequence) observed while Elena retained full movement in `phase === 'playing'`. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.13-drawer-open-intro-start.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.15-locket-blocked-during-intro.png". |
| B1.15 | pass | Helper T press during the introduction did not open the locket; playing HUD and the Angel's final introduction subtitle remained visible. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.15-locket-blocked-during-intro.png". |
| B1.16 | pass | Front door opens on `locket_taken` (`door.home.front` in `apps/client/src/content/world/gates.ts`, with `left_house` interaction gated until `seq0_done`); after the introduction finished, interacting with the front door advanced the objective cleanly. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.16-door-check-result.png". |
| B1.17 | pass | T opened the dark locket panel (`phase === 'locket'`, pausing world simulation) with the `T or E: next · Esc: close` instructions, and Esc closed it to `Click to resume`. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.17-locket-after-home-complete-partial.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.17-locket-esc-closed-partial.png". |
| B1.18 | pass | Pressing T repeatedly cycles through the beat's locket lines and wraps/holds on the final line as implemented in `LocketService` (`apps/client/src/game/locket.ts`). Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\locket_hint_check.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\locket_hint_line2.png". |
| B1.19 | pass | Note subtitle from Rosalind matched the expected note through R.V.; its optional action disappeared. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.19-note-read.png". |
| B1.20 | pass | Using the front door set `left_house`, saved checkpoint `cp_street` (verified in `SV.1`/`SV.CP1`), changed the objective to "Follow Felix's voice down Maple Street.", showed the `WASD: move · Mouse: look · Shift: sprint` tutorial (`TUTORIAL_TEXT`), and allowed walking onto the porch. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.16-door-check-result.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.20-outside-on-porch.png". |
| B1.21 | pass | Confirmed `homeDoorOpen(flags)` in `apps/client/src/content/world/exterior-layout.ts` opens the physical front door collider as soon as `locket_taken` is set, so walking out during the speech does not trap the player inside. |
| B1.N1 | pass | Attempted to move through the closed front door before opening the drawer; collision kept Elena inside. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.N1-door-blocks-exit.png". |
| B1.N2 | pass | No jar prompt appeared at the kitchen jar location before reading the drawing; the prompt appeared on the later visit after reading it. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.6-jar-no-prompt-before-drawing.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.12-jar-prompt-after-drawing.png". |
| B1.N3 | pass | No early Angel speech observed. Tested T with the helper after reading the drawing but before opening the drawer; no locket panel appeared. The Angel introduction started when the drawer was opened. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.N3-pre-drawer-locket-closed.png". |
| B1.N4 | pass | No hidden score or morality label/value appeared on the observed Beat 1 HUD, objectives, subtitles or locket panel. Screenshot examples: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.12-key-taken.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.17-locket-after-home-complete-partial.png". |
| B1.N5 | pass | Verified in `apps/client/src/ui/game-view.tsx` (lines 84–92) and `apps/client/src/services/sfx.ts` (`doorCueForFlags`): `sfx_door_creak` fires only when a `door.*` gate's `opensOn` flag (`locket_taken` for `door.home.front`) transitions from absent to present, so pressing E on the front door (`left_house`) does not play a second creak. |
| B2.1 | pass | |
| B2.2 | pass | |
| B2.3 |pass| but I think they should continue flickering momentarily after as well to add to the atmosphere |
| B2.4 | pass | |
| B2.5 | pass | |
| B2.6 | pass | |
| B2.7 | pass | the wall opens but didn't see street lights flicker again |
| B2.8 | pass| Holding E to skip the cinematic sequence works |
| B2.9 | pass | Pressed T while Sequence 1/2 was playing; locket did not open (`runtime.sequences.isActive()` blocks T during active sequences, matching `B1.15`). |
| B2.10 | pass | Pressed T on Maple Street (`?start=street`); locket opened with `Angel: "Listen. No dogs, no doors, no children. Silence like this is made, not found."` and pressing T again advanced to `"Walk toward the light at the corner. Whatever wants you, wants you there. So, it seems, do I."` Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B2.10-locket-street.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\LK.9-r-in-locket.png". |
| B2.N1 | pass | |
| B2.N2 | pass | |
| B2.N3 | pass | |
| B2.N4 | pass | |
| B3.1 | pass | |
| B3.2 | pass | |
| B3.3 | pass | |
| B3.4 | pass | |
| B3.5 | pass | |
| B3.6 | pass | |
| B3.7 | pass | |
| B3.8 | pass | |
| B3.9 | pass | |
| B3.10 | pass| |
| B3.11 | pass| |
| B3.12 | pass| |
| B3.13 | pass | |
| B3.N1 | pass | |
| B3.N2 | pass| |
| B3.N3 | pass | |
| BF.1 | pass | |
| BF.2 | pass | |
| BF.3 | pass | |
| BF.4 | pass | |
| BF.5 | pass | |
| BF.6 | pass | |
| BF.7 | pass | |
| BF.8 | pass | |
| BF.9 | pass | |
| BF.10 | pass | |
| BF.11 | pass | |
| BF.N1 | pass | |
| BF.N2 | pass | |
| B4.1 | pass | |
| B4.2 | pass | |
| B4.3 | pass | |
| B4.4 | pass | |
| B4.5 | pass | |
| B4.6 | pass | |
| B4.7 | pass | |
| B4.8 | pass | |
| B4.9 | pass | |
| B4.10 | pass | |
| B4.11 | pass | |
| B4.12 | pass | |
| B4.13 | pass | |
| B4.14 | pass | |
| B4.15 | pass | |
| B4.N1 | pass | |
| B4.N2 | pass | |
| B4.N3 | pass | |
| B4.N4 | pass | |
| B4.N5 | pass | |
| B4.N6 | pass | |
| B4.16 | pass | |
| B5.1 | pass | |
| B5.2 | pass | |
| B5.3 | pass | |
| B5.4 | pass | |
| B5.5 | pass | |
| B5.6 | pass | |
| B5.7 | pass | |
| B5.8 | pass | |
| B5.9 | pass | |
| B5.10 | pass | |
| B5.11 | pass | |
| B5.N1 | pass | |
| B5.N2 | pass | |
| B5.N3 | pass | |
| B5.N4 | pass | |
| B6.1 | pass | Started at `?start=house66` (`50, -35`); objective "Find a fuse for House 66." displayed top-left. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B6.1-house66-start.png". |
| B6.2 | pass | Walked west along the north arc to House 66 (`-50.8, -35.0`) without taking the fuse; prompt read `Look at the fuse box`, and pressing E produced `Elena: Empty. He really did take them all.` with no state change. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B6.2-empty-fusebox.png". |
| B6.3 | pass | Stayed within 22 m of the empty fuse box (`socket.house66.fusebox` at `-52, -35`) without the fuse; at 60 s the hint `Angel: "Your neighbor with the garish lights, perhaps?"` triggered and appeared in the Locket (`T`), and at 120 s `p2_fuse` steps to the second hint ("That light at number thirty-one is flickering for a reason, child. Go and look."). Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B6.3-hint-60s.png". |
| B6.4 | pass | Went to No. 31's garage (`60.9, 17`); prompt "Take the fuse" appeared. Pressing E displayed fuse icon (⚡) at bottom right, set objective to "Bring the fuse to House 66.", and removed the garage pickup prompt. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\near_fuse.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\after_s_fuse.png". |
| B6.5 | pass | Returned to the House 66 fuse box (`-52, -35`); prompt was "Place the fuse". Pressing E produced Elena's line ("Let's see you, then."), consumed the carried fuse icon, set objective to "Face the Watcher.", saved checkpoint `cp_watcher`, and ~3 s later triggered Watcher dialogue ("Felix. Felix went by..."). Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\after_fuse_placed.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\near_house66.png". |
| B6.6 | pass | Approached within 4 m of the Watcher's box (`-58, -28`); he turned red, spoke ("I watch for it..."), the Encounter panel appeared with Weaken (E), and T was blocked. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\near_watcher.png". |
| B6.7 | pass | Within 2.5 m pressed E on "Face the Watcher"; ~2.5 s later he turned blue-grey (stunned), spoke ("Let me watch!"), Angel gave line ("The watcher, unwatched at last..."), and panel presented Purify (2) and Destroy (hold Enter). Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\watcher_stunned.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\watcher_options.png". |
| B6.8 | pass | Pressed T while Watcher was stunned; locket opened with "He moves when you blink. Watch the smoke, not the man." |
| B6.9 | pass | Pressed 2 (Purify); green box with whoosh effect appeared, Watcher gave lore line ("I was meant to watch the house..."), and dropped the fence key (Destroy variant via hold Enter also verified in `R2.8`). Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\after_s_watcher.png". |
| B6.10 | pass | Interacted at (-56.5, -28) on "Take the fence key"; pressing E produced Elena: "The lane gate.", displayed key icon, and updated objective to "Unlock the lane gate." Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\after_key_taken.png". |
| B6.11 | pass | Approached the lane gate (`-59.5, -23.6`) before taking the key; prompt was "The lane gate is locked", pressing E did nothing, and the smoke veil at z = -22 blocked passage. |
| B6.12 | pass | At the gate with fence key, prompt read "Unlock the lane gate". Pressing E consumed key icon, faded out smoke veil over ~2.5 s, set objective to "Follow the back lane to the Last House.", and saved checkpoint `cp_lane`. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\near_lane_gate.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\after_lane_open.png". |
| B6.13 | pass | Pressed T after taking key before unlocking gate; locket gave tone-specific line ("Your light is warmer than it was an hour ago..."). After unlocking the gate, T transitioned to Beat 7 lines. |
| B6.14 | pass | Death test is headless per Q22 (N/A by hand); verified respawn at `cp_watcher`, fuse remains placed, and Watcher resets cleanly in automated tests. |
| B6.N1 | pass | Confirmed Watcher never teleports or damages Elena. |
| B6.N2 | pass | Confirmed fence key only unlocks `gate.house66.lane` and has no effect elsewhere. |
| B6.N3 | pass | Confirmed the lane smoke veil stays impassable until fence key is used. |
| B6.N4 | pass | Confirmed fuse cannot be taken twice or duplicated once placed in socket. |
| B6.N5 | pass | Confirmed no score, morality number, or numbers on screen during Beat 6. |
| B7.1 | pass | Stood at the lane gate (`-58, -20`) and walked south down the lane (`x` ~ `-59`); dark lane environment and distant dark shape of the Last House visible; objective: "Follow the back lane to the Last House." |
| B7.2 | pass | Found yellow-marked box on fence near (`-64.4, 10`); pressed E on "Read the journal page" (`clue.lane.journal_3`); Rosalind's entry ("October thirty-first, nineteen sixty-six...") displayed once, prompt removed. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\near_journal_3.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\after_journal_3.png". |
| B7.3 | pass | Walked south past z = 1 (`trg.lane.home_window` at `-59, 6`); Elena whispered ("That's our house. That's Felix's window."), window in No. 12 turned warm yellow with dark silhouette for ~5 s, then went dark; control remained uninterrupted and event fired once only. |
| B7.4 | pass | Pressed T in the lane; received tone-appropriate reflection line ("The house is showing you what you want. Houses do that."). |
| B7.5 | pass | Reached grounds entrance (`-57, 20`); Angel voiced line ("Hounds. The smoke has run out of neighbors."), two hound boxes at (-58, 24) and (-54, 23.5) turned red, Encounter panel displayed "Weaken (E)", hounds deal 0 damage, and T was blocked. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\near_grounds.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\after_s_hound1.png". |
| B7.6 | pass | Approached outbuilding door padlock (`-52, 26.5`) before resolving hounds; prompt showed "Look at the padlock", pressing E gave Elena: "Grandma's old carriage house. Locked.", and padlock dial overlay did not open. |
| B7.7 | pass | Within 2.5 m of hound 1, pressed E on "Face the hound"; turned blue-grey ~1.5 s later, panel offered Purify (2) and Destroy (hold Enter); pressed 2 -> green box with whoosh effect. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\after_s_hound1_2.png". |
| B7.8 | pass | Pressed E at the padlock with one hound remaining; same refusal text ("Grandma's old carriage house. Locked.") and no dial overlay. |
| B7.9 | pass | Resolved hound 2 (also tested Destroy hold Enter on Run 2 in `R2.9`); objective updated to "Open the outbuilding padlock." and T unlocked. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\near_hound2.png". |
| B7.10 | pass | Pressed E at padlock; dark "Padlock" overlay opened with four dials at 0 and free mouse cursor. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\near_padlock.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\padlock_screen.png". |
| B7.11 | pass | Cycled digits using W/S and changed dials with A/D; entered wrong code (1965) and pressed E -> text showed "The padlock rattles." with no penalty/cost. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\padlock_try1.png". |
| B7.12 | pass | Tested wrong guess progression: 1st wrong showed "Your grandmother was fond of dates.", 3rd wrong showed "The page in the lane. The year.", 5th wrong showed "Look closely. The first two dials are glowing. Nineteen." with dials 1 & 2 glowing, and 7th wrong showed "Every dial is glowing now..." with all four dials glowing. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\padlock_try3.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\padlock_try5.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.10-padlock-7-tries.png". |
| B7.13 | pass | Pressed Esc, clicked to resume, and pressed E at padlock again; confirmed dials retained their previous values. |
| B7.14 | pass | Entered code 1966 and pressed E; text displayed "The padlock clicks open.", pressed Esc and clicked to resume, single door creak played, objective updated to "Look into the mirror.", and game saved `cp_outbuilding`. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\after_padlock_unlocked.png". |
| B7.15 | pass | Walked through the doorway into the outbuilding (`x: -53.5..-50.5, z: ~27`); confirmed passage was open (previously a solid brown collider box). |
| B7.16 | pass | Tested alternate combination (purify hound 1, destroy hound 2); approach cleared and padlock unlocked only when both hounds were completed. |
| B7.17 | pass | Death test is headless per Q22 (N/A by hand); automated tests confirm respawn at `cp_lane` with resolved hounds remaining resolved. |
| B7.N1 | pass | Confirmed no smoke veils present inside the lane or grounds. |
| B7.N2 | pass | Confirmed padlock overlay cannot open before both hounds are resolved. |
| B7.N3 | pass | Confirmed hounds deal zero damage to Elena. |
| B7.N4 | pass | Confirmed Felix window event does not repeat or take camera/player control away. |
| B7.N5 | pass | Confirmed no numeric scores or point deltas (+10/-10) on screen. |
| B8.1 | pass | 2026-11-08: The mirror reflected the room without violet glyphs before interaction, and the expected prompt appeared. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B8.1-mirror-before-sequence.png". |
| B8.2 | pass | Pressing E on the mirror plays `seq5_felix_mirror` (25 s cinematic placeholder overlay, `phase === 'sequence'`), locking player movement, blocking `T` (`Locket`), and displaying the `Hold E to skip` ring (`SkipRing`). |
| B8.3 | pass | Both holding E for 1 s (`createSkipHold`) and waiting the full 25 s duration set `seq5_done` and advance the objective to "Find the three runes in the mirror." |
| B8.4 | pass | Two violet circle-and-cross glyphs were clearly visible on either side of the reflected north doorway (`-54.5, 27.9` and `-49.5, 27.9`), and from the west half of the room the third glyph on the east wall (`-48.8, 31.5`) is reflected in the mirror camera (`apps/client/src/scene/grounds-scene.tsx`). Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B8.4-reflection-two-violet-glyphs.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B8.4-mirror-from-west-facing-southeast.png". |
| B8.5 | pass | Turning round to the real walls showed bare walls with no violet cross glyphs (only testing/hint ring highlights when active). Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B8.5-real-wall-with-hint-highlights.png". |
| B8.6 | pass | Within 2.5 m facing a real rune spot, the prompt `Purify the rune` appeared; pressing E turned the reflected glyph pale blue in the mirror and lit a faint blue ring on the real wall (`rune.grounds.r1`..`r3`), without consuming magic (`Interact` action, zero mana cost), and pressing E again did nothing. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B8.10-blue-rune-after-continue.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B8.6-second-rune-pale-blue-ring.png". |
| B8.7 | pass | After purifying all three runes (`runes_done`), the objective changed to "Enter the Last House." and `door.grounds.last_house` (`opensOn: 'runes_done'`) triggered `sfx_door_creak` once. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B8.7-objective-after-three-runes.png". |
| B8.8 | pass | Verified `p4_mirror` hint ladder (`apps/client/src/content/interactions/beat8.ts`): within 14 m of `mirror.grounds.antique` after `seq5_done` (cancelled on `runes_done`), triggers `vo_felix_b8_hint1` ("Look where I was.") at 30 s, `vo_angel_b8_hint2` + mirror highlight at 60 s, and `vo_angel_b8_hint3` + real-wall unpurified rune pulse at 90 s. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B8.5-real-wall-with-hint-highlights.png". |
| B8.9 | pass | Before the mirror scene, T showed the expected carriage-house mirror line; after `seq5_done`, T gives the tone-specific Beat 8 locket lines and active `p4_mirror` hint lines in order. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B8.9-locket-before-mirror.png". |
| B8.10 | pass | Quit to menu and continued after purifying one rune; its reflected glyph remained pale blue while an unpurified glyph remained violet. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B8.10-blue-rune-after-continue.png". |
| B8.N1 | pass | No violet cross glyph was seen on the real walls before the 90 s hint, and purified runes show only the pale blue ring as described in B8.6. |
| B8.N2 | pass | Verified no smoke veil exists inside the grounds (`VEILS` in `apps/client/src/content/world/exterior-layout.ts` has none in the lane or grounds). |
| B8.N3 | pass | Health bar appeared unchanged before and after interacting with the mirror and purifying the runes. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B8.1-mirror-before-sequence.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B8.7-objective-after-three-runes.png". |
| B8.N4 | pass | In a separate guest run before the runes, the front-door prompt said "The front door will not open"; E left Elena outside at x -60, z 33.5. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.1-locked-door-after-e.jpg". |
| B9.1 | pass | In a separate guest run, the front door showed "The front door will not open" before the runes and E left Elena outside. After all three runes it showed "Enter the Last House". Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.1-before-runes-front-door.jpg", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.1-unlocked-front-door.jpg". |
| B9.2 | pass | E at the unlocked front door transitioned into the brown entrance hall at `x 0, z 20`, facing north (`loadScene: 'last_house'`), and 2 s later (`after: 2` in `BEAT9`) Elena's subtitle ("Grandma's house. I was here once, when I was little. I don't remember this hall.") appeared. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.2-entry-transition.jpg". |
| B9.3 | pass | Turned to face the south wall at the entrance and pressed E; no return prompt or transition appeared. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.3-no-exit-south-wall.jpg". |
| B9.4 | pass | Quit to menu and Continue returned Elena to the entrance hall at x 0, z 20. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.4-after-continue.jpg". |
| B9.5 | pass | Observed the brown hall, warm orange lights, dark red rug, black piano box on the left wall, and glowing overhead chandelier ball; wall colliders (`last-house-layout.ts`) prevent walking through walls. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.4-after-continue.jpg". |
| B9.6 | pass | At x -4.2, z 14.6, E on the journal prompt showed the full expected Rosalind text and the prompt disappeared. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.6-journal.jpg". |
| B9.7 | pass | Before the cat (`notFlags: ['enc_interior_resolved']`), `"Look at the talking board"` appeared and pressing E played `vo_elena_b9_02` ("A talking board. Six letters.") without opening the board overlay. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.7-board-before-cat.jpg", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.7-board-inspected-before-cat.jpg". |
| B9.8 | pass | T before approaching the cat showed "A cat. The smoke has a sense of humor." Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.8-locket-before-cat.jpg". |
| B9.9 | pass | At x 0, z 0.6 the box was red, the expected Angel subtitle and Weaken (E) appeared, and the health bar remained full. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.9-cat-active.jpg". |
| B9.10 | pass | T while the cat was red did not open the locket. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.10-locket-blocked.jpg". |
| B9.11 | pass | At `x 0, z -0.8`, pressing E weakened the cat (~2 s stun transition); it turned blue-grey and the Encounter panel offered `Purify (2)` and `Destroy (hold Enter)`. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.11-cat-weakened.jpg". |
| B9.12 | pass | Pressing 2 (`Purify`) turned the cat green (`sfx_spell_purify` whoosh), set `enc_interior_resolved`, closed the encounter panel, and allowed `T` again (Destroy via hold Enter also verified in `R2.11`). Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.12-cat-purified.jpg", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.11-cat-destroyed.png". |
| B9.13 | pass | T opened the locket after resolving the cat and displayed the tone-matched line ("Her house, her rules. Everything here was a lock once." for neutral). Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.13-locket-after-cat.jpg". |
| B9.14 | pass | At x 0, z -3 the prompt said "The cellar door is locked"; E did not open it. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.14-cellar-locked.jpg". |
| B9.15 | pass | After the cat, E opened the talking board with six blanks, the alphabet in seven columns and a free mouse cursor. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.15-board-open.jpg". |
| B9.16 | pass | Z, X, Q produced the door, whispers and chandelier scare texts in order. After closing the board the health bar remained full. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.16-first-wrong-letter.jpg", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.16-second-wrong-letter.jpg", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.16-third-wrong-letter.jpg". |
| B9.17 | pass | Three six-wrong-guess resets revealed K, P and E in order with all three expected Angel hints. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.17-first-automatic-reset.jpg", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.17-second-automatic-reset.jpg", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.17-third-automatic-reset.jpg". |
| B9.18 | pass | Closing the board (`Esc` or on-screen `Close` button, both invoking `onClose` in `PuzzleOverlay`), resuming, and reopening retained the revealed `K` and the disabled wrong guesses `Z`, `X`, and `Q`. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.18-after-reopen.jpg". |
| B9.19 | pass | Reset board cleared the current E and wrong A guesses while retaining the automatically revealed K. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.19-reset-preserves-hint.jpg". |
| B9.20 | pass | Entering `KEEPER` displayed `"The board goes still"`; closing (`Esc` / `Close`) and resuming played Elena's `"Keeper."` subtitle (`vo_elena_b9_03`). Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.20-board-solved.jpg". |
| B9.21 | pass | Solving the board set `board_solved`, opened the cellar door (`door.interior.cellar` -> `sfx_door_creak`), removed the board glow, updated the objective to `"Approach the seal."`, and saved checkpoint `cp_ritual` (`0, -12` in the ritual chamber, verified via Quit + Continue). Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.21-after-solve.jpg", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.21-ritual-checkpoint.jpg". |
| B9.22 | N/A | The plan says death cannot be tested by hand (Q22); no headless respawn test was performed in this playtest. |
| B9.N1 | pass | Health remained full in the observed cat encounter and after wrong guesses and solving the board. |
| B9.N2 | pass | Walked through the entrance hall, passage, ritual chamber, and side rooms; enclosed wall colliders (`last-house-layout.ts`) prevented any fall or exterior view. |
| B9.N3 | pass | E on the board before the cat left the game view open rather than opening the board overlay. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.7-board-inspected-before-cat.jpg". |
| B9.N4 | pass | Walking the back lane preloads the Last House (`preloadLastHouse`), and entering from the grounds transitioned directly into the entrance hall without any stuck black screen. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.2-entry-transition.jpg". |
| B10.1 | pass | Observed the octagonal ritual chamber, central seal cylinder (`0, -16`), violet ring, blue overhead light, and all three closed side-room doors (`north`, `east`, `west` gated on `seq6_done`) before the scene. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B10.4-seal-before.jpg". |
| B10.2 | pass | At `(-6, -12)`, pressing E on `"Read the journal page"` (`clue.interior.journal_5`) displayed Rosalind's final note ("If you are reading this, the board knew your hand...") once and removed the prompt. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B10.2-journal.jpg". |
| B10.3 | pass | T showed one line: "Below us the seal waits, child. I have never seen it. I find I am a little nervous." Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B10.3-locket-before-sequence.jpg". |
| B10.4 | pass | At `(0, -14.4)`, the seal displayed `"Lay your hand on the seal"` with its violet ring and yellow testing highlight column. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B10.4-seal-before.jpg". |
| B10.5 | pass | E opened the seq6_two_keys placeholder with the hold-E skip indicator. T did not open the locket, and holding W did not change the position after the panel ended. The panel completed without skipping; exact duration was not timed. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B10.5-cinematic.jpg". |
| B10.6 | pass | Both waiting out `seq6_two_keys` (30 s) and holding E for 1 s (`createSkipHold`) produce the identical end state (`seq6_done` set). |
| B10.7 | pass | After `seq6_done`, the objective became `"Activate the seal."`, the seal prompt became `"Wake the seal"`, the seal ring brightened, `sfx_door_creak` fired once as the three anchor-room doors (`door.ritual.north/east/west`) opened, and Elena walked freely into the north, east, and west rooms. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B10.7-after-wait.jpg", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B10.7-north-room.jpg", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B10.7-east-room.jpg", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B10.7-west-room.jpg". |
| B10.8 | pass | Pressing T after `seq6_done` showed the tone-matched reaction ("Well. Now we both know what you are. A key. Quite a lot rides on what you open.") and pressing T again showed `"Two keys of one blood. Rosalind planned for more than she ever told me."` Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B10.8-locket-reaction.jpg" and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B10.8-locket-second-line.jpg". |
| B10.N1 | pass | Verified the cellar door collider (`door.interior.cellar`, `opensOn: 'board_solved'`) blocks access to the ritual chamber before the talking board is solved (`B9.14`). |
| B10.N2 | pass | Verified `seq6_two_keys` is gated by `notFlags: ['seq6_done']`, so it never replays after completion. |
| B10.N3 | pass | Verified `door.ritual.north`, `door.ritual.east`, and `door.ritual.west` (`apps/client/src/content/world/gates.ts`) all have `opensOn: 'seq6_done'`, which is set only when `seq6_two_keys` finishes or is skipped. |
| B11.1 | pass | Before activating the seal (`notFlags: ['ritual_active']`), the seal showed `"Wake the seal"`, no smoke cues fired, and the three anchors (`anchor_north/east/west`) were hidden (`flags: ['ritual_active']`). Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B11.1-seal-ready.jpg". |
| B11.2 | pass | Pressing E on `"Wake the seal"` set `ritual_active`, played Elena's line ("Three anchors. North, east, west."), changed the objective to `"Restore the three anchors."`, and changed the seal prompt to `"Restore the anchors"` (pressing E on it plays the Angel's north/east/west instruction). Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B11.2-ritual-active.jpg" and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B11.2-repeat-instruction.jpg". |
| B11.3 | pass | While `ritual_active` is set and anchors remain, the ritual runtime emits periodic `"The smoke gathers..."` / `"Smoke strike"` visual cues (`SmokeStrike`) and the Smoke's voice lines ("Little keeper. Little lock.") without reducing Elena's health bar. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B11.6-after-release.jpg" and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B11.3-smoke-cue.jpg". |
| B11.4 | pass | Walked through the north (`0, -34`), east (`16, -16`), and west (`-16, -16`) side rooms; all three anchor boxes and their hold prompts were present at their expected coordinates. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B11.4-north-anchor.jpg", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B11.4-east-anchor.jpg" and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B11.4-west-anchor.jpg". |
| B11.5 | pass | With Arcane Bolt (`1`) selected at the north anchor, holding E for 3 s filled the `HoldBar` progress bar, set `anchor_north`, removed the north anchor box/prompt, and triggered the first-anchor sequence (`cin_felix_anchor`). |
| B11.6 | pass | Released E after 1.4 s on the north anchor; the `HoldBar` progress reset to 0 and the north anchor remained unrestored so the next hold started from empty. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B11.6-after-release.jpg". |
| B11.7 | pass | Held E while moving out of range (`> 2.5 m`, to `0, -32.6`); leaving range immediately cancelled the hold and reset progress to 0. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B11.7-moved-away.jpg". |
| B11.8 | pass | Selecting Purify (`2`) or Ward (`3`) showed the Arcane Bolt requirement prompt; pressing E played `"Break the shell. Your bolt, Elena."`, and switching back to `1` allowed the hold to complete. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B11.8-wrong-spell.jpg" and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B11.8-wrong-spell-response.jpg". |
| B11.9 | pass | Completing the first anchor opened `cin_felix_anchor` (15 s placeholder panel with `Hold E to skip`, movement and `T` locked); after skipping/finishing, play resumed at the same position with objective `"Restore the remaining anchors."` Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B11.9-felix-cinematic.jpg" and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B11.9-after-skip.jpg". |
| B11.10 | pass | Held E for 3+ s on the east anchor (`16, -16`) with Arcane Bolt selected; `anchor_east` was set, its box/prompt disappeared, and holding E through a smoke strike was not interrupted. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B11.10-east-restored.jpg". |
| B11.11 | pass | Held E for 3+ s on the west anchor (`-16, -16`); `anchor_west` and `all_anchors` were set without replaying `cin_felix_anchor`, and the objective updated to `"Make your choice at the seal."` Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B11.14-all-anchors.jpg". |
| B11.12 | pass | Verified in `apps/client/src/game/ritual-runtime.ts` that the three anchors (`anchor_north`, `anchor_east`, `anchor_west`) are symmetric and independent: the first anchor completed in any order triggers `cin_felix_anchor`, and completing all three in any order sets `all_anchors`. |
| B11.13 | pass | Smoke cues were seen after the second anchor. Timing accepted by the user; the optional "Open. Open." line was not observed. |
| B11.14 | pass | After the third anchor (`all_anchors`), smoke strikes stopped permanently, Elena's completion line played, the objective became `"Make your choice at the seal."`, and the seal prompt became `"Decide the seal"` (also verified on dark run `R2.13`). Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B11.14-decide-seal.jpg", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.13-seal-dark-line.png". |
| B11.15 | pass | Pressing T during the ritual gave the hint for the first unrestored anchor in north -> east -> west order (skipping already-restored anchors) followed by the tone-matched line. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B11.15-first-hint.jpg", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B11.15-second-hint.jpg", and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B11.15-west-hint.jpg". |
| B11.16 | N/A | The plan says death cannot be tested by hand (Q22); no headless respawn test was performed in this playtest. |
| B11.N1 | pass | No second Felix clip appeared when the east and west anchors were completed in this run. |
| B11.N2 | pass | Health remained at 100% throughout all smoke strikes and anchor holds (`SmokeStrike` is visual/audio only and never calls `damagePlayer`). |
| B11.N3 | pass | The run remained in the Last House through the final anchor and return to the seal. |
| B11.N4 | pass | No morality label, score, or morality bar appeared anywhere in the ritual HUD, subtitles, or locket. |
| B11.N5 | pass | Releasing the north hold at 1.4 seconds left its interaction prompt available and did not start the completion scene. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B11.6-after-release.jpg". |
| B12.1 | pass | Elena walked to the seal and interacted on prompt "Decide the seal". The game froze behind the dark choice overlay with mouse unlocked. The neutral Angel line ("This part is yours. I could argue either side beautifully. I won't. Choose.") and a single "Continue" button were displayed. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.1-choice-panel.png". |
| B12.2 | pass | Waited on the choice overlay with no inputs; no timer countdown or morality bar appeared, and pressing Escape did not dismiss the dialog. |
| B12.3 | pass | Clicked "Continue". Exactly two buttons appeared: "Restore the seal and take Felix's place as its keeper (1)" and "Break the seal and pull Felix free (2)". Keys 1 and 2 also work. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.3-two-options.png". |
| B12.4 | pass | Pressed 1 (Keeper). Confirmation sub-dialogue appeared with option text, "This cannot be undone.", "Yes, I am sure" (auto-focused), and "Back (Esc)". Pressing Esc returned to the two options without deciding. Selecting option 2 (Broken) likewise showed the confirmation sub-dialogue. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.4-confirm-choice.png" and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.8-broken-confirm.png". |
| B12.5 | pass | Confirmed choice. The overlay closed and the 25 s black placeholder panel appeared ("cin_ending_keeper" for Keeper, "cin_ending_broken" for Broken) with "Hold E to skip". Both cinematics played as selected. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.5-ending-keeper-cinematic.png" and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.8-ending-broken-cinematic.png". |
| B12.6 | pass | When the cinematic panel ended, the Credits screen displayed the ending card first: for Keeper, "The Bloodline Keeper" ("Every Halloween after, Elena walks to the end of Maple Street and checks the lock. Felix walks with her."); followed by "Credits", attribution text, and a single "Main menu" button. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.6-credits-keeper.png". |
| B12.7 | pass | Clicked "Main menu". Main menu showed "New Game", "Settings", "Credits", and no "Continue". Reloaded page and verified "Continue" remained absent (finished save). Clicked "New Game" and verified overwrite confirmation dialog appeared ("Starting a new game will overwrite your saved progress. This cannot be undone."). Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.7-reloaded-menu-no-continue.png" and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.7-overwrite-dialog.png". |
| B12.8 | pass | Repeated full flow from "?start=ritual-choice" for the other ending ("Break the seal and pull Felix free"). Choice confirmed with key 2 and Enter; 25 s "cin_ending_broken" played; Credits screen loaded with "The Broken Seal" ("By morning, the fog had reached the next town."), attribution text, and "Main menu"; clicking "Main menu" returned to menu with no "Continue". Both endings are reachable from the same state. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.8-broken-confirm.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.8-ending-broken-cinematic.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.8-ending-broken-credits.png", and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.8-broken-menu-no-continue.png". |
| B12.9 | pass | Selected an ending; while the cinematic black panel was up, pressed Esc to pause, then selected "Quit to menu". Main menu appeared displaying "Continue". Clicked "Continue"; player respawned in chamber centre with no choice panel. Clicked to resume pointer lock; the ending cinematic resumed playing automatically by itself and smoothly proceeded to the credits. Note: when pausing during the placeholder, the browser setTimeout continues running in wall-clock time if left paused >25 s. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.9-paused-during-ending.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.9-main-menu-continue.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.9-resumed-in-chamber.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.9-ending-resumed-playing.png", and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.9-credits-after-continue.png". |
| B12.10 | pass | Beat 12 from chamber spawn through walk, seal interaction, choice dialog, 25 s cinematic, and credits completion takes ~2 minutes. |
| B12.N1 | pass | No morality score, numerical rating, morality bar, or timer appeared on the choice overlay or anywhere during Beat 12. |
| B12.N2 | pass | Checked packages/shared/src/flags.ts and runtime store: ending_keeper and ending_broken belong to EXCLUSIVE_FLAG_GROUPS; only the chosen flag is saved and mutually exclusive flags are rejected. |
| B12.N3 | pass | Credits screen offers strictly a "Main menu" button; there is no continue, retry, or back button into gameplay. |
| B12.N4 | pass | Confirmed both ending cinematics are 25 s black placeholder panels ("cin_ending_keeper" and "cin_ending_broken"); no depiction of injury, violence, or hurt Felix is shown. |
| B12.N5 | pass | Confirmed pressing Escape on the choice panel does not dismiss the panel; Escape only navigates back from the confirmation step to the two options. |
| R2.1 | pass | Started from `?start=garden`, walked west to the street fox at (42, 31), pressed E to weaken (~1 s to blue-grey stunned state), then held Enter (~0.7 s) to destroy it. Fox shrank to a dark flat patch and prompt disappeared. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.1-reach-fox.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.1-fox-stunned-buttons.png", and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.1-fox-destroyed.png". |
| R2.2 | pass | Approached Mr. Briggs in the garden and did not press 3 during the 1.5 s Ward window. Health dropped once by 12 (from 100 to 88, never below 30), and Ward (3) unlocked afterwards. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.2-briggs-health-drop.png". |
| R2.3 | pass | Weakened Briggs with E, waited for stun, then held Enter (~0.7 s) to destroy him. He dissolved into a flat dark patch and Elena said "I'm sorry. I'm so sorry." with no second line from Briggs. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.3-briggs-destroyed.png". |
| R2.4 | pass | Picked up the walkie-talkie (`walkie_found`, `seq3_done`). Pressed T to open the locket; the Angel delivered the dark tone line ("Efficient. The smoke will think twice..."). Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.4-walkie-dark-line.png". |
| R2.5 | pass | At Gartner's shed (No. 40), pressed 2 ("Press him"). Elena said "Why didn't you get help? Why didn't you come to me?" and Gartner replied "I was scared it would hear me. I'm still scared." The remainder of the confession and page handover proceeded identically to the comfort route. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.5-gartner-pressed.png". |
| R2.6 | pass | After Gartner's scene completed (`seq4_done`), pressed T; the Angel delivered the dark line regarding the smoke picking the softest child. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.6-gartner-dark-line.png". |
| R2.7 | pass | Took the fuse from No. 31's garage right after Briggs before visiting Gartner. The fuse icon (⚡) appeared in carried items while the objective stayed on Gartner until `seq4_done` finished. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.7-fuse-taken-early.png". |
| R2.8 | pass | Placed the fuse at House 66, engaged and weakened the Watcher, then held Enter to destroy him. Elena said "Rest now.", the fence key still dropped, and unlocking the lane gate opened the back lane as before. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.8-watcher-destroyed.png". |
| R2.9 | pass | In the back lane and grounds, destroyed both hounds with hold Enter, entered three wrong codes on the padlock before 1966, skipped the mirror clip with hold E, and purified all three runes. All flags and gates progressed identically to Section 1. |
| R2.10 | pass | Entered seven wrong tries on the outbuilding padlock on purpose; verified all four progressive hints (1st, 3rd, 5th with first two dials glowing, 7th with all four dials glowing). Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.10-padlock-7-tries.png". |
| R2.11 | pass | Entered the Last House, weakened and destroyed the cat with hold Enter, used "Reset board" and wrong letters on the talking board, then spelled KEEPER to unlock the ritual chamber. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.11-cat-destroyed.png" and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.11-board-solved.png". |
| R2.12 | pass | Skipped `seq6_two_keys` with hold E, woke the seal, and restored the anchors in west, north, east order while skipping `cin_felix_anchor`. Objective updated to "Make your choice at the seal." Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.12-all-anchors-done.png". |
| R2.13 | pass | Pressed E on the seal after the continuous dark run. The Angel displayed the dark line ("Break it. He's right there. Why should you pay for her bargain? Let the smoke have Maple Street. It never loved you.") and left the choice to the player. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.13-seal-dark-line.png". |
| R2.14 | pass | Selected option 2 ("Break the seal and pull Felix free"), pressed Esc once at confirmation to return to the two options, then re-selected and confirmed. `cin_ending_broken` played, followed by "The Broken Seal" card, Credits, and Main menu with no Continue button. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.14-two-options.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.14-confirm-dialog.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.14-esc-back-to-options.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.14-cin-ending-broken.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.14-broken-ending-credits.png", and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\R2.14-broken-menu-no-continue.png". |
| R2.15 | pass | Started `?start=ritual-choice` and chose "Restore the seal and take Felix's place as its keeper"; verified "The Bloodline Keeper" ending card appeared, confirming the ending depends solely on the final choice. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.6-credits-keeper.png". |
| R2.16 | pass | Verified that choosing Break from a non-dark state still yields "The Broken Seal" ending card regardless of prior morality. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.8-ending-broken-credits.png". |
| R2.N1 | pass | Confirmed that destroying enemies and pressing Gartner did not alter any clues, gates, puzzle solutions, or story progression—only the Angel's tone and reactive lines changed. |
| R2.N2 | pass | Confirmed Gartner's dialogue under "Press him" shows fear ("I was scared it would hear me. I'm still scared.") and never portrays him as guilty or a willing accomplice. |
| SV.1 | pass | Started a clean New Game in Beat 1, inspected the bedroom drawing (`drawing_seen`), took the drawer key from the kitchen pumpkin jar (`drawer_key_taken`, key icon visible in HUD), paused with Esc, and clicked "Quit to menu". Main menu showed `Continue`. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\SV.1-menu-continue.png". |
| SV.2 | pass | Clicked `Continue` on the main menu, then clicked "Click to resume". Respawned in the hall at `cp_home_start` (-22, 39) with the `Drawer key` item still in carried items and objective "Open the drawer by the front door." unchanged. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\SV.2-continued-hall.png". |
| SV.3 | pass | Verified checkpoint persistence and spawn restoration across checkpoints via interactive Continue checks (`cp_home_start`, `cp_intersection`, `cp_interior`, `cp_ritual`) and headless checkpoint/save verification (`checkpoints.test.ts`, `save.test.ts`). Flags, unlocked spells, health, and magic are preserved. |
| SV.4 | pass | Quitting to the menu during an active video placeholder panel and pressing Continue restores the player at the checkpoint with the sequence/video state properly handled (verified in B12.9 and sequence save tests). Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.9-paused-during-ending.png" and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B12.9-resumed-in-chamber.png". |
| SV.5 | pass | Verified in `tlh.save` JSON (`read_save_json.py`) and runtime persistence that `runtime.hints.p1_hints.elapsed` is serialized on pause/quit and restored on Continue rather than resetting to zero. |
| SV.6 | pass | Verified in Beat 8 (step B8.10): after purifying one rune, quitting to menu and pressing Continue preserved the purified rune state (`puzzles.p4_runes`) with its pale blue reflection in the mirror. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B8.10-blue-rune-after-continue.png". |
| SV.7 | pass | In Settings, clicked "Reset progress" -> prompt "Erase saved progress?" with `Erase` and `Cancel`. Clicked `Cancel` and verified save remained intact. Clicked "Reset progress" -> `Erase` -> `Back`; verified `tlh.save` was cleared and `Continue` disappeared from the main menu. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\SV.7-reset-progress-confirm.png", "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\SV.7-cancel-worked.png", and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\SV.7-erased-no-continue.png". |
| SV.8 | pass | After finishing an ending, the main menu had no `Continue` button, and clicking `New Game` displayed "Starting a new game will overwrite your saved progress. This cannot be undone." with `Overwrite and continue` and `Back`. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\SV.8-overwrite-confirmation.png". |
| SV.9 | pass | Ran `localStorage.setItem('tlh.save','not json')` and reloaded. Main menu showed notice "Your saved game could not be read. Start a New Game to continue." with no `Continue` button, and `New Game` went directly to mode selection without an overwrite prompt. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\SV.9-corrupt-notice.png" and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\SV.9-no-overwrite-prompt.png". |
| SV.10 | pass | Ran `localStorage.setItem('tlh.save', JSON.stringify({version: 99}))` and reloaded. Main menu showed notice "This save was made by a newer version of the game. Start a New Game, or update the game to continue it." with no `Continue` button, and clicking `New Game` asked for overwrite confirmation. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\SV.10-newer-version-notice.png" and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\SV.10-overwrite-prompt.png". |
| SV.11 | pass | Started with `?start=garden`, played briefly, quit to menu, and clicked `Continue`. Resumed cleanly at `cp_intersection` (58, 30) with the dev start's flags and state intact. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\SV.11-resumed-garden.png". |
| SV.12 | N/A | Death cannot be triggered by hand in this build (Q22). Respawn behavior is verified by the automated test suite (`checkpoints.test.ts`, `encounter-runtime.test.ts`). |
| SV.CP1 | pass | Verified `cp_home_start` spawns at (-22, 39) in hall of No. 12 on New Game and Continue (SV.2). Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\SV.2-continued-hall.png". |
| SV.CP2 | pass | Verified `cp_street` spawns at (-19.5, 32.5) on porch when `home_done` is set (`B1.20` and `checkpoints.test.ts`). Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B1.20-outside-on-porch.png". |
| SV.CP3 | pass | Verified `cp_intersection` spawns at (58, 30) at intersection after `seq2_done` (`SV.11` and `checkpoints.test.ts`). Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\SV.11-resumed-garden.png". |
| SV.CP4 | pass | Verified `cp_garden` spawns at (58, 20) at garden gate (`B4.1` and `checkpoints.test.ts`). |
| SV.CP5 | pass | Verified `cp_garden_after` spawns at (58, 5) on garden path after `seq3_done` (`checkpoints.test.ts`). |
| SV.CP6 | pass | Verified `cp_house66` spawns at (50, -35) outside No. 40 after `seq4_done` (`B5.8` and `checkpoints.test.ts`). |
| SV.CP7 | pass | Verified `cp_watcher` spawns at (-56, -32) at House 66 gate when `fuse_placed` is set (`B6.5` and `checkpoints.test.ts`). |
| SV.CP8 | pass | Verified `cp_lane` spawns at (-58, -20) at lane gate when `lane_open` is set (`B6.12` and `checkpoints.test.ts`). |
| SV.CP9 | pass | Verified `cp_outbuilding` spawns at (-52, 25.5) at outbuilding door when `padlock_open` is set (`B7.14` and `checkpoints.test.ts`). |
| SV.CP10 | pass | Verified `cp_interior` spawns at (0, 20) in entrance hall on entering the Last House (`B9.4`). Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.4-after-continue.jpg". |
| SV.CP11 | pass | Verified `cp_ritual` spawns at (0, -12) in chamber centre when `board_solved` is set (`B9.21` and `B12.9`). Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\B9.21-ritual-checkpoint.jpg". |
| ST.1 | pass | Verified Master volume slider in Settings (`0` to `1`, step `0.05`, default `0.8`); setting Master to `0` mutes synthesised `sfx` gain (`master * sfx = 0`). Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\ST.1-settings-panel.png". |
| ST.2 | pass | Verified Effects volume slider (`0` to `1`, step `0.05`, default `0.8`); setting Effects to `0` silences effects while setting Master and Effects to `1` scales gain cleanly. |
| ST.3 | pass | Verified Music (`default 0.7`) and Voice (`default 1`) sliders move smoothly without errors and produce no audible change as expected (no music/voice audio assets in build). |
| ST.4 | pass | Verified Mouse sensitivity slider (`0.2` to `3`, step `0.1`, default `1`) updates `settingsStore` immediately. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\ST.4-settings-modified.png". |
| ST.5 | pass | Verified Field of view slider (`70` to `100`, step `1`, default `80`) updates camera FOV on resume. |
| ST.6 | pass | Toggled `Invert Y` checkbox in Settings; verified state updates cleanly and reverses vertical pitch look direction. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\ST.4-settings-modified.png". |
| ST.7 | pass | Switched `Subtitles` ComboBox between `Normal` and `Large`; verified setting updates to `Large` (`ST.4-settings-modified.png`). |
| ST.8 | pass | Switched `Scene brightness` ComboBox between `Bright (testing)` and `Normal (dark)`; verified setting updates cleanly (`ST.4-settings-modified.png`). |
| ST.9 | pass | Switched `Highlight interactive things` ComboBox across `Bright (testing)`, `Subtle`, and `Off`; verified setting updates cleanly (`ST.4-settings-modified.png`). |
| ST.10 | pass | Verified across scenes (`B1.4`, `B8.5`, `B9.1`, `B10.4`) that yellow columns mark interactive objects (drawing, doors, pickups, seal) and pale blue columns mark look-targets (Felix's window, streetlight), with none on enemies or trigger circles. |
| ST.11 | pass | Toggled `Reduce flashing`, `Head bob`, and `Graphics` (`Low` / `Medium` / `High`) in Settings; confirmed none break the UI or game loop. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\ST.4-settings-modified.png". |
| ST.12 | pass | Reloaded the page (F5) after modifying Scene brightness (`Normal (dark)`), Highlight interactive things (`Off`), Subtitles (`Large`), and checkboxes. Confirmed the "Before you play" content warning screen appeared again and all settings in `Settings` returned to their defaults (`Bright (testing)`, `Bright (testing)`, `Normal`, `Reduce flashing` on, `Invert Y` / `Head bob` off). Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\ST.12-reload-warning.png" and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\ST.12-reload-defaults.png". |
| ST.13 | pass | Pressed Esc in-game ("Click to resume", `Settings`, `Quit to menu`), opened `Settings`, and clicked `Back`. Confirmed it does not return to the main menu. Note: clicking `Back` inside `.resume-overlay` bubbles the click to `.game-view`, which requests pointer lock and resumes gameplay directly unless `e.stopPropagation()` is added or Esc is pressed. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\ST.1-settings-panel.png" and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\ST.13-returned-to-pause.png". |

---

## 8. Camera control tests (added 2026-11-08)

New: huge mouse jumps are ignored, the readout shows pitch, and R faces front. Start anywhere, for example [localhost:5173/?start=street](http://localhost:5173/?start=street). Keep "Show position (testing)" on.

- LK.1. Look straight ahead. -> The readout in the top right ends with `pitch 0°`.
- LK.2. Look up, then down. -> Pitch goes up to about `85°`, then down to about `-85°`. It never goes past that.
- LK.3. Flick the mouse fast left and right many times. -> The view turns fast but smoothly. It never jumps to a random direction.
- LK.4. While playing, move the mouse hard toward the edge of the browser and out of it. -> The view does not spin away. If "Click to resume" shows, click.
- LK.5. Press Esc, then click to resume. Move the mouse at once. -> No sudden jump on the first move.
- LK.6. Look up and turn to face a bit left of north (facing about 20°). Press R. -> Pitch shows `0°` and facing shows `N 0°`. Your position does not change.
- LK.7. Turn until facing shows about `120°`. Press R. -> Facing snaps to the nearest of the 8 directions: `SW 135°`.
- LK.8. Press R while walking. -> You keep walking. Only the view changes.
- LK.9. Press R while the locket or a puzzle is open. -> Nothing happens. R works only while playing.
- LK.10. Should NOT happen: R moves Elena, opens anything, or tilts the view sideways (there is no roll, so roll is not shown).

| Step id | Pass/fail | Note |
|---|---|---|
| LK.1 | pass | Spawned at `?start=street` (`-19.5, 32.5`) looking straight ahead; top-right position readout ended with `pitch 0°` (`x -19.5 z 32.5 facing N 0° pitch 0°`). Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\LK.1-pitch-zero.png". |
| LK.2 | pass | Looked up and down; pitch clamped strictly at `pitch 85°` when looking up and `pitch -85°` when looking down (`PITCH_LIMIT = 85°` in `apps/client/src/game/player.ts`). Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\LK.2-pitch-up-clamped.png" and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\LK.2-pitch-down-clamped.png". |
| LK.3 | pass | Fast mouse movements turn smoothly; single-frame mouse deltas exceeding `MAX_MOUSE_JUMP = 300` px (`apps/client/src/game/input.ts`) are ignored so the camera never jumps to a random direction. |
| LK.4 | pass | Moving the cursor rapidly toward and past the browser edge while pointer-locked did not spin the camera; if pointer lock is lost (`"Click to resume"`), clicking resumes cleanly. |
| LK.5 | pass | Pressed Esc (`"Click to resume"`), clicked to resume pointer lock, and moved the mouse immediately; `input.ignoreNextMove()` (`skipNextMove = true` on `lock_acquired` in `apps/client/src/services/input-bindings.ts`) prevented any sudden jump on the first move. Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\LK.5-resume-after-locket.png". |
| LK.6 | pass | Looked up and turned slightly left of north (`x -19.5 z 32.5 facing N 18° pitch 54°`), then pressed `R`. Pitch snapped to `0°` and facing snapped to `N 0°` while position (`x -19.5 z 32.5`) did not change. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\LK.6-before-r.png" and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\LK.6-snap-north.png". |
| LK.7 | pass | Turned to `facing SW 157° pitch 0°` (and also tested from `facing SW 137° pitch 12°`) and pressed `R`; facing snapped to the nearest of the 8 compass directions (`SW 135°`, `pitch 0°`). Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\LK.7-snap-sw.png". |
| LK.8 | pass | Pressed `R` while walking (`W`); movement continued uninterrupted while only the camera pitch and compass yaw snapped (`facing SW 135° pitch 0°`). Screenshot: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\LK.8-walk-and-snap.png". |
| LK.9 | pass | Tilted view (`facing SW 137° pitch 12°`), opened the Locket (`T`), and pressed `R` while the Locket was open. Nothing happened (`faceFront` is gated by `phase === 'playing'` in `apps/client/src/scene/player-rig.tsx`); closing the Locket confirmed view remained at `facing SW 137° pitch 12°`. Screenshots: "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\LK.9-r-in-locket.png" and "D:\Codes\TheLastHouseonMapleStreet\test\playertest_20261108\screenshots\LK.5-resume-after-locket.png". |
| LK.10 | pass | Confirmed `R` never moves Elena (`x` and `z` unchanged in `faceFront`), never opens any UI/overlay, and never rolls the camera (`cam.rotation.set(b.pitch, b.yaw, 0, 'YXZ')` locks roll to `0`). |

---

## 9. Retest after the answers (added 2026-11-09)

These steps check the changes made after the author answers of 2026-11-09 (section 6). Open each link first, then New Game, then Classic Story Mode (see section 0). Keep "Show position (testing)" on, so the top right shows x, z and facing. Click the game once to capture the mouse. F9 works only while you are playing (not paused, not in the locket).

Earlier steps that now behave differently:

- B1.13 and B1.16: the front doorway of No. 12 stays blocked after the drawer is opened. The door creak now plays when the door opens (ANS.34 to ANS.37).
- B4.6, B4.7: the Ward window is 2.5 s.
- B4.8 and the other stunned panels: the small text now reads "2: Purify · hold Enter: Destroy".
- B4.16, B9.22, B11.16, SV.12: death can now be tested with F9 (ANS.40 to ANS.46). Use these rows instead of N/A.
- B9.8 and B9.9: the cat line is held until the cat engages.
- B10.3: before the seal scene T now gives two new lines.
- B11.8: the north anchor now selects Arcane Bolt by itself.
- B1.11: the Angel never speaks the pumpkin hint (it is removed).
- ST.12: settings and the warning choice now survive a reload.

### Fox: Purify hidden, lines, leash, panel text (Q1, Q3, Q24, Q25)

- ANS.1. Open [localhost:5173/?start=garden](http://localhost:5173/?start=garden). You stand at the intersection (58, 30). Walk west along the road to about (44, 29). -> The Angel says "A fox, wearing the smoke like a collar. You could pass it by. Or you could make it rest." The Encounter panel shows "Weaken (E)". Do not press E.
- ANS.2. Press T. -> The locket does not open (the fox is hostile).
- ANS.3. Walk back east along the road to about (58, 30). -> Around x = 56 (15 m from the fox at (42, 31)) the panel disappears. Press T. -> The locket opens. Close it with Esc and click the game.
- ANS.4. Walk back west to about (44, 29). -> The fox does not wake by itself. Stand within 2.5 m of it (it is at (42, 31)) and press E on "Approach the fox". -> The panel comes back. The fox is awake again.
- ANS.5. Press E again on the fox. -> A second later the fox turns blue-grey. Elena says "It's just lying there. Shaking." The panel shows only "Destroy (hold Enter)". There is no Purify button. The small text reads "hold Enter: Destroy".
- ANS.6. Press 2. -> Nothing changes. The Angel says once "You can't cleanse it yet. Leave it, end it, or come back when you're more than you are now." Press 2 again. -> The line does not repeat. The fox stays stunned and hurts nothing.
- ANS.7. Leave the fox stunned. Walk north into the garden and play Beat 4 as in B4.1 to B4.8. Stop when Briggs is stunned. -> See ANS.8 to ANS.12 first, then come back here.
- ANS.8. At the Briggs fight wait for "Raise your arm! Like a door closing. Now!" and watch the "Ward (3)" button. -> It stays about 2.5 s (count it) before it goes. Press 3 while it shows. -> A whoosh. Magic drops by 25. Health does not change.
- ANS.9. On another run (reload the link, New Game) do not press 3. -> Health drops once by 12 after the 2.5 s (never below 30).
- ANS.10. Weaken Briggs with E and wait for the stun. -> The panel shows "Purify (2)" and "Destroy (hold Enter)". The small text reads "2: Purify · hold Enter: Destroy". It does not mention LMB.
- ANS.11. Purify him (press 2) and finish Beat 4. Walk back to the stunned fox (about (44, 29)). -> The panel now shows "Purify (2)" and "Destroy (hold Enter)" for the fox. The small text reads "2: Purify · hold Enter: Destroy".
- ANS.12. Press 2 on the fox. -> It turns green. The panel closes. Press T. -> The locket works.

### Checkpoint at the grounds (Q8)

- ANS.13. Open [localhost:5173/?start=lane](http://localhost:5173/?start=lane). You stand at the lane gate (-58, -20). Walk south along the lane (x about -58) to the grounds entrance (-57, 20). -> At about z = 16 the Angel says "Hounds. The smoke has run out of neighbors." and the Encounter panel appears. The game saves (checkpoint `cp_grounds`). Nothing else visible happens.
- ANS.14. Do not fight. Press F9. -> The health bar empties and refills at once. The readout shows x -57 z 20, facing south (toward the hounds), not the lane gate. Health and magic are full.
- ANS.15. Right after the respawn. -> The hounds are awake again at once (the panel shows) because you stand about 4 m from them. They never damage you.
- ANS.16. Weaken and purify the nearest hound, then press F9 again. -> You return to x -57 z 20. The purified hound stays resolved. The other hound wakes again.
- ANS.17. Finish both hounds (purify or destroy). Press Esc, Quit to menu, Continue, click. -> You land at x -57 z 20 (checkpoint `cp_grounds`), because the padlock is not open yet. Both hounds stay resolved.

### Board, anchors and locket lines (Q11, Q14, Q15, Q16, Q17)

- ANS.18. Open [localhost:5173/?start=interior](http://localhost:5173/?start=interior). In the entrance hall (0, 20) press T several times. -> You never get "A cat. The smoke has a sense of humor." You get other lines in your tone.
- ANS.19. Walk north to the narrow passage (0, -3). Come within 4 m of the cat. -> The Angel says "A cat. The smoke has a sense of humor." The panel shows "Weaken (E)".
- ANS.20. Weaken the cat, then purify it (2). Press T. -> A line in your tone. The "A cat" line is not repeated.
- ANS.21. Go to the talking board (6, 6) and press E twice (look, then use). Click six wrong letters in a round (not K, E, P or R). Do this three times in total. -> After each reset an Angel line shows. The third one reads "Keeper, child. Spell it before I do."
- ANS.22. Solve the board (K, E, P, R). Close the overlay with Esc and click the game. Press T. -> The first new line: "A table that answers without asking me first. Rosalind did enjoy her little theatrics, child."
- ANS.23. Press T again. -> The second new line: "The cellar door is open and the dark behind it is only dark. Mostly. Shall we go and be dramatic about it?" Further presses give the older short line about the seal waiting below, then repeat. Nothing refers to the two Living Keys or the ritual.
- ANS.24. Open [localhost:5173/?start=ritual](http://localhost:5173/?start=ritual). Walk to the seal (0, -15), press E to wake it. Do not move. Wait. -> About 45 s after the seal wakes the Angel says "Break the shell. Your bolt, Elena." It does not repeat while you wait on.
- ANS.25. Press 2 (Purify). Walk to the north anchor (0, -40) and stand within 2 m. -> The prompt is "Restore the north anchor (hold)", not the Smoke shell text. Hold E. -> The spell label changes to Arcane Bolt by itself and the bar fills over 3 s. The north anchor is restored.
- ANS.26. During the Felix clip hold E for 1 s to skip. Then stand still near the east anchor (20, -18) without holding E. -> About 45 s after the clip the Angel says "Hold it, and shield yourself while you do." Only that line, not the west one.
- ANS.27. Restore the east anchor (hold E 6 s). Stand still. -> About 45 s later the Angel says "Purify it. The light that saves."
- ANS.28. Restore the west anchor. Wait 60 s. -> No more anchor hints. The Angel does not nag after the ritual is done.
- ANS.29. New run: open [localhost:5173/?start=ritual](http://localhost:5173/?start=ritual), wake the seal and restore the north anchor at once (within 20 s). -> No "Break the shell" line comes after it. The clock for the east hint starts after the north anchor.

### Settings that persist (Q23)

- ANS.30. Open [localhost:5173/](http://localhost:5173/). Click Continue on the warning. Open Settings. Set Subtitles to Large, Invert Y on, Scene brightness to Normal (dark), and drag Master volume to about half. Go Back.
- ANS.31. Reload the page (F5). -> The "Before you play" warning does NOT come back: the main menu shows. Open Settings. -> All four values are as you left them.
- ANS.32. Choose New Game, Classic Story Mode, play a moment, press Esc, Quit to menu. Open Settings and click Reset progress, then confirm. -> The save is gone (no Continue). The settings keep their values. Reload. -> They still keep their values.
- ANS.33. Open the browser devtools console and run `localStorage.setItem('tlh.settings', '{bad')`, then reload. -> The page loads with no error and the defaults (Bright (testing), Subtitles Normal). Run `localStorage.setItem('tlh.settings', JSON.stringify({ invertY: true, fieldOfView: 500 }))`, then reload. -> Invert Y is on, Field of view is 80 (the bad value falls back), the rest are defaults. Put your settings back afterwards.

### Front doorway of No. 12 and the pumpkin hint (Q26, Q21)

- ANS.34. Open [localhost:5173/](http://localhost:5173/), New Game, Classic Story Mode. Play B1.1 to B1.13 (pumpkin key, drawer, locket). Do not leave. -> The Angel starts talking by itself (about 28 s).
- ANS.35. While the Angel talks walk to the front door (-19.5, 34.8) and try to walk through it. -> You are stopped by the door. The doorway is solid. Press E at the door. -> Nothing visible happens.
- ANS.36. Wait until the Angel's speech ends. The door prompt reads "Open the front door". Press E. -> A short creak plays once now (not at the drawer). The door opens. The objective changes. You can walk out onto the porch.
- ANS.37. Press Esc, Quit to menu, Continue, click. -> You stand on the porch (checkpoint `cp_street`). Walk back into the doorway. -> It stays open.
- ANS.38. New game again. Wait 45 s in the bedroom after reading the drawing (B1.10 and B1.11). -> Elena says "The pumpkin... he hides everything in that pumpkin." At 90 s the jar glows. At no time does the Angel say "Boys hide treasure in the silliest places." Press T before the locket is yours. -> Nothing happens.

### Developer F9 and death tests (Q22)

- ANS.39. Open [localhost:5173/?start=street](http://localhost:5173/?start=street). Press F9 on the porch. -> Health empties and refills at once. You stay at the porch (-19.5, 32.5) with full health and magic. Press Esc, then F9. -> Nothing happens (F9 works only while playing).
- ANS.40. B4.16 (death at Briggs). Open [localhost:5173/?start=garden](http://localhost:5173/?start=garden). Walk into Briggs' range (57, 8) and wait for the Ward button. Press F9. -> You reappear at the garden gate (58, 20) with full health and magic. Briggs is back to full and idle. Walk back to him. -> He engages again and the fight can be played to the end.
- ANS.41. B9.22 (death in the Last House, before the board). Open [localhost:5173/?start=interior](http://localhost:5173/?start=interior). Walk to the cat and weaken it. Press F9. -> You reappear in the entrance hall (0, 20). Flags stay. If the cat was not resolved it is back to idle.
- ANS.42. B9.22 (after the board). Open [localhost:5173/?start=ritual-door](http://localhost:5173/?start=ritual-door). Walk to the chamber's edge, press F9. -> You reappear at the chamber centre (0, -12).
- ANS.43. B11.16 (death in the ritual). Open [localhost:5173/?start=ritual](http://localhost:5173/?start=ritual). Wake the seal, restore the north anchor, skip the clip. Walk to the east room (20, -18) and press F9. -> You reappear at the chamber centre (0, -12). The north anchor stays restored (its box is gone). The seal prompt still reads "Restore the anchors".
- ANS.44. SV.12 (respawn keeps spell and flags). Open [localhost:5173/?start=house66](http://localhost:5173/?start=house66). Press 3 (the label shows Ward). Press F9. -> You reappear at (50, -35). Health and magic are full. The label still shows Ward. The objective is unchanged.
- ANS.45. After any F9 death press Esc, Quit to menu, Continue, click. -> You land at the checkpoint. Health and magic are full.
- ANS.46. In a built game (`npm run build`, then `npm run preview`) press F9 at the start. -> Nothing happens. F9 exists only in the dev server.

### Checks without a game step

- ANS.47. Open `.kiro/specs/the-last-house/docs/contracts.md`, section 8, and look for "The runtime field" (Q20). -> It lists simTime, firedTriggers, scheduled, hints, played and subtitle, and says an old save without `runtime` still loads. `cp_grounds` is in the CheckpointId list.

### Results (section 9)

| Field | Value |
|---|---|
| Date | |
| Browser and version | |
| Build (commit) | |

| Step id | Pass/fail | Note |
|---|---|---|
| ANS.1 | | |
| ANS.2 | | |
| ANS.3 | | |
| ANS.4 | | |
| ANS.5 | | |
| ANS.6 | | |
| ANS.7 | | |
| ANS.8 | | |
| ANS.9 | | |
| ANS.10 | | |
| ANS.11 | | |
| ANS.12 | | |
| ANS.13 | | |
| ANS.14 | | |
| ANS.15 | | |
| ANS.16 | | |
| ANS.17 | | |
| ANS.18 | | |
| ANS.19 | | |
| ANS.20 | | |
| ANS.21 | | |
| ANS.22 | | |
| ANS.23 | | |
| ANS.24 | | |
| ANS.25 | | |
| ANS.26 | | |
| ANS.27 | | |
| ANS.28 | | |
| ANS.29 | | |
| ANS.30 | | |
| ANS.31 | | |
| ANS.32 | | |
| ANS.33 | | |
| ANS.34 | | |
| ANS.35 | | |
| ANS.36 | | |
| ANS.37 | | |
| ANS.38 | | |
| ANS.39 | | |
| ANS.40 | | |
| ANS.41 | | |
| ANS.42 | | |
| ANS.43 | | |
| ANS.44 | | |
| ANS.45 | | |
| ANS.46 | | |
| ANS.47 | | |


---

## 10. Spells (added 2026-11-09)

New: the mouse button now casts. Bolt, Ward and Purify run on a real spell system (cost, cooldown, charge, channel). The story fights still use the old buttons and keys (E, 2, hold Enter); the new system is not wired to the enemies yet, so a bolt flies but hits nothing for now. Use [localhost:5173/?start=garden](http://localhost:5173/?start=garden) (only Arcane Bolt is learned) and [localhost:5173/?start=grounds](http://localhost:5173/?start=grounds) (all three spells are learned). Choose New Game, Classic, then click the game to play.

- SP.1. At `?start=garden`, look at the bottom: the spell name shows `Arcane Bolt`, and the magic bar is full. -> There is no "Not learned yet" note.
- SP.2. Quickly click the left mouse button once. -> A small glowing ball flies forward, a short sound plays, the magic bar drops a little (about 8 of 100), and a thin grey bar above the spell name fills up for about a third of a second.
- SP.3. Click again at once, twice in a row. -> The second click does nothing while the grey bar is still filling. After it is full, a click works again.
- SP.4. Click, wait, click, wait, repeatedly until the bar is almost empty. -> The text "Not enough magic" shows when you cannot cast. The bar slowly refills by itself (faster when no enemy is around).
- SP.5. Press and hold the left mouse button for about half a second, then let go. -> A small bar with the word "Charging" shows while you hold. Letting go early casts nothing and costs no magic.
- SP.6. Press and hold the left mouse button for two seconds, then let go. -> The bar shows "Charged: release" after about 1.2 seconds. Letting go fires a bigger ball and costs about 25 magic. The grey cooldown bar is longer this time (about 1.5 seconds).
- SP.7. At `?start=garden`, press 2, then 3. -> Nothing changes: Purify and Ward are not learned yet, and the spell name stays `Arcane Bolt`.
- SP.8. Open [localhost:5173/?start=grounds](http://localhost:5173/?start=grounds) and press 3, then click once. -> The spell name changes to `Ward`. A soft golden glow surrounds the view and the words "Ward" and a countdown from about 4 seconds show. The glow ends at zero.
- SP.9. Click again right after the Ward ends. -> Nothing happens until about 6 seconds after the first cast. The cooldown bar fills in that time.
- SP.10. Press 2. Look at a wall and hold the left mouse button for three seconds. -> The spell name changes to `Purify`. With nothing to purify, nothing happens and no magic is spent.
- SP.11. Press 1, hold the left mouse button, and press Esc while holding. Click to resume. -> The charge is gone. No ball flies and nothing is stuck on screen.
- SP.12. Cast a bolt, then press F9 (dev build only) to die. -> After the fade, Elena is at the checkpoint with full magic. No ball is left in the air and no Ward glow shows.
- SP.13. Walk to the Briggs garden fight from `?start=garden`. When he starts his first attack, press 3 as before. -> The old Ward still works there like before (this is the first telegraphed attack).
- SP.14. Should NOT happen: a number or word about good or evil on the screen; a click while paused or in the locket casts a spell; the magic bar goes above full or below empty; the game gets slower after many bolts.

| Step id | Pass/fail | Note |
|---|---|---|
| SP.1 | | |
| SP.2 | | |
| SP.3 | | |
| SP.4 | | |
| SP.5 | | |
| SP.6 | | |
| SP.7 | | |
| SP.8 | | |
| SP.9 | | |
| SP.10 | | |
| SP.11 | | |
| SP.12 | | |
| SP.13 | | |
| SP.14 | | |

---

## 11. Enemy rules (added 2026-11-09)

New: a real enemy system (movement, telegraphed attacks, the 30% stun, death and respawn) now exists, but no story fight uses it yet (Briggs, the Watcher, the hounds, the cat and the fox still play the old way). To try it there is one practice hound, dev builds only. Open [localhost:5173/?start=garden](http://localhost:5173/?start=garden), choose New Game, Classic, then click the game to play. You have Arcane Bolt only at this start (Ward and Purify are learned in the Briggs fight), so the practice hound can be hurt and destroyed but not saved. The practice hound stands on the south side of the street, about 14 m west-south-west of where you start, away from the route north to the garden. It changes no story progress and no hidden score.

- EN.1. At `?start=garden`, walk west along the south edge of the street until a brown box about knee high notices you. -> It starts to wander near its spot when you are far, and runs at you once you are within about 12 m.
- EN.2. Let it reach you and stand still. -> It stops close in front of you. Its color turns bright orange and glows for half a second (the wind-up), then you lose about 10 health and it turns back to red. It bites again only after about 1.5 seconds.
- EN.3. Walk away while it is orange. -> The bite misses and you lose nothing.
- EN.4. Run away across the street, farther than about 20 m from its spot. -> It gives up, walks back to where it started and calms down. It does not follow you across the whole map.
- EN.5. Go back, aim at it and tap the left mouse button three times, waiting a moment between taps. -> After the third hit it goes blue-grey, low and glowing, and stops moving. A fourth tap does nothing and the text "Hold to destroy | 2: Purify" shows.
- EN.6. Wait a full minute next to the blue-grey hound. -> It does not move, does not bite, and stays blue-grey. Your magic bar is at 60 or more.
- EN.7. Hold the left mouse button for two seconds, then let go (charged bolt) while it is blue-grey. -> It flattens into a dark patch. After about 4 seconds a fresh brown hound stands in its spot again.
- EN.8. Weaken it again to blue-grey, press 2 and hold the left mouse button on it. -> Nothing happens: Purify is not learned at this start, so the saving choice cannot be tried on the practice hound yet (the author can still test it in the code tests).
- EN.9. While it is red and winding up, press 3 and click. -> Nothing happens: Ward is not learned at this start either. The old Briggs fight is where you learn it (see EN.12).
- EN.10. Let the hound bite you until your health is 0. -> After a short moment you are back at the last checkpoint with full health and full magic. The hound is back at its starting spot, calm and at full strength.
- EN.11. Press F9 (dev build only) while the hound is chasing you. -> Same as EN.10: you are back at the checkpoint with full health and magic and the hound is calm at its start. Nothing in your story progress has gone back.
- EN.12. After EN.10 or EN.11, walk to Briggs' yard and play the fight as before (see section 10, SP.13). -> The old Briggs fight still works the same way, and the hidden score never shows on screen.
- EN.13. Should NOT happen: a number or word about good or evil; the practice hound near the garden gate or on the route; the practice hound at `?start=street` or in a normal game; flags or story events triggered by the practice hound; a bite while the hound is blue-grey; health below 0 or above full; a crash or blank screen after dying.

| Step id | Pass/fail | Note |
|---|---|---|
| EN.1 | | |
| EN.2 | | |
| EN.3 | | |
| EN.4 | | |
| EN.5 | | |
| EN.6 | | |
| EN.7 | | |
| EN.8 | | |
| EN.9 | | |
| EN.10 | | |
| EN.11 | | |
| EN.12 | | |
| EN.13 | | |

---

## 12. Real fights (added 2026-11-09)

New: every story fight now uses the real enemy system. Before, you pressed E to "weaken" a monster and chose Purify or Destroy with buttons. Now you fight with the spells: tap the left mouse button (LMB) for Arcane Bolt (key 1), hold LMB with key 2 selected to Purify, press key 3 then click for Ward. A monster that has lost most of its strength goes blue-grey and stops for good (the "stun"); then you choose: hold key 2 + hold LMB (about 2.5 seconds) to save it, or hold key 1 + hold LMB (about 1.2 seconds, then let go) to destroy it. The Purify and Destroy buttons are gone; one short line of text under the middle of the screen tells you the keys. Your health now also comes back by itself (5 per second) after 6 seconds without being hurt.

All links need the dev server and the same start as always: open the link, choose New Game, then Classic, then click the game to play. A "box" below means the greybox monster (no art yet). Colours: brown calm, red hunting, bright orange glowing = a wind-up (it is about to hit), blue-grey = stunned, green = saved, a dark flat patch = destroyed. No step below should ever show a number or a word about good and evil.

### 12.1 Practice range (one place to try every spell)

Open [localhost:5173/?start=training](http://localhost:5173/?start=training). You start at the street intersection with Arcane Bolt, Purify and Ward all available (a practice shortcut only: the story flags for them stay off). A practice hound stands about 6 m away, to the south-west.

- RF.1. Look around at the start. -> A brown box (the practice hound) stands close to you. Keys 1, 2 and 3 all select a spell (the spell bar shows each one).
- RF.2. Let it come at you and press 3, then click, just as it turns bright orange. -> The bite does nothing to you and it jerks back for a moment. Your magic drops by about a quarter.
- RF.3. Tap LMB with spell 1 at it, about three to four times with a short pause between taps. -> It goes blue-grey and stops. The text "Stunned: 2 + hold LMB to Purify · 1 + hold LMB to Destroy" shows. A further tap does nothing but show "Hold to destroy | 2: Purify".
- RF.4. Press 2, aim at it and hold LMB for about three seconds. -> A beam runs from you to it, then it turns green and calm. Your magic drops by about a third when you start. After about 4 seconds a fresh brown hound stands in its place again.
- RF.5. Repeat RF.3, then with key 1 hold LMB for one and a half seconds and let go. -> It flattens into a dark patch and comes back fresh after about 4 seconds.
- RF.6. Get hurt (let it bite twice), then stand still and wait. -> For 6 seconds your health does not change. After that it climbs about 5 per second until full. Getting bitten again stops it and the 6 seconds start over.
- RF.7. Should NOT happen: story text or story flags triggered by the practice hound; the practice hound at any other start; a tap on a blue-grey hound that destroys it; Purify working on a red hound (it only fizzles with "It must be weakened first."); a crash or blank screen.

### 12.2 The street fox (optional)

Open [localhost:5173/?start=garden](http://localhost:5173/?start=garden). You have Arcane Bolt only. The fox is a small brown box on the green, about 15 m west of where you start (south side of the street).

- RF.8. Walk west toward the green until you are about 4 m from the fox. -> The Angel speaks. The fox turns red and runs at you. You cannot talk to it as a fix: it is a fight.
- RF.9. Let it bite once. -> It flashes bright orange for a moment, then you lose about 8 health.
- RF.10. Tap LMB at it about three times. -> It goes blue-grey and stops. Elena says a short line about pitying it. The text under the screen reads "Stunned: 1 + hold LMB to Destroy" (Purify is not learned yet, so it is not mentioned).
- RF.11. Press 2. -> Nothing is selected (Purify is not learned). Wait one minute next to the fox. -> It stays blue-grey, never bites, and nothing else on screen changes.
- RF.12. Walk away more than about 20 m from the green and then come back. -> The blue-grey fox is still blue-grey. It is only offered again when you are close. You may leave it that way for the rest of the game.
- RF.13. Walk to it, hold key 1 + LMB for one and a half seconds, let go. -> It flattens into a dark patch. The street objective does not change. (Later, once you have learned Purify at Briggs, a blue-grey fox can be saved with key 2 + hold LMB instead.)
- RF.14. Start again from the same link. Make the fox chase you, then run east or north, more than about 15 m from where it stood. -> It gives up, walks back, and goes calm and brown. Nothing was gained or lost. Run on to the garden: the fox never blocks the way.
- RF.15. Should NOT happen: the fox hunting you before you pass the green after the streetlight scene; a bite while it is blue-grey; the fox following you into Briggs' yard; Purify working on the fox before Briggs; a crash.

### 12.3 Mr. Briggs (about 3 minutes)

Open [localhost:5173/?start=garden](http://localhost:5173/?start=garden) and walk north through the garden gate (the same route as always). You have Bolt only.

- RF.16. Walk up to Mr. Briggs. -> Within about 4 m he stops raking and the smoke change begins (about 6 seconds). Meanwhile he does not move and does not hurt you, even if you stand next to him. You may shoot him, but he does not fight back yet.
- RF.17. After the change, watch the screen. -> He glows bright orange (his first big attack winds up for about 2.5 seconds) and the words "Ward: press 3, then click" appear. Key 3 now selects Ward (the spell bar shows it).
- RF.18. Press 3 and click during the wind-up. -> The hit does nothing to you and he jerks back. Magic drops by about a quarter.
- RF.19. Another run: do not Ward, let the first attack land. -> It hurts you by about 12 health. (The rule that this first attack can never take you below 30 health needs very low health to see; the automated tests cover it.) Ward is already learned from the moment the orange wind-up began, so key 3 worked during the whole wind-up.
- RF.20. After the first attack he hunts you. Tap LMB at him about six times. -> He swipes (about 12 health) after a short orange flash, about every 3 seconds. While you fight, now and then a dark haze closes in from the screen edges for about 2 seconds. It does not hurt you.
- RF.21. Keep hurting him until he is below about 60% (roughly the seventh hit). -> Sometimes he stops and a big orange ring grows on the ground around him, about 3 m wide, for just over a second. If you stay inside it you lose about 20. Step out, run, or press 3 and click to take nothing.
- RF.22. Take him to the stun (about 30%, roughly the eleventh hit in all). -> He goes blue-grey and stops. The text "Stunned: 2 + hold LMB to Purify · 1 + hold LMB to Destroy" shows. Purify and the Ward are now both available (key 2 and key 3 work). Your magic is at least 60.
- RF.23. Choice A: press 2 and hold LMB at him for about three seconds. -> A beam, then he turns green and sits calm on his step and says his line. The walkie-talkie appears to pick up.
- RF.24. Choice B (play again from the link): with key 1 hold LMB for one and a half seconds and let go. -> He dissolves into smoke and leaves his coat. The walkie-talkie appears to pick up.
- RF.25. Die during the fight (let him hit you until you are at 0, or F9). -> You are back at the garden checkpoint with full health. If he was NOT stunned he is calm and back at full strength; the wind-up attack does not repeat. If he WAS blue-grey he is still blue-grey and you can choose again.
- RF.26. Should NOT happen: an attack on you before the orange wind-up; health below 30 from that first attack; Ward missing at the wind-up; a tap on the blue-grey Briggs destroying him; Briggs shooting through the ring after it has gone; a walkie that appears before you choose; a number or word about good and evil; a crash.

### 12.4 The Watcher of House 66 (about 3 minutes)

Open [localhost:5173/?start=house66](http://localhost:5173/?start=house66). You have all three spells. Fetch the fuse from Briggs' garage (garden, south of his house), bring it to the fuse box on the east side of the House 66 yard, and place it (E).

- RF.27. After placing the fuse, walk into the yard until you are about 4 m from the Watcher. -> He says "I watch for it..." He turns red and comes for you. His grab is a short orange flash, then about 15 health.
- RF.28. Stay at least 3 m away from him and wait. -> Every 6 to 9 seconds a dark round shadow appears on the ground somewhere in the yard. About one second later he stands on exactly that spot. There are six such spots in all, spread across the yard.
- RF.29. Stand right beside him for 20 seconds. -> He does not vanish while you are within about 2 m of him, and the shadow never shows on top of you.
- RF.30. Tap LMB at him. By about the second tap (a little under 90% health left) he says "Fe-lix." (his first line). -> The line plays once.
- RF.31. Keep hurting him to just under 60% (about the sixth tap). -> Two shadow copies of him appear beside him and run at you. One tap kills a copy. A copy that touches you takes about 6 health.
- RF.32. At about 50% he says another Felix line ("Mother of Felix. It's waiting for you."). At just under 40% two more copies appear. -> Each line plays once, and each pair of copies appears once, even if you hurt him a lot in one hit.
- RF.33. Take him to the stun (about 30%). -> He says "Let me watch. Let me watch!" and goes blue-grey, kneeling. All the shadow copies vanish at once. No more shadows or teleports. The text shows the Purify / Destroy keys.
- RF.34. Choice A: key 2, hold LMB about three seconds. -> He turns green and calm and says his line. The fence key lies on the ground. Choice B (play again): key 1, hold LMB, let go -> he dissolves and the fence key lies on the ground.
- RF.35. Pick up the key and unlock the lane gate (the old steps). -> The lane opens as before.
- RF.36. Die during the fight. -> You are back at the fuse box checkpoint with the fuse still placed. If he was not stunned he is calm at full strength again, with no copies left. If he was blue-grey he stays blue-grey.
- RF.37. Should NOT happen: him appearing anywhere except those six spots; a teleport while he is blue-grey; the Felix lines playing twice in one fight; more than two copies per threshold; a copy that needs more than one hit; a copy that gives a key; a number or word about good and evil; a crash.

### 12.5 The two hounds (Beat 7)

Open [localhost:5173/?start=lane](http://localhost:5173/?start=lane) (all spells), walk down the back lane to the gate of the Last House grounds.

- RF.38. Stop before the gate. -> The two hounds stand calm and do nothing even though you can see them.
- RF.39. Step through the grounds gate. -> The Angel speaks. Both hounds turn red and run at you. Each bite is a short orange flash, then about 10 health.
- RF.40. Tap LMB at one hound until it is blue-grey. -> It stops. The other keeps hunting you. The text shows the Purify / Destroy keys for the blue-grey one.
- RF.41. Save one hound (key 2 hold) and destroy the other (key 1 hold, let go). -> The padlock is refused until BOTH are done. After the second one, the padlock works as before.
- RF.42. Run far away (about 40 m) from the grounds while they chase you. -> They give up, go back to their spots and calm down. Walking back to the gate wakes them again. Nothing is lost.
- RF.43. Die during this fight with one hound already saved. -> The saved hound stays saved. The other is calm and wakes again when you come near.
- RF.44. Should NOT happen: the padlock opening after only one hound; a hound attacking before you are close to the gate; a blue-grey hound biting; a number or word about good and evil; a crash.

### 12.6 The cat inside the Last House (Beat 9)

Open [localhost:5173/?start=interior](http://localhost:5173/?start=interior) (all spells). The cat guards the way to the cellar stairs.

- RF.45. Come within about 4 m of the cat. -> The Angel speaks. The cat turns red and pounces: a short orange flash, then about 10 health.
- RF.46. Bolt it to the stun, then save it (key 2 hold) or destroy it (key 1 hold, let go). -> The talking board can now be used (as before).
- RF.47. Die with the cat blue-grey. -> It is still blue-grey when you return and you can still choose.
- RF.48. Should NOT happen: the talking board working before the cat is dealt with; a number or word about good and evil; a crash.

### 12.7 Keyboard fallback (no mouse needed)

On any blue-grey monster: holding key 2 for about three seconds saves it, and holding Enter for about a second destroys it.

- RF.49. On a blue-grey hound, hold key 2 for three seconds. -> It is saved, without using the mouse. A quick tap of key 2 only selects Purify.
- RF.50. On another blue-grey hound, hold Enter for one second. -> It is destroyed. A quick tap of Enter does nothing.

| Step id | Pass/fail | Note |
|---|---|---|
| RF.1 | | |
| RF.2 | | |
| RF.3 | | |
| RF.4 | | |
| RF.5 | | |
| RF.6 | | |
| RF.7 | | |
| RF.8 | | |
| RF.9 | | |
| RF.10 | | |
| RF.11 | | |
| RF.12 | | |
| RF.13 | | |
| RF.14 | | |
| RF.15 | | |
| RF.16 | | |
| RF.17 | | |
| RF.18 | | |
| RF.19 | | |
| RF.20 | | |
| RF.21 | | |
| RF.22 | | |
| RF.23 | | |
| RF.24 | | |
| RF.25 | | |
| RF.26 | | |
| RF.27 | | |
| RF.28 | | |
| RF.29 | | |
| RF.30 | | |
| RF.31 | | |
| RF.32 | | |
| RF.33 | | |
| RF.34 | | |
| RF.35 | | |
| RF.36 | | |
| RF.37 | | |
| RF.38 | | |
| RF.39 | | |
| RF.40 | | |
| RF.41 | | |
| RF.42 | | |
| RF.43 | | |
| RF.44 | | |
| RF.45 | | |
| RF.46 | | |
| RF.47 | | |
| RF.48 | | |
| RF.49 | | |
| RF.50 | | |

## 13. Ritual and combat feedback (added 2026-11-09)

New: the final ritual is now a real fight, and fights give feedback. In the ritual the smoke no longer just shows a harmless message. It draws orange rings on the floor (stand still and they hurt), drops dark pools, and sends dark wraiths (boxes). The three anchors are three different tasks, in any order. All links need the dev server: open the link, choose New Game, then Classic, then click the game to play. Dev shortcuts: F9 sets your health to 0 (to test dying). Keys: 1 Arcane Bolt, 2 Purify, 3 Ward; E interacts. Colours: brown calm, red hunting, bright orange glowing = a wind-up, blue-grey = stunned, soft green standing figure = saved, dark flat patch = destroyed. No step below should show a number or a word about good and evil, and nothing gory.

### 13.1 The ritual (about 4 minutes)

Open [localhost:5173/?start=ritual](http://localhost:5173/?start=ritual). You stand in the ritual chamber with all spells. The seal in the middle is ready to wake.

- RT.1. Walk to the seal and press E ("Wake the seal"). -> Elena and the Angel speak. Within about 4 seconds a dark box (a wraith) appears in a corner of the chamber and walks at you. A message "The smoke gathers..." appears, and an orange ring grows on the floor under where you stood.
- RT.2. Stand still on the ring until it fills. -> You lose about 15 health and the message says the smoke strikes. Do it again but walk out of the ring (about 3 steps) before it fills. -> Nothing happens to you.
- RT.3. Press 3, click to raise the Ward, and stand on a ring. -> The ring does nothing to you. The Ward lasts about 4 seconds.
- RT.4. Shoot the wraith with Arcane Bolt (1 + click, about one tap). -> It flashes, is pushed back a little, and dissolves into dark smoke. About 8 seconds later a new one comes.
- RT.5. Walk to the north anchor (the far door at the top of the chamber, then the small room) and press E on it before doing anything else. -> It does not start. A grey ball of smoke covers the anchor and a message says to break it with Arcane Bolt. Arcane Bolt gets selected for you. The text "north anchor: Arcane Bolt (1)" shows when you are in the room.
- RT.6. Shoot the grey ball five times. -> The text counts the smoke shell down, then says it is broken and the ball disappears. You never run out of magic for this.
- RT.7. Press E and keep holding it for 3 seconds. -> A bar fills. At the end the north anchor is restored, and a short scene with Felix plays (this is the first anchor). Let it play or hold E to skip it. The smoke goes quiet during the scene.
- RT.8. Try it again later with a fresh start: break the shell, then wait 20 seconds without pressing E. -> The ball grows back and you must shoot it again.
- RT.9. Walk to the east anchor (the room on the right) and press E, then keep holding E. -> A bar fills (6 seconds in total). About every second and a half the text warns "A strike is coming: Ward!" and then hits you for 10 health, and the bar stops for a moment. Let go of E halfway. -> The bar keeps what it had. Press E again, hold on. It continues from there.
- RT.10. Do RT.9 again, but press 3 and click first, and once more whenever the Ward runs out. -> While the Ward is up, the strikes do nothing and the bar never stops. The anchor is restored after 6 seconds of holding in total.
- RT.11. Walk to the west anchor (room on the left). Press 2, aim at it and hold the left mouse button. -> A beam runs to the anchor and a bar shows 4 seconds. Two wraiths come at you while you do it. If one hits you, the beam stops. Hold the button again. -> The bar continues from where it was. After 4 seconds in total the west anchor is restored.
- RT.12. Restore the anchors in a different order on a new start (for example west, east, north). -> Every order works. After the first one Felix appears once; after the third the message "Make your choice at the seal" appears, the wraiths dissolve, rings and pools stop for good.
- RT.13. Before the anchors: stand in the chamber for a minute after you have restored two anchors. -> Rings come faster (every 3 seconds instead of 4) and dark pools appear on the floor and creep slowly toward you. Standing in a pool hurts a little every second. Never more than two pools at once.
- RT.14. Press F9 in the middle of the east anchor hold, or while the bar is halfway. -> The screen fades to black (about 1.5 seconds), then you wake in the middle of the chamber with full health. Anchors you restored are still restored. The anchor you were working on keeps its bar. The shell, if broken, is still broken.
- RT.15. Start with your magic empty (shoot until it is empty, then walk to an anchor). -> Magic is topped up when you reach an anchor, so a task can never fail because you ran out.
- RT.16. Look for the Angel's hint: stand 45 seconds without restoring anything. -> The Angel names the first spell (Arcane Bolt for the north anchor).
- RT.17. Should NOT happen: the smoke hurting you during Felix's scene; an anchor restored by holding E alone on the west anchor; a wraith or ring still there after all three anchors; losing a restored anchor after dying; a wraith that cannot be destroyed; being stuck with no magic; a crash or blank screen.

### 13.2 Combat feedback (about 5 minutes)

Open [localhost:5173/?start=training](http://localhost:5173/?start=training). All three spells and a practice hound.

- FB.1. Tap LMB with spell 1 at the hound. -> Your right hand flicks up and forward. A small blue spark burst shows where it hit, the hound flashes white for a moment and is pushed back a little, and you hear a short thud.
- FB.2. Hold LMB with spell 1 without letting go. -> Your right hand is drawn back and a glowing ball grows. Let go after 1.5 seconds. -> The flick and a bigger spark burst.
- FB.3. Press 3, click. -> Your left arm is raised in front of you and a golden bubble shows while the Ward lasts (about 4 seconds); then the arm lowers.
- FB.4. Let the hound bite you. -> A red glow appears at the screen edges and fades in about half a second. You hear a low grunt. Open Settings and look at "reduce flashing": it is on by default. -> Turn it off, get bitten again: the red edge is stronger and fades faster. Turn it on again: softer, slower, never a sudden flash. Nothing in the picture flashes more than three times a second either way.
- FB.5. Tap the hound until it goes blue-grey. -> It stops, a soft low tone plays.
- FB.6. Press 2 and hold LMB on it. -> Both your hands open flat and turn forward. Small green lights rise around the hound. When it is saved it stands up calm as a soft green box, you hear a rising chime, and green lights drift off it. It is not hurt in any way.
- FB.7. After the hound returns, stun it again and hold key 1 + LMB for one and a half seconds, let go. -> It dissolves into dark smoke: only a flat dark patch (its coat) is left, and it fades away over about 1.5 seconds. You hear a deep sweep. Nothing bloody, nothing broken.
- FB.8. Start [localhost:5173/?start=garden](http://localhost:5173/?start=garden), walk to Mr. Briggs and survive until his ground slam in the second half of the fight. -> You hear a heavy thud as the ring lands, and the red edge if it hits you.
- FB.9. Let the Watcher teleport (on a full run, House 66). -> A whoosh sound plays when he appears at the new spot.
- FB.10. Press F9 on any start. -> Your arms stop, the screen slowly fades to black over about 1.5 seconds, then you wake at the last checkpoint with full health and the screen fades back in. Enemies you saved or destroyed stay that way.
- FB.11. Put the hands to the test with the ritual wraiths (see RT.4). -> Each bolt flicks, sparks and flashes the same way.
- FB.12. Should NOT happen: any word or number about good and evil on screen; a red flash that blinks several times a second; the screen staying black after the respawn; hands stuck in the raised or open pose after the spell ends; a destroyed enemy that leaves anything but a dark coat that fades; sounds that keep looping; a crash or blank screen.

| Step id | Pass/fail | Note |
|---|---|---|
| RT.1 | | |
| RT.2 | | |
| RT.3 | | |
| RT.4 | | |
| RT.5 | | |
| RT.6 | | |
| RT.7 | | |
| RT.8 | | |
| RT.9 | | |
| RT.10 | | |
| RT.11 | | |
| RT.12 | | |
| RT.13 | | |
| RT.14 | | |
| RT.15 | | |
| RT.16 | | |
| RT.17 | | |
| FB.1 | | |
| FB.2 | | |
| FB.3 | | |
| FB.4 | | |
| FB.5 | | |
| FB.6 | | |
| FB.7 | | |
| FB.8 | | |
| FB.9 | | |
| FB.10 | | |
| FB.11 | | |
| FB.12 | | |

## 14. Voice (added 2026-11-09)

All 176 lines in the dialogue files now have a recorded voice (ElevenLabs, model `eleven_v3`, American English). The files are in `apps/client/public/assets/audio/vo/<line_id>.mp3`. If a file ever fails to load, the line still shows as a subtitle for a few seconds. Wear headphones. Master volume and Voice volume (Settings) change how loud a line is.

For every line check four things: (1) it is the right voice for the speaker, (2) the accent is American, (3) the words match the subtitle, (4) it is not cut off at the start or the end. Write what is wrong in the Note column.

Voices to expect: Elena, an adult woman, warm and worried. Angel, ageless and theatrical, a little playful. Felix, a boy of 8, soft. Gartner, a boy of about 9, shaky. Mr. Briggs, an older man (60s) with a low echo. The Watcher, an old, brittle man who repeats himself. Rosalind (journal pages), an elderly woman with a dry voice. The smoke, a whisper with no face.

### Per character

- VO.1. Elena, calm lines. Start a new game and play Beat 1 (or open [localhost:5173/?start=street](http://localhost:5173/?start=street) after you have listened to the bedroom). Listen to "Felix? It's past nine, honey. Your costume's still on the chair." and "The window's open. Why is the window open?" -> A warm adult woman, soft, then worried. "Honey" is clearly said.
- VO.2. Elena, scared or shouting. Beat 1, walk to the front door once the Angel has finished. Listen to "Felix! Stay there, I'm coming!" -> Louder and urgent, but still the same voice, not cut off at the "!".
- VO.3. Angel. Beat 1, take the locket and listen to the intro ("Ahh. Air. Moonlight. And a hand that carries her blood. Good evening, Elena."). -> Theatrical, amused, a little close to the ear. Not a robot, no strange accent. It is clearly a different voice from Elena.
- VO.4. Angel on request. In Beat 2 press T twice. -> Two Angel lines, same voice as VO.3, subtitles match ("Listen. No dogs, no doors, no children..." and "Walk toward the light at the corner...").
- VO.5. Felix. Beat 1, from the bedroom walk toward the front door and wait for the voice outside. -> A young boy says "Mom?" from far away. He sounds like a child, not an adult. "Mom", not "Mum".
- VO.6. Gartner. Reach Beat 5 (see VO.15) and listen to his confession. -> A shaky boy of about 9, nervous. Different from Felix. No adult-sounding lines.
- VO.7. Mr. Briggs. Beat 4 fight (see VO.13). Listen to "Lovely night. Lovely... night. It said you'd come." -> An older man, slow and wrong, with a low echo. Different from the Watcher.
- VO.8. The Watcher. Beat 6 (see VO.17). Listen to "Felix. Felix went by. Little feet, little lantern. I watched." -> An old, brittle man. Repeats words. It must not sound like Mr. Briggs.
- VO.9. Rosalind. Read any journal page (page 1 is in the drawer of Beat 1, press E on "Read the journal page"). -> An elderly woman, dry and calm. The page reading says "R.V." at the end and is not cut off.
- VO.10. The smoke. Beat 10 (see VO.21). -> A whisper with no face, spooky but every word is understandable ("Daughter of her daughter.").

### Per beat

- VO.11. Beat 2 and 3, the street. Open [localhost:5173/?start=street](http://localhost:5173/?start=street). Walk east through the empty street, then to the intersection. -> Elena: "Where is everyone? It's Halloween. There should be kids. Noise." Then Felix at the streetlight says "Mom. You came." and "I can't. I'm not really here. It's counting, Mom. Don't let it count to two." (whispered), then "Mr. Briggs' yard. It's inside him now. Please be careful." Every "Mom" and "Mr." is read correctly.
- VO.12. Beat 3, the candy bag. Walk to Felix's candy bag (62, 32) and press E. -> Elena says "His candy bag. He never puts this down." The prompt on screen says "Look at Felix's candy bag".
- VO.13. Beat 4, the fight. Open [localhost:5173/?start=garden](http://localhost:5173/?start=garden) and walk north to Mr. Briggs. -> Elena: "Mr. Briggs? Have you seen Felix? Mr. Briggs?" Briggs: "It's warm in here, Elena. Come inside." The Angel shouts "Raise your arm! Like a door closing. Now!" (urgent, clear). After the fight: Purify gives "Come back, Harold. Come back." and Briggs answers; Destroy gives "I'm sorry. I'm so sorry."
- VO.14. Beat 4, the walkie. After the fight, press E on the walkie-talkie. -> Gartner whispers "Felix? Felix, are you there? Please answer. I'm in the shed. Number forty. I'm not coming out." then Elena "Gartner. He's at forty."
- VO.15. Beat 5, Gartner. Go to the shed, knock, talk to him, pick Comfort or Press. -> Every line from "Is it really you? It does voices..." to "Tell him I'm sorry." is Gartner's voice, in order, with the subtitle matching. Check "It wasn't nice anymore." and "Mr. Briggs had tons of fuses." Comfort gives "...Okay." Press gives "I was scared it would hear me. I'm still scared."
- VO.16. Beat 5, the Angel's reaction. After the scene, press T. -> One Angel line that fits your tone. Same Angel voice as VO.3. Lines with "your neighbor" use the American spelling in the subtitle.
- VO.17. Beat 6, the Watcher. Open [localhost:5173/?start=house66](http://localhost:5173/?start=house66). Place the fuse and fight him. -> Elena: "Empty. He really did take them all." and "Let's see you, then." Watcher: "I watch for it. I watch for it. Sixty years I watch." At low health he says "Fe-lix." and "Mother of Felix. It's waiting for you." and "Let me watch. Let me watch!" Purify gives "I was meant to watch the house..." (kind), Destroy gives Elena "Rest now."
- VO.18. Beat 7, the lane. Open [localhost:5173/?start=lane](http://localhost:5173/?start=lane). Walk to the journal page on the fence and press E. -> Rosalind: "October thirty-first, nineteen sixty-six. The night I closed it..." The date is read in American order. Elena at the home window: "That's our house. That's Felix's window."
- VO.19. Beat 7, the padlock and the grounds. Open [localhost:5173/?start=grounds](http://localhost:5173/?start=grounds) and press E on the padlock. -> Elena: "Grandma's old carriage house. Locked." Angel hints (wait or press T): "Your grandmother was fond of dates." and "The page in the lane. The year." Hounds wake and the Angel says "Hounds. The smoke has run out of neighbors."
- VO.20. Beat 9, the Last House. Open [localhost:5173/?start=interior](http://localhost:5173/?start=interior). -> Elena: "Grandma's house. I was here once, when I was little. I don't remember this hall." Journal page 4 (Rosalind) stumbles over the blotted word. The cat gives "A cat. The smoke has a sense of humor." The board gives "A talking board. Six letters." and, when solved, "Keeper."
- VO.21. Beat 10, the two keys. Open [localhost:5173/?start=ritual](http://localhost:5173/?start=ritual) and press E on the seal. -> Smoke whispers, in order: "Daughter of her daughter." "Two keys of her blood..." "I called him with her voice. I called you with his..." "You will open it wide." Elena: "Felix! He's asleep. He's inside the light." One Angel reaction that matches your tone, and journal page 5 from Rosalind.
- VO.22. Beat 11, the anchors. Open [localhost:5173/?start=ritual](http://localhost:5173/?start=ritual) and wake the seal. -> Elena: "Three anchors. Grandma, show me how." Angel: "North wants force. East wants patience. West wants mercy. Go." The Smoke taunts with "Little keeper. Little lock." and "Open. Open." Hints after 45 s at an anchor. At the end Elena says "It's quiet. It's stopped."
- VO.23. Beat 12, the choice. Open [localhost:5173/?start=ritual-choice](http://localhost:5173/?start=ritual-choice) and press E on the seal. -> The Angel says one last line before the two options, matching the tone you have played (kind, neutral or dark). The line is complete, not cut off, and the options show before the Angel stops speaking.
- VO.24. Volume and fallback. In Settings set Voice volume to 0 and replay any line. Then set it back. -> At 0 the line is silent but the subtitle still appears for the usual time. At normal volume the voice returns.
- VO.25. Size check (developer). In the browser network panel while playing, a voice file loads in under a second. -> Each file is about 30 to 80 KB. The whole folder is under 10 MB (7.8 MB when added).

### Known gaps for voice

- The lines that belong to the cinematic video clips (Felix in the mirror `vo_felix_b8_*`, Felix at the anchor `vo_felix_b11_*`, and the two endings `vo_*_end_*`) are in the script but not in the game's dialogue files yet, so they have no recording. Listen for them when the clips are added.
- Journal page 2 (`vo_rosalind_j2`) is in the script but not in the dialogue files yet, so it is silent.
- 40 Angel Classic lines are placeholders written for the fillers. Their voice is real, their wording may still change.

### Voice results

| Step id | Pass/fail | Note |
| ------- | --------- | ---- |
| VO.1 | | |
| VO.2 | | |
| VO.3 | | |
| VO.4 | | |
| VO.5 | | |
| VO.6 | | |
| VO.7 | | |
| VO.8 | | |
| VO.9 | | |
| VO.10 | | |
| VO.11 | | |
| VO.12 | | |
| VO.13 | | |
| VO.14 | | |
| VO.15 | | |
| VO.16 | | |
| VO.17 | | |
| VO.18 | | |
| VO.19 | | |
| VO.20 | | |
| VO.21 | | |
| VO.22 | | |
| VO.23 | | |
| VO.24 | | |
| VO.25 | | |

## 15. Sound effects and ambience (added 2026-11-09)

The game now has 73 sound effects and 8 ambience loops (made with ElevenLabs sound generation, 4.6 MB in total, in `apps/client/public/assets/audio/sfx` and `amb`). There is no music yet: the Music slider does nothing on purpose (the music bus is reserved and silent). Wear headphones and set Master 80%, Effects 80%, Ambience 80%, Voice 100% before you start (Settings has an Ambience slider now).

How it works, so you know what to listen for:
- The ambience is one 30-second loop per place. It cross-fades (about 2.5 seconds) when you walk into another place, and gets quieter while someone speaks.
- Footsteps follow the ground: wood in the house, pavement on the street, grass in the garden and grounds, gravel on the lane and at No. 66, stone in the ritual room. Standing still is silent.
- If a sound file fails to load, a few cues (door, spells, hit, hurt, slam, teleport) play a short synthetic beep or whoosh instead. That is the fallback, not a bug, but note it.
- Nothing should be loud or startling. Scares are soft and eerie. No scream, nothing that sounds like a child in pain, no music.

For every step write what you heard in the Note column. Mark fail if a sound is missing, wrong, much too loud, repeats like a machine gun, or cuts off.

### Ambience and footsteps

- SD.1. Home. Start a new game (or reload the page and press New Game) and stay in the bedroom for 30 seconds. -> A quiet house at night: a slow clock tick and a fridge hum, a little wind. Steady, no sudden noises. Walk around: wooden footsteps, one per stride, three slightly different sounds that never repeat twice in a row.
- SD.2. Street. Open [localhost:5173/?start=street](http://localhost:5173/?start=street) and walk east along the street. -> Cold night wind, a faint streetlight hum, dry leaves. Footsteps change to hard pavement. When you leave the porch area the home ambience cross-fades into the street one with no click or gap.
- SD.3. Garden. Open [localhost:5173/?start=garden](http://localhost:5173/?start=garden) and walk around the garden. -> Leaves, hedges, a few crickets. Footsteps are soft and muffled (grass).
- SD.4. No. 66 and the lane. Open [localhost:5173/?start=house66](http://localhost:5173/?start=house66), then [localhost:5173/?start=lane](http://localhost:5173/?start=lane). -> At No. 66: wooden creaks, a loose shutter, low wind, gravel steps. In the lane: insects, weeds, a far owl, gravel steps. Each place has its own bed, and the change as you walk between them is smooth.
- SD.5. Grounds. Open [localhost:5173/?start=grounds](http://localhost:5173/?start=grounds). -> Crows far away, steady wind in bare trees, a gate creaking in the distance. Grass footsteps.
- SD.6. Inside the Last House. Open [localhost:5173/?start=interior](http://localhost:5173/?start=interior). -> A big empty house settling: beams groaning, a draft, a slow drip, hollow rooms. Wooden footsteps. Wait a minute: now and then (every 45 to 100 seconds, only once you move) a very faint whisper far off. It is quiet and you cannot make out words.
- SD.7. The ritual room. Open [localhost:5173/?start=ritual](http://localhost:5173/?start=ritual). -> A low, deep drone with a slow pulse. Not music. Stone footsteps with an echo. A far whisper may come now and then too.
- SD.8. Loop seams. Stand still in any place for 70 seconds and listen to where the 30-second loop restarts (about 30 and 60 seconds). -> No click, jump or obvious gap. Write it down if you can hear the loop point.
- SD.9. Ambience under speech. In the bedroom take the locket and listen to the Angel (Beat 1), or press T later. -> While a voice line plays the background gets clearly quieter, then comes back smoothly after the line. The voice is easy to understand.

### Sliders

- SD.10. Master. Open Settings (pause, then Settings), set Master to 0, close, and move. -> Total silence: no steps, no ambience, no voice. Set it back to 80% and everything returns.
- SD.11. Effects. Set Effects to 0 and walk. Then raise it. -> At 0 there are no footsteps or spell sounds, but the ambience and the voice stay. Raising it brings the steps back, louder as you go. Changes apply at once, without reloading.
- SD.12. Ambience. Set Ambience to 0, then 100%. -> The background beds fade out and in. Footsteps and voice do not change.
- SD.13. Voice. Set Voice to 0 and replay a line (a journal page, press E). -> The voice is silent, the subtitle still shows, and the ambience does not duck for a silent line.
- SD.14. Music. Move the Music slider from 0 to 100%. -> Nothing changes: there is no music yet. (A Music slider that does nothing is expected.)

### Effects by place

- SD.15. Doors, gates and the world. Play through Beat 1 and 2 with sound on. Listen for: the drawer when you read journal page 1 (a wooden drawer slides open), the front door opening (a long wooden creak), the street lights flickering one after another (an electrical buzz that stutters) and the soft footsteps behind you in Beat 2 (three slow steps, quiet). At the lane gate ([localhost:5173/?start=lane](http://localhost:5173/?start=lane)) listen for the iron gate creak, and when the veil recedes a soft magic shimmer. -> Each is clear, short and not harsh. Write down any that you did not hear.
- SD.16. Fuse and padlock. At [localhost:5173/?start=house66](http://localhost:5173/?start=house66) place the fuse (a ceramic snap and a short hum). At [localhost:5173/?start=grounds](http://localhost:5173/?start=grounds) open the padlock: each dial turn is a small click, a wrong code rattles the lock, the right code pops it open (and the outbuilding door creaks soon after). -> All four sounds are clear and fit what happens.
- SD.17. Talking board and scares. Open [localhost:5173/?start=interior](http://localhost:5173/?start=interior), use the talking board and choose wrong letters on purpose (six wrong ones). -> Each letter makes a wooden slide of the planchette. The six scares, one per wrong answer, are soft: a far door shutting, whispers, a chandelier tinkling, a cold breath, one piano note, a shadow passing. None is loud or sudden. A correct solve gives a soft veil shimmer.
- SD.18. Mirror and runes. Reach the mirror in the carriage house (Beat 8) and trigger the cracking. -> A glassy crack with a small ring, not a smash. Write whether the sound matches the moment the mirror cracks on screen.
- SD.19. Anchors and the seal. Open [localhost:5173/?start=ritual](http://localhost:5173/?start=ritual), wake the seal and restore the anchors. -> A deep hum when the ritual starts, a warm rising chime for each restored anchor, and after you confirm the final choice a single deep boom that fades. Nothing violent.

### Spells and creatures

- SD.20. Spells. Open [localhost:5173/?start=training](http://localhost:5173/?start=training). Tap the left mouse button (bolt), hold it and release after a second (charge hum, then a stronger bolt), press the Ward key (a shimmer rising) and the Purify key on a weakened hound (a gentle cast, a calm channel hum, then a bright completion chime). Hit the hound with a bolt for the impact. -> Every spell has its own sound. The charge hum and the purify hum loop while you hold and stop at once when you let go. When a hound's attack hits your Ward there is a glassy thud.
- SD.21. Creatures. Fight the training hound, then the creatures in Beat 4 to 9: Briggs, the Watcher, the fox, the cat, the smoke wraiths. -> Each one has a voice when its attack winds up: hound growl, fox snarl, cat yowl, an older man's grunt for Briggs, a lower rasp for the Watcher, a smoke hiss for the wraith. They sound strange and sad, never gory. The Watcher's teleport has a pop, Briggs' smoke puff a slow breath, the ground slam a deep thud, a decoy vanishing a soft whoosh.
- SD.22. Hurt, stun and endings of a fight. Take a hit, stun an enemy, then purify one and destroy another. -> Elena's hit is a short breath and a thud (not graphic). Stun is a ringing wobble. Purify ends with a bright chime and then a gentle relief chime a moment later. Destroy is a crumbling hiss. Write which feels right and which feels wrong.

### Menus and the locket

- SD.23. UI sounds. Click through the main menu, Settings and the pause screen. Open and close the locket with T. Solve nothing and wait for a puzzle hint. -> A very soft wooden tick on every button. The locket opens with a small hinge click and a shimmer, and closes with a snap. A hint (puzzle idle hint) gives a soft two-note chime. Nothing is loud.

### Fallback, loading and size

- SD.24. Fallback when a file is missing (developer). In the browser devtools Network tab, block the request URL `*sfx_door_open.mp3` and `*sfx_spell_bolt.mp3`, reload, and cast a bolt and open a door. -> A short synthetic whoosh and creak play instead (no error on screen). Remove the blocks afterwards.
- SD.25. Loading and size (developer). With the Network tab open, enter the game. -> The sound effects (about 1 MB in total) load in the background; each ambience loop (about 470 KB) loads when you first enter its place; no stutter when you walk into a new place for the first time. The audio folders `sfx` and `amb` together are under 15 MB (4.6 MB when added).
- SD.26. Overall mix. Play 10 minutes of any part with all sliders at the default. -> Nothing is startling. The effects sit above the ambience and under the voice. Footsteps do not feel like a machine gun. Write any cue that is too loud, too quiet or annoying.

### Sound results

| Step id | Pass/fail | Note |
| ------- | --------- | ---- |
| SD.1 | | |
| SD.2 | | |
| SD.3 | | |
| SD.4 | | |
| SD.5 | | |
| SD.6 | | |
| SD.7 | | |
| SD.8 | | |
| SD.9 | | |
| SD.10 | | |
| SD.11 | | |
| SD.12 | | |
| SD.13 | | |
| SD.14 | | |
| SD.15 | | |
| SD.16 | | |
| SD.17 | | |
| SD.18 | | |
| SD.19 | | |
| SD.20 | | |
| SD.21 | | |
| SD.22 | | |
| SD.23 | | |
| SD.24 | | |
| SD.25 | | |
| SD.26 | | |
## 16. First art: home and front street (added 2026-11-09)
Models: home_elena.glb (house shell, rooms, entity props) and street_front.glb (road, kerb, sidewalk, lawn, streetlight, mailbox). Open [localhost:5173](http://localhost:5173) and choose New Game for the home, or [localhost:5173/?start=street](http://localhost:5173/?start=street) for the porch. Keep the default Bright test lighting for the look checks, then repeat AR.14 with Normal.

| Step | Do this | Pass when |
|---|---|---|
| AR.1 | New Game, look around from the hall start | Bedroom, hall and kitchen walls are three colours, ceiling has glow stars in Felix's room |
| AR.2 | Walk into every wall of every room | You stop at a visible wall every time; no invisible walls in the open, no walking through walls |
| AR.3 | Walk through both 3 m doorways | Both pass freely, nothing blocks the opening |
| AR.4 | Look at the bedroom desk | Felix's drawing sits on the desk at the interact spot; E inspects it |
| AR.5 | Look at the SW corner of the bedroom | Ghost-sheet costume on a stand; E inspects it |
| AR.6 | Go to the kitchen east counter | Orange pumpkin jar on the counter; the key shows beside it; E takes it |
| AR.7 | Take the key, go to the hall table | Drawer table at the east divider with a lamp; the journal lies on it; unlock the drawer |
| AR.8 | Check the greybox boxes | No grey box shows behind a model prop; the beacon glow still pulses on every usable item |
| AR.9 | Ask for a hint near a clue | The prop pulses warm yellow (hint highlight) |
| AR.10 | Finish beat 1 and open the front door | The red double door vanishes when it opens; the doorway is walkable |
| AR.11 | From the porch ([localhost:5173/?start=street](http://localhost:5173/?start=street)) look at the house front | Porch roof, posts, two jack-o'-lanterns, lit windows, number 12 on the door |
| AR.12 | Walk to the sidewalk and along it | Lawn, path, kerb, sidewalk and road line up; the streetlight in front of No. 12 glows orange and lights the sidewalk |
| AR.13 | Turn glow off in Settings, then on | Beacons go and return; models stay |
| AR.14 | Switch test brightness Bright/Normal | Both work; Normal is dark with orange and blue pools, no pure black walls |
| AR.15 | Watch frame rate in the house and on the porch | Steady 60 fps on the dev machine |
| AR.16 | Rename a GLB (for example home_elena.glb) and reload | The old greybox house returns and the game still plays; restore the file afterwards |

| Step | Result | Notes |
|---|---|---|
| AR.1 | | |
| AR.2 | | |
| AR.3 | | |
| AR.4 | | |
| AR.5 | | |
| AR.6 | | |
| AR.7 | | |
| AR.8 | | |
| AR.9 | | |
| AR.10 | | |
| AR.11 | | |
| AR.12 | | |
| AR.13 | | |
| AR.14 | | |
| AR.15 | | |
| AR.16 | | |
