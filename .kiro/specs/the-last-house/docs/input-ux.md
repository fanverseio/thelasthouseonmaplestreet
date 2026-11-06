# Input and UX State Spec

## Game phases
`boot -> menu -> playing <-> paused | locket | cutscene -> ending -> menu`
Simulation runs only in `playing` (and a limited tick during `cutscene` for scripted motion). Rendering always runs.

## Pointer lock
- Request pointer lock only from a user gesture (click on "Play"/"Resume"/canvas).
- Esc: browsers exit pointer lock themselves and do not give the page a reliable keydown. Treat `pointerlockchange` (unlocked while `playing`) as "pause".
- After an unlock, browsers may refuse a new lock request for ~1 second. Show a "Click to resume" overlay and retry on click; never loop-retry.
- On `pointerlockerror`, show the overlay; do not crash.
- Window blur or tab hidden -> pause.

## Locket (T)
- T opens the locket only in `playing`. Not available in `cutscene`, `paused`, or during scripted sequence steps flagged `locketBlocked`.
- While open: phase = `locket`, exit pointer lock, focus the text input.
- Typing "t" must not close the locket. Close with Esc, a close affordance, or T when the input is empty and not focused. Key handling is phase-aware: in `locket` only Esc and Enter are intercepted.
- Closing returns to `playing` and requires a click to relock (show the overlay).
- All game timers (stun timers, cooldowns, sequences, Angel cooldowns) pause in `locket`.
- Input limits: 300 characters, Enter to send, one request in flight, "thinking" indicator (animated locket glow plus ellipsis).
- If the reply takes more than 8 s, give a stock in-character line and treat as `timeout`.

## Input handling
- One input module reads DOM events into an `InputState` (held keys, mouse delta, pressed-this-frame flags). Systems read only `InputState`.
- Mouse sensitivity setting; optional invert Y. Clamp pitch to ±85°.
- Movement is framerate-independent. Sprint is a speed multiplier (no stamina).
- Keys are bound by `event.code` (KeyW etc.) so non-QWERTY layouts work.

## Menus
- Main menu: Continue (if a save exists), New Game (choose mode), Settings, Credits.
- Mode choice at New Game: Classic or AI-Enhanced. AI-Enhanced shows connection state (hosted: logged in; local: key entry).
- Pause: Resume, Settings, Save and Quit to menu.
- Changing mode mid-game is not offered from the menu; fallback to Classic is automatic and diegetic.

## Audio autoplay
Create the AudioContext only after the first click on the menu. Preload the menu-adjacent audio after that.

## Accessibility and safety
- Photosensitivity warning on first launch. Setting "Reduce flashing" caps flicker rate (<3 flashes per second) and softens the contrast of flicker/strobe effects. Default on after the warning's confirm.
- Subtitles for Angel, Felix and Gartner lines always on. Whisper SFX that carry meaning must also appear as text.
- Settings: master/music/sfx/voice volume, mouse sensitivity, field of view (70-100), graphics preset, reduce flashing, head bob on/off.
- Colour is never the only carrier of information (e.g. the spell HUD shows names and icons).
- Interaction prompt shows the key ("E") and the action.

## Loading and errors
- Loading screen with progress for the zone/interior GLBs. WebGL unsupported -> clear message with a supported browser list.
- Corrupt or too-new save -> message with the option to start a new game; never crash.
- Network failure in AI mode is silent in gameplay (diegetic locket flicker plus a stock line).

## Performance toggles
`low | medium | high` presets: render scale, shadow map size, post-processing, light count, particles. Auto-suggest `low` if the first 5 seconds average <40 fps.