# Playtest: street fox, hold-E skip, placeholder sounds

Greybox build. Sounds are synthesised beeps and noise, not final audio. Use the dev start shortcuts to reach
the street after Beat 3 (`seq2_done`) if you do not want to replay the start.

## A. Sound cues (check master and SFX volume in Settings first)

1. New Game, click to start. Walk the home. **Hear:** nothing odd; no sounds at idle. No console errors.
2. Open the front door (take the locket first). **Hear:** a short wavering creak when the door opens. **Expected:** one creak, not repeated.
3. Walk out into the street, towards the first streetlights (west to east along Maple Street). **See/hear:** the lights flicker one after another, each with a short stuttering buzz.
4. Keep walking. **Hear:** three slow dull thuds (footsteps behind you). **Expected:** once, quiet, ominous; not on every step.
5. Settings: set SFX to 0, replay the same stretch (or load a save before it). **Expected:** complete silence for these cues. Set master to 0: same. Restore the volumes afterwards.
6. Settings: set SFX to maximum. **Expected:** louder but not painful (placeholders are capped).

## B. Hold-E skip (Beat 3 video: Felix at the streetlight)

7. Walk to the intersection streetlight (east end of the street, near x 57). The Felix video placeholder (black screen with the clip name) starts. You cannot move.
8. **See:** bottom-right a ring with "Hold E to skip". It is empty.
9. Tap E quickly. **Expected:** nothing skips; the ring stays empty or flashes a sliver and resets.
10. Hold E. **See:** the ring fills over about 1 second. Release halfway. **Expected:** the ring empties again; the video keeps playing.
11. Hold E for the full second. **Expected:** the black screen disappears at once, you can move again, the Arcane Bolt tutorial text appears ("LMB: Arcane Bolt"), and the Angel lines of the skip-or-watch ending play as usual.
12. Press LMB. **Hear:** a short whoosh (the bolt placeholder). **Expected:** same game state as if you had watched the video: bolt available, the garden path open.
13. Replay (load a save before the streetlight) and this time do NOT skip. **Expected:** after about 20 seconds the video ends by itself with the same result as step 11.
14. Hold E from before the video starts (keep E down while stepping into the trigger). **Expected:** it does NOT skip until you release E and press it again.
15. In any scene with no video (the empty street, the house): hold E. **Expected:** no ring appears.

## C. Street fox (optional, after Beat 3)

Start state: Beat 3 done, bolt unlocked. The fox is a small box on the street at about x 42, z 31 (west of the intersection). Before Beat 3 is done there is no fox.

16. Walk west along the street from the intersection towards x 42. **See:** a small red box (the fox) appears as you get near. **Expected:** it does not attack or hurt you. The Encounter panel (Weaken) may appear.
17. While the fox is red, press T. **Expected:** the locket does not open (combat blocked).
18. Stand close and press E ("Approach the fox"), or use the panel's Weaken button. **See:** the fox turns blue-grey about 1 second later. It stays that way forever (no timer).
19. Press T now. **Expected:** the locket opens normally.
20. Press 2 (Purify). **Expected:** nothing happens. The fox stays blue-grey and harmless. (Purify only works after Beat 4 teaches it.) No sound, no score change.
21. Walk away more than 20 m (east past the intersection) and come back. **Expected:** the fox is still blue-grey; the panel only shows when you are within 20 m.
22. Destroy ending: stand near the stunned fox, hold Enter for about 0.7 s. **See:** the fox shrinks to a dark flat box. **Expected:** it is gone from the prompts (no more "Approach the fox"). Your hidden score drops a little; nothing on screen says so.
23. Purify ending (replay from a save after Beat 4 when you know Purify): press 2 on the stunned fox. **Hear:** a soft rising whoosh. **See:** the fox turns green. **Expected:** the score rises a little (hidden).
24. Skip ending A (never touch it): walk past the fox's area without going into the trigger circle. **Expected:** nothing happens and the story proceeds.
25. Skip ending B (walk away): let the fox turn red, then walk east more than 20 m. **Expected:** the fox turns back to its calm brown colour and the locket works again. Walking back and pressing E re-engages it.
26. Skip ending C (leave it stunned): stun it, then go on to the garden. **Expected:** Beat 4 (Mr Briggs) works exactly as without the fox; the fox does not follow or reappear.
27. Let Briggs kill you (or die any other way) while the fox is red. **Expected:** you respawn at the checkpoint and the fox is calm brown again.
28. **Softlock check:** at no point should the fox stop you from moving, opening the locket (once stunned or away), or finishing the story. If anything blocks you, note where you stood and what you pressed.

## What to report
Sound too loud or too long, ring timing off, fox visible too early, E prompt missing or wrong, anything that blocks the way forward.
