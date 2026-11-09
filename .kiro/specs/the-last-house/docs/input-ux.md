# Input and UX State Spec

## 1. Game phases

`boot -> warning -> menu -> playing <-> paused | locket | overlay | sequence -> ending -> credits -> menu`

- `overlay` covers puzzle overlays (number lock, talking board), the journal reader and the final choice.
- The simulation runs only in `playing`, and in `sequence` for scripted motion. Rendering always runs.

## 2. Pointer lock

- Request pointer lock only from a user gesture (Play, Resume, a click on the canvas).
- Esc: the browser exits pointer lock and gives the page no reliable keydown. Treat `pointerlockchange` (unlocked while `playing`) as Pause.
- After an unlock, browsers may refuse a new lock for about 1 s. Show a "Click to resume" overlay; retry only on click.
- `pointerlockerror` shows the overlay; never crash.
- Window blur or a hidden tab pauses the game.
- Locket, overlays and menus release pointer lock. Closing them shows "Click to resume".

## 3. The locket (T)

- T does nothing until `angel_awake`.
- T opens the locket only in `playing`, and only when the current policy allows it (`beat-sheet.md`).
- **Classic Mode** does not pause: T asks for the next line, which shows in the Angel panel (section 5) while play continues. The phase stays `playing` and pointer lock is kept.
- **AI-Enhanced Mode** opens the locket overlay (phase `locket`, pointer lock released) and pauses only while the player is typing.
- **Classic Mode**: no text input. The Angel speaks one authored line for the current context (beat, zone, morality band, pending hint). Pressing T again plays the next line, if any. There is nothing to close.
- **AI-Enhanced Mode**: a text box is focused. Max 300 characters. Enter sends. One request in flight. A "thinking" state (the locket glows and pulses). Over 8 s gives a stock in-character line, and the request is treated as a timeout.
- Typing never triggers game keys. While the input is focused, only Esc and Enter are intercepted. T closes the locket only when the input is empty.
- Angel effects proposed during the conversation apply after the locket closes, after re-validation.
- AI status is shown diegetically: a steady glow when ready, a dim flicker when degraded, cold and dark when unavailable.
- Hosted, after `access_invalid` or `session_expired`: the next locket open shows the Classic line plus a small "Re-enter access code" field. Dismissing it keeps Classic behaviour.

## 4. Puzzle overlays and the final choice

- Number lock: mouse wheel or W/S changes a dial, A/D moves between dials, E tries the code, Esc closes.
- Talking board: click a letter or use the arrow keys plus E; Esc closes.
- Journal pages: a full-screen page with a voiced reading (Rosalind) and subtitles; E or Esc closes.
- Final choice: two large options, then a confirm. Esc backs out of the confirm, never out of the game.
- Overlays keep their state when closed and reopened.

## 5. HUD

- Bottom left: health and magic rows, each `label | bar | number`: `HL` and `ML`, with the rounded value to the right of the bar.
- Bottom left, directly above the bars: the Angel panel. A small cluster of about 18 glowing lights (dim and tight when idle, brighter and wider while the Angel speaks), then the label `The Angel` and the line in a serif face. The cluster appears once `angel_awake` is set. Its colour follows the Angel's hidden mood (blue, pale violet or red); the UI never states why. Every line spoken by the Angel (hints, sequences, locket) shows here instead of the bottom-centre subtitle, for the length of the voice line; other speakers keep the bottom-centre subtitles. Reduced motion draws a static frame; reduce flashing removes the twinkle flicker.
- Bottom centre: the selected spell, with icon and name (colour is never the only cue).
- Top left: the current objective (one line).
- Bottom right: carried key items, max 4 icons, shown only while carrying something.
- Centre: the interaction prompt ("E Open drawer").
- First-person hands always visible in `playing`; they animate per spell (bolt flick, purify open palms, ward raised forearm) and glow per morality band.

## 6. Input handling

- One input module turns DOM events into an `InputState` (held keys, mouse delta, pressed-this-frame). Systems read only `InputState`.
- Keys bound by `event.code`, so non-QWERTY layouts work.
- LMB tap vs hold: a press over 200 ms counts as a hold for the charged Arcane Bolt and for Purify channels.
- Mouse sensitivity setting; invert Y option. Pitch clamped to +/-85 degrees.
- Movement is framerate-independent. Sprint is a speed multiplier.
- Cinematic skip: hold E for 1 s; a ring fills around the prompt.

## 7. Menus

- **Main menu**: Continue (only if a save exists and is not finished), New Game, Settings, Credits.
- **New Game**: choose Classic Story Mode or AI-Enhanced Mode. If a save exists, confirm overwriting it.
  - AI-Enhanced, hosted: an access code field. On success the session starts; on failure "The locket stays cold" and the option to play Classic.
  - AI-Enhanced, local: shows the provider configured in `.env`, or a form for protocol, base URL, model and key (sent to the local server, held in memory only).
- **Pause**: Resume, Settings, Quit to menu (progress is saved at the last checkpoint).
- Mode switching mid-game is not offered from menus. Fallback to Classic is automatic. If AI comes back, the game returns to AI mode when the player had chosen it.
- **After the ending**: credits, then the main menu with New Game only.

## 8. Settings (stored separately from saves)

Master, music, SFX, voice volumes; mouse sensitivity; invert Y; field of view (70-100, default 80); graphics preset (low, medium, high); reduce flashing; head bob on/off; subtitle size (normal, large). **Reset progress** (confirm) clears the save.

## 9. Audio autoplay

Create the AudioContext only after the first click (the warning screen's Continue). Preload menu audio after that.

## 10. Accessibility and safety

- Photosensitivity warning on first launch, with "reduce flashing" on by default after the warning is confirmed. With it on, flicker effects stay under 3 flashes per second and the contrast is softened.
- Subtitles always on. Whispers that carry meaning also appear as text.
- Colour is never the only carrier of information.
- No gore. Content note on the warning screen: horror themes, a missing child, supernatural violence.

## 11. Loading and errors

- Loading screen with progress for the exterior scene and the Last House interior. The interior preloads during beat 7.
- WebGL unsupported: a clear message listing supported browsers (desktop Chrome, Edge, Firefox).
- A corrupt or too-new save: a message with the option to start a New Game; never crash.
- A missing asset falls back to a greybox shape, never a crash.
- Network failure in AI mode is silent in play (the locket dims, plus one stock line).

## 12. Performance presets

`low | medium | high`: render scale, shadow map size, post-processing, light count, particles. If the first 5 s average under 40 fps, suggest `low` once.
