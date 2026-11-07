# Playtest: Beat 9 (Last House interior, cat, talking board) and Beat 10 (the seal, Sequence 6)

Greybox build. Boxes stand in for the cat, the board and the seal; the Sequence 6 cinematic is a black
placeholder panel. Dev builds only: start at `?start=interior` (entrance hall, Beat 9 not started) or
`?start=ritual-door` (chamber behind the cellar door, board already solved) to skip the early game.
Add `?start=interior` to the dev URL (for example `http://localhost:5173/?start=interior`) and choose New Game.
Keys: WASD move, mouse look, E use, T locket, Esc pause. Test with the glow setting on "bright" and the scene
brightness on "bright" if the house looks too dark.

## A. Entering the house (from the outside)

Start from the grounds with the runes done (`runes_done`). If you walk it for real: front door of the Last House,
west end of the garden at about x -62, z 34.6, a yellow glowing tall column.

1. Stand at the front door. **See:** a yellow glow column and the prompt "E  Enter the Last House". **Expected:** the prompt shows only once the runes are done; before that it reads "The front door will not open" and pressing E does nothing.
2. Press E. **See:** at once (or, if the house is still loading, a "Opening the Last House…" screen first). **Expected:** the view switches to a dim brown interior, you stand at the south end of a long entrance hall facing north. No pause menu, no black flash that needs a click.
3. Wait two seconds. **Hear/see:** the subtitle "Gran's house. I was here once, when I was little. I don't remember this hall." (Elena).
4. Press E again at the hall. **Expected:** nothing happens (the front door is behind you and cannot be used from inside).
5. Press Esc, then Quit to menu and Continue. **Expected:** Continue puts you back in the entrance hall (not outside, not at the house in the street), because entering wrote the checkpoint.
6. Do NOT expect: seeing the street or the garden through the walls, falling through the floor, the HUD objective still saying "Enter the Last House" (it should read "Enter the Last House" only until you are in; after that it keeps the last objective text, a known placeholder).

## B. The entrance hall (Beat 9, before the cat)

7. Walk north down the hall. **See:** warm orange lights, a dark red rug, a black box (piano) on the left wall, a glowing chandelier ball overhead, brown walls. **Expected:** you cannot walk through walls or the piano's back wall.
8. Go to the left side, about halfway (a small golden box with a yellow glow, left wall). Prompt "E  Read the journal page". Press E. **Hear/see:** subtitle "This house does not need a lock. It needs a... A lock can be broken. What I am can only be handed on, and only by choice." **Expected:** read once; the box and glow vanish afterwards. It is optional (skipping it never blocks anything).
9. Go to the right side (a brown box on a yellow glow, the talking board). Prompt: "E  Look at the talking board". Press E. **See:** nothing opens. **Hear/see:** subtitle "A talking board. Six letters." **Expected:** the board overlay does NOT open yet (the cat first).

## C. The cat (enemy stub)

10. Walk towards the far end of the hall where two short walls make a narrow passage (the cellar stairs, four dark steps on the floor leading to a brown door). A box stands in the passage: the cat.
11. When you are about 4 m from it. **See:** the box turns red and the Encounter panel appears. **Hear/see:** subtitle (Angel) "A cat. The smoke has a sense of humour." **Expected:** the cat does not attack, move or hurt you. Your health bar never drops.
12. Press T while it is red. **Expected:** the locket does not open (combat blocked).
13. Get within about 2 m and press E ("Face the cat"). **See:** it weakens, then after about 2 seconds turns blue-grey and stays that way (stunned). **Expected:** it stays harmless.
14. Pick one ending, both are allowed:
    - Purify (key 2 or the panel): the box turns green. **Hidden effect:** goodness score +10 (not shown).
    - Destroy (hold Enter about 0.7 s): the box shrinks to a flat dark patch. **Hidden effect:** −10 (not shown).
    **Expected (both):** the cat's prompt is gone, the panel closes, and you can press T again.
15. Walk towards the cellar door at the end of the passage. **See:** a brown door and the prompt "E  The cellar door is locked". **Expected:** you cannot pass it yet; pressing E does nothing.

## D. The talking board (P5)

16. Go back to the board (right side). Prompt "E  Use the talking board". Press E. **See:** a dark full-screen overlay "Talking board" with a word of six blanks and the alphabet. The mouse cursor is free.
17. Click wrong letters on purpose (for example Z, X, Q). **See/hear:** after each wrong letter one scare text in order: a door slams, whispers, the chandelier sways, a cold breath, a single piano note, a shadow passes. **Expected:** no damage ever; close the overlay and check the health bar: unchanged.
18. Make six wrong letters. **Expected:** the board resets and one letter is already revealed (K, then P, then E). **Hear/see:** an Angel hint line after each reset ("What does a house that holds something need?", then "Someone who keeps it.", then "Keeper, child.").
19. Press Esc. **Expected:** the overlay closes and you see "Click to resume". Click, press E at the board again. **Expected:** the letters you found and the wrong-letter count are still there (nothing lost).
20. Spell KEEPER (K, E, P, R). **See:** the word fills in, "The board goes still." **Hear/see:** subtitle (Elena) "Keeper." once you close the overlay and the game runs again. Press Esc to close the overlay if it stays open.
21. **Expected after solving:** the cellar door at the end of the passage disappears (the way is open) and the board's glow vanishes. Autosave/checkpoint now stands in the ritual chamber.

## E. Down the stairs: the ritual chamber

22. Walk through the opened door. **See:** a wide square chamber with a bluish floor, a short dark cylinder with a violet ring around it in the middle (the seal), and a faint blue light overhead. Three more brown doors: north, east, west. **Expected:** the three anchor doors are CLOSED and cannot be walked through yet.
23. To the right of the seal (about 4 m east, a small golden box with a glow): "E  Read the journal page". Press E. **Hear/see:** subtitle (Rosalind) "If you are reading this, my blood has come back to the house. Two of us can open it. One of us can carry it. Mend the anchors, and then choose what I chose, or don't." **Expected:** optional; read once.

## F. Beat 10: the seal and the cinematic

24. Stand between the door and the seal, about 1.5 m south of it. **See:** a tall yellow glow and the prompt "E  Lay your hand on the seal". The violet ring is dim.
25. Press E. **See:** the screen goes black with the text `seq6_two_keys` and "cinematic placeholder". You cannot move. **Hear:** nothing yet (the real clip has the Smoke and Felix speaking; the clip is not made yet).
26. Hold E for 1 second (the ring bottom-right fills). **Expected:** the black screen ends at once; you can move again. OR, replay from a save and do not skip: **Expected:** after 40 seconds the black screen ends on its own. Both give exactly the same result.
27. After it ends. **See:** the violet ring around the seal is much brighter; the "Lay your hand on the seal" prompt is gone (the next seal prompts come with the final-ritual beat). **Expected:** all three anchor doors (north, east, west) are now OPEN: you can walk into each of the three side rooms. Nothing else happens in them yet.
28. Press E at the seal again. **Expected:** nothing from this beat (no second cinematic).
29. Press T during the cinematic. **Expected:** the locket does not open. After it, T works again.

## G. Dev start checks

30. `?start=interior`: **Expected:** you start in the hall at the south end, runes done, no cat resolved, board still locked.
31. `?start=ritual-door`: **Expected:** you start in the chamber centre with the cellar door gone, the seal prompt available; the cat and board are already counted as done.

## What you should NOT see

- Any damage from the cat, the scares or the board.
- The exterior (street, houses, streetlights) while inside; the cat or the seal visible outside.
- The seal prompt before the board is solved, or twice after the cinematic.
- A stuck black loading screen when the house has been preloaded (walking the back lane preloads it; a fresh `?start=interior` shows the loading screen for a moment).
- The anchor doors open before the cinematic ends.

## Known placeholders

- Cat, board, seal, piano, journal pages and steps are plain boxes; no models, no textures, no real lighting mood.
- The Smoke and Felix lines of Sequence 6 are not spoken: they belong to the generated clip that does not exist yet. The Angel's three authored reactions (kind, neutral, dark) after the cinematic are written as content (`vo_angel_b10_*`) but not played yet (task 4.11).
- No Classic locket lines for beats 9-10 yet (the three `vo_angel_b9_*_c1` lines exist as content only, task 4.11).
- All scare effects of the talking board are text only (no sound, no shake).
- The HUD objective text for beats 9-10 is still the generic "Enter the Last House" / "Approach the seal."
- The cat has no real combat (stub rules).
