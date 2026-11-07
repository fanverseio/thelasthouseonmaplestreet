# Cinematic and Sequence Controller

One reusable runner for all six horror sequences, the Felix anchor scene, the two endings, atmosphere events and encounter intros. Real-time, in-engine (R3F/Three). No pre-rendered video.

## 1. Responsibilities
- Run authored step lists (timelines) with waits and conditions.
- Drive camera, lighting, animation, audio, subtitles and effects.
- Set progression flags, and only the flags the sequence declares.
- Own entities while running, so Angel actions on them are rejected.
- Apply the sequence policy: locket, Angel actions, control mode.
- Restore player control and camera cleanly at the end, on skip, on death and on load.

## 2. Data model
```ts
type ControlMode = 'full' | 'limited' | 'locked';
type LocketPolicy = 'allowed' | 'combat_blocked' | 'blocked';

interface SequenceDef {
  id: SequenceId;                 // e.g. 'seq2_felix_streetlight'
  kind: 'horror' | 'cinematic' | 'atmosphere' | 'ending';
  trigger: { entity: EntityId } | { flag: ProgressFlag };
  requires: ProgressFlag[];       // all must be set
  owns: EntityId[];               // Angel actions on these are rejected while running
  policy: { locket: LocketPolicy; angelActions: 'allowed' | 'blocked'; control: ControlMode };
  maxForcedSeconds: number;       // 0 for fully interactive sequences
  skippable: boolean;
  setsOnComplete: ProgressFlag[]; // also set on skip
  steps: SequenceStep[];
}

type SequenceStep =
  | { t: 'camera'; to: CameraShot; ease: 'in' | 'out' | 'inOut'; seconds: number }
  | { t: 'cameraRestore'; seconds: number }
  | { t: 'clampLook'; yawDeg: number; pitchDeg: number }          // limited mode
  | { t: 'light'; target: EntityId; effect: 'flicker' | 'on' | 'off' | 'burst' | 'color'; seconds?: number }
  | { t: 'anim'; target: EntityId; clip: string; loop?: boolean }
  | { t: 'spawn' | 'despawn'; target: EntityId }
  | { t: 'audio'; cue: AudioCueId; at?: EntityId; bus: 'sfx' | 'amb' | 'mus' | 'vo' }
  | { t: 'line'; lineId: VoiceLineId }                             // voice + subtitle
  | { t: 'fx'; effect: 'smoke' | 'veilRecede' | 'mirrorCrack' | 'runes' | 'glow'; target: EntityId }
  | { t: 'setFlag'; flag: ProgressFlag }                           // must be listed in setsOnComplete
  | { t: 'unlockSpell'; spell: SpellId }
  | { t: 'prompt'; textId: string; until: 'input' | 'flag'; flag?: ProgressFlag }
  | { t: 'wait'; seconds: number }
  | { t: 'waitFor'; cond: { flag: ProgressFlag } | { trigger: EntityId } | { input: 'interact' } }
  | { t: 'parallel'; steps: SequenceStep[] };
```

## 3. Runtime behaviour
- One sequence runs at a time. A second trigger waits in a queue. Atmosphere events may overlap only when their `owns` sets do not overlap.
- Steps advance in sim time, which pauses with the game. The locket can pause a sequence only when the policy allows it.
- `limited`: no movement, camera clamped around the shot. `locked`: input ignored except hold-E to skip. `full`: normal play.
- Subtitles always show for `line` steps. Speaker names are coloured per character, with the name always shown.
- **Skip** (hold E for 1 s, when `skippable`): jumps to the end state. It sets every flag in `setsOnComplete`, unlocks every spell from `unlockSpell` steps, applies the final state of every entity the sequence changed, and restores control. Skipping never leaves a half-applied world.
- **Interrupt**: death or load during a sequence rolls it back to its start. Flags are only set at completion (or by explicit `setFlag` steps that the beat sheet marks as safe midpoints).
- **Restore**: camera returns to the player's view over 0.4 s; the look clamp is released; pointer lock is requested on the next click if it was lost.
- Classic and AI modes run identical sequences. AI mode never adds, removes or reorders steps.

## 4. Registry of sequences
| ID | Kind | Control | Locket | Angel actions | Max forced s | Skippable |
|---|---|---|---|---|---|---|
| `seq1_empty_street` | horror | full | allowed | blocked | 0 | no (interactive) |
| `seq2_felix_streetlight` | horror | limited | blocked | blocked | 25 | yes |
| `seq3_cursed_neighbour` | horror | full | combat_blocked | blocked | 0 | no (interactive) |
| `seq4_gartner_confession` | horror | limited (dialogue) | blocked | blocked | 0 (dialogue cap 120 s) | lines only |
| `seq5_felix_mirror` | horror | locked | blocked | blocked | 30 | yes |
| `seq6_two_keys` | horror | locked | blocked | blocked | 45 | yes |
| `cin_felix_anchor` | cinematic | locked | blocked | blocked | 20 | yes |
| `cin_ending_keeper` | ending | locked | blocked | blocked | 30 | yes |
| `cin_ending_broken` | ending | locked | blocked | blocked | 30 | yes |
| `atm_home_window` | atmosphere | full | allowed | blocked | 0 | n/a |
| `angel_intro` | cinematic | full | blocked | blocked | 0 | lines only |

Only one ending plays per run, so the counted total is 25 + 30 + 45 + 20 + 30 = **150 s** (limit 180 s).

## 5. Tests required
- Content test: every `SequenceDef` validates; every `owns`, `trigger` and step target exists in the level manifest; every flag in `setsOnComplete` exists.
- Budget test: the sum of `maxForcedSeconds` over one playthrough (one ending) is <= 180.
- Skip test: for each skippable sequence, skip-at-every-step gives the same flags and entity states as a full run.
- Interrupt test: death or load mid-sequence leaves no partial flags.
- Policy test: Angel actions on owned entities are rejected while the sequence runs.

## 6. Authoring guidance
- Keep cameras low and close; avoid big swoops.
- Use light and sound as the main scare tools. Use a camera cut at most once per cinematic.
- No gore. Felix's on-screen moments are gentle and eerie, never hurt.
- Every cinematic ends on a clear next objective.