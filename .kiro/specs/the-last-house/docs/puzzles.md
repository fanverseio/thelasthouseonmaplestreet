# Puzzles

Status: DRAFT, needs author approval.
Rules for every puzzle:
- Solvable in Classic Mode with no AI.
- Escalating authored hints after failed attempts or idle time; the last hint always gives the answer, or makes it trivial.
- No softlock: puzzle items cannot be lost, wrong answers never cost progress, and the puzzle can be left and resumed.
- In AI mode the Angel may give hints in its own words. It never solves a puzzle and never sets a puzzle flag.
- Overlay puzzles (number lock, talking board) release pointer lock like the locket. Esc closes them; state is kept.

Hint sources: Classic = the Angel's authored hint lines (locket glows when a hint is ready; press T). AI = the Angel's own hints, using the same hint level as context.

## P1. The locket drawer (home, beat 1)
- **Goal**: open `socket.home.drawer` to get the locket.
- **Clue**: Felix's drawing (`clue.home.drawing`): "my secret hiding place" shows the ceramic pumpkin with a key inside.
- **Solution**: take the key from `prop.home.pumpkin_jar`, then use it on the hall drawer.
- **Hints**: 45 s idle in the house after `drawing_seen` -> Elena: "The pumpkin... he hides everything in that pumpkin." 90 s -> the pumpkin jar gets a subtle highlight.
- **No softlock**: the key cannot be dropped; the drawer cannot be locked again.
- **Target**: 60-75 s.

## P2. The fuse (fetch and place between houses, beat 6)
- **Goal**: restore power at House 66 so the Watcher shows himself.
- **Clue**: Gartner: Mr Corwin took the fuses out of his lights; Mr Briggs had spare fuses for his Halloween lights. House 66's fuse box hangs open and empty on the side wall.
- **Solution**: `pickup.garden.fuse` from No. 31's garage, carried to `socket.house66.fusebox`.
- **Hints**: objective text "Find a fuse for House 66". After 60 s near House 66 without the fuse: Angel hint "Your neighbour with the garish lights, perhaps?". After 120 s: the garage light in No. 31 flickers (authored, not an Angel action).
- **No softlock**: one fuse; it cannot be dropped; the socket accepts only it.
- **Target**: 45-60 s including the walk back (about 25 s).

## P3. The number lock (outbuilding padlock, beat 7)
- **Goal**: open `door.grounds.outbuilding`.
- **Clue**: journal page 3 (`clue.lane.journal_3`) is headed "31st October 1966. The night I closed it." The padlock has 4 dials. A carving on the door reads "R.V. - the year it slept".
- **Solution**: `1966`.
- **Overlay**: 4 dials, mouse wheel or W/S to change, A/D to move, E to try.
- **Hints**: 1st wrong: Angel "Your grandmother was fond of dates." 3rd wrong: "The page in the lane. The year." 5th wrong: the first two digits glow (`19`). 7th wrong: all digits glow in order.
- **No softlock**: unlimited tries, no penalty beyond a rattle sound.
- **Target**: 30-60 s.

## P4. The mirror runes (outbuilding, beat 8)
- **Goal**: break the ward on the Last House front door.
- **Mechanic**: after `seq5_felix_mirror`, three runes appear in the mirror's reflection on the walls behind Elena. They are invisible when looking at the walls directly. Elena locates each by looking into the mirror, then casts Purify on the spot (`rune.grounds.r1`..`r3`). A purified rune flares and stays visible.
- **Hints**: 30 s with none found: Felix's whisper "Look where I was." 60 s: the mirror brightens around the first rune's reflection. 90 s: the next unfound rune pulses faintly in the real room.
- **Magic**: Purify on a rune costs no magic, so magic can never block it.
- **No softlock**: rune progress is saved; the mirror cannot break further.
- **Target**: 45-75 s.

## P5. The talking board (interior, beat 9)
- **Goal**: open the cellar door `door.interior.ritual`.
- **Clue**: journal page 4 (`clue.interior.journal_4`): "This house does not need a lock. It needs a ______." The board in the hall table shows `_ _ _ _ _ _`.
- **Solution**: `KEEPER`.
- **Mechanic** (hangman-style): Elena moves the planchette to a letter (mouse click or arrow keys plus E). A correct letter fills its blanks. A wrong letter triggers a scare from a fixed list, in order (a door slams, whispers, the chandelier sways, a cold breath on the screen, the piano plays one note, a shadow passes). Scares never deal damage.
- **Rounds**: after 6 wrong letters the board resets with one extra letter revealed (`K` first, then `P`, then `E`).
- **Hints**: Angel lines escalate per reset ("What does a house that holds something need?" -> "Someone who keeps it." -> "Keeper, child.").
- **No softlock**: unlimited rounds; revealed letters persist.
- **Target**: 60-90 s.

## P6. The three anchors (ritual, beat 11)
Any order. Each uses one spell. Restoring an anchor saves immediately. Magic regenerates fast in the ritual (`combat-tuning.md`), so magic can never block an anchor.
| Anchor | Spell | Mechanic | Fail state |
|---|---|---|---|
| `anchor.ritual.north` | Arcane Bolt | A smoke shell (100 HP, 5 bolts) covers the anchor. Break it, then hold E for 3 s to restore. | The shell regrows after 20 s if not restored. |
| `anchor.ritual.east` | Ward | Hold E for 6 s to channel. The smoke strikes every 1.5 s. A strike without Ward pauses the channel and deals 10 damage. Progress is kept. | None; progress is never lost. |
| `anchor.ritual.west` | Purify | Channel Purify on the anchor for 4 s. Two smoke wraiths harass; damage interrupts the channel but keeps progress. | None. |
- **Hints**: entering an anchor room shows a rune icon of the needed spell on the anchor. After 45 s without progress, the Angel names the spell.
- **Target**: 3-4 min total including combat pressure.

## Puzzle time budget
P1 1.0 + P2 0.9 + P3 0.75 + P4 1.0 + P5 1.25 + P6 (inside the 4 min ritual) = about 5 min of puzzle time inside the 28.5-minute plan. P2 replaces street travel; P3 to P5 replace exploration time in beats 7 to 9.

## Open questions for the author
1. Is `1966` (also the house number 66) the right code, or do you prefer a code tied to Felix (e.g. his birthday)?
2. Is `KEEPER` acceptable before Seq 6, or too much of a hint about the good ending?