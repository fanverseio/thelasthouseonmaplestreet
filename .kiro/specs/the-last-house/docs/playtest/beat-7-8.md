# Playtest checklist: Beats 7-8 (back lane, hounds, padlock, mirror, runes)

Greybox build. Coordinates are metres (x east, z south). Controls: WASD move, mouse look, E interact, T locket, Q switch the selected action in the side panel, 2 Purify, hold Enter Destroy (encounter panel), Esc pause, hold E (1 s) skips a skippable cinematic.

## Start points (dev builds only)

- `?start=lane`: at the lane gate (-58, -20), gate open, spells unlocked, nothing from Beat 7 done. Use this for the whole of Beat 7.
- `?start=grounds`: at the outbuilding door (-52, 25.5), padlock already open, hounds treated as done. Use this for Beat 8.
- A normal new game reaches the same places by playing Beats 1-6.

## Beat 7: the back lane

1. Stand at the lane gate (-58, -20). Walk south down the lane (x about -59).
   - You should see: dark lane, the Last House silhouette far south-west, a faint grey box on the fence near (-64, 10).
   - Objective in the HUD: "Follow the back lane to the Last House."
   - You should NOT see: a smoke wall in the lane (it opened with the gate).
2. Near (-64, 10), on the fence, press E on "Read the journal page".
   - Hear/see: Rosalind's subtitle "Thirty-first of October, nineteen sixty-six. The night I closed it..." Flag in plain words: the journal page 3 is collected. It is optional; the E prompt goes away after one read.
3. Keep walking south past z = 1, around (-59, 4).
   - Hear/see: Elena whispers "That's our house. That's Felix's window." Far to the east, in the wall of your house (x about -27, z about 40), a window turns warm yellow with a small dark silhouette, for about 5 seconds, then goes dark.
   - You should NOT lose control at any point (you can keep walking and looking). It happens once only.
4. Keep going to the grounds entrance, around (-57, 20).
   - Hear/see: the Angel says "Hounds. The smoke has run out of neighbours." Two red boxes (the hounds) at about (-58, 24) and (-54, 23.5) turn hostile. You are never hurt by them (placeholder).
   - The locket (T) is blocked while a hound is hostile.
5. Walk to the padlock at (-52, 26.5) (on the outbuilding door) BEFORE dealing with the hounds and press E.
   - You should see: prompt "Look at the padlock"; Elena says "Gran's old carriage house. Locked." No dial overlay opens.
6. Go to the first hound, stand within 2 m, press E on "Face the hound".
   - You should see: the hound goes from red to weakened, and about 1.5 s later turns blue-grey (stunned). The panel shows "Purify (2)" and "Destroy (hold Enter)". Choose one (Purify +10 morality, Destroy -10, not shown on screen).
   - Purified hound turns green; destroyed leaves a flat dark coat.
7. Check the padlock again with only ONE hound resolved: it must still refuse (same line, no overlay).
8. Resolve the second hound the same way. Test both ways over several runs: both Purify, both Destroy, one of each.
   - Flag in plain words: the approach is cleared (`enc_approach_resolved`) only after BOTH hounds are done. The locket works again.
   - Objective: "Open the outbuilding padlock."
9. Die on purpose once (let the dev tools or a test set HP 0) in the grounds: you respawn at the lane gate with full health. A hound you already resolved stays resolved; the other one wakes again when you come within about 5 m.
10. At the padlock press E: the number lock overlay opens (4 dials). W/S or mouse wheel change a dial, A/D move, E tries.
    - Wrong tries cost nothing, only a rattle note. Hints (shown as text and as the Angel's line): 1st wrong "Your grandmother was fond of dates.", 3rd wrong "The page in the lane. The year.", 5th wrong the first two dials glow (nineteen), 7th wrong all four glow.
    - Esc closes the overlay; reopening keeps the dials where you left them.
    - Enter 1966: "The padlock clicks open."
    - Flag in plain words: the padlock is open (`padlock_open`), checkpoint "outbuilding door" is written, objective "Look into the mirror."
11. The door area in the north wall of the outbuilding (3 m wide, x -53.5 to -50.5) is now walkable; before the code it was a solid brown block.

## Beat 8: the mirror

12. Walk in and stand near the south wall (-52, 30.5), facing south. A large mirror (3 m wide) hangs on the wall.
    - You should see: your reflection of the room (walls, door gap). You should NOT see any glowing marks in the room or in the reflection yet.
    - Press E on "Look into the antique mirror".
13. The cinematic: a black panel reading `seq5_felix_mirror` ("cinematic placeholder") for 25 seconds. You cannot move. The locket is blocked.
    - Holding E for 1 s skips it. Skipping and watching the full 25 s must end in exactly the same state.
    - Flag in plain words: the mirror scene is done (`seq5_done`). Objective: "Find the three runes in the mirror."
    - Known placeholder: the real clip (Felix behind the reflection, the mirror cracking, the three Felix/Elena lines) is a generated video that does not exist yet.
14. Look into the mirror again. You should now see three violet glyphs (ring and cross) in the REFLECTION only: two on the north wall either side of the door gap, one on the east wall near the south corner (that one only shows from the west half of the room).
    - You should NOT see them when looking at the real walls (turn around: bare walls).
15. Turn to the real wall at the place you saw, within 2.5 m. The prompt "Purify the rune" appears when you face the spot. Press E.
    - You should see: that glyph turns pale blue in the mirror and a faint blue ring stays lit on the real wall. Purify costs no magic (try it with magic at 0).
    - Pressing E again on the same spot does nothing.
16. Purify the other two the same way (any order).
    - Flag in plain words: runes are done (`runes_done`) after the third. Objective: "Enter the Last House." The gate on the Last House front door is now open by flags; the door interaction and the interior belong to Beat 9.
17. Idle hints (clock runs only while you are within 14 m of the mirror, after the video): 30 s Felix whispers "Look where I was."; 60 s the Angel says "The glass sees what you can't. Use it." and the mirror pulses; 90 s the Angel says "There. By your shoulder. Can you feel it?" and the unfound runes pulse faintly on the REAL walls (the one place a rune shows outside the mirror).
18. Quit and Continue after step 15: purified runes stay purified (they are saved as entity state).

## What you should never see

- Runes in the real room before a hint at 90 s or after purifying (blue ring).
- A black smoke wall inside the grounds.
- Any morality number, score or "+10" text.
- Being damaged by the hounds.
- A way into the Last House from this build (the front door interaction is not part of Beats 7-8).

## Known placeholders

- Hounds are red/blue/green boxes that do not move or attack. Real combat is Phase 5.
- Felix's window is a flat emissive plane with a dark box as the silhouette; no spirit model.
- The mirror reflection is a real render-to-texture mirror but the room and glyphs are boxes and flat rings; the mirror does not visibly crack (the clip does that).
- `seq5_felix_mirror` is the 25 s black placeholder panel until the generated clip is dropped in (clip id `seq5_felix_mirror`).
- No audio: no hound sounds, padlock rattle, rune flare or whispers.
- Classic-mode locket lines for beats 7-8 (`vo_angel_b7_*_c1`, `vo_angel_b8_*_c1`) are not wired; the locket only gives older beats' lines.
- Rune hit-testing is "stand within 2.5 m and face the spot" (E), not a Purify spell cast at a target.
